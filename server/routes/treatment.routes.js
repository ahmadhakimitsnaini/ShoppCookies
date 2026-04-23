import express from 'express';
import prisma from '../db.js';

const router = express.Router();

// GET /api/treatment/accounts
// Mengembalikan daftar akun yang masuk ke sistem automasi treatment.
router.get('/accounts', async (req, res) => {
  try {
    const rawAccounts = await prisma.shopeeAccount.findMany({
      include: {
        studio: true,
        sessions: {
          orderBy: { updated_at: 'desc' },
          take: 1
        }
      },
      orderBy: { updated_at: 'desc' }
    });

    // Map Prisma models to the exact format needed by Front-End
    const mapped = rawAccounts.map(acc => {
      let statusString = 'AMAN';
      if (acc.health_status === 'WARNING') statusString = 'PERLU PERHATIAN';
      if (acc.health_status === 'CRITICAL') statusString = 'KRITIS';
      
      const session = acc.sessions.length > 0 ? acc.sessions[0] : null;
      if (session && session.status === 'EXPIRED') statusString = 'KRITIS';

      return {
        id: acc.id.substring(0, 8),
        username: acc.shopee_username,
        namaToko: acc.shopee_shop_name,
        studioName: acc.studio ? acc.studio.name : 'Belum Ditugaskan',
        status: statusString,
        health_score: session ? session.health_score : 0
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching treatment accounts:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
