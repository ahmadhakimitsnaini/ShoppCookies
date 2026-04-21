import express from 'express';
import prisma from '../db.js';

const router = express.Router();

/**
 * GET /api/studios
 * Mengambil daftar Studio yang ada beserta akun Shopee yang berjalan di dalamnya
 */
router.get('/', async (req, res) => {
  try {
    const studios = await prisma.studio.findMany({
      include: {
        shopee_accounts: {
          include: {
            sessions: {
              where: {
                status: 'LIVE',
              },
            },
          },
        },
      },
    });

    // Transformasi data agar sesuai dengan format yang biasa dipakai di frontend
    const formattedStudios = studios.map((studio) => ({
      id: studio.id,
      name: studio.name,
      status: studio.status,
      activeAccountsCount: studio.shopee_accounts.filter(a => a.status === 'ACTIVE').length,
      // Aggregasi live sessions
      totalLiveSessions: studio.shopee_accounts.reduce((sum, account) => {
        return sum + account.sessions.length;
      }, 0),
      createdAt: studio.created_at,
    }));

    res.status(200).json({ data: formattedStudios });
  } catch (error) {
    console.error('Error fetching studios:', error);
    res.status(500).json({ error: 'Gagal mengambil data studio.' });
  }
});

/**
 * POST /api/studios
 * Endpoint untuk membuat studio baru
 */
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Nama studio wajib diisi.' });

    const newStudio = await prisma.studio.create({
      data: {
        name,
        status: 'ACTIVE',
      },
    });
    res.status(201).json({ data: newStudio, message: 'Studio berhasil dibuat.' });
  } catch (error) {
    console.error('Error creating studio:', error);
    res.status(500).json({ error: 'Gagal membuat studio.' });
  }
});

export default router;
