/**
 * NotificationService.js
 * ========================
 * Service terpusat untuk mengirim notifikasi Telegram per Studio.
 * Setiap studio memiliki token bot Telegram sendiri.
 * 
 * Arsitektur: 1 Bot → 1 Studio → N Akun Shopee
 */

import prisma from '../../db.js';

// Cache instance bot per studio agar tidak buat koneksi baru setiap notif
const botCache = new Map();

/**
 * Mendapatkan bot Telegram untuk studio tertentu.
 * Menggunakan cache agar efisien.
 */
async function getBotForStudio(studioId) {
  if (botCache.has(studioId)) return botCache.get(studioId);

  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { telegram_token: true, telegram_chat_id: true, name: true }
  });

  if (!studio?.telegram_token || !studio?.telegram_chat_id) return null;

  // Lazy import Telegraf agar tidak semua studio memuat library ini
  const { Telegraf } = await import('telegraf');
  const bot = new Telegraf(studio.telegram_token);

  const instance = { bot, chatId: studio.telegram_chat_id, studioName: studio.name };
  botCache.set(studioId, instance);
  return instance;
}

/**
 * Invalidasi cache saat token studio diperbarui
 */
export function invalidateStudioCache(studioId) {
  botCache.delete(studioId);
}

/**
 * Kirim pesan mentah ke studio tertentu
 * @param {string} studioId 
 * @param {string} htmlMessage - pesan dalam format HTML Telegram
 */
export async function sendToStudio(studioId, htmlMessage) {
  try {
    const instance = await getBotForStudio(studioId);
    if (!instance) {
      console.log(`[Notif] Studio ${studioId} belum dikonfigurasi Telegram. Notifikasi dilewati.`);
      return false;
    }

    await instance.bot.telegram.sendMessage(instance.chatId, htmlMessage, {
      parse_mode: 'HTML'
    });
    return true;
  } catch (err) {
    console.error(`[Notif] Gagal kirim ke Studio ${studioId}:`, err.message);
    return false;
  }
}

// ============================================================
//  TEMPLATE NOTIFIKASI
// ============================================================

/**
 * 🔴 Notifikasi: Cookies Expired
 */
export async function sendCookieExpiredAlert(account) {
  const studioId = account.studio_id;
  if (!studioId) return;

  const msg = [
    `🔴 <b>COOKIES KEDALUWARSA!</b>`,
    ``,
    `Akun <b>@${account.shopee_username}</b>`,
    `Toko: <i>${account.shopee_shop_name}</i>`,
    ``,
    `⚠️ Session telah berakhir. Bot tidak bisa beroperasi.`,
    `👉 Segera perbarui cookies melalui dashboard!`,
    ``,
    `🕐 ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
  ].join('\n');

  await sendToStudio(studioId, msg);
}

/**
 * ✅ Notifikasi: Auto-Treatment Selesai
 */
export async function sendTreatmentCompleteAlert(account, durationMs) {
  const studioId = account.studio_id;
  if (!studioId) return;

  const minutes = Math.round(durationMs / 60000);
  const msg = [
    `✅ <b>AUTO-TREATMENT SELESAI</b>`,
    ``,
    `Akun <b>@${account.shopee_username}</b>`,
    `Toko: <i>${account.shopee_shop_name}</i>`,
    ``,
    `⏱ Durasi: <b>${minutes} menit</b>`,
    `🏥 Status: Akun telah dihangatkan dan siap untuk sesi Live`,
    ``,
    `🕐 ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
  ].join('\n');

  await sendToStudio(studioId, msg);
}

/**
 * ❌ Notifikasi: Auto-Treatment Gagal
 */
export async function sendTreatmentFailedAlert(account, errorMsg) {
  const studioId = account.studio_id;
  if (!studioId) return;

  const msg = [
    `❌ <b>AUTO-TREATMENT GAGAL!</b>`,
    ``,
    `Akun <b>@${account.shopee_username}</b>`,
    `Toko: <i>${account.shopee_shop_name}</i>`,
    ``,
    `⚠️ Error: <code>${errorMsg?.substring(0, 200) ?? 'Unknown error'}</code>`,
    ``,
    `🕐 ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
  ].join('\n');

  await sendToStudio(studioId, msg);
}

/**
 * 📊 Notifikasi: Rekap Harian Studio (dikirim tiap 23:59 WIB)
 * Mengumpulkan omzet semua akun di studio pada hari ini
 */
export async function sendDailyRevenueReport(studio) {
  if (!studio.telegram_token || !studio.telegram_chat_id) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Ambil data performa hari ini untuk semua akun di studio ini
  const accounts = await prisma.shopeeAccount.findMany({
    where: { studio_id: studio.id, deleted_at: null },
    include: {
      performances: {
        where: { recorded_at: { gte: today } },
        orderBy: { recorded_at: 'desc' },
      }
    }
  });

  // Total omzet & komisi hari ini
  let totalOmzet  = 0;
  let totalKomisi = 0;
  const lines     = [];

  accounts.forEach(acc => {
    const omzet  = acc.performances.reduce((s, p) => s + Number(p.omzet_live),   0);
    const komisi = acc.performances.reduce((s, p) => s + Number(p.omzet_komisi), 0);
    totalOmzet  += omzet;
    totalKomisi += komisi;

    if (omzet > 0) {
      lines.push(`  • @${acc.shopee_username}: Rp ${omzet.toLocaleString('id-ID')}`);
    }
  });

  const tanggal = today.toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Jakarta'
  });

  const msg = [
    `📊 <b>REKAP HARIAN ${studio.name.toUpperCase()}</b>`,
    `📅 ${tanggal}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━`,
    `💰 <b>Total Omzet: Rp ${totalOmzet.toLocaleString('id-ID')}</b>`,
    `🎯 <b>Total Komisi: Rp ${totalKomisi.toLocaleString('id-ID')}</b>`,
    `━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `📋 <b>Per Akun:</b>`,
    ...(lines.length > 0 ? lines : ['  Tidak ada sesi live hari ini.']),
    ``,
    `📦 Total Akun Aktif: ${accounts.length}`,
    ``,
    `🤖 GudangKreatif Studio Bot`,
  ].join('\n');

  await sendToStudio(studio.id, msg);
}

/**
 * 🧪 Kirim pesan TEST ke studio (untuk verifikasi konfigurasi)
 */
export async function sendTestNotification(studioId, studioName) {
  const msg = [
    `🧪 <b>TEST NOTIFIKASI BERHASIL!</b>`,
    ``,
    `Studio: <b>${studioName}</b>`,
    ``,
    `✅ Konfigurasi Telegram Anda sudah terhubung dengan benar.`,
    `Bot siap mengirim notifikasi cookies expired, treatment selesai, dan rekap harian.`,
    ``,
    `🕐 ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
    `🤖 GudangKreatif Studio Bot`,
  ].join('\n');

  return await sendToStudio(studioId, msg);
}
