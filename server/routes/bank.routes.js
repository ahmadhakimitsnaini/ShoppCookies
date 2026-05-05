import express from 'express';
import prisma from '../db.js';

const router = express.Router();

// ============================================================
// POST /api/bank/batch
// Menyimpan URL secara massal ke ProductBank
// ============================================================
router.post('/batch', async (req, res) => {
  try {
    const { category, urls } = req.body;
    
    if (!category || !urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'Kategori dan array URLs wajib diisi.' });
    }

    // Hindari duplikat di database secara manual karena product_url bukan @unique
    // Tapi karena kita asumsikan injeksi masif, lebih cepat filter di aplikasi
    const existing = await prisma.productBank.findMany({
      where: { category, product_url: { in: urls } },
      select: { product_url: true }
    });
    
    const existingSet = new Set(existing.map(e => e.product_url));
    const newUrls = urls.filter(url => !existingSet.has(url));

    if (newUrls.length === 0) {
      return res.json({ 
        success: true, 
        message: 'Semua URL sudah ada di Bank Produk kategori ini.',
        inserted: 0 
      });
    }

    const payload = newUrls.map(url => ({
      category,
      product_url: url
    }));

    const result = await prisma.productBank.createMany({
      data: payload,
      skipDuplicates: true
    });

    res.json({
      success: true,
      message: `${result.count} URL baru berhasil disimpan ke Bank Produk (${category}).`,
      inserted: result.count
    });

  } catch (error) {
    console.error('[Bank] POST /batch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /api/bank/stats
// Mengambil statistik jumlah URL per kategori
// ============================================================
router.get('/stats', async (req, res) => {
  try {
    const stats = await prisma.productBank.groupBy({
      by: ['category'],
      _count: {
        product_url: true
      }
    });

    // Format output menjadi object simple { kategori: count }
    const result = {};
    stats.forEach(s => {
      result[s.category] = s._count.product_url;
    });

    res.json(result);
  } catch (error) {
    console.error('[Bank] GET /stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
