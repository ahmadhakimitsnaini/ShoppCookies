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
        const recentTask = await prisma.botTask.findFirst({
          where: {
            account_id: acc.id,
            task_type: 'AUTO_INJECT',
            status: 'COMPLETED',
            created_at: { gte: sixHoursAgo }
          }
        });

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
};
