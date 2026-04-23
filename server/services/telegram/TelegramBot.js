import { Telegraf, Markup } from 'telegraf';
import { pinProductInShopee } from '../bot/LiveController.js';
import { runProductInjection } from '../bot/ProductInjector.js';
import prisma from '../../db.js';
import dotenv from 'dotenv';
dotenv.config();

let tgBotInstance = null;
let masterChatId = null; // Menyimpan chat id darimana admin terakhir nge-start, untuk broadcast.

export const startTelegramBot = () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!token || token.length < 20) {
    console.error('[Bot] ❌ Token Telegram hilang dari .env. Layanan ditiadakan sementara.');
    return;
  }

  const bot = new Telegraf(token);
  tgBotInstance = bot;

  // Menyambut admin
  bot.start((ctx) => {
    masterChatId = ctx.chat.id; // Menyimpan ID sesi live
    ctx.reply('Halo! GudangKreatif Bot telah Siaga 😎.\nSistem pemantau Chat (Shopee Eye) telah aktif dan tersambung ke ruang obrolan ini.');
  });

  bot.help((ctx) => {
    ctx.reply(
      '🌟 **Menu Bantuan GudangKreatif Bot** 🌟\n\n' +
      'Gunakan perintah ini untuk memandu jalannya siaran:\n\n' +
      '1. `/toko`\n' +
      '   Membuka daftar Akun Shopee yang aktif untuk mengendalikan Remote.\n' +
      '2. `/pin <urutan> <id_akun>`\n' +
      '   Mengeklik tombol "Sematkan Etalase" secara ketik manual.'
    );
  });

  // MENAMPILKAN MENU TOKO (Tanpa Ngetik!)
  bot.command('toko', async (ctx) => {
    try {
      // Menarik data toko asli dari Supabase (Prisma)
      const accounts = await prisma.shopeeAccount.findMany({
        where: { status: 'ACTIVE' },
        take: 10 // Batasi 10 toko dulu
      });

      if (accounts.length === 0) {
        return ctx.reply('⚠️ Belum ada Akun Shopee yang aktif di Database Anda.');
      }

      const buttons = accounts.map(acc => [
        Markup.button.callback(`🏪 ${acc.shopee_shop_name}`, `open_remote_${acc.id}`)
      ]);

      ctx.reply('<b>SISTEM KENDALI PUSAT</b>\n\nSilakan sentuh Toko yang sedang Live di bawah ini untuk membuka Papan Kendalinya:', {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(buttons)
      });

    } catch (e) {
      console.error(e);
      ctx.reply('❌ Gagal memuat daftar toko dari Database Prisma.');
    }
  });

  // Telinga baru: Mendengar KETUKAN TOKO dari menu di atas
  bot.action(/^open_remote_(.+)$/, async (ctx) => {
    const accountId = ctx.match[1];
    
    // Tampilkan Papan Kendali seketika!
    await ctx.answerCbQuery('Membuka Papan Kendali...');

    const buttons = [];
    for (let i = 1; i <= 30; i += 5) {
      const row = [];
      for (let j = i; j < i + 5; j++) {
        row.push(Markup.button.callback(`🛒 ${j}`, `pin_${j}_${accountId}`));
      }
      buttons.push(row);
    }

    const panelMsg = `🎛️ <b>PAPAN KENDALI REMOTE</b>\n📡 Target Akun: <code>${accountId}</code>\n\nSentuh angka keranjang di bawah untuk mem-Pin Produk secara langsung (Real-Time).`;
    
    // Ganti pesan menu dengan Papan Remote (supaya tidak numpuk)
    ctx.editMessageText(panelMsg, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard(buttons)
    });
  });

  // Komando Aksi 'Sematkan Etalase' (/pin)
  bot.command('pin', async (ctx) => {
    // Format ekspektasi: /pin <nomor_produk> <id_akun>
    // Contoh nyata: /pin 14 a201
    const text = ctx.message.text.trim();
    const args = text.split(' ').slice(1);

    if (args.length < 2) {
      return ctx.reply('❌ Format penulisan salah kak.\nGunakan: /pin <urutan> <id_akun>\nContoh: /pin 14 A201');
    }

    const itemIndex = parseInt(args[0], 10);
    const accountId = args[1].toUpperCase();

    if (isNaN(itemIndex)) {
      return ctx.reply('❌ Nomor produk harus angka mutlak, misal: /pin 5 A201');
    }

    // Balasan umpan balik langsung (Instant feedback)
    const pendingMessage = await ctx.reply(`⏳ Roger! Perintah diterima.\nSebentar ya kak, sedang memandu robot menyematkan Etalase Baris ke-${itemIndex} di Live Akun [${accountId}]...`);

    // Panggil mesin gaib Playwright
    try {
      const result = await pinProductInShopee(accountId, itemIndex);
      if (result.success) {
        ctx.telegram.editMessageText(
          ctx.chat.id, 
          pendingMessage.message_id, 
          undefined, 
          `✅ **SUKSES MASUK!** Etalase Baris ke-${itemIndex} telah disematkan untuk Penonton di Akun ${accountId}.`
        );
      } else {
        ctx.telegram.editMessageText(
          ctx.chat.id, 
          pendingMessage.message_id, 
          undefined, 
          `❌ **GAGAL MENEKAN TOMBOL:** ${result.message}`
        );
      }
    } catch (e) {
      ctx.reply(`❌ ERROR: Gagal terhubung ke Shopee! ${e.message}`);
    }
  });

  // COMMAND BARU: REMOTE CONTROL PANEL
  // Syntax: /remote <akun_id> -> Menampilkan grid 30 tombol keranjang!
  bot.command('remote', (ctx) => {
    const args = ctx.payload.split(' ');
    if (args.length < 1 || args[0] === '') {
      return ctx.reply('⚠️ Format salah! Gunakan: /remote <akun_id>\nContoh: /remote A201_KOSMETIK');
    }
    
    const accountId = args[0];
    
    // Membangun GRID tombol 5 Kesamping x 6 Kebawah = 30 Etalase.
    const buttons = [];
    for (let i = 1; i <= 30; i += 5) {
      const row = [];
      for (let j = i; j < i + 5; j++) {
        row.push(Markup.button.callback(`🛒 ${j}`, `pin_${j}_${accountId}`));
      }
      buttons.push(row);
    }

    const panelMsg = `🎛️ <b>PAPAN KENDALI REMOTE</b>\n📡 Target Akun: <code>${accountId}</code>\n\nSentuh angka keranjang di bawah untuk mem-Pin Produk secara langsung (Real-Time).`;
    
    ctx.reply(panelMsg, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard(buttons)
    });
  });

  // COMMAND BARU: INJEKSI MASSAL FASE 10
  bot.command('inject', async (ctx) => {
    const args = ctx.payload.split(' ');
    if (args.length < 1 || args[0] === '') {
      return ctx.reply('⚠️ Format: /inject <akun_id>\nContoh: /inject A201_KOSMETIK');
    }
    
    const accountId = args[0];
    const waitMsg = await ctx.reply(`⚠️ **PERINGATAN MESIN**: Bot sedang mencoba membajak keranjang live di Akun <code>${accountId}</code> untuk membombardir link produk. Proses ini akan memakan waktu lumayan lama ⏳...`, {parse_mode: 'HTML'});

    try {
      const injectRes = await runProductInjection(accountId);
      if(injectRes.success) {
         ctx.reply(`✅ <b>INJEKSI MASSAL SELESAI!</b>\nBerhasil menyuntikkan ${injectRes.count} Produk langsung ke Shopee Live.`, {parse_mode: 'HTML'});
      } else {
         ctx.reply(`❌ <b>GAGAL MENYUNTIK:</b> ${injectRes.message}`, {parse_mode: 'HTML'});
      }
    } catch(err) {
       ctx.reply(`❌ ERROR CRITICAL: ${err.message}`);
    }
  });

  // Telinga baru: Mendengar KETUKAN TOMBOL (Callback Query)
  // Format regex: /pin_(\d+)_([a-zA-Z0-9_]+)/
  // Menangkap action data misal "pin_14_A201"
  bot.action(/pin_(\d+)_([a-zA-Z0-9_]+)/, async (ctx) => {
    const itemIndex = parseInt(ctx.match[1], 10);
    const accountId = ctx.match[2];

    // Beri sinyal balik ke Telegram bahwa tombol sudah ditekan (menghilangkan logo jam loading di tombol)
    await ctx.answerCbQuery(`Menyematkan Nomer ${itemIndex}...`);

    // Merubah Teks Tombol Asli Menjadi Teks Informasi (Edit In-Place)
    const pendingMsg = await ctx.editMessageText(
      `${ctx.callbackQuery.message.text}\n\n⏳ <b>Sedang Mengeklik Jemari Gaib untuk Nomor ${itemIndex}...</b>`,
      { parse_mode: 'HTML' }
    );

    try {
      const result = await pinProductInShopee(accountId, itemIndex);
      if (result.success) {
         ctx.editMessageText(
           `${ctx.callbackQuery.message.text}\n\n✅ <b>SUKSES MENYALA!</b> Etalase Baris ke-${itemIndex} resmi tertancap di Akun ${accountId}.`,
           { parse_mode: 'HTML' }
         );
      } else {
         ctx.editMessageText(
           `${ctx.callbackQuery.message.text}\n\n❌ <b>GAGAL:</b> ${result.message}`,
           { parse_mode: 'HTML' }
         );
      }
    } catch (e) {
      ctx.editMessageText(`❌ <b>ERROR KRITIKAL PLAYWRIGHT:</b> ${e.message}`, { parse_mode: 'HTML' });
    }
  });

  // Untuk demo, kita luncurkan ke udara (Polling)
  bot.launch();
  console.log('[Telegram] 🚀 Pusat Kendali Telegraf dengan Smart Keyboard mengudara mantap!');

  // Tangkap sinyal Stop Node.js agar Telegram tidak hang
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
};

/**
 * Pintu belakang untuk Playwright (LiveController) 
 * agar bisa membombardir Telegram dengan Notifikasi Live + Tombol Pin.
 */
export const sendLiveChatNotification = async (accountId, viewerName, chatText, productIndex) => {
  if (!tgBotInstance || !masterChatId) {
    console.log(`[Bot] Lewati peringatan chat, Telegram belum dikonfigurasi (Belum /start).`);
    return;
  }

  const messageStr = `💬 <b>[Akun ${accountId}] ${viewerName}</b>\n"${chatText}"`;
  
  // Menciptakan Keyboard Interaktif!
  const keyboard = Markup.inlineKeyboard([
    Markup.button.callback(`📌 SEMATKAN PRODUK NO ${productIndex}`, `pin_${productIndex}_${accountId}`)
  ]);

  try {
    await tgBotInstance.telegram.sendMessage(masterChatId, messageStr, {
      parse_mode: 'HTML',
      ...keyboard
    });
  } catch (error) {
    console.error('Gagal membombar Telegram: ', error);
  }
};

/**
 * Pintu belakang global untuk mengirim pesan ke Admin
 */
export const broadcastMessage = async (message) => {
  if (!tgBotInstance || !masterChatId) return;
  try {
    await tgBotInstance.telegram.sendMessage(masterChatId, message, { parse_mode: 'HTML' });
  } catch (error) {
    console.error('[Bot] Gagal broadcast:', error.message);
  }
};
