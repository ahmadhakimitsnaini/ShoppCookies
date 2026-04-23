import cron from 'node-cron';
import prisma from '../../db.js';
import { ShopeeBot } from '../bot/ShopeeBot.js';
import { runProductInjection } from '../bot/ProductInjector.js';
import { broadcastMessage } from '../telegram/TelegramBot.js';

export const startCronJobs = () => {

  // ========================================================
  // CRON 1: Auto-Start Injeksi Produk (Setiap 5 Menit)
  // ========================================================
  console.log('[Cron] 🕒 Menjadwalkan Auto-Start (Setiap 5 Menit)...');

  cron.schedule('*/5 * * * *', async () => {
    console.log('\n[Cron] 🔥 Memulai siklus deteksi Live & Auto-Start.');
    
    try {
      const liveAccounts = await prisma.shopeeAccount.findMany({
        where: { 
          sessions: {
            some: { status: 'LIVE' }
          },
          status: 'ACTIVE',
          studio: { status: 'ACTIVE', is_share_on: true } 
        },
        include: { studio: true }
      });

      if (liveAccounts.length === 0) {
        console.log('[Cron] Tidak ada akun baru yang sedang LIVE saat ini.');
        return;
      }

      console.log(`[Cron] Menemukan ${liveAccounts.length} akun LIVE. Memeriksa kebutuhan injeksi...`);

      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      
      const sessionInjections = liveAccounts.map(async (acc) => {
        // Filter task_type di JS untuk menghindari Prisma v7 enum error
        const recentTasks = await prisma.botTask.findMany({
          where: {
            account_id: acc.id,
            created_at: { gte: sixHoursAgo }
          },
          take: 20
        });
        const recentTask = recentTasks.find(
          t => String(t.task_type) === 'AUTO_INJECT' && String(t.status) === 'COMPLETED'
        ) ?? null;

        if (recentTask) {
          console.log(`[Cron] Akun @${acc.shopee_username} sudah di-injek hari ini. Skip.`);
          return null;
        }

        console.log(`[Cron] 🚨 DETEKSI LIVE BARU: @${acc.shopee_username}. Memulai Auto-Start...`);
        
        broadcastMessage(`🤖 <b>[AUTO-START]</b> Mendeteksi Live baru: <b>${acc.shopee_shop_name}</b> (@${acc.shopee_username}).\nMenyiapkan pembersihan etalase & pengisian Brankas...`);

        const task = await prisma.botTask.create({
          data: {
            account_id: acc.id,
            task_type: 'AUTO_INJECT',
            status: 'PROCESSING'
          }
        });

        const result = await runProductInjection(acc.id, { clearEtalase: true });

        if (result.success) {
          await prisma.botTask.update({
            where: { id: task.id },
            data: { status: 'COMPLETED', finished_at: new Date() }
          });
          broadcastMessage(`✅ <b>[AUTO-START]</b> Berhasil injeksi ${result.count} produk ke <b>${acc.shopee_username}</b>!`);
        } else {
          await prisma.botTask.update({
            where: { id: task.id },
            data: { status: 'FAILED', payload: { error: result.message } }
          });
          broadcastMessage(`❌ <b>[AUTO-START GAGAL]</b> Akun <b>${acc.shopee_username}</b>: ${result.message}`);
        }
        
        return result;
      });

      await Promise.all(sessionInjections);
      console.log('[Cron] 🏁 Siklus deteksi Auto-Start selesai.');

    } catch (e) {
       console.error('[Cron] Kesalahan fatal siklus cron:', e);
    }
  });

  // ========================================================
  // CRON 2: Sinkronisasi Omzet Asli (Setiap 30 Menit)
  // ========================================================
  console.log('[Cron] 📊 Menjadwalkan sinkronisasi omzet (Setiap 30 menit)...');
  
  cron.schedule('*/30 * * * *', async () => {
    console.log('\n[Cron] 📊 Memulai siklus sinkronisasi omzet...');
    
    try {
      const liveSessions = await prisma.shopeeSession.findMany({
        where: { status: 'LIVE' },
        include: {
          account: {
            select: { 
              id: true, 
              shopee_username: true,
              shopee_shop_name: true,
              studio_id: true
            }
          }
        }
      });

      if (liveSessions.length === 0) {
        console.log('[Cron] Tidak ada sesi LIVE untuk disinkron omzetnya.');
        return;
      }

      console.log(`[Cron] Sinkronisasi omzet ${liveSessions.length} sesi aktif secara paralel...`);

      const crawlJobs = liveSessions.map(async (session) => {
        const bot = new ShopeeBot();
        try {
          const result = await bot.checkHealthAndOmzet(session);

          if (result.status === 'EXPIRED') {
            await prisma.shopeeSession.update({
              where: { id: session.id },
              data: { status: 'EXPIRED', expired_at: new Date() }
            });
            console.log(`[Cron] ⚠️ Sesi @${session.account.shopee_username} expired.`);
            broadcastMessage(`⚠️ <b>[SESI EXPIRED]</b> Cookie <b>${session.account.shopee_username}</b> tidak valid. Segera perbarui!`);
            return;
          }

          if (result.status === 'LIVE') {
            await prisma.livePerformance.create({
              data: {
                account_id: session.account.id,
                session_id: session.id,
                live_title: result.live_title || 'Live Session',
                viewers: result.viewers,
                buyers: result.buyers,
                omzet_live: result.omzet_live,
                omzet_komisi: result.omzet_komisi,
                recorded_at: new Date()
              }
            });
            console.log(`[Cron] ✅ Omzet @${session.account.shopee_username}: Rp${result.omzet_live.toLocaleString('id-ID')}`);
          }

        } catch (err) {
          console.error(`[Cron] Gagal crawl @${session.account?.shopee_username}:`, err.message);
        }
      });

      await Promise.all(crawlJobs);
      console.log('[Cron] 🏁 Siklus sinkronisasi omzet selesai.');

    } catch (e) {
      console.error('[Cron] Kesalahan fatal siklus sinkronisasi omzet:', e);
    }
  });

  // ========================================================
  // CRON 3: Auto-Treatment (Setiap 6 Jam)
  // Menjalankan "pemanasan" akun untuk semua akun aktif
  // yang TIDAK sedang LIVE, maksimal 2 akun paralel.
  // ========================================================
  console.log('[Cron] 🤖 Menjadwalkan Auto-Treatment (Setiap 6 Jam)...');

  cron.schedule('0 */6 * * *', async () => {
    console.log('\n[Cron] 🤖 Memulai siklus Auto-Treatment...');

    try {
      // Ambil akun yang: ACTIVE, punya sesi non-LIVE, belum treatment dalam 6 jam terakhir
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

      const candidates = await prisma.shopeeAccount.findMany({
        where: {
          status: 'ACTIVE',
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
          // Ambil semua task lalu filter di JS (hindari Prisma v7 enum error)
          bot_tasks: {
            where: {
              created_at: { gte: sixHoursAgo }
            },
            take: 20
          }
        }
      });

      // Filter di JS: hanya akun yang belum AUTO_TREATMENT dalam 6 jam terakhir
      const toTreat = candidates.filter(acc =>
        !acc.bot_tasks.some(t => String(t.task_type) === 'AUTO_TREATMENT')
      );

      if (toTreat.length === 0) {
        console.log('[Cron] Semua akun sudah menjalani treatment dalam 6 jam terakhir.');
        return;
      }

      console.log(`[Cron] ${toTreat.length} akun perlu treatment. Memproses maks. 2 paralel...`);

      // Proses maksimal 2 akun sekaligus (batching)
      const BATCH_SIZE = 2;
      for (let i = 0; i < toTreat.length; i += BATCH_SIZE) {
        const batch = toTreat.slice(i, i + BATCH_SIZE);

        await Promise.all(batch.map(async (acc) => {
          const session = acc.sessions[0];
          if (!session) return;

          // Buat record task
          const task = await prisma.botTask.create({
            data: {
              account_id: acc.id,
              task_type:  'AUTO_TREATMENT',
              status:     'PROCESSING',
            }
          });

          const bot = new ShopeeBot();
          const result = await bot.performTreatment({ ...session, account: acc }, null);

          await prisma.botTask.update({
            where: { id: task.id },
            data: {
              status:      result.success ? 'COMPLETED' : 'FAILED',
              finished_at: new Date(),
              payload:     { logs: result.logs, duration_ms: result.duration_ms }
            }
          });

          console.log(`[Cron] Treatment @${acc.shopee_username}: ${result.success ? '✅ Sukses' : '❌ Gagal'}`);
        }));

        // Jeda 30 detik antar batch agar server tidak panas
        if (i + BATCH_SIZE < toTreat.length) {
          console.log('[Cron] Jeda 30 detik sebelum batch berikutnya...');
          await new Promise(r => setTimeout(r, 30_000));
        }
      }

      console.log('[Cron] 🏁 Siklus Auto-Treatment selesai.');

    } catch (e) {
      console.error('[Cron] Kesalahan fatal siklus treatment:', e);
    }
  });
};
