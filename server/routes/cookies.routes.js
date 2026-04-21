import express from 'express';
import prisma from '../db.js';

const router = express.Router();

/**
 * POST /api/cookies
 * Menyimpan Cookie rekaman dari ekstensi/UI Frontend
 */
router.post('/', async (req, res) => {
  try {
    const { account_id, raw_cookie_encrypted, user_agent } = req.body;

    if (!account_id || !raw_cookie_encrypted) {
      return res.status(400).json({ error: 'account_id dan raw_cookie_encrypted wajib dikirim!' });
    }

    // Buat session baru (upsert atau insert standar sesuai kebutuhan)
    const newSession = await prisma.shopeeSession.create({
      data: {
        account_id,
        raw_cookie_encrypted,
        user_agent: user_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        status: 'LIVE',
        health_score: 100,
      },
    });

    res.status(201).json({
      message: 'Cookie berhasil disimpan ke dalam sesi aktif.',
      data: newSession,
    });
  } catch (error) {
    console.error('Error saving cookie:', error);
    res.status(500).json({ error: 'Terjadi kesalahan sistem saat menyimpan cookie.' });
  }
});

/**
 * GET /api/cookies/sessions
 * Mengambil daftar sesi live yang sehat (sebagai contoh API view)
 */
router.get('/sessions', async (req, res) => {
  try {
    const sessions = await prisma.shopeeSession.findMany({
      where: {
        status: 'LIVE',
      },
      include: {
        account: {
          select: {
            shopee_username: true,
            shopee_shop_name: true,
            health_status: true,
            member: { select: { name: true, phone: true } },
            studio: { select: { name: true } }
          }
        }
      },
      orderBy: { last_sync_at: 'desc' }
    });

    res.status(200).json({ data: sessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Gagal mendapatkan data sesi cookie.' });
  }
});

export default router;
