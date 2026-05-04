import express from 'express';
import prisma from '../db.js';
import { ShopeeBot } from '../services/bot/ShopeeBot.js';
import { sendTreatmentCompleteAlert, sendTreatmentFailedAlert } from '../services/telegram/NotificationService.js';

const router = express.Router();

// ============================================================
// GET /api/treatment/accounts
// Daftar akun untuk panel treatment (dengan info last_treatment)
// CATATAN: Filter task_type dilakukan di JS karena Prisma v7 + 
// PG Adapter menolak string literal untuk kolom enum.
// ============================================================
router.get('/accounts', async (req, res) => {
  try {
    const rawAccounts = await prisma.shopeeAccount.findMany({
      include: {
        studio: true,
        sessions: {
          orderBy: { updated_at: 'desc' },
          take: 1
        },
        // Ambil semua tasks lalu filter di JS (hindari enum Prisma issue)
        bot_tasks: {
          orderBy: { created_at: 'desc' },
          take: 10
        }
      },
      orderBy: { updated_at: 'desc' }
    });

    const mapped = rawAccounts.map(acc => {
      let statusString = 'AMAN';
      if (acc.health_status === 'WARNING') statusString = 'PERLU PERHATIAN';
      if (acc.health_status === 'CRITICAL') statusString = 'KRITIS';

      const session = acc.sessions[0] ?? null;
      if (session?.status === 'EXPIRED') statusString = 'KRITIS';

      // Filter task AUTO_TREATMENT di JavaScript
      const treatmentTasks = (acc.bot_tasks ?? []).filter(
        t => String(t.task_type) === 'AUTO_TREATMENT'
      );
      const lastTask = treatmentTasks[0] ?? null;

      return {
        id:            acc.id.substring(0, 8),
        full_id:       acc.id,
        username:      acc.shopee_username,
        namaToko:      acc.shopee_shop_name,
        studioName:    acc.studio?.name ?? 'Belum Ditugaskan',
        status:        statusString,
        health_score:  session?.health_score ?? 0,
        is_live:       session?.status === 'LIVE',
        last_treatment: lastTask ? {
          status:     String(lastTask.status),
          created_at: lastTask.created_at,
        } : null,
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching treatment accounts:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST /api/treatment/start/:accountId
// Jalankan treatment MANUAL dari dashboard untuk satu akun
// ============================================================
router.post('/start/:accountId', async (req, res) => {
  const { accountId } = req.params;

  try {
    const account = await prisma.shopeeAccount.findUnique({
      where: { id: accountId },
      include: {
        sessions: {
          orderBy: { created_at: 'desc' },
          take: 1
        }
      }
    });

    if (!account)
      return res.status(404).json({ error: 'Akun tidak ditemukan.' });

    const session = account.sessions[0];
    if (!session)
      return res.status(400).json({ error: 'Akun tidak memiliki sesi/cookies aktif.' });
    if (String(session.status) === 'LIVE')
      return res.status(400).json({ error: 'Akun sedang LIVE, treatment tidak bisa dijalankan.' });
    if (String(session.status) === 'EXPIRED')
      return res.status(400).json({ error: 'Cookies akun sudah expired. Perbarui cookies terlebih dahulu.' });

    // Buat record task — gunakan string 'AUTO_TREATMENT' sesuai enum schema
    const task = await prisma.botTask.create({
      data: {
        account_id: account.id,
        task_type:  'AUTO_TREATMENT',
        status:     'PROCESSING',
      }
    });

    // Jalankan bot treatment secara non-blocking
    const bot = new ShopeeBot();
        bot.performTreatment({ ...session, account }, null)
          .then(async (result) => {
            await prisma.botTask.update({
              where: { id: task.id },
              data: {
                status:      result.success ? 'COMPLETED' : 'FAILED',
                finished_at: new Date(),
                payload:     { logs: result.logs, duration_ms: result.duration_ms }
              }
            });

            // KIRIM NOTIFIKASI TELEGRAM
            if (result.success) {
              await sendTreatmentCompleteAlert(account, result.duration_ms);
            } else {
              await sendTreatmentFailedAlert(account, result.error);
            }

            console.log(`[Treatment] ✅ Selesai @${account.shopee_username}: ${result.success ? 'Sukses' : 'Gagal'}`);
          })
          .catch(async (err) => {
            await prisma.botTask.update({
              where: { id: task.id },
              data: { status: 'FAILED', payload: { error: err.message } }
            });
            // Notifikasi Gagal
            await sendTreatmentFailedAlert(account, err.message);
          });

    res.json({
      success: true,
      message: `Treatment untuk @${account.shopee_username} dimulai di background (10-15 menit).`,
      task_id: task.id,
    });
  } catch (error) {
    console.error('[Treatment] /start error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /api/treatment/logs/:accountId
// Riwayat 20 treatment terakhir untuk satu akun
// ============================================================
router.get('/logs/:accountId', async (req, res) => {
  try {
    // Ambil semua task lalu filter AUTO_TREATMENT di JS
    const allTasks = await prisma.botTask.findMany({
      where: { account_id: req.params.accountId },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
    const logs = allTasks.filter(t => String(t.task_type) === 'AUTO_TREATMENT').slice(0, 20);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /api/treatment/active-live
// Daftar semua akun dengan sesi LIVE aktif, beserta komparasi
// omzet Live Terkini vs Sesi Sebelumnya.
// Digunakan oleh halaman TreatmentManual.jsx
// ============================================================
router.get('/active-live', async (req, res) => {
  try {
    const accounts = await prisma.shopeeAccount.findMany({
      where: {
        deleted_at: null,
        sessions: { some: { status: 'LIVE' } },
      },
      include: {
        member: { select: { bank_name: true } },
        sessions: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
        performances: {
          orderBy: { recorded_at: 'desc' },
          take: 2, // [0] live terkini, [1] sesi sebelumnya
        },
      },
      orderBy: { updated_at: 'desc' },
    });

    const mapped = accounts.map((acc) => {
      const session  = acc.sessions[0]    ?? null;
      const livePerf = acc.performances[0] ?? null;
      const prevPerf = acc.performances[1] ?? null;

      return {
        id:          acc.id,
        shortId:     acc.id.substring(0, 8).toUpperCase(),
        session_id:  session?.id ?? null,
        status:      session ? String(session.status) : 'OFFLINE',
        stateColor:  session?.status === 'LIVE' ? 'green' : 'gray',
        namaToko:    acc.shopee_shop_name,
        username:    acc.shopee_username,
        judulLive:   livePerf?.live_title ?? '-',
        // Live terkini
        omzet:       Number(livePerf?.omzet_live   ?? 0) > 0
          ? `Rp ${Number(livePerf.omzet_live).toLocaleString('id-ID')}`
          : '-',
        omzetJam:    '-', // kolom durasi belum ada di schema
        // Sesi sebelumnya
        omzetSeb:    Number(prevPerf?.omzet_live ?? 0) > 0
          ? `Rp ${Number(prevPerf.omzet_live).toLocaleString('id-ID')}`
          : '-',
        omzetJamSeb: '-',
        viewers:     livePerf?.viewers ?? 0,
        buyers:      livePerf?.buyers  ?? 0,
        komisi:      Number(livePerf?.omzet_komisi ?? 0) > 0
          ? `Rp ${Number(livePerf.omzet_komisi).toLocaleString('id-ID')}`
          : '-',
        bank:        acc.member?.bank_name ?? '-',
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error('[Treatment] /active-live error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST /api/treatment/stop/:sessionId
// Menghentikan sesi Live secara manual (membuat BotTask STOP_LIVE)
// ============================================================
router.post('/stop/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  try {
    const session = await prisma.shopeeSession.findUnique({
      where: { id: sessionId },
      include: { account: true },
    });
    if (!session) return res.status(404).json({ error: 'Sesi tidak ditemukan.' });
    if (String(session.status) !== 'LIVE') {
      return res.status(400).json({ error: 'Sesi ini tidak dalam status LIVE.' });
    }

    // Buat task STOP_LIVE
    const task = await prisma.botTask.create({
      data: {
        account_id: session.account_id,
        task_type:  'STOP_LIVE',
        status:     'PENDING',
        payload:    { session_id: sessionId, triggered_by: 'manual_ui' },
      },
    });

    // Ubah status sesi langsung ke OFFLINE sebagai efek segera
    await prisma.shopeeSession.update({
      where: { id: sessionId },
      data:  { status: 'OFFLINE', last_sync_at: new Date() },
    });

    res.json({
      success:  true,
      task_id:  task.id,
      message:  `Sesi @${session.account?.shopee_username} telah dihentikan. Task bot STOP_LIVE dibuat.`,
    });
  } catch (error) {
    console.error('[Treatment] /stop error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /api/treatment/logs
// Mengambil riwayat aktivitas bot (BotTask) dengan pagination
// ============================================================
router.get('/logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, status, task_type } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where = {};
    if (status) where.status = status;
    if (task_type) where.task_type = task_type;

    const [total, tasks] = await Promise.all([
      prisma.botTask.count({ where }),
      prisma.botTask.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        include: {
          account: {
            select: {
              shopee_username: true,
              shopee_shop_name: true,
              studio: { select: { name: true } }
            }
          }
        }
      })
    ]);

    res.json({
      data: tasks,
      meta: {
        total,
        page: Number(page),
        limit: take,
        total_pages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('[Treatment] /logs error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
