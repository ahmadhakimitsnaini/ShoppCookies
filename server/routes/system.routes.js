import express from 'express';
import os from 'os';
import { execSync } from 'child_process';
import prisma from '../db.js';

const router = express.Router();

// ============================================================
// In-memory circular buffer: simpan 60 titik data CPU (5 mnt)
// Update setiap kali endpoint dipanggil (polling 5 detik)
// ============================================================
const CPU_HISTORY_MAX = 60;
const cpuHistory = [];

/**
 * Hitung CPU usage % pada Linux via /proc/stat
 * Membandingkan dua snapshot dengan jeda 100ms untuk akurasi.
 */
function readProcStat() {
  const data = execSync('cat /proc/stat').toString();
  const line = data.split('\n')[0]; // "cpu  user nice system idle iowait irq softirq..."
  const parts = line.trim().split(/\s+/).slice(1).map(Number);
  const idle  = parts[3] + (parts[4] || 0); // idle + iowait
  const total = parts.reduce((a, b) => a + b, 0);
  return { idle, total };
}

async function getCpuPercent() {
  try {
    const s1 = readProcStat();
    // Jeda 150ms untuk mendapat delta yang bermakna
    await new Promise(r => setTimeout(r, 150));
    const s2 = readProcStat();
    const totalDelta = s2.total - s1.total;
    const idleDelta  = s2.idle  - s1.idle;
    if (totalDelta === 0) return 0;
    return Math.round((1 - idleDelta / totalDelta) * 100);
  } catch {
    // Fallback: gunakan load average 1 menit jika /proc/stat gagal
    const load = os.loadavg()[0];
    const cores = os.cpus().length;
    return Math.min(100, Math.round((load / cores) * 100));
  }
}

/**
 * Hitung jumlah proses Chromium yang sedang berjalan (= jumlah bot aktif)
 * Menggunakan pgrep yang tersedia di Ubuntu/Linux.
 */
function getActiveBotCount() {
  try {
    // pgrep -c menghitung semua proses yang namanya mengandung chromium
    const count = parseInt(
      execSync('pgrep -c -f "chromium|chrome|playwright" 2>/dev/null || echo 0')
        .toString()
        .trim()
    );
    return isNaN(count) ? 0 : count;
  } catch {
    return 0;
  }
}

/**
 * Ambil status database dan jumlah sesi LIVE yang aktif
 */
async function getDbStats() {
  try {
    const [liveSessions, totalAccounts] = await Promise.all([
      prisma.shopeeSession.count({ where: { status: 'LIVE' } }),
      prisma.shopeeAccount.count({ where: { status: 'ACTIVE' } }),
    ]);
    return { liveSessions, totalAccounts, dbStatus: 'OK' };
  } catch {
    return { liveSessions: 0, totalAccounts: 0, dbStatus: 'ERROR' };
  }
}

/**
 * Format uptime server (dalam detik) ke string yang mudah dibaca
 */
function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}h ${h}j ${m}m`;
  if (h > 0) return `${h} jam ${m} menit`;
  return `${m} menit`;
}

// ============================================================
// GET /api/system/performance
// Endpoint utama: data performa server real-time
// ============================================================
router.get('/performance', async (req, res) => {
  try {
    const [cpuPercent, dbStats] = await Promise.all([
      getCpuPercent(),
      getDbStats(),
    ]);

    const totalRam  = os.totalmem();
    const freeRam   = os.freemem();
    const usedRam   = totalRam - freeRam;
    const ramPercent = Math.round((usedRam / totalRam) * 100);

    const activeBots  = getActiveBotCount();
    const serverUptime = formatUptime(os.uptime());

    // Tentukan status global server
    let globalStatus = 'Operational';
    if (cpuPercent > 90 || ramPercent > 95) globalStatus = 'Critical';
    else if (cpuPercent > 70 || ramPercent > 80) globalStatus = 'Degraded';

    // Simpan ke circular buffer CPU history
    const ts = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    cpuHistory.push({ time: ts, cpu: cpuPercent, ram: ramPercent });
    if (cpuHistory.length > CPU_HISTORY_MAX) cpuHistory.shift();

    res.json({
      globalStatus,                       // Operational | Degraded | Critical
      serverUptime,
      cpu: {
        percent: cpuPercent,
        cores:   os.cpus().length,
        model:   os.cpus()[0]?.model || 'Unknown',
      },
      ram: {
        usedGb:  +(usedRam  / 1024 ** 3).toFixed(2),
        totalGb: +(totalRam / 1024 ** 3).toFixed(2),
        percent: ramPercent,
        freeGb:  +(freeRam  / 1024 ** 3).toFixed(2),
      },
      bots: {
        active:        activeBots,
        limit_warning: 10,
        is_overloaded: activeBots >= 10,
      },
      database: dbStats,
      components: [
        {
          name:   'Core API Endpoint',
          status: 'Operational',
          ping:   '< 5ms',
          icon:   'Globe',
        },
        {
          name:   'Database (Supabase)',
          status: dbStats.dbStatus === 'OK' ? 'Operational' : 'Down',
          ping:   dbStats.dbStatus === 'OK' ? '~15ms' : 'timeout',
          icon:   'Database',
        },
        {
          name:   'Playwright Worker',
          status: activeBots > 0 ? 'Active' : 'Idle',
          ping:   activeBots > 0 ? `${activeBots} proses` : '0 proses',
          icon:   'Cpu',
        },
        {
          name:   'Cron Jobs',
          status: 'Operational',
          ping:   'Scheduled',
          icon:   'Clock',
        },
      ],
    });
  } catch (err) {
    console.error('[System] /performance error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/system/cpu-history
// Riwayat tren CPU & RAM (buffer 5 menit terakhir)
// ============================================================
router.get('/cpu-history', (req, res) => {
  res.json(cpuHistory);
});

export default router;
