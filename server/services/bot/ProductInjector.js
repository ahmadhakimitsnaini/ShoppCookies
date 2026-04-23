import prisma from '../../db.js';

/**
 * Injeksi Tunggal untuk satu akun
 */
const injectSingleAccount = async (akun, products, clearEtalase = false) => {
  console.log(`[Injector] ➔ Memulai Injeksi Akun: ${akun.shopee_username} (Produk: ${products.length})`);
  
  try {
    // 1. Simulasikan Penghapusan Produk Lama (Jika diminta)
    if (clearEtalase) {
      console.log(`[Injector]    ➔ [CLEANUP] Menghapus seluruh etalase lama di @${akun.shopee_username}...`);
      await new Promise(res => setTimeout(res, 3000)); // Simulasi proses penghapusan (3 detik)
    }

    // 2. Injeksi Produk Baru satu per satu (Serial per akun untuk menghindari rate limit internal Shopee)
    for (let i = 0; i < products.length; i++) {
        const prod = products[i];
        console.log(`[Injector]    ➔ [@${akun.shopee_username}] [${i+1}/${products.length}] Menambahkan: ${prod.product_url}`);
        await new Promise(res => setTimeout(res, 2000)); // Jeda 2 detik per produk
    }

    return { username: akun.shopee_username, success: true, count: products.length };
  } catch (err) {
    console.error(`[Injector] ❌ Error pada akun ${akun.shopee_username}:`, err);
    return { username: akun.shopee_username, success: false, error: err.message };
  }
};

/**
 * Entry Point Utama Injektor
 */
export const runProductInjection = async (idOrUsername, options = { clearEtalase: true }) => {
  console.log(`[Injector] 🤖 Memulai protokol Auto-Inject Etalase untuk: ${idOrUsername}`);

  try {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(idOrUsername);
    let targets = [];
    
    // 1. Identifikasi Target (Akun Tunggal vs Studio Massal)
    const singleAccount = await prisma.shopeeAccount.findFirst({
      where: isUuid ? { id: idOrUsername } : { shopee_username: idOrUsername },
      include: { studio: { include: { products: { orderBy: { order_index: 'asc' } } } } }
    });

    if (singleAccount) {
      targets = [singleAccount];
    } else if (isUuid) {
      const studio = await prisma.studio.findUnique({
        where: { id: idOrUsername },
        include: { 
          shopee_accounts: true,
          products: { orderBy: { order_index: 'asc' } }
        }
      });

      if (studio) {
        if (studio.shopee_accounts.length === 0) {
          return { success: false, message: `Studio '${studio.name}' tidak memiliki akun.` };
        }
        targets = studio.shopee_accounts.map(acc => ({
            ...acc,
            studio: { products: studio.products }
        }));
      }
    }

    if (targets.length === 0) {
      return { success: false, message: `ID/Username '${idOrUsername}' tidak ditemukan.` };
    }

    // 2. Eksekusi Injeksi SECARA PARALEL antar Akun
    console.log(`[Injector] ⚡ Menjalankan injeksi pada ${targets.length} akun secara PARALEL...`);
    
    const injectionPromises = targets.map(akun => {
      const products = akun.studio?.products || [];
      if (products.length === 0) {
        return Promise.resolve({ username: akun.shopee_username, success: false, error: 'Tidak ada produk di Brankas.' });
      }
      return injectSingleAccount(akun, products, options.clearEtalase);
    });

    const results = await Promise.all(injectionPromises);
    
    const successful = results.filter(r => r.success).length;
    const totalProducts = results.reduce((sum, r) => sum + (r.count || 0), 0);

    return { 
      success: true, 
      count: totalProducts, 
      accountsCount: targets.length, 
      successAccounts: successful,
      details: results 
    };

  } catch (err) {
    console.error(`[Injector] ❌ Fatal Error:`, err);
    return { success: false, message: err.message };
  }
};
