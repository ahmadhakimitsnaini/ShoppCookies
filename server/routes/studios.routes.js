import express from 'express';
import prisma from '../db.js';

const router = express.Router();

/**
 * RESOLVER CERDAS: Mencari Studio ID asli dari berbagai jenis input.
 * Mendukung: UUID lengkap, Nama Studio, Potongan ID Studio, Potongan ID Akun Shopee.
 */
async function resolveStudioId(id) {
  // 1. Cek apakah UUID lengkap → langsung pakai
  const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
  if (isUuid) {
    // Pastikan UUID ini adalah Studio (bukan Akun)
    const studio = await prisma.studio.findUnique({ where: { id }, select: { id: true } });
    if (studio) return studio.id;

    // Mungkin ini adalah UUID Akun Shopee → ambil studio_id-nya
    const account = await prisma.shopeeAccount.findUnique({ where: { id }, select: { studio_id: true } });
    if (account?.studio_id) return account.studio_id;

    return null;
  }

  // 2. Cek apakah Nama Studio
  const studioByName = await prisma.studio.findUnique({ where: { name: id } });
  if (studioByName) return studioByName.id;

  // 3. Cek apakah Potongan ID (8+ karakter hexa) dari Studio atau Akun
  if (id.length >= 8) {
    // Cari di tabel Studio
    const allStudios = await prisma.studio.findMany({ select: { id: true } });
    const studioMatch = allStudios.find(s => s.id.toLowerCase().startsWith(id.toLowerCase()));
    if (studioMatch) return studioMatch.id;

    // Cari di tabel Akun Shopee
    const allAccounts = await prisma.shopeeAccount.findMany({ select: { id: true, studio_id: true } });
    const accMatch = allAccounts.find(a => a.id.toLowerCase().startsWith(id.toLowerCase()));
    if (accMatch?.studio_id) return accMatch.studio_id;
  }

  return null;
}

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

/**
 * PATCH /api/studios/:id/share
 * Endpoint untuk mengubah status "Share ON/OFF" pada spesifik Studio
 */
router.patch('/:id/share', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_share_on } = req.body;

    if (typeof is_share_on !== 'boolean') {
      return res.status(400).json({ error: 'Nilai is_share_on wajib bertipe boolean.' });
    }

    const updatedStudio = await prisma.studio.update({
      where: { id },
      data: {
        is_share_on,
      },
    });

    res.status(200).json({ data: updatedStudio, message: 'Status Sinkronisasi Share Berhasil Diubah.' });
  } catch (error) {
    console.error('Error updating studio share status:', error);
    res.status(500).json({ error: 'Gagal memperbarui status share studio.' });
  }
});

export default router;

/**
 * GET /api/studios/:id/details
 * Menarik seluruh data bersarang (Accounts -> Sessions -> Performances) untuk halaman DetailStudio.jsx
 */
router.get('/:id/details', async (req, res) => {
  try {
    const { id } = req.params;
    const accounts = await prisma.shopeeAccount.findMany({
      where: { studio_id: id },
      include: {
        sessions: {
          orderBy: { updated_at: 'desc' },
          take: 1
        },
        performances: {
          orderBy: { recorded_at: 'desc' },
          take: 2 // Ambil 2 terakhir untuk pembandingan "Live Terkini" vs "Sesi Sebelumnya"
        }
      }
    });

    const mappedAccounts = accounts.map(acc => {
      const session = acc.sessions[0];
      const livePerf = acc.performances[0] || {};
      const prevPerf = acc.performances[1] || {};

      return {
        id: acc.id.substring(0, 8).toUpperCase(),
        studio_id: acc.studio_id || id, // ID Studio asli untuk navigasi produk
        status: {
           isLive: session ? session.status === 'LIVE' : false,
           etalaseCount: Math.floor(Math.random() * 200) + 50, // Simulasi metrik yg blm ada di db
           health: { 
             sessions: acc.total_sessions,
             pel: acc.health_status === 'CRITICAL' ? 1 : 0,
             value: session ? session.health_score : 0,
             warning: acc.health_status === 'WARNING' ? 'Sistem mendeteksi pelambatan trafik' : null
           }
        },
        namaToko: acc.shopee_shop_name,
        judulLive: livePerf.live_title || "Menunggu host memulai siaran...",
        omzetLive: {
           omzet: typeof livePerf.omzet_live !== 'undefined' ? `Rp ${Number(livePerf.omzet_live).toLocaleString('id-ID')}` : '-',
           jam: "02:15",
           rasio: typeof livePerf.omzet_live !== 'undefined' ? `Rp ${Math.floor(Number(livePerf.omzet_live) / 2.25).toLocaleString('id-ID')}/j` : '-'
        },
        omzetSeb: {
           omzet: typeof prevPerf.omzet_live !== 'undefined' ? `Rp ${Number(prevPerf.omzet_live).toLocaleString('id-ID')}` : '-',
           jam: "04:00",
           rasio: "-"
        },
        penonton: livePerf.viewers || 0,
        pembeli: livePerf.buyers || 0,
        komisi: typeof livePerf.omzet_komisi !== 'undefined' ? `Rp ${Number(livePerf.omzet_komisi).toLocaleString('id-ID')}` : '-',
        bank: "Mandiri", // Anggap data statis UI kl ga ada relasinya
        isVerif: acc.status === 'ACTIVE',
        kategori: "KATEGORI REGULER"
      };
    });

    res.json(mappedAccounts);
  } catch (error) {
    console.error('Error fetching detail studio accounts:', error);
    res.status(500).json({ error: 'Gagal mereload detail dari database.' });
  }
});

// ==========================================
// RUTE MANAJEMEN PRODUK STUDIO (PHASE 10)
// ==========================================

/**
 * GET /api/studios/:id/products
 * Menarik list URL produk milik suatu studio, berurutan.
 */
router.get('/:id/products', async (req, res) => {
  const { id } = req.params;
  
  try {
    const studioId = await resolveStudioId(id);
    if (!studioId) {
      return res.status(404).json({ error: `Studio dengan identitas '${id}' tidak ditemukan di database.` });
    }

    const products = await prisma.studioProduct.findMany({
      where: { studio_id: studioId },
      orderBy: { order_index: 'asc' }
    });
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil produk studio.' });
  }
});

/**
 * POST /api/studios/:id/products
 * Menyimpan tautan produk baru
 */
router.post('/:id/products', async (req, res) => {
  const { id } = req.params;
  
  try {
    const studioId = await resolveStudioId(id);
    if (!studioId) return res.status(404).json({ error: `Studio dengan identitas '${id}' tidak ditemukan.` });

    const { product_url, product_name } = req.body;
    
    // Hitung index terakhir biar auto nambah di ekor
    const lastProduct = await prisma.studioProduct.findFirst({
      where: { studio_id: studioId },
      orderBy: { order_index: 'desc' }
    });
    const newIndex = lastProduct ? lastProduct.order_index + 1 : 1;

    const baru = await prisma.studioProduct.create({
      data: {
        studio_id: studioId,
        product_url,
        product_name: product_name || null,
        order_index: newIndex
      }
    });

    res.status(201).json(baru);
  } catch (err) {
    console.error('SERVER ERROR PRODUCT CREATE:', err);
    res.status(500).json({ error: `Gagal menyimpan tautan baru: ${err.message}` });
  }
});

/**
 * POST /api/studios/:id/products/bulk
 * Menyimpan banyak tautan sekaligus
 */
router.post('/:id/products/bulk', async (req, res) => {
  const { id } = req.params;
  
  try {
    const studioId = await resolveStudioId(id);
    if (!studioId) return res.status(404).json({ error: `Studio dengan identitas '${id}' tidak ditemukan.` });

    const { product_urls } = req.body; // Array of strings
    if (!product_urls || !Array.isArray(product_urls)) {
      return res.status(400).json({ error: 'Format data tidak valid, butuh array link.' });
    }

    // Hitung index terakhir
    const lastProduct = await prisma.studioProduct.findFirst({
      where: { studio_id: studioId },
      orderBy: { order_index: 'desc' }
    });
    let nextIndex = lastProduct ? lastProduct.order_index + 1 : 1;

    // Siapkan data untuk createMany
    const dataToCreate = product_urls.map((url, i) => ({
      studio_id: studioId,
      product_url: url,
      product_name: null,
      order_index: nextIndex + i
    }));

    const result = await prisma.studioProduct.createMany({
      data: dataToCreate
    });

    res.status(201).json({ count: result.count, message: 'Berhasil mengimpor link massal!' });
  } catch (err) {
    console.error('BULK IMPORT ERROR:', err);
    res.status(500).json({ error: 'Gagal melakukan import massal.' });
  }
});

/**
 * DELETE /api/studios/:id/products/:productId
 */
router.delete('/:id/products/:productId', async (req, res) => {
  try {
    await prisma.studioProduct.delete({
      where: { id: req.params.productId }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus tautan.' });
  }
});

/**
 * GET /api/studios/:id/live-etalase
 */
router.get('/:id/live-etalase', async (req, res) => {
  try {
    const mockEtalase = [
      {
        id: 1,
        image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=100&q=80",
        name: "PROMO 5.5 KELFI SETELAN / SET BAJU ANAK CEWEK BORDIR",
        url: "https://shopee.co.id/product/163001621/14931759796",
        kom: 2,
        stok: 591,
        keranjang: 13,
        klik: 18,
        terjual: 0,
        harga: 28600,
        bintang: 4.9
      },
      {
        id: 2,
        image: "https://images.unsplash.com/photo-1539109132305-3c11375d4a6c?w=100&q=80",
        name: "ROK PLISKET KANCING ANAK PEREMPUAN 4-14 TAHUN",
        url: "https://shopee.co.id/product/293075991/7278750492",
        kom: 1,
        stok: 137291,
        keranjang: 2,
        klik: 10,
        terjual: 0,
        harga: 25000,
        bintang: 4.7
      },
      {
        id: 3,
        image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=100&q=80",
        name: "BabyToys Mainan Ring Donat Susun Putar Anak Bayi Jumbo",
        url: "https://shopee.co.id/product/346014230/43072757889",
        kom: 6,
        stok: 124844,
        keranjang: 4,
        klik: 10,
        terjual: 0,
        harga: 36990,
        bintang: 4.9
      }
    ];
    res.json(mockEtalase);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data etalase live.' });
  }
});
