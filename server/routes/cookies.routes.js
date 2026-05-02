import express from 'express';
import prisma from '../db.js';
import { sendCookieExpiredAlert } from '../services/telegram/NotificationService.js';

const router = express.Router();

// GET: Cari Akun Shopee berdasarkan Username
router.get('/search', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'Username wajib diisi.' });

    const accounts = await prisma.shopeeAccount.findMany({
      where: {
        shopee_username: { contains: username, mode: 'insensitive' },
        deleted_at: null
      },
      include: {
        studio: true,
        sessions: { orderBy: { created_at: 'desc' }, take: 1 }
      },
      take: 5
    });

    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST: Inject Cookies baru
router.post('/inject', async (req, res) => {
  try {
    const { account_id, cookie_text, studio_id } = req.body;

    if (!account_id || !cookie_text) {
      return res.status(400).json({ error: 'Data tidak lengkap.' });
    }

    // Gunakan nama kolom yang benar sesuai schema: raw_cookie_encrypted
    const session = await prisma.shopeeSession.create({
      data: {
        account_id,
        raw_cookie_encrypted: cookie_text,
        user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)",
        status: 'OFFLINE' // Siaga — Cron Radar akan mengubahnya ke LIVE saat siaran terdeteksi
      }
    });

    if (studio_id) {
      await prisma.shopeeAccount.update({
        where: { id: account_id },
        data: { studio_id }
      });
    }

    res.json({ success: true, message: 'Cookies berhasil disimpan!', session });
  } catch (error) {
    console.error('[Cookies] Error inject:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST: Tandai Cookies Expired
router.post('/mark-expired', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    const updated = await prisma.shopeeSession.update({
      where: { id: sessionId },
      data: { status: 'EXPIRED' },
      include: { account: true }
    });

    if (updated.account) {
      await sendCookieExpiredAlert(updated.account);
    }

    res.json({ success: true, message: 'Status cookies diubah ke EXPIRED.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET: Status seluruh sesi / cookies (pengganti mock di ExpiredCookies.jsx)
router.get('/status', async (req, res) => {
  try {
    const accounts = await prisma.shopeeAccount.findMany({
      where: { deleted_at: null },
      include: {
        studio: { select: { id: true, name: true } },
        member: { select: { bank_name: true, bank_account_number: true } },
        sessions: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
        performances: {
          orderBy: { recorded_at: 'desc' },
          take: 2, // [0] = terbaru, [1] = sesi sebelumnya
        },
        violations: {
          orderBy: { detected_at: 'desc' },
          take: 5,
        },
      },
      orderBy: { updated_at: 'desc' },
    });

    const mapped = accounts.map((acc) => {
      const session   = acc.sessions[0]   ?? null;
      const livePerf  = acc.performances[0] ?? null;
      const prevPerf  = acc.performances[1] ?? null;

      const sessionStatus = session ? String(session.status) : 'KOSONG';
      const isExpired     = sessionStatus === 'EXPIRED';
      const isLive        = sessionStatus === 'LIVE';

      // Hitung omzet delta vs sesi sebelumnya
      const omzetNow  = Number(livePerf?.omzet_live   ?? 0);
      const omzetPrev = Number(prevPerf?.omzet_live   ?? 0);
      let omzetDelta  = '';
      if (omzetPrev > 0 && omzetNow > 0) {
        const pct = Math.round(((omzetNow - omzetPrev) / omzetPrev) * 100);
        omzetDelta = pct >= 0 ? `+${pct}%` : `${pct}%`;
      }

      const bankLabel = acc.member?.bank_name
        ? `${acc.member.bank_name} - ${String(acc.member.bank_account_number ?? '').slice(0, 6)}xxx`
        : '-';

      return {
        id:            acc.id,
        shortId:       acc.id.substring(0, 8).toUpperCase(),
        statusLive:    sessionStatus,
        isExpired,
        isLive,
        health:        String(acc.health_status),
        health_score:  session?.health_score ?? 0,
        sessionTotal:  acc.total_sessions,
        violations:    acc.violations.map((v) => v.description ?? v.violation_type),
        namaToko:      acc.shopee_shop_name,
        username:      acc.shopee_username,
        studioName:    acc.studio?.name ?? '-',
        judulLive:     livePerf?.live_title ?? '-',
        omzetLive:     omzetNow > 0 ? `Rp ${omzetNow.toLocaleString('id-ID')}` : 'Rp 0',
        omzetJam:      '-', // Belum ada kolom durasi di schema
        omzetSebelum:  omzetPrev > 0
          ? `Rp ${omzetPrev.toLocaleString('id-ID')}${omzetDelta ? ` (${omzetDelta})` : ''}`
          : '-',
        viewers:       livePerf?.viewers       ?? 0,
        buyers:        livePerf?.buyers        ?? 0,
        omzetKomisi:   Number(livePerf?.omzet_komisi ?? 0) > 0
          ? `Rp ${Number(livePerf.omzet_komisi).toLocaleString('id-ID')}`
          : 'Rp 0',
        bank:          bankLabel,
        lastUpdate:    session?.last_sync_at ?? acc.updated_at,
        session_id:    session?.id ?? null,
      };
    });

    // Urutkan: EXPIRED dulu, lalu LIVE, lalu OFFLINE
    mapped.sort((a, b) => {
      const order = { EXPIRED: 0, LIVE: 1, OFFLINE: 2, KOSONG: 3 };
      return (order[a.statusLive] ?? 9) - (order[b.statusLive] ?? 9);
    });

    res.json(mapped);
  } catch (error) {
    console.error('[Cookies] GET /status error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
