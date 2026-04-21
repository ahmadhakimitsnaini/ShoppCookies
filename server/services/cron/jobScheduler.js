import cron from 'node-cron';
import prisma from '../../db.js';
import { ShopeeBot } from '../bot/ShopeeBot.js';

export const startCronJobs = () => {
  console.log('[Cron] 🕒 Menjadwalkan mesin penjaga Auto-Treatment (Setiap 5 Menit)...');

  // Jalankan setiap 5 menit
  cron.schedule('*/5 * * * *', async () => {
    console.log('\n[Cron] 🔥 Memulai siklus pengecekan bot (Worker).');
    
    try {
      // 1. Cari semua ShopeeAccount (Sesi) yang terafiliasi dengan Studio yang is_share_on = true
      // (Berdasarkan skema kita, cookie diletakkan di session atau ShopeeAccount)
      const activeStudios = await prisma.studio.findMany({
        where: { is_share_on: true, status: 'ACTIVE' },
        include: { shopee_accounts: true } // Sesuaikan dengan struktur relasi
      });

      let sessionsToProcess = [];
      activeStudios.forEach(studio => {
        // Ambil akun yang aktif
        sessionsToProcess = [...sessionsToProcess, ...studio.shopee_accounts.filter(acc => acc.session_status === 'LIVE')];
      });

      console.log(`[Cron] Menemukan ${sessionsToProcess.length} akun live dari studio aktif.`);

      // 2. Loop Paralel / Antrean perlahan (for-of) agar RAM tidak crash
      const bot = new ShopeeBot();
      for (const session of sessionsToProcess) {
        // Simulasi R&D eksekusi bot Playwright
        const result = await bot.checkHealthAndOmzet(session);
        
        // 3. Reaksi ke DB atas hasil bot
        if (result.status === 'EXPIRED') {
          await prisma.shopeeAccount.update({
            where: { id: session.id },
            data: { session_status: 'EXPIRED' }
          });
          console.log(`[Cron] Peringatan Merah! Status DB akun ${session.id} dipaksa menjadi EXPIRED.`);
        } else if (result.status === 'LIVE') {
           // Simpan history omzet atau update record
           console.log(`[Cron] Auto-Treatment sukses! Estimasi Omzet Mock: Rp ${result.omzet}`);
        }
      }
      
      console.log('[Cron] 🏁 Siklus eksekusi bot selesai.');

    } catch (e) {
       console.error('[Cron] Terjadi kegagalan siklus cron:', e);
    }
  });
};
