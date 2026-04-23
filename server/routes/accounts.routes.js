import express from 'express';
import prisma from '../db.js';

const router = express.Router();

// ============================================================
// GET /api/accounts/member/:memberId
// Ambil semua akun Shopee milik satu member
// ============================================================
router.get('/member/:memberId', async (req, res) => {
  try {
    const accounts = await prisma.shopeeAccount.findMany({
      where: {
        member_id:  req.params.memberId,
        deleted_at: null,
      },
      include: {
        studio:   { select: { id: true, name: true } },
        sessions: {
          orderBy: { created_at: 'desc' },
          take: 1,
          select: { status: true, last_sync_at: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const mapped = accounts.map(a => ({
      id:               a.id,
      shopee_username:  a.shopee_username,
      shopee_shop_name: a.shopee_shop_name,
      status:           String(a.status),
      health_status:    String(a.health_status),
      studio_name:      a.studio?.name ?? 'Belum ditugaskan',
      session_status:   a.sessions[0] ? String(a.sessions[0].status) : 'KOSONG',
      created_at:       a.created_at,
    }));

    res.json(mapped);
  } catch (error) {
    console.error('[Accounts] GET /member error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST /api/accounts
// Daftarkan akun Shopee baru untuk seorang member
// ============================================================
router.post('/', async (req, res) => {
  const { member_id, shopee_username, shopee_shop_name } = req.body;

  if (!member_id || !shopee_username || !shopee_shop_name) {
    return res.status(400).json({
      error: 'member_id, shopee_username, dan shopee_shop_name wajib diisi.'
    });
  }

  // Validasi: member harus ada
  try {
    const member = await prisma.member.findUnique({
      where: { id: member_id }
    });
    if (!member || member.deleted_at) {
      return res.status(404).json({ error: 'Member tidak ditemukan.' });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  try {
    const account = await prisma.shopeeAccount.create({
      data: {
        member_id,
        shopee_username:  shopee_username.trim().toLowerCase(),
        shopee_shop_name: shopee_shop_name.trim(),
      }
    });

    res.status(201).json({
      success: true,
      message: `Akun @${account.shopee_username} berhasil didaftarkan.`,
      data: account,
    });
  } catch (error) {
    // Tangani duplikasi username
    if (error.code === 'P2002') {
      return res.status(400).json({
        error: `Username @${shopee_username} sudah terdaftar di sistem.`
      });
    }
    console.error('[Accounts] POST error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// DELETE /api/accounts/:id
// Hapus (soft delete) akun Shopee
// ============================================================
router.delete('/:id', async (req, res) => {
  try {
    // Cek apakah ada sesi LIVE yang sedang berjalan
    const activeSessions = await prisma.shopeeSession.count({
      where: {
        account_id: req.params.id,
        status:     'LIVE',
      }
    });

    if (activeSessions > 0) {
      return res.status(400).json({
        error: 'Akun sedang LIVE. Hentikan sesi terlebih dahulu sebelum menghapus.'
      });
    }

    await prisma.shopeeAccount.update({
      where: { id: req.params.id },
      data:  { deleted_at: new Date() }
    });

    res.json({ success: true, message: 'Akun Shopee berhasil dihapus.' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Akun tidak ditemukan.' });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;
