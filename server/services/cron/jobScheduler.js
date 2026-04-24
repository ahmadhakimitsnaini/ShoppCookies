import cron from 'node-cron';
import prisma from '../../db.js';
import { ShopeeBot } from '../bot/ShopeeBot.js';

/**
 * Memulai semua jadwal otomatis (Cron Jobs)
 */
export const startCronJobs = () => {
  console.log('🚀 [Scheduler] Menginisialisasi jadwal otomatis...');

  // ============================================================
  // CRON 1: PERIODIC POLLING — MONITOR LIVE & COOKIES (Setiap 5 Menit)
  // Rotasi bergiliran 1 per 1: buka browser → scrape → simpan → tutup.
  // Efisiensi RAM: max 1 Playwright aktif pada satu waktu.
  // ============================================================
  cron.schedule('*/5 * * * *', async () => {
    console.log('[Cron] 🔍 [Polling] Memulai putaran monitor sesi LIVE...');

    // Jaga agar cron tidak jalan paralel jika iterasi sebelumnya belum selesai
    if (global.__livePollingRunning) {
      console.log('[Cron] ⏳ Polling sebelumnya masih berjalan, putaran ini dilewati.');
      return;
    }
    global.__livePollingRunning = true;

    try {
      const { sendCookieExpiredAlert } = await import('../telegram/NotificationService.js');

      // Ambil semua sesi yang berstatus LIVE beserta relasi akunnya
      const liveSessions = await prisma.shopeeSession.findMany({
        where: { status: 'LIVE' },
        include: {
          account: {
            select: {
              id: true,
              shopee_username: true,
              shopee_shop_name: true,
              studio_id: true,
              status: true,
            }
          }
        },
        orderBy: { last_sync_at: 'asc' } // Prioritaskan yang paling lama belum di-sync
      });

      if (liveSessions.length === 0) {
        console.log('[Cron] ℹ️  Tidak ada sesi LIVE yang perlu dimonitor saat ini.');
        return;
      }

      console.log(`[Cron] 📋 Ditemukan ${liveSessions.length} sesi LIVE. Memulai antrean polling...`);

      // === LOOP BERGILIRAN (1 per 1, tidak paralel) ===
      for (const session of liveSessions) {
        const username = session.account?.shopee_username ?? session.id.substring(0, 8);
        console.log(`[Cron] 🤖 Polling @${username}...`);

        try {
          const bot = new ShopeeBot();
          const result = await bot.checkHealthAndOmzet(session);

          if (result.status === 'EXPIRED') {
            // === Skenario: Cookie Kedaluwarsa ===
            console.log(`[Cron] 🔴 @${username}: COOKIE EXPIRED! Menonaktifkan sesi...`);

            // Update status sesi menjadi EXPIRED
            await prisma.shopeeSession.update({
              where: { id: session.id },
              data: { status: 'EXPIRED', expired_at: new Date() }
            });

            // Kirim notifikasi darurat ke Telegram Owner Studio
            if (session.account) {
              await sendCookieExpiredAlert(session.account);
            }

          } else if (result.status === 'LIVE') {
            // === Skenario: Data Berhasil Ditarik ===
            console.log(`[Cron] ✅ @${username}: Omzet=Rp${result.omzet_live?.toLocaleString('id-ID')}, Viewers=${result.viewers}`);

            // Simpan snapshot performa ke database
            await prisma.livePerformance.create({
              data: {
                account_id: session.account_id,
                session_id:  session.id,
                live_title:  result.live_title || 'Live Session',
                viewers:     result.viewers     || 0,
                buyers:      result.buyers      || 0,
                omzet_live:  result.omzet_live  || 0,
                omzet_komisi: result.omzet_komisi || 0,
                recorded_at: new Date(),
              }
            });

            // Perbarui timestamp last_sync_at agar urutan antrean selalu fresh
            await prisma.shopeeSession.update({
              where: { id: session.id },
              data: { last_sync_at: new Date() }
            });

          } else {
            // === Skenario: Error saat scraping (jaringan, struktur HTML berubah, dll) ===
            console.warn(`[Cron] ⚠️  @${username}: Status tidak dikenali atau error — ${result.error ?? 'Unknown'}`);
          }

        } catch (sessionErr) {
          // Error per-akun tidak menghentikan antrean akun berikutnya
          console.error(`[Cron] ❌ Error polling @${username}:`, sessionErr.message);
        }

        // Jeda antar-akun: 8-12 detik (mengurangi lonjakan RAM & terasa lebih natural)
        const jeda = 8000 + Math.floor(Math.random() * 4000);
        await new Promise(r => setTimeout(r, jeda));
      }

      console.log(`[Cron] ✅ [Polling] Putaran selesai. ${liveSessions.length} sesi telah diproses.`);

    } catch (err) {
      console.error('[Cron] ❌ Fatal error pada Polling Monitor:', err.message);
    } finally {
      // WAJIB: lepas kunci agar putaran berikutnya bisa berjalan
      global.__livePollingRunning = false;
    }
  });


  // ============================================================
  // CRON 2: AUTO-TREATMENT BERGILIR (Setiap 6 Jam)
  // Memanaskan akun agar tidak dianggap bot mati oleh Shopee
  // ============================================================
  cron.schedule('0 */6 * * *', async () => {
    console.log('[Cron] 🏥 Menjalankan Siklus Auto-Treatment...');
    try {
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      
      const candidates = await prisma.shopeeAccount.findMany({
        where: {
          status: 'ACTIVE',
          deleted_at: null,
          sessions: {
            some: {
              status: { notIn: ['LIVE', 'EXPIRED'] }
            }
          }
        },
        include: {
          sessions: {
            where: { status: { notIn: ['LIVE', 'EXPIRED'] } },
            orderBy: { created_at: 'desc' },
            take: 1
          },
          bot_tasks: {
            where: { created_at: { gte: sixHoursAgo } },
            take: 20
          }
        }
      });

      const toTreat = candidates.filter(acc =>
        !acc.bot_tasks.some(t => String(t.task_type) === 'AUTO_TREATMENT')
      );

      if (toTreat.length === 0) return;

      const BATCH_SIZE = 2;
      for (let i = 0; i < toTreat.length; i += BATCH_SIZE) {
        const batch = toTreat.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (acc) => {
          const session = acc.sessions[0];
          if (!session) return;

          const task = await prisma.botTask.create({
            data: { account_id: acc.id, task_type: 'AUTO_TREATMENT', status: 'PROCESSING' }
          });

          const bot = new ShopeeBot();
          const result = await bot.performTreatment({ ...session, account: acc }, null);

          await prisma.botTask.update({
            where: { id: task.id },
            data: {
              status: result.success ? 'COMPLETED' : 'FAILED',
              finished_at: new Date(),
              payload: { logs: result.logs, duration_ms: result.duration_ms }
            }
          });
          console.log(`[Cron] Treatment @${acc.shopee_username}: ${result.success ? '✅' : '❌'}`);
        }));
        if (i + BATCH_SIZE < toTreat.length) await new Promise(r => setTimeout(r, 30000));
      }
    } catch (e) {
      console.error('[Cron] Kesalahan treatment:', e);
    }
  });

  // ============================================================
  // CRON 3: REKAP HARIAN TELEGRAM (Setiap Hari jam 23:59 WIB)
  // ============================================================
  cron.schedule('59 23 * * *', async () => {
    console.log('[Cron] 📊 Menjalankan Rekap Harian Telegram...');
    try {
      const { sendDailyRevenueReport } = await import('../telegram/NotificationService.js');
      const studios = await prisma.studio.findMany({ where: { status: 'ACTIVE' } });
      for (const studio of studios) {
        if (studio.telegram_token && studio.telegram_chat_id) {
          await sendDailyRevenueReport(studio);
        }
      }
    } catch (err) {
      console.error('[Cron] Gagal kirim rekap harian:', err.message);
    }
  }, { timezone: "Asia/Jakarta" });

  console.log('✅ [Scheduler] Semua sistem otomasi cron telah mengudara.');
};
