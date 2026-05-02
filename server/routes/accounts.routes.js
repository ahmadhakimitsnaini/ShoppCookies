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


// ============================================================
// GET /api/accounts/:id/products
// Ambil daftar produk dari Brankas Mandiri akun ini
// ============================================================
router.get('/:id/products', async (req, res) => {
  try {
    const account = await prisma.shopeeAccount.findUnique({
      where: { id: req.params.id },
      select: { id: true, use_custom_vault: true, studio_id: true }
    });
    if (!account) return res.status(404).json({ error: 'Akun tidak ditemukan.' });

    const products = await prisma.studioProduct.findMany({
      where: { account_id: req.params.id },
      orderBy: { order_index: 'asc' }
    });

    res.json({ use_custom_vault: account.use_custom_vault, products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST /api/accounts/:id/products
// Tambah produk ke Brankas Mandiri akun ini
// ============================================================
router.post('/:id/products', async (req, res) => {
  try {
    const account = await prisma.shopeeAccount.findUnique({
      where: { id: req.params.id },
      select: { id: true, studio_id: true }
    });

    if (!account) {
      return res.status(404).json({ error: 'Akun tidak ditemukan.' });
    }

    const { product_url, product_name } = req.body;
    if (!product_url) return res.status(400).json({ error: 'product_url wajib diisi.' });

    // Jika akun belum assign ke studio, fallback: ambil studio_id dari produk yang sudah ada di akun ini
    // atau langsung tolak jika sama sekali tidak ada studio_id
    let studioId = account.studio_id;
    if (!studioId) {
      // Coba ambil studio_id dari produk yang sudah ada milik akun ini
      const existingProduct = await prisma.studioProduct.findFirst({
        where: { account_id: req.params.id },
        select: { studio_id: true }
      });
      studioId = existingProduct?.studio_id ?? null;
    }

    if (!studioId) {
      return res.status(400).json({ error: 'Akun belum terhubung ke Studio manapun. Hubungkan akun ke Studio terlebih dahulu.' });
    }

    const lastProduct = await prisma.studioProduct.findFirst({
      where: { account_id: req.params.id },
      orderBy: { order_index: 'desc' },
      select: { order_index: true }
    });

    const product = await prisma.studioProduct.create({
      data: {
        studio_id:    studioId,
        account_id:   req.params.id,
        product_url:  product_url.trim(),
        product_name: product_name?.trim() || null,
        order_index:  (lastProduct?.order_index ?? -1) + 1,
      }
    });

    res.status(201).json({ success: true, product });
  } catch (error) {
    console.error('[Accounts] POST /:id/products error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// DELETE /api/accounts/:id/products/:productId
// Hapus produk dari Brankas Mandiri akun ini
// ============================================================
router.delete('/:id/products/:productId', async (req, res) => {
  try {
    await prisma.studioProduct.delete({
      where: { id: req.params.productId }
    });
    res.json({ success: true, message: 'Produk berhasil dihapus dari Brankas Mandiri.' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Produk tidak ditemukan.' });
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PATCH /api/accounts/:id/toggle-vault
// Hidupkan/matikan sakelar Brankas Mandiri
// ============================================================
router.patch('/:id/toggle-vault', async (req, res) => {
  try {
    const account = await prisma.shopeeAccount.findUnique({
      where: { id: req.params.id },
      select: { use_custom_vault: true }
    });
    if (!account) return res.status(404).json({ error: 'Akun tidak ditemukan.' });

    const updated = await prisma.shopeeAccount.update({
      where: { id: req.params.id },
      data:  { use_custom_vault: !account.use_custom_vault }
    });

    res.json({
      success: true,
      use_custom_vault: updated.use_custom_vault,
      message: updated.use_custom_vault
        ? '✅ Brankas Mandiri AKTIF. Bot akan menggunakan produk khusus akun ini.'
        : '↩️  Brankas Mandiri NONAKTIF. Bot kembali menggunakan Brankas Studio.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PATCH /api/accounts/:id/toggle-live
// Paksa ubah status sesi terbaru: LIVE ↔ ACTIVE (Manual Override)
// ============================================================
router.patch('/:id/toggle-live', async (req, res) => {
  try {
    // Cari sesi terbaru milik akun ini yang masih aktif (bukan EXPIRED)
    const session = await prisma.shopeeSession.findFirst({
      where: {
        account_id: req.params.id,
        status: { notIn: ['EXPIRED'] }
      },
      orderBy: { created_at: 'desc' }
    });

    if (!session) {
      return res.status(404).json({ error: 'Tidak ada sesi aktif untuk akun ini. Masukkan cookies terlebih dahulu.' });
    }

    const isCurrentlyLive = session.status === 'LIVE';
    const newStatus = isCurrentlyLive ? 'OFFLINE' : 'LIVE';

    await prisma.shopeeSession.update({
      where: { id: session.id },
      data: { status: newStatus, last_sync_at: new Date() }
    });

    res.json({
      success: true,
      isLive: !isCurrentlyLive,
      status: newStatus,
      message: !isCurrentlyLive
        ? '🔴 Bot Live diaktifkan! Polling Omzet akan dimulai dalam ≤5 menit.'
        : '⏹️ Sesi Live dihentikan. Bot kembali ke mode Siaga (Auto-Radar tetap berjalan).'
    });
  } catch (error) {
    console.error('[Accounts] PATCH /:id/toggle-live error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

