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
        status: 'LIVE'
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

export default router;
