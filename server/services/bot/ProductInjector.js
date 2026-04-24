import { chromium } from 'playwright';
import prisma from '../../db.js';

// ============================================================
// KONSTANTA & KONFIGURASI
// ============================================================

/** URL langsung ke halaman pengelolaan produk keranjang Shopee Live (paling efisien) */
const SHOPEE_LIVE_PRODUCT_URL = 'https://seller.shopee.co.id/live/';

/** Jeda acak antar klik produk — agar tidak terdeteksi sebagai bot */
const randomDelay = (min = 3000, max = 7000) =>
  new Promise(r => setTimeout(r, min + Math.floor(Math.random() * (max - min))));

/** Jeda pendek untuk UI merespons */
const shortDelay = (ms = 1500) =>
  new Promise(r => setTimeout(r, ms + Math.floor(Math.random() * 500)));

// ============================================================
// HELPER: Parse Cookie String ke Format Playwright
// ============================================================
const parseCookieString = (rawCookieStr) => {
  if (!rawCookieStr) return [];
  if (rawCookieStr.trim().startsWith('[')) {
    try { return JSON.parse(rawCookieStr); } catch (_) {}
  }
  return rawCookieStr.split(';')
    .map(c => c.trim())
    .filter(Boolean)
    .map(pair => {
      const firstEq = pair.indexOf('=');
      if (firstEq === -1) return null;
      return {
        name: pair.slice(0, firstEq).trim(),
        value: pair.slice(firstEq + 1).trim(),
        domain: '.shopee.co.id',
        path: '/'
      };
    })
    .filter(Boolean);
};

// ============================================================
// FUNGSI INTI: Hapus Seluruh Produk Lama di Keranjang Live
// ============================================================
const clearEtalaseViaPlaywright = async (page) => {
  console.log('[Injector] 🧹 Membersihkan etalase lama...');

  try {
    // Tunggu daftar produk muncul di keranjang
    await page.waitForSelector('[data-testid="live-product-item"], .live-product-item, .product-card', {
      timeout: 10000
    }).catch(() => null); // Tidak error jika kosong

    // Cari semua tombol hapus (✕ / delete) pada produk yang sudah ada
    let deleteButtons = await page.$$('[data-testid="remove-product"], .btn-remove-product, button.delete-btn');

    if (deleteButtons.length === 0) {
      // Coba selector alternatif umum Shopee
      deleteButtons = await page.$$('button[class*="remove"], button[class*="delete"], button[aria-label*="hapus"], button[aria-label*="remove"]');
    }

    if (deleteButtons.length === 0) {
      console.log('[Injector]    → Etalase sudah kosong, lanjut injeksi produk baru.');
      return;
    }

    console.log(`[Injector]    → Ditemukan ${deleteButtons.length} produk lama. Menghapus satu per satu...`);

    // Hapus satu per satu dari belakang (hindari index bergeser)
    for (let i = deleteButtons.length - 1; i >= 0; i--) {
      try {
        await deleteButtons[i].click();
        await shortDelay(800);

        // Konfirmasi dialog hapus jika muncul
        const confirmBtn = await page.$('[data-testid="modal-confirm"], button:has-text("Hapus"), button:has-text("Konfirmasi"), button:has-text("OK")');
        if (confirmBtn) {
          await confirmBtn.click();
          await shortDelay(1000);
        }
      } catch (_) { /* Tombol mungkin sudah tidak ada */ }
    }

    console.log('[Injector]    ✅ Etalase berhasil dikosongkan.');
  } catch (err) {
    console.warn('[Injector]    ⚠️ Gagal bersihkan etalase, lanjut injeksi:', err.message);
  }
};

// ============================================================
// FUNGSI INTI: Tambah 1 Produk via URL ke Keranjang Live
// ============================================================
const addSingleProductByUrl = async (page, productUrl, productName, index, total) => {
  console.log(`[Injector]    ➔ [${index + 1}/${total}] Menambahkan: ${productName || productUrl}`);

  try {
    // 1. Klik tombol "Tambah Produk" / "Add Product"
    const addBtn = await page.$(
      'button:has-text("Tambah Produk"), button:has-text("Add Product"), ' +
      'button[data-testid="add-product-btn"], button[class*="add-product"]'
    );

    if (!addBtn) {
      throw new Error('Tombol Tambah Produk tidak ditemukan. Pastikan ada sesi Live aktif.');
    }

    await addBtn.click();
    await shortDelay(1500);

    // 2. Cari input search / URL produk
    const searchInput = await page.waitForSelector(
      'input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="link"], ' +
      'input[placeholder*="cari"], input[type="search"], input[data-testid="product-search-input"]',
      { timeout: 8000 }
    );

    await searchInput.clear();
    await searchInput.type(productUrl, { delay: 50 }); // Ketik per karakter seperti manusia
    await page.keyboard.press('Enter');
    await shortDelay(2500); // Tunggu hasil pencarian

    // 3. Pilih produk pertama dari hasil pencarian
    const firstResult = await page.$(
      '[data-testid="product-result-item"]:first-child, ' +
      '.product-search-result:first-child, ' +
      '.search-result-item:first-child'
    );

    if (!firstResult) {
      throw new Error(`Produk tidak ditemukan di hasil pencarian: ${productUrl}`);
    }

    // 4. Klik tombol tambah/centang pada item hasil
    const addItemBtn = await firstResult.$(
      'button:has-text("Tambah"), button:has-text("Add"), button[class*="add"], ' +
      'button[data-testid="add-item"], input[type="checkbox"]'
    );

    if (addItemBtn) {
      await addItemBtn.click();
    } else {
      // Fallback: klik langsung item-nya
      await firstResult.click();
    }

    await shortDelay(1000);

    // 5. Konfirmasi tambah jika ada popup
    const confirmBtn = await page.$('button:has-text("Simpan"), button:has-text("Konfirmasi"), button:has-text("OK"), [data-testid="modal-confirm"]');
    if (confirmBtn) {
      await confirmBtn.click();
      await shortDelay(800);
    }

    // 6. Tutup modal jika ada tombol close
    const closeModal = await page.$('[data-testid="modal-close"], button[aria-label="Close"], button.modal-close');
    if (closeModal) {
      await closeModal.click();
      await shortDelay(500);
    }

    console.log(`[Injector]    ✅ Produk ke-${index + 1} berhasil ditambahkan.`);
    return true;

  } catch (err) {
    console.error(`[Injector]    ❌ Gagal tambah produk ke-${index + 1}: ${err.message}`);
    return false;
  }
};

// ============================================================
// FUNGSI UTAMA: Injeksi Satu Akun
// ============================================================
const injectSingleAccount = async (akun, session, products, clearEtalase = false) => {
  console.log(`\n[Injector] 🚀 Memulai Injeksi: @${akun.shopee_username} (${products.length} produk)`);

  let browser = null;
  let context = null;
  const results = { added: 0, failed: 0, errors: [] };

  try {
    // === STEP 1: Buka Browser Headless (Berjalan di Background) ===
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    context = await browser.newContext({
      userAgent: session.user_agent ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      extraHTTPHeaders: {
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      viewport: { width: 1366, height: 768 }
    });

    // Sembunyikan tanda-tanda otomasi dari Shopee Anti-Bot
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      window.chrome = { runtime: {} };
    });

    // === STEP 2: Inject Cookies ===
    const parsedCookies = parseCookieString(session.raw_cookie_encrypted);
    if (parsedCookies.length === 0) {
      throw new Error('Cookie tidak valid atau kosong. Harap perbarui cookie akun ini.');
    }
    await context.addCookies(parsedCookies);
    console.log(`[Injector]    → ${parsedCookies.length} cookie berhasil diinjeksi.`);

    // === STEP 3: Navigasi ke Shopee Live Seller Center ===
    const page = await context.newPage();
    console.log(`[Injector]    → Navigasi ke ${SHOPEE_LIVE_PRODUCT_URL}...`);

    await page.goto(SHOPEE_LIVE_PRODUCT_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });

    await shortDelay(3000);

    // === STEP 4: Verifikasi Login ===
    const currentUrl = page.url();
    if (
      currentUrl.includes('/login') ||
      currentUrl.includes('/passport') ||
      currentUrl.includes('/authorize')
    ) {
      throw new Error('COOKIE_EXPIRED: Sesi login telah kedaluwarsa. Harap perbarui cookie.');
    }

    console.log('[Injector]    ✅ Login terverifikasi. Halaman Live terbuka.');

    // === STEP 5: Kosongkan Etalase Lama (jika diminta) ===
    if (clearEtalase) {
      await clearEtalaseViaPlaywright(page);
      await shortDelay(2000);
    }

    // === STEP 6: Injeksi Produk Satu per Satu ===
    console.log(`[Injector]    → Memulai injeksi ${products.length} produk...`);

    for (let i = 0; i < products.length; i++) {
      const prod = products[i];
      const success = await addSingleProductByUrl(page, prod.product_url, prod.product_name, i, products.length);

      if (success) {
        results.added++;
      } else {
        results.failed++;
        results.errors.push(`Produk ${i + 1}: ${prod.product_url}`);
      }

      // Jeda acak antar produk (3-7 detik) agar tidak kena rate limit
      if (i < products.length - 1) {
        const delay = 3000 + Math.floor(Math.random() * 4000);
        console.log(`[Injector]    ⏱️ Jeda ${(delay / 1000).toFixed(1)} detik sebelum produk berikutnya...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }

    console.log(`[Injector] 🏁 Selesai @${akun.shopee_username}: ✅ ${results.added} berhasil, ❌ ${results.failed} gagal`);
    return { username: akun.shopee_username, success: true, ...results };

  } catch (err) {
    const isExpired = err.message.includes('COOKIE_EXPIRED');
    console.error(`[Injector] ❌ Error pada @${akun.shopee_username}: ${err.message}`);

    // Jika cookie expired, update status sesi di database
    if (isExpired && session?.id) {
      await prisma.shopeeSession.update({
        where: { id: session.id },
        data: { status: 'EXPIRED', expired_at: new Date() }
      }).catch(() => {});
    }

    return {
      username: akun.shopee_username,
      success: false,
      added: results.added,
      failed: products.length - results.added,
      error: err.message
    };
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
};

// ============================================================
// ENTRY POINT UTAMA — dipanggil oleh route, cron, atau Telegram
// ============================================================
export const runProductInjection = async (idOrUsername, options = { clearEtalase: false }) => {
  console.log(`\n[Injector] 🤖 ====== AUTO-INJECT ETALASE ======`);
  console.log(`[Injector] Target: ${idOrUsername} | ClearEtalase: ${options.clearEtalase}`);

  try {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(idOrUsername);
    let targets = []; // Array of { account, session, products }

    // === IDENTIFIKASI TARGET: Akun Tunggal vs Seluruh Studio ===
    const singleAccount = await prisma.shopeeAccount.findFirst({
      where: isUuid
        ? { id: idOrUsername, deleted_at: null }
        : { shopee_username: idOrUsername, deleted_at: null },
      include: {
        studio: { include: { products: { orderBy: { order_index: 'asc' } } } },
        sessions: {
          where: { status: 'LIVE' },
          orderBy: { created_at: 'desc' },
          take: 1
        }
      }
    });

    if (singleAccount) {
      targets = [singleAccount];
    } else if (isUuid) {
      // Coba cari sebagai Studio ID
      const studio = await prisma.studio.findUnique({
        where: { id: idOrUsername },
        include: {
          products: { orderBy: { order_index: 'asc' } },
          shopee_accounts: {
            where: { deleted_at: null },
            include: {
              sessions: {
                where: { status: 'LIVE' },
                orderBy: { created_at: 'desc' },
                take: 1
              }
            }
          }
        }
      });

      if (!studio) {
        return { success: false, message: `ID '${idOrUsername}' tidak ditemukan sebagai Akun maupun Studio.` };
      }

      if (studio.shopee_accounts.length === 0) {
        return { success: false, message: `Studio '${studio.name}' tidak memiliki akun aktif.` };
      }

      if (studio.products.length === 0) {
        return { success: false, message: `Studio '${studio.name}' belum memiliki daftar produk. Tambahkan produk terlebih dahulu.` };
      }

      // Gabungkan produk studio ke setiap akun
      targets = studio.shopee_accounts.map(acc => ({
        ...acc,
        studio: { products: studio.products }
      }));
    }

    if (targets.length === 0) {
      return { success: false, message: `Target '${idOrUsername}' tidak ditemukan.` };
    }

    // === FILTER: Hanya akun yang punya sesi LIVE aktif ===
    const liveTargets = targets.filter(acc => acc.sessions?.length > 0);
    const noSessionTargets = targets.filter(acc => !acc.sessions?.length);

    if (noSessionTargets.length > 0) {
      console.warn(`[Injector] ⚠️ ${noSessionTargets.length} akun dilewati (tidak ada sesi LIVE aktif).`);
    }

    if (liveTargets.length === 0) {
      return {
        success: false,
        message: 'Tidak ada akun yang sedang LIVE. Injeksi hanya bisa dilakukan saat akun memiliki sesi Live aktif.'
      };
    }

    console.log(`[Injector] ⚡ ${liveTargets.length} akun LIVE siap diinjeksi.\n`);

    // === EKSEKUSI: Satu per Satu (Serial) untuk Menghindari Deteksi Bot ===
    // (Tidak paralel karena setiap browser Playwright membutuhkan RAM ~200MB)
    const allResults = [];
    let totalAdded = 0;
    let totalFailed = 0;

    for (const acc of liveTargets) {
      const session = acc.sessions[0];
      const products = acc.studio?.products || [];

      if (products.length === 0) {
        allResults.push({ username: acc.shopee_username, success: false, error: 'Tidak ada produk di brankas studio.' });
        continue;
      }

      // Catat BotTask ke database sebelum mulai
      const task = await prisma.botTask.create({
        data: {
          account_id: acc.id,
          task_type: 'AUTO_INJECT',
          status: 'PROCESSING'
        }
      });

      const result = await injectSingleAccount(acc, session, products, options.clearEtalase);

      // Update status BotTask setelah selesai
      await prisma.botTask.update({
        where: { id: task.id },
        data: {
          status: result.success ? 'COMPLETED' : 'FAILED',
          finished_at: new Date(),
          payload: {
            added: result.added,
            failed: result.failed,
            errors: result.errors || [],
            clearEtalase: options.clearEtalase
          }
        }
      });

      allResults.push(result);
      totalAdded += result.added || 0;
      totalFailed += result.failed || 0;

      // Jeda 10 detik antar akun jika ada lebih dari 1
      if (liveTargets.indexOf(acc) < liveTargets.length - 1) {
        console.log('[Injector] ⏳ Jeda 10 detik sebelum akun berikutnya...');
        await new Promise(r => setTimeout(r, 10000));
      }
    }

    console.log(`\n[Injector] 🎉 INJEKSI SELESAI`);
    console.log(`[Injector]    Total Ditambahkan : ${totalAdded}`);
    console.log(`[Injector]    Total Gagal       : ${totalFailed}`);
    console.log(`[Injector]    Akun Diproses     : ${liveTargets.length}`);
    console.log(`[Injector]    Akun Dilewati     : ${noSessionTargets.length}`);
    console.log('[Injector] ==========================================\n');

    return {
      success: true,
      totalAdded,
      totalFailed,
      processedAccounts: liveTargets.length,
      skippedAccounts: noSessionTargets.length,
      details: allResults
    };

  } catch (err) {
    console.error('[Injector] ❌ Fatal Error:', err);
    return { success: false, message: err.message };
  }
};
