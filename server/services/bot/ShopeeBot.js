import { chromium } from 'playwright';

export class ShopeeBot {
  constructor() {
    this.browser = null;
  }

  /**
   * Helper: Parsing cookie string mentah ke format Playwright.
   */
  parseCookieString(rawCookieStr) {
    if (!rawCookieStr) return [];
    
    if (rawCookieStr.trim().startsWith('[')) {
      try {
        return JSON.parse(rawCookieStr);
      } catch(e) {
        console.error('[Bot] Gagal parse JSON cookie, mencoba sebagai raw text');
      }
    }

    const splitted = rawCookieStr.split(';').map(c => c.trim()).filter(Boolean);
    const result = [];
    
    for (const pair of splitted) {
      const firstEq = pair.indexOf('=');
      if (firstEq === -1) continue;
      const key = pair.slice(0, firstEq);
      const value = pair.slice(firstEq + 1);
      
      result.push({
        name: key,
        value: value,
        domain: '.shopee.co.id',
        path: '/'
      });
    }
    return result;
  }

  /**
   * Helper: Membersihkan format string Rupiah menjadi integer.
   * Contoh: "Rp1.234.567" → 1234567
   */
  parseRupiahToInt(str) {
    if (!str) return 0;
    const cleaned = str.replace(/[^0-9]/g, '');
    return parseInt(cleaned, 10) || 0;
  }

  /**
   * RADAR DETEKSI: Mengecek apakah akun sedang aktif siaran Live.
   * Fungsi ringan: hanya membuka halaman list, tanpa mengekstrak omzet.
   * Dipakai oleh CRON 4 (Radar, setiap 15 menit).
   * @returns {Object} { isLive: boolean, status: 'LIVE'|'ACTIVE'|'EXPIRED'|'ERROR' }
   */
  async checkIsLive(session) {
    console.log(`[Radar] 🔭 Mengecek status siaran @${session.account?.shopee_username ?? session.id.substring(0,8)}...`);

    let context;
    try {
      const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
      });

      context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      });

      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      });

      const parsedCookies = this.parseCookieString(session.raw_cookie_encrypted);
      await context.addCookies(parsedCookies);

      const page = await context.newPage();

      // Navigasi ke halaman list siaran Live milik akun ini
      await page.goto('https://creator.shopee.co.id/portal/live/list', {
        waitUntil: 'domcontentloaded',
        timeout: 40000
      });
      await page.waitForTimeout(2500 + Math.floor(Math.random() * 1500));

      // Cek apakah akun ditendang ke halaman login (Cookie Expired)
      const currentUrl = page.url();
      if (currentUrl.includes('/login') || currentUrl.includes('passport')) {
        console.log(`[Radar] 🔴 Cookie EXPIRED terdeteksi.`);
        return { isLive: false, status: 'EXPIRED' };
      }

      // Deteksi indikator siaran aktif dari teks di halaman:
      // Shopee biasanya menampilkan badge "Sedang Berlangsung" atau "LIVE" pada kartu sesi aktif
      const isLiveDetected = await page.evaluate(() => {
        const bodyText = document.body.innerText.toLowerCase();
        const indicators = ['sedang berlangsung', 'on air', 'live now', 'siaran berlangsung'];
        return indicators.some(keyword => bodyText.includes(keyword));
      });

      if (isLiveDetected) {
        console.log(`[Radar] 📡 Siaran LIVE terdeteksi! Mengubah status...`);
        return { isLive: true, status: 'LIVE' };
      } else {
        console.log(`[Radar] 💤 Tidak ada siaran aktif. Status: OFFLINE (Siaga).`);
        return { isLive: false, status: 'OFFLINE' };
      }

    } catch (err) {
      console.error(`[Radar] ❌ Error saat deteksi siaran:`, err.message);
      return { isLive: false, status: 'ERROR' };
    } finally {
      if (context) await context.close().catch(() => {});
    }
  }

  /**
   * Menginjeksi cookie, masuk ke Shopee Creator Dashboard,
   * lalu mengambil data omzet live secara asli dari DOM.
   * Hasilnya bisa disimpan per jam ke tabel live_performances.
   */
  async checkHealthAndOmzet(session) {
    console.log(`[Bot] 🤖 Mulai crawl sesi (ID: ${session.id})...`);
    
    let context;
    try {
      this.browser = await chromium.launch({ 
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox', 
          '--disable-blink-features=AutomationControlled'
        ]
      });

      context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        extraHTTPHeaders: {
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      });

      // Sembunyikan tanda-tanda bot Playwright dari Shopee Anti-Bot
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      });

      // Inject cookies dari database
      const parsedCookies = this.parseCookieString(session.raw_cookie_encrypted);
      await context.addCookies(parsedCookies);

      const page = await context.newPage();
      
      // === API INTERCEPTION (Menangkap Jalur Belakang) ===
      let interceptedProducts = [];
      page.on('response', async (response) => {
        const url = response.url();
        // Coba tangkap request API Shopee terkait live metrics / items
        if (url.includes('api/v') && (url.includes('live') || url.includes('item') || url.includes('product'))) {
          try {
            const json = await response.json();
            const str = JSON.stringify(json);
            
            // Cek jika response memiliki ciri-ciri array produk
            if (str.includes('product_id') || str.includes('item_id')) {
              // Fungsi rekursif untuk mencari array di kedalaman JSON
              const findArray = (obj) => {
                if (Array.isArray(obj) && obj.length > 0 && (obj[0].product_id || obj[0].item_id || obj[0].name)) return obj;
                if (typeof obj === 'object' && obj !== null) {
                  for (let key in obj) {
                     const found = findArray(obj[key]);
                     if (found) return found;
                  }
                }
                return null;
              };
              
              const productsArray = findArray(json);
              if (productsArray && productsArray.length > 0) {
                // Konversi key API Shopee ke struktur standar kita
                interceptedProducts = productsArray.map(p => ({
                   id: p.item_id || p.product_id || p.id || Math.random().toString(),
                   name: p.name || p.product_name || p.title || 'Produk',
                   image: p.image || p.cover || p.image_url || 'https://via.placeholder.com/100',
                   harga: p.price || p.current_price || p.min_price || 0,
                   stok: p.stock || p.available_stock || p.normal_stock || 0,
                   klik: p.clicks || p.item_clicks || 0,
                   keranjang: p.add_to_cart || p.cart_adds || 0,
                   terjual: p.sold || p.orders || p.sales || 0,
                   kom: p.commission_rate || p.commission || 0,
                   url: p.url || p.product_url || '#'
                }));
                console.log(`[Bot] 🕵️‍♂️ [API Interception] Berhasil menyadap ${interceptedProducts.length} produk dari jalur belakang!`);
              }
            }
          } catch(e) { /* Abaikan response yang gagal diparse */ }
        }
      });
      
      // === LANGKAH 1: Navigasi ke Dashboard Creator ===
      console.log(`[Bot] Navigasi ke creator.shopee.co.id...`);
      await page.goto('https://creator.shopee.co.id/portal/live/list', { 
        waitUntil: 'domcontentloaded', 
        timeout: 45000 
      });

      // Jeda alami agar terasa seperti aktivitas manusia
      await page.waitForTimeout(2000 + Math.floor(Math.random() * 1500));

      // === LANGKAH 2: Verifikasi Status Login ===
      const currentUrl = page.url();
      if (currentUrl.includes('/login') || currentUrl.includes('/authorize') || currentUrl.includes('passport')) {
        console.log(`[Bot] ❌ Sesi Expired! Diarahkan ke halaman login.`);
        return { status: 'EXPIRED', omzet_live: 0, omzet_komisi: 0, viewers: 0, buyers: 0 };
      }

      console.log(`[Bot] ✅ Login valid, mulai mengekstrak data omzet...`);

      // === LANGKAH 3: Navigasi ke Halaman Data Analytics ===
      await page.goto('https://creator.shopee.co.id/portal/data/live', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      await page.waitForTimeout(3000 + Math.floor(Math.random() * 2000));

      // === LANGKAH 4: Ekstraksi Data dari DOM ===
      const crawledData = await page.evaluate(() => {
        const result = {
          omzet_raw: '0',
          komisi_raw: '0',
          viewers_raw: '0',
          buyers_raw: '0',
          live_title: '',
        };

        // Ambil semua card metrics yang memiliki class eds-metrics-card__value
        const metricValues = Array.from(document.querySelectorAll('.eds-metrics-card__value'));
        
        // Shopee Dashboard biasanya menampilkan urutan: 
        // 1. Omzet (Revenue) -> berisi "Rp"
        // 2. Komisi (Estimated Commission) -> berisi "Rp"
        // 3. Pesanan/Pembeli (Orders/Buyers)
        // 4. Penonton (Viewers)

        const rupiahMetrics = metricValues.filter(el => el.innerText.includes('Rp'));
        const numberMetrics = metricValues.filter(el => !el.innerText.includes('Rp'));

        // Strategi: Omzet biasanya adalah Rp pertama yang paling besar
        if (rupiahMetrics.length > 0) result.omzet_raw = rupiahMetrics[0].innerText;
        if (rupiahMetrics.length > 1) result.komisi_raw = rupiahMetrics[1].innerText;

        // Strategi: Penonton dan Pembeli dari non-Rupiah metrics
        if (numberMetrics.length > 0) result.buyers_raw = numberMetrics[0].innerText;
        if (numberMetrics.length > 1) result.viewers_raw = numberMetrics[1].innerText;

        // Fallback: Jika class spesifik tidak ditemukan, cari teks umum
        if (result.omzet_raw === '0') {
           const allText = document.body.innerText;
           const matches = allText.match(/Rp[\s]*[\d.,]+/g) || [];
           if (matches.length > 0) result.omzet_raw = matches[0];
           if (matches.length > 1) result.komisi_raw = matches[1];
        }

        // Ambil Judul Live (biasanya ada di header atau breadcrumb)
        const titleEl = document.querySelector('[class*="live-title"], h1, h2');
        result.live_title = titleEl ? titleEl.innerText : document.title;

        return result;
      });

      // === LANGKAH 5: Konversi & Bersihkan Data ===
      const omzet_live    = this.parseRupiahToInt(crawledData.omzet_raw);
      const omzet_komisi  = this.parseRupiahToInt(crawledData.komisi_raw);
      const viewers       = parseInt(crawledData.viewers_raw.replace(/\D/g, '')) || 0;
      const buyers        = parseInt(crawledData.buyers_raw.replace(/\D/g, '')) || 0;
      const live_title    = crawledData.live_title || 'Live Session';

      // === Deteksi Akhir Siaran (End of Stream) ===
      // Jika semua metrik utama bernilai 0, sangat mungkin siaran telah ditutup.
      // Kita kembalikan status 'ENDED' agar Cron Job bisa memulangkan sesi ke ACTIVE.
      if (omzet_live === 0 && viewers === 0 && buyers === 0) {
        console.log(`[Bot] 🏁 @${session.account?.shopee_username ?? session.id.substring(0,8)}: Semua metrik 0 — siaran kemungkinan telah ditutup.`);
        return { status: 'ENDED' };
      }

      console.log(`[Bot] 📊 Hasil: Omzet=Rp${omzet_live.toLocaleString('id-ID')}, Komisi=Rp${omzet_komisi.toLocaleString('id-ID')}, Viewers=${viewers}, Buyers=${buyers}`);

      return { 
        status: 'LIVE',
        omzet_live,
        omzet_komisi,
        viewers,
        buyers,
        live_title,
        live_cart_snapshot: interceptedProducts
      };

    } catch (error) {
      console.error(`[Bot] Fatal error pada sesi ${session.id}:`, error.message);
      return { status: 'ERROR', error: error.message, omzet_live: 0, omzet_komisi: 0 };
    } finally {
      if (context) await context.close();
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    }
  }

  // ============================================================
  // AUTO-TREATMENT: Simulasi Perilaku Manusia (Account Warm-up)
  // Duration: 10-15 menit per sesi
  // ============================================================

  /**
   * Helper: Jeda acak antara min-max ms untuk meniru respons manusia.
   */
  async humanDelay(minMs = 1500, maxMs = 4000) {
    const delay = minMs + Math.floor(Math.random() * (maxMs - minMs));
    await new Promise(r => setTimeout(r, delay));
  }

  /**
   * Helper: Scroll halaman perlahan ke bawah lalu naik kembali (meniru manusia baca).
   */
  async humanScroll(page, steps = 5) {
    for (let i = 0; i < steps; i++) {
      const scrollY = 300 + Math.floor(Math.random() * 400);
      await page.mouse.wheel(0, scrollY);
      await this.humanDelay(800, 2000);
    }
    // Scroll kembali ke atas
    await page.mouse.wheel(0, -9999);
    await this.humanDelay(1000, 2000);
  }

  /**
   * Logika utama Auto-Treatment: "Jalan-jalan" di Shopee selama 10-15 menit.
   * @param {Object} session - Object sesi dari database (berisi cookie_data)
   * @param {Function} onLog - Callback untuk mengirim progress log (opsional)
   * @returns {Object} { success: boolean, logs: string[], duration_ms: number }
   */
  async performTreatment(session, onLog = null) {
    const startTime = Date.now();
    const logs = [];
    const log = (msg) => {
      const entry = `[${new Date().toLocaleTimeString('id-ID')}] ${msg}`;
      logs.push(entry);
      console.log(`[TreatmentBot] @${session.account?.shopee_username ?? 'unknown'}: ${msg}`);
      if (onLog) onLog(entry);
    };

    // Kata kunci trending untuk pencarian (umum & relevan Shopee Indonesia)
    const TRENDING_KEYWORDS = [
      'skincare viral', 'baju lebaran', 'hijab kekinian',
      'celana cargo pria', 'sepatu sneakers', 'tas wanita murah',
      'parfum original', 'jam tangan pria', 'dress midi', 'kaos polos'
    ];

    // Durasi target: 10-15 menit (600.000 - 900.000 ms)
    const TARGET_DURATION = 600_000 + Math.floor(Math.random() * 300_000);
    log(`🚀 Memulai treatment. Target durasi: ${Math.round(TARGET_DURATION / 60000)} menit`);

    let browser, context;
    try {
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
      });

      context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Mobile Safari/537.36',
        extraHTTPHeaders: { 'Accept-Language': 'id-ID,id;q=0.9' },
        viewport: { width: 390, height: 844 } // Simulasi layar HP (iPhone 14)
      });

      // Sembunyikan tanda bot
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      });

      // Inject cookies akun ini
      const cookies = this.parseCookieString(session.cookie_data);
      await context.addCookies(cookies);

      const page = await context.newPage();

      // =============================================
      // AKTIVITAS 1: Buka beranda Shopee & scroll
      // =============================================
      log('📱 Membuka beranda Shopee...');
      await page.goto('https://shopee.co.id', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.humanDelay(3000, 5000);
      log('👆 Scrolling beranda...');
      await this.humanScroll(page, 6);

      // =============================================
      // AKTIVITAS 2: Pencarian kata kunci (2-3 kali)
      // =============================================
      const keywordCount = 2 + Math.floor(Math.random() * 2);
      for (let k = 0; k < keywordCount; k++) {
        const keyword = TRENDING_KEYWORDS[Math.floor(Math.random() * TRENDING_KEYWORDS.length)];
        log(`🔍 Mencari: "${keyword}"...`);

        try {
          await page.goto(`https://shopee.co.id/search?keyword=${encodeURIComponent(keyword)}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await this.humanDelay(3000, 5000);
          await this.humanScroll(page, 4);

          // Klik produk pertama secara acak (1 dari 3 produk teratas)
          const productLinks = await page.$$('a[href*="/product/"]');
          if (productLinks.length > 0) {
            const randomIdx = Math.floor(Math.random() * Math.min(3, productLinks.length));
            log(`🛍️ Mengklik produk #${randomIdx + 1} dari hasil pencarian...`);
            await productLinks[randomIdx].click({ timeout: 5000 });
            await this.humanDelay(4000, 7000);
            await this.humanScroll(page, 3);
            await page.goBack();
            await this.humanDelay(2000, 3500);
          }
        } catch (e) {
          log(`⚠️ Gagal lakukan pencarian "${keyword}": ${e.message}`);
        }

        // Jeda antar pencarian (manusia tidak langsung cari lagi)
        await this.humanDelay(5000, 10000);
      }

      // =============================================
      // AKTIVITAS 3: Menonton sesi Live orang lain
      // =============================================
      log('📺 Membuka halaman Shopee Live...');
      try {
        await page.goto('https://shopee.co.id/live', { waitUntil: 'domcontentloaded', timeout: 20000 });
        await this.humanDelay(3000, 5000);

        // Klik salah satu Live yang muncul di beranda
        const liveCards = await page.$$('[class*="live-card"], [class*="stream-card"], a[href*="/live/"]');
        if (liveCards.length > 0) {
          const randomLive = Math.floor(Math.random() * Math.min(5, liveCards.length));
          log(`▶️ Masuk ke sesi Live #${randomLive + 1}...`);
          await liveCards[randomLive].click({ timeout: 5000 });
          
          // Tonton selama 2-5 menit (acak)
          const watchMs = 120_000 + Math.floor(Math.random() * 180_000);
          log(`⏱️ Menonton live selama ${Math.round(watchMs / 60000)} menit...`);

          // Scroll sedikit (simulasi interaksi saat nonton)
          await this.humanDelay(watchMs * 0.3, watchMs * 0.4);
          await this.humanScroll(page, 2);

          // Coba klik tombol Love/Like jika ada
          const loveBtn = await page.$('[class*="love-btn"], [class*="like-btn"], [aria-label*="like"]');
          if (loveBtn) {
            log('❤️ Memberikan Love pada sesi Live...');
            await loveBtn.click({ timeout: 3000 });
          }

          await this.humanDelay(watchMs * 0.5, watchMs * 0.6);
          log('🚪 Keluar dari sesi Live...');
        } else {
          log('ℹ️ Tidak ada sesi Live yang bisa diklik, skip aktivitas ini.');
        }
      } catch (e) {
        log(`⚠️ Aktivitas tonton Live gagal: ${e.message}`);
      }

      // =============================================
      // AKTIVITAS 4: Kunjungi Flash Sale atau Promo
      // =============================================
      log('🏷️ Mengunjungi halaman Flash Sale...');
      try {
        await page.goto('https://shopee.co.id/flash_sale', { waitUntil: 'domcontentloaded', timeout: 20000 });
        await this.humanDelay(3000, 5000);
        await this.humanScroll(page, 4);
      } catch (e) {
        log(`⚠️ Halaman Flash Sale gagal dimuat: ${e.message}`);
      }

      const duration = Date.now() - startTime;
      log(`✅ Treatment selesai! Durasi: ${Math.round(duration / 60000)} menit ${Math.round((duration % 60000) / 1000)} detik`);

      return { success: true, logs, duration_ms: duration };

    } catch (error) {
      log(`❌ Error kritis: ${error.message}`);
      return { success: false, logs, duration_ms: Date.now() - startTime, error: error.message };
    } finally {
      if (context) await context.close().catch(() => {});
      if (browser)  await browser.close().catch(() => {});
    }
  }
}
