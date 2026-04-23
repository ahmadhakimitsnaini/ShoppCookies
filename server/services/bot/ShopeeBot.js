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

      console.log(`[Bot] 📊 Hasil: Omzet=Rp${omzet_live.toLocaleString('id-ID')}, Komisi=Rp${omzet_komisi.toLocaleString('id-ID')}, Viewers=${viewers}, Buyers=${buyers}`);

      return { 
        status: 'LIVE',
        omzet_live,
        omzet_komisi,
        viewers,
        buyers,
        live_title
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
}
