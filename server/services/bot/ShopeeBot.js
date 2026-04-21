import { chromium } from 'playwright';

export class ShopeeBot {
  constructor() {
    this.browser = null;
  }

  /**
   * Helper internal untuk mem-parsing cookie dari teks murni / database
   * ke dalam format array object yang Playwright kenali.
   */
  parseCookieString(rawCookieStr) {
    if (!rawCookieStr) return [];
    
    // Jika formatnya sudah JSON array (bukan string key=value rakitan)
    if (rawCookieStr.trim().startsWith('[')) {
      try {
        return JSON.parse(rawCookieStr);
      } catch(e) {
        console.error('[Bot] Peringatan: Gagal parse JSON cookie, menganggap sebagai raw text');
      }
    }

    // Jika formatnya mentah "SPC_F=...; SPC_T=..."
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
        domain: '.shopee.co.id', // domain default shopee seller/creator
        path: '/'
      });
    }
    return result;
  }

  /**
   * Menginjeksi cookie, mengakses creator.shopee.co.id, 
   * dan mencatat omzet (simulasi R&D).
   */
  async checkHealthAndOmzet(session) {
    console.log(`[Bot] 🤖 Mulai memeriksa sesi (ID: ${session.id}) Studio ${session.studio_id}...`);
    
    let context;
    try {
      this.browser = await chromium.launch({ 
        headless: true, // Berjalan diam-diam
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
      });

      context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      // Inject cookies
      const parsedCookies = this.parseCookieString(session.raw_cookie_encrypted);
      await context.addCookies(parsedCookies);

      const page = await context.newPage();
      
      console.log(`[Bot] Navigasi ke creator.shopee.co.id...`);
      // Kita coba tembak alamat seller/creator
      await page.goto('https://creator.shopee.co.id/', { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Verifikasi login (Berdasarkan indikator login khas platform)
      // (Mock: di lingkungan aslinya Anda menyesuaikan selektor CSS)
      const url = page.url();
      if (url.includes('login') || url.includes('/authorize')) {
         console.log(`[Bot] ❌ Sesi Expired! Dilempar ke halaman login halaman.`);
         return { status: 'EXPIRED', omzet: 0 };
      }

      // Simulasi Auto-Treatment: scroll sedikit
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(1500);
      await page.evaluate(() => window.scrollBy(0, -200));

      console.log(`[Bot] ✅ Login valid terpantau! Melakukan R&D omzet...`);
      
      // MOCKUP: Simulasi mengekstrak Omzet dari dashboard (contoh DOM R&D awal)
      const omzetMock = Math.floor(Math.random() * 500000) + 100000;

      return { status: 'LIVE', omzet: omzetMock };

    } catch (error) {
      console.error(`[Bot] Terjadi fatal error pada sesi ${session.id}:`, error.message);
      return { status: 'ERROR', error: error.message };
    } finally {
      if (context) await context.close();
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    }
  }
}
