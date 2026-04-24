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

/**
 * PATCH /api/studios/:id/telegram
 * Update konfigurasi bot Telegram per studio
 */
router.patch('/:id/telegram', async (req, res) => {
  try {
    const { id } = req.params;
    const { telegram_token, telegram_chat_id } = req.body;

    const updated = await prisma.studio.update({
      where: { id },
      data: {
        telegram_token,
        telegram_chat_id
      }
    });

    // Invalidasi cache bot di NotificationService
    const { invalidateStudioCache } = await import('../services/telegram/NotificationService.js');
    invalidateStudioCache(id);

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/studios/:id/test-telegram
 * Mengirim pesan percobaan ke Telegram studio
 */
router.post('/:id/test-telegram', async (req, res) => {
  try {
    const { id } = req.params;
    const { sendTestNotification } = await import('../services/telegram/NotificationService.js');
    
    const studio = await prisma.studio.findUnique({ where: { id } });
    const success = await sendTestNotification(id, studio.name);

    if (success) {
      res.json({ success: true, message: 'Pesan test terkirim!' });
    } else {
      res.status(400).json({ error: 'Gagal kirim pesan. Cek token dan chat ID Anda.' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/studios/:id/inject-products
 * Trigger manual Injeksi Produk Massal untuk studio dari Dashboard (Tanpa Telegram)
 */
router.post('/:id/inject-products', async (req, res) => {
  try {
    const { id } = req.params;
    const { clearEtalase } = req.body;
    
    // Import function dari ProductInjector
    const { runProductInjection } = await import('../services/bot/ProductInjector.js');
    
    // Karena injeksi memakan waktu lama, kita berikan response awal ke user,
    // lalu biarkan proses berjalan secara asinkron di background.
    res.json({ success: true, message: 'Proses injeksi produk massal telah dimulai di latar belakang. Silakan pantau keranjang Live di HP Anda.' });

    // Eksekusi asinkron tanpa ditunggu (fire and forget)
    runProductInjection(id, { clearEtalase: clearEtalase === true })
      .then(result => console.log(`[API] Injeksi Background Selesai:`, result))
      .catch(err => console.error(`[API] Injeksi Background Error:`, err));
      
  } catch (error) {
    console.error('Error trigger inject products:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/studios/:id/metrics
 * Mengambil agregasi finansial total untuk 1 studio (Kartu Metrik di DetailStudio)
 */
router.get('/:id/metrics', async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Pastikan studio ada
    const studio = await prisma.studio.findUnique({
      where: { id },
      select: { id: true, name: true }
    });
    if (!studio) return res.status(404).json({ error: 'Studio tidak ditemukan.' });

    // 2. Ambil semua ID akun di studio ini
    const accounts = await prisma.shopeeAccount.findMany({
      where: { studio_id: id, deleted_at: null },
      select: { id: true }
    });
    const accountIds = accounts.map(a => a.id);

    if (accountIds.length === 0) {
      return res.json({ omzetTotal: 0, komisiTotal: 0, divalidasi: 0, menungguDibayar: 0, terbayar: 0, activeAccounts: 0, totalAccounts: 0 });
    }

    // 3. Ambil semua data performa, lalu kelompokkan per session_id untuk mencari puncak per sesi
    //    PERBAIKAN BUG: Sebelumnya memakai SUM langsung → menyebabkan inflasi data karena
    //    polling setiap 5 menit membuat satu sesi menghasilkan banyak baris.
    //    Solusi: Ambil MAX(omzet_live) per sesi, baru jumlahkan antar sesi.
    const allRecords = await prisma.livePerformance.findMany({
      where: { account_id: { in: accountIds } },
      select: { session_id: true, omzet_live: true, omzet_komisi: true, recorded_at: true }
    });

    // Kelompokkan: { sessionId → { maxOmzet, maxKomisi } }
    const sessionPeak = {};
    allRecords.forEach(r => {
      const key = r.session_id ?? `no-session-${r.account_id}`;
      if (!sessionPeak[key]) sessionPeak[key] = { omzet: 0, komisi: 0, recorded_at: r.recorded_at };
      const o = Number(r.omzet_live   ?? 0);
      const k = Number(r.omzet_komisi ?? 0);
      if (o > sessionPeak[key].omzet)  sessionPeak[key].omzet  = o;
      if (k > sessionPeak[key].komisi) sessionPeak[key].komisi = k;
    });

    // Jumlahkan puncak dari semua sesi
    let omzetTotal  = 0;
    let komisiTotal = 0;
    Object.values(sessionPeak).forEach(s => {
      omzetTotal  += s.omzet;
      komisiTotal += s.komisi;
    });

    // 4. Hitung komisi bulan berjalan (dari sesi yang dicatat bulan ini)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    let komisiBulanIni = 0;
    Object.values(sessionPeak).forEach(s => {
      if (new Date(s.recorded_at) >= startOfMonth) {
        komisiBulanIni += s.komisi;
      }
    });

    // 5. Estimasi status pencairan
    const divalidasi      = Math.round(komisiBulanIni * 0.20);
    const menungguDibayar = Math.round(komisiBulanIni * 0.30);
    const terbayar        = komisiTotal - komisiBulanIni + Math.round(komisiBulanIni * 0.50);

    // 6. Hitung akun dengan sesi LIVE aktif
    const activeAccounts = await prisma.shopeeSession.count({
      where: { account_id: { in: accountIds }, status: 'LIVE' }
    });

    res.json({ omzetTotal, komisiTotal, divalidasi, menungguDibayar, terbayar, activeAccounts, totalAccounts: accountIds.length });
  } catch (error) {
    console.error('[Studios] /metrics error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/studios/:id/chart?days=30
 * Mengambil data historis omzet harian untuk grafik di DetailStudio
 */
router.get('/:id/chart', async (req, res) => {
  try {
    const { id } = req.params;
    const days = Math.min(parseInt(req.query.days) || 30, 90);

    // 1. Ambil semua ID akun di studio ini
    const accounts = await prisma.shopeeAccount.findMany({
      where: { studio_id: id, deleted_at: null },
      select: { id: true }
    });
    const accountIds = accounts.map(a => a.id);
    if (accountIds.length === 0) return res.json([]);

    // 2. Rentang waktu
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    since.setHours(0, 0, 0, 0);

    // 3. Ambil semua record dalam rentang (termasuk session_id, viewers, buyers)
    const records = await prisma.livePerformance.findMany({
      where: { account_id: { in: accountIds }, recorded_at: { gte: since } },
      select: { session_id: true, account_id: true, omzet_live: true, omzet_komisi: true, viewers: true, buyers: true, recorded_at: true },
      orderBy: { recorded_at: 'asc' }
    });

    // 4. Buat bucket harian kosong
    const dailyMap = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
      const key = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      dailyMap[key] = { date: key, omzet: 0, komisi: 0, viewers: 0, buyers: 0 };
    }

    // 5. Kelompokkan per (tanggal + session_id) → cari nilai puncak (MAX) per sesi
    //    Ini mencegah inflasi data akibat polling setiap 5 menit.
    const sessionDayPeak = {}; // key: 'dateKey|sessionId'
    records.forEach(r => {
      const dateKey   = new Date(r.recorded_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      const sessionKey = r.session_id ?? `no-session-${r.account_id}`;
      const mapKey     = `${dateKey}|${sessionKey}`;

      if (!sessionDayPeak[mapKey]) {
        sessionDayPeak[mapKey] = { dateKey, omzet: 0, komisi: 0, viewers: 0, buyers: 0 };
      }
      const p = sessionDayPeak[mapKey];
      const o = Number(r.omzet_live   ?? 0);
      const k = Number(r.omzet_komisi ?? 0);
      const v = Number(r.viewers      ?? 0);
      const b = Number(r.buyers       ?? 0);
      if (o > p.omzet)   p.omzet   = o;
      if (k > p.komisi)  p.komisi  = k;
      if (v > p.viewers) p.viewers = v;
      if (b > p.buyers)  p.buyers  = b;
    });

    // 6. Akumulasikan puncak setiap sesi ke dalam bucket harian
    Object.values(sessionDayPeak).forEach(peak => {
      if (dailyMap[peak.dateKey]) {
        dailyMap[peak.dateKey].omzet   += peak.omzet;
        dailyMap[peak.dateKey].komisi  += peak.komisi;
        dailyMap[peak.dateKey].viewers += peak.viewers;
        dailyMap[peak.dateKey].buyers  += peak.buyers;
      }
    });

    res.json(Object.values(dailyMap));
  } catch (error) {
    console.error('[Studios] /chart error:', error);
    res.status(500).json({ error: error.message });
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
