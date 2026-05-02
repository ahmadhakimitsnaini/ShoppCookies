import express from 'express';
import prisma from '../db.js';

const router = express.Router();

/**
 * GET /api/search?q=...
 * Global search: mencari di Studio, ShopeeAccount (Toko), dan Member.
 * Mengembalikan maks 5 hasil per kategori.
 */
router.get('/', async (req, res) => {
  try {
    const q = (req.query.q ?? '').trim();
    if (!q || q.length < 2) {
      return res.json({ studios: [], accounts: [], members: [] });
    }

    const [studios, accounts, members] = await Promise.all([
      // Cari Studio berdasarkan nama
      prisma.studio.findMany({
        where: {
          name: { contains: q, mode: 'insensitive' },
        },
        select: { id: true, name: true, status: true },
        take: 5,
      }),

      // Cari ShopeeAccount berdasarkan username atau nama toko
      prisma.shopeeAccount.findMany({
        where: {
          deleted_at: null,
          OR: [
            { shopee_username:  { contains: q, mode: 'insensitive' } },
            { shopee_shop_name: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          shopee_username:  true,
          shopee_shop_name: true,
          status:           true,
          studio: { select: { id: true, name: true } },
        },
        take: 5,
      }),

      // Cari Member berdasarkan nama, username studio, atau nomor HP
      prisma.member.findMany({
        where: {
          deleted_at: null,
          OR: [
            { name:            { contains: q, mode: 'insensitive' } },
            { username_studio: { contains: q, mode: 'insensitive' } },
            { phone:           { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          phone: true,
          username_studio: true,
        },
        take: 5,
      }),
    ]);

    res.json({
      studios:  studios.map((s) => ({
        type:   'studio',
        id:     s.id,
        title:  s.name,
        sub:    String(s.status),
        url:    `/list-studio/${s.id}`,
      })),
      accounts: accounts.map((a) => ({
        type:   'account',
        id:     a.id,
        title:  a.shopee_shop_name,
        sub:    `@${a.shopee_username} · ${a.studio?.name ?? 'Belum di-studio'}`,
        url:    `/input-member`,
      })),
      members:  members.map((m) => ({
        type:   'member',
        id:     m.id,
        title:  m.name,
        sub:    m.phone,
        url:    `/input-member`,
      })),
    });
  } catch (error) {
    console.error('[Search] error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
