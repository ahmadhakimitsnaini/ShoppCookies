import express from 'express';
import prisma from '../db.js';

const router = express.Router();

// GET: Cari Akun Shopee berdasarkan Username
router.get('/search', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ error: 'Parameter username diperlukan.' });
    }

    const accounts = await prisma.shopeeAccount.findMany({
      where: {
        shopee_username: {
          contains: username,
          mode: 'insensitive'
        }
      },
      include: {
        member: true,
        studio: true,
        sessions: {
          where: { status: 'LIVE' },
          take: 1
        }
      }
    });

    res.json(accounts);
  } catch (error) {
    console.error('Error search accounts:', error);
    res.status(500).json({ error: 'Gagal mencari akun.' });
  }
});

// POST: Hubungkan Cookie dengan ShopeeAccount dan Sematkan Studio
router.post('/link', async (req, res) => {
  try {
    const { account_id, studio_id, raw_cookie } = req.body;
    if (!account_id || !studio_id || !raw_cookie) {
      return res.status(400).json({ error: 'Gagal! ID Akun, Studio, dan Raw Cookie wajib diisi seluruhnya.' });
    }

    // 1. Update shopee account untuk ditugaskan ke Studio tertentu
    await prisma.shopeeAccount.update({
      where: { id: account_id },
      data: { studio_id: studio_id }
    });

    // 2. Cek apakah sesi sudah ada sblumnya
    const existingSession = await prisma.shopeeSession.findFirst({
      where: { account_id: account_id }
    });

    if (existingSession) {
      // Overwrite raw cookie dan revive!
      await prisma.shopeeSession.update({
        where: { id: existingSession.id },
        data: {
          raw_cookie_encrypted: raw_cookie,
          status: 'LIVE',
          expired_at: null,
          user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)"
        }
      });
    } else {
      // Buat baru
      await prisma.shopeeSession.create({
        data: {
          account_id: account_id,
          raw_cookie_encrypted: raw_cookie,
          user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)",
          status: 'LIVE'
        }
      });
    }

    res.json({ success: true, message: 'Sesi Cookie diaktifkan dan Akun dipatenkan ke Studio!' });
  } catch (error) {
    console.error('Error melink cookie:', error);
    res.status(500).json({ error: 'Gagal mengeratkan sistem cookies akibat internal error.' });
  }
});

export default router;
