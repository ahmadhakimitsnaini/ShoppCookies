/**
 * LiveController.js
 * =================
 * Modul ini mengelola semua interaksi browser Playwright yang berkaitan dengan
 * pemantauan siaran Live Shopee dan aksi sematkan etalase.
 *
 * Arsitektur: Single Browser, Multi-Context
 * -----------------------------------------
 * Hanya ada 1 instance Chromium yang berjalan di memori. Setiap akun yang
 * perlu dioperasikan mendapat BrowserContext tersendiri yang terisolasi
 * (cookie, session, localStorage terpisah). Ini jauh lebih hemat RAM
 * dibandingkan meluncurkan browser baru untuk setiap akun.
 */

import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(stealthPlugin());
import prisma from '../../db.js';
import { sendLiveChatNotification, broadcastMessage } from '../telegram/TelegramBot.js';

// ── Konfigurasi Launch Chromium (Hemat RAM) ───────────────────────────────
const BROWSER_LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-blink-features=AutomationControlled',
  '--disable-gpu',                    // Tidak perlu GPU rendering
  '--disable-dev-shm-usage',          // Cegah crash di /dev/shm yang kecil
  '--no-zygote',                      // Kurangi proses child yang tidak perlu
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
  '--js-flags=--max-old-space-size=256', // Batasi heap V8 per context
];

// ── State Global ──────────────────────────────────────────────────────────
let sharedBrowser = null;             // Instance Chromium tunggal
const activeObservers = new Map();    // accountId → { context, page }

// ── Regex Deteksi Request Penonton ────────────────────────────────────────
// Menangkap: "spill 5", "sematkan 12", "no. 3", "nomor 10", "spil 7", dll.
const SPILL_REGEX = /(?:spill|sematkan|spil|no\.?|nomor|nomo)\s*(\d+)/i;

// ── Interval Polling Dynamic Observer (2 menit) ───────────────────────────
const POLL_INTERVAL_MS = 2 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────
// UTILITAS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Mendapatkan atau membuat instance Chromium tunggal yang dipakai bersama.
 */
async function getSharedBrowser() {
  if (!sharedBrowser || !sharedBrowser.isConnected()) {
    console.log('[LiveController] 🚀 Meluncurkan Chromium shared instance...');
    sharedBrowser = await chromium.launch({
      headless: true,
      args: BROWSER_LAUNCH_ARGS,
    });
    sharedBrowser.on('disconnected', () => {
      console.warn('[LiveController] ⚠️ Chromium terputus, akan dibuat ulang saat diperlukan.');
      sharedBrowser = null;
    });
  }
  return sharedBrowser;
}

/**
 * Parsing cookie dari database (string atau JSON) ke format Playwright.
 */
function parseCookieString(rawCookieStr) {
  if (!rawCookieStr) return [];
  if (rawCookieStr.trim().startsWith('[')) {
    try { return JSON.parse(rawCookieStr); } catch (_) {}
  }
  return rawCookieStr
    .split(';')
    .map(c => c.trim())
    .filter(Boolean)
    .map(pair => {
      const idx = pair.indexOf('=');
      if (idx === -1) return null;
      return { name: pair.slice(0, idx), value: pair.slice(idx + 1), domain: '.shopee.co.id', path: '/' };
    })
    .filter(Boolean);
}

/**
 * Blokir resource berat untuk menghemat RAM & bandwidth.
 * Bot hanya butuh HTML + JS, tidak butuh gambar/video/CSS.
 */
async function blockHeavyResources(page) {
  await page.route('**/*', (route) => {
    const type = route.request().resourceType();
    const blockedTypes = ['image', 'media', 'font', 'stylesheet', 'other'];
    if (blockedTypes.includes(type)) {
      route.abort();
    } else {
      route.continue();
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────
// FITUR 1: AUTO-PIN (SEMATKAN ETALASE) + EKSTRAK LINK → TELEGRAM HOST
// ─────────────────────────────────────────────────────────────────────────

/**
 * Mengklik tombol "Sematkan" pada indeks produk yang diminta,
 * mengekstrak link produk, dan mengirimkan link tersebut ke Telegram Host.
 *
 * Fungsi ini dipanggil dari dua tempat:
 *  1. TelegramBot.js → saat Host menekan tombol pin di Telegram
 *  2. startLiveChatObserver → saat penonton request "spill no X"
 *
 * @param {string} accountId   - ID ShopeeAccount (UUID atau short)
 * @param {number} itemIndex   - Nomor urut produk di etalase (1-based)
 * @returns {{ success: boolean, message: string, productUrl?: string }}
 */
export const pinProductInShopee = async (accountId, itemIndex) => {
  console.log(`[Pin] 📌 Request sematkan produk #${itemIndex} untuk akun ${accountId}`);

  // Cek apakah akun ini memiliki sesi observer yang aktif (reuse page)
  const activeSession = activeObservers.get(accountId);
  let page = activeSession?.page || null;
  let context = activeSession?.context || null;
  let ownedContext = false; // Apakah kita membuat context baru (perlu di-close)

  try {
    // Jika tidak ada observer aktif, buat context sementara
    if (!page) {
      console.log(`[Pin] Tidak ada observer aktif untuk ${accountId}, membuat context sementara...`);
      
      // Ambil cookie dari database
      const session = await prisma.shopeeSession.findFirst({
        where: { account_id: accountId, status: 'LIVE' },
        select: { raw_cookie_encrypted: true },
      });
      if (!session) {
        return { success: false, message: 'Tidak ada sesi LIVE aktif untuk akun ini.' };
      }

      const browser = await getSharedBrowser();
      context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Mobile Safari/537.36',
        viewport: { width: 390, height: 844 },
      });
      await context.addCookies(parseCookieString(session.raw_cookie_encrypted));
      page = await context.newPage();
      await blockHeavyResources(page);
      ownedContext = true;

      // Navigasi ke halaman Live Studio
      await page.goto('https://creator.shopee.co.id/portal/live', {
        waitUntil: 'domcontentloaded',
        timeout: 40000,
      });
      await page.waitForTimeout(3000);
    }

    // ── LANGKAH 1: Buka laci etalase (keranjang kuning) ─────────────────
    console.log('[Pin] 📂 Mencari tombol laci etalase...');
    const shoppingBagSelector = [
      '[class*="shopping-bag"]',
      '[class*="bag-icon"]',
      '[aria-label*="keranjang"]',
      '[aria-label*="etalase"]',
      'button[class*="product"]',
    ].join(', ');

    const bagBtn = await page.$(shoppingBagSelector);
    if (bagBtn) {
      await bagBtn.click();
      await page.waitForTimeout(1500);
    } else {
      console.warn('[Pin] ⚠️ Tombol laci etalase tidak ditemukan, mencoba lanjut...');
    }

    // ── LANGKAH 2: Cari produk berdasar indeks ───────────────────────────
    // Shopee Live biasanya menampilkan list produk dalam container scrollable
    const productItemSelectors = [
      '[class*="product-list"] > *',
      '[class*="etalase-item"]',
      '[class*="shelf-product"]',
      '[class*="live-product"]',
    ];

    let productItems = [];
    for (const sel of productItemSelectors) {
      productItems = await page.$$(sel);
      if (productItems.length > 0) break;
    }

    if (productItems.length === 0) {
      return { success: false, message: 'Daftar produk etalase tidak ditemukan di halaman.' };
    }

    const targetIndex = Math.max(0, itemIndex - 1); // Konversi 1-based ke 0-based
    if (targetIndex >= productItems.length) {
      return {
        success: false,
        message: `Produk #${itemIndex} tidak ditemukan. Hanya ada ${productItems.length} produk di etalase.`,
      };
    }

    const targetItem = productItems[targetIndex];

    // ── LANGKAH 3: Ekstrak link produk sebelum klik ──────────────────────
    let productUrl = null;
    try {
      // Coba ambil href dari elemen anchor di dalam item produk
      const anchor = await targetItem.$('a[href]');
      if (anchor) {
        const href = await anchor.getAttribute('href');
        productUrl = href?.startsWith('http')
          ? href
          : `https://shopee.co.id${href}`;
      }

      // Fallback: cari atribut data-url atau data-link
      if (!productUrl) {
        const dataUrl = await targetItem.getAttribute('data-url')
          || await targetItem.getAttribute('data-link')
          || await targetItem.getAttribute('data-product-url');
        if (dataUrl) productUrl = dataUrl.startsWith('http') ? dataUrl : `https://shopee.co.id${dataUrl}`;
      }
    } catch (_) {}

    // ── LANGKAH 4: Klik tombol "Sematkan" ────────────────────────────────
    const pinBtnSelector = [
      '[class*="pin-btn"]',
      '[class*="sematkan"]',
      'button[class*="highlight"]',
      '[aria-label*="sematkan"]',
      '[aria-label*="pin"]',
    ].join(', ');

    const pinBtn = await targetItem.$(pinBtnSelector);
    if (pinBtn) {
      await pinBtn.click();
      await page.waitForTimeout(1000);
      console.log(`[Pin] ✅ Produk #${itemIndex} berhasil disematkan!`);
    } else {
      // Fallback: klik item itu sendiri (beberapa versi UI Shopee langsung sematkan saat diklik)
      await targetItem.click();
      await page.waitForTimeout(1000);
      console.log(`[Pin] ✅ Produk #${itemIndex} diklik (fallback). Semoga tersematkan!`);
    }

    // ── LANGKAH 5: Kirim link ke Telegram Host ───────────────────────────
    const linkText = productUrl
      ? `🔗 <b>Link Produk #${itemIndex}:</b>\n${productUrl}`
      : `📌 Produk #${itemIndex} sudah disematkan. Link tidak berhasil diekstrak.`;

    await broadcastMessage(
      `✅ <b>Sematkan #${itemIndex} Berhasil!</b>\n` +
      `📦 Akun: <code>${accountId}</code>\n\n` +
      linkText +
      `\n\n<i>Klik link di atas dan bacakan deskripsi produk ke penonton.</i>`
    );

    // ── LANGKAH 6: Tutup laci etalase ────────────────────────────────────
    try {
      const closeBtn = await page.$('[class*="close"], [aria-label*="tutup"], [aria-label*="close"]');
      if (closeBtn) await closeBtn.click();
    } catch (_) {}

    return { success: true, message: `Produk #${itemIndex} berhasil disematkan.`, productUrl };

  } catch (err) {
    console.error(`[Pin] ❌ Error saat menyematkan produk:`, err.message);
    return { success: false, message: err.message };
  } finally {
    // Tutup context jika kita yang membuatnya (bukan milik observer aktif)
    if (ownedContext && context) {
      await context.close().catch(() => {});
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────
// FITUR 2: DOM OBSERVER (PEMANTAU CHAT LIVE)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Memasang MutationObserver pada halaman Live Shopee untuk mendeteksi
 * pesan masuk dari penonton secara real-time.
 * Observer berjalan di dalam context Playwright milik akun ini.
 *
 * @param {string} accountId  - ID ShopeeAccount
 * @param {string} username   - Username untuk log
 */
export const startLiveChatObserver = async (accountId, username = accountId) => {
  if (activeObservers.has(accountId)) {
    console.log(`[Observer] ⚡ Observer untuk @${username} sudah aktif, skip duplikat.`);
    return;
  }

  console.log(`[Observer] 👀 Memulai Observer untuk @${username}...`);

  try {
    // Ambil sesi & cookie dari database
    const session = await prisma.shopeeSession.findFirst({
      where: { account_id: accountId, status: 'LIVE' },
      include: { account: { select: { shopee_username: true } } },
    });

    if (!session?.raw_cookie_encrypted) {
      console.warn(`[Observer] ⚠️ Tidak ada cookie untuk akun ${accountId}.`);
      return;
    }

    const browser = await getSharedBrowser();
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Mobile Safari/537.36',
      viewport: { width: 390, height: 844 },
    });

    await context.addCookies(parseCookieString(session.raw_cookie_encrypted));
    const page = await context.newPage();

    // Blokir resource berat agar ringan
    await blockHeavyResources(page);

    // Navigasi ke panel live
    await page.goto('https://creator.shopee.co.id/portal/live', {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    await page.waitForTimeout(3000);

    // Verifikasi login masih valid
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('passport')) {
      console.warn(`[Observer] 🔴 Cookie EXPIRED untuk @${username}. Observer dibatalkan.`);
      await context.close().catch(() => {});
      return;
    }

    // ── Pasang MutationObserver via page.exposeFunction ──────────────────
    // Saat browser mendeteksi node chat baru, panggil fungsi Node.js ini.
    await page.exposeFunction('onNewChatMessage', async (viewerName, chatText) => {
      const match = chatText.match(SPILL_REGEX);
      if (match) {
        const productIndex = parseInt(match[1], 10);
        console.log(`[Observer] 🔥 @${username}: "${chatText}" → Request produk #${productIndex}`);

        // Kirim notifikasi Telegram dulu (dengan tombol pin)
        await sendLiveChatNotification(accountId, viewerName, chatText, productIndex);

        // Otomatis jalankan pin
        await pinProductInShopee(accountId, productIndex);
      }
    });

    // Injeksi MutationObserver ke DOM halaman Live
    await page.evaluate(() => {
      // Selector umum untuk container chat Shopee Live
      const chatSelectors = [
        '[class*="chat-container"]',
        '[class*="comment-list"]',
        '[class*="live-chat"]',
        '[class*="message-list"]',
      ];

      let chatContainer = null;
      for (const sel of chatSelectors) {
        chatContainer = document.querySelector(sel);
        if (chatContainer) break;
      }

      if (!chatContainer) {
        console.warn('[Observer] Container chat tidak ditemukan, mencoba observer pada body...');
        chatContainer = document.body;
      }

      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType !== 1) continue; // Hanya Element nodes

            // Ekstrak nama & teks dari struktur HTML chat Shopee
            const nameEl = node.querySelector?.('[class*="username"], [class*="user-name"], [class*="nickname"]');
            const textEl = node.querySelector?.('[class*="content"], [class*="text"], [class*="message"]');

            const viewerName = nameEl?.innerText?.trim() || 'Penonton';
            const chatText   = textEl?.innerText?.trim() || node.innerText?.trim() || '';

            if (chatText) {
              // Panggil fungsi Node.js yang sudah di-expose
              window.onNewChatMessage(viewerName, chatText);
            }
          }
        }
      });

      observer.observe(chatContainer, { childList: true, subtree: true });
      console.log('[Observer] ✅ MutationObserver terpasang pada container chat.');
    });

    // Simpan context & page ke Map agar bisa di-reuse oleh pinProductInShopee
    activeObservers.set(accountId, { context, page, username });
    console.log(`[Observer] ✅ Observer aktif untuk @${username}.`);

    // Pantau jika halaman crash/ditutup
    page.on('close', () => {
      console.warn(`[Observer] ⚠️ Page @${username} ditutup. Menghapus dari activeObservers.`);
      activeObservers.delete(accountId);
    });

  } catch (err) {
    console.error(`[Observer] ❌ Gagal memulai observer untuk @${username}:`, err.message);
    activeObservers.delete(accountId);
  }
};

// ─────────────────────────────────────────────────────────────────────────
// FITUR 3: DYNAMIC OBSERVER MANAGER (dipanggil dari server/index.js)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Polling database setiap 2 menit untuk mendeteksi sesi LIVE baru/selesai.
 * Menggantikan hardcode startLiveChatObserver('A201_KOSMETIK').
 */
export const startDynamicLiveObserver = () => {
  console.log('[LiveController] 🔍 Dynamic Observer Manager aktif. Polling setiap 2 menit...');

  const poll = async () => {
    try {
      const liveSessions = await prisma.shopeeSession.findMany({
        where:   { status: 'LIVE' },
        include: { account: { select: { id: true, shopee_username: true } } },
      });

      const liveAccountIds = new Set(liveSessions.map(s => s.account_id));

      // Mulai observer baru untuk akun yang baru LIVE
      for (const session of liveSessions) {
        if (!activeObservers.has(session.account_id)) {
          await startLiveChatObserver(
            session.account_id,
            session.account?.shopee_username || session.account_id
          );
        }
      }

      // Tutup observer untuk akun yang sudah tidak LIVE
      for (const [accountId, { context }] of activeObservers.entries()) {
        if (!liveAccountIds.has(accountId)) {
          console.log(`[LiveController] 🛑 Menutup observer ${accountId} (sudah tidak LIVE).`);
          await context.close().catch(() => {});
          activeObservers.delete(accountId);
        }
      }

      if (activeObservers.size > 0) {
        console.log(`[LiveController] 📡 ${activeObservers.size} akun sedang diawasi.`);
      }
    } catch (err) {
      console.error('[LiveController] ❌ Error polling database:', err.message);
    }
  };

  poll(); // Jalankan pertama kali segera
  setInterval(poll, POLL_INTERVAL_MS);
};
