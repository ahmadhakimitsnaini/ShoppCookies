import express from 'express';
import prisma from '../db.js';

const router = express.Router();

// ============================================================
// Helper: Awal & Akhir hari ini (WIB-aware)
// ============================================================
function getTodayRange() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { startOfDay, endOfDay };
}

// ============================================================
// GET /api/analytics/summary
// Ringkasan total omzet hari ini, komisi, & jumlah studio LIVE
// ============================================================
router.get('/summary', async (req, res) => {
  try {
    const { startOfDay, endOfDay } = getTodayRange();

    // Agregasi omzet & komisi hari ini dari live_performances
    const todayAgg = await prisma.livePerformance.aggregate({
      _sum: {
        omzet_live:   true,
        omzet_komisi: true,
      },
      where: {
        recorded_at: { gte: startOfDay, lte: endOfDay }
      }
    });

    // Hitung studio yang sedang LIVE (ada sesi aktif LIVE)
    const liveStudioCount = await prisma.studio.count({
      where: {
        status: 'ACTIVE',
        shopee_accounts: {
          some: {
            sessions: {
              some: { status: 'LIVE' }
            }
          }
        }
      }
    });

    const totalStudioCount = await prisma.studio.count({
      where: { status: 'ACTIVE' }
    });

    res.json({
      omzet_hari_ini:    Number(todayAgg._sum.omzet_live   ?? 0),
      komisi_hari_ini:   Number(todayAgg._sum.omzet_komisi ?? 0),
      studio_live_count: liveStudioCount,
      studio_total_count: totalStudioCount,
    });
  } catch (err) {
    console.error('[Analytics] /summary error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/analytics/omzet-chart
// Data omzet per jam untuk hari ini (00:00 - sekarang)
// Untuk grafik utama di HomeDashboard
// ============================================================
router.get('/omzet-chart', async (req, res) => {
  try {
    const { startOfDay } = getTodayRange();
    const now = new Date();

    // Ambil semua record hari ini
    const performances = await prisma.livePerformance.findMany({
      where: {
        recorded_at: { gte: startOfDay, lte: now }
      },
      select: {
        omzet_live:   true,
        omzet_komisi: true,
        recorded_at:  true,
      },
      orderBy: { recorded_at: 'asc' }
    });

    // Buat bucket 24 jam (per jam)
    const hourlyBuckets = {};
    for (let h = 0; h <= now.getHours(); h++) {
      const label = `${String(h).padStart(2, '0')}:00`;
      hourlyBuckets[h] = { hour: label, omzet: 0, komisi: 0 };
    }

    // Akumulasikan data ke dalam bucket per jam
    performances.forEach(p => {
      const h = new Date(p.recorded_at).getHours();
      if (hourlyBuckets[h] !== undefined) {
        hourlyBuckets[h].omzet  += Number(p.omzet_live   ?? 0);
        hourlyBuckets[h].komisi += Number(p.omzet_komisi ?? 0);
      }
    });

    res.json(Object.values(hourlyBuckets));
  } catch (err) {
    console.error('[Analytics] /omzet-chart error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/analytics/studios
// Performa tiap Studio: status LIVE, omzet live, omzet bulan ini
// Untuk kartu studio di HomeDashboard & CekOmzet
// ============================================================
router.get('/studios', async (req, res) => {
  try {
    const { startOfDay, endOfDay } = getTodayRange();

    // Awal bulan ini
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    const studios = await prisma.studio.findMany({
      where: { status: 'ACTIVE' },
      include: {
        shopee_accounts: {
          include: {
            sessions: {
              where: { status: 'LIVE' },
              take: 1,
            },
            performances: {
              where: {
                recorded_at: { gte: startOfMonth }
              },
              select: {
                omzet_live:   true,
                omzet_komisi: true,
                recorded_at:  true,
              }
            }
          }
        }
      }
    });

    // Kalkulasi per studio
    const result = studios.map(studio => {
      let is_live        = false;
      let omzet_live     = 0; // Total omzet hari ini dari semua akun di studio ini
      let omzet_bulan    = 0;
      let komisi_bulan   = 0;
      let viewers        = 0;
      let account_count  = studio.shopee_accounts.length;

      studio.shopee_accounts.forEach(acc => {
        // Cek apakah akun ini ada sesi LIVE 
        if (acc.sessions.length > 0) {
          is_live = true;
        }

        acc.performances.forEach(p => {
          const recordedDate = new Date(p.recorded_at);
          // Omzet hari ini saja
          if (recordedDate >= startOfDay && recordedDate <= endOfDay) {
            omzet_live += Number(p.omzet_live ?? 0);
          }
          // Omzet & komisi bulan ini
          omzet_bulan  += Number(p.omzet_live   ?? 0);
          komisi_bulan += Number(p.omzet_komisi ?? 0);
        });
      });

      return {
        id:              studio.id,
        name:            studio.name,
        is_live,
        omzet_live,
        omzet_bulan_ini: omzet_bulan,
        komisi_bulan:    komisi_bulan,
        account_count,
      };
    });

    // Urutkan berdasarkan omzet terbesar dulu
    result.sort((a, b) => b.omzet_live - a.omzet_live);

    res.json(result);
  } catch (err) {
    console.error('[Analytics] /studios error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/analytics/omzet-history?studioId=xxx&days=7
// Riwayat omzet harian per studio (untuk grafik OmzetAnalitik)
// ============================================================
router.get('/omzet-history', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const records = await prisma.livePerformance.findMany({
      where: {
        recorded_at: { gte: since },
      },
      include: {
        account: {
          select: {
            studio_id:       true,
            shopee_username: true,
            studio: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { recorded_at: 'asc' }
    });

    // Kelompokkan per tanggal & studio
    const grouped = {};
    records.forEach(r => {
      const dateKey   = new Date(r.recorded_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      const studioName = r.account?.studio?.name || 'Unknown';
      
      if (!grouped[dateKey]) grouped[dateKey] = { date: dateKey };
      if (!grouped[dateKey][studioName]) grouped[dateKey][studioName] = 0;
      grouped[dateKey][studioName] += Number(r.omzet_live ?? 0);
    });

    res.json(Object.values(grouped));
  } catch (err) {
    console.error('[Analytics] /omzet-history error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
