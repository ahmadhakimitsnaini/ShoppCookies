import { sendLiveChatNotification } from '../telegram/TelegramBot.js';

export const pinProductInShopee = async (accountId, itemIndex) => {
  // Dalam realitas operasional:
  // 1. Fungsi ini akan memanggil instance window Playwright spesifik yang sudah standby
  //    Contoh: activeBrowsers.get(accountId)
  // 2. Berpindah ke daftar panel HTML (div) Etalase.
  // 3. Melakukan eksekusi klik: await page.locator(`.btn-pin:nth-child(${itemIndex})`).click()
  
  // Karena saat ini fungsi Playwright 'standby mode' ditahan untuk menghemat RAM (Phase Mock),
  // Kita melakukan simulasi jeda asinkronus (Loading bot).

  return new Promise((resolve) => {
    console.log(`[Playwright-Mock] Menerima instruksi klik SEMATKAN pada Etalase #${itemIndex} untuk Akun ${accountId}`);
    
    // Anggap waktu manusia-robot me-scroll mouse hingga ketemu produk itu butuh 2 detik
    setTimeout(() => {
      // Mockup kondisi (Kadang toko tidak Live/Belum pasang etalase)
      if (itemIndex > 100) {
         resolve({ success: false, message: "Produk di atas baris ke-100 tidak ditemukan dalam etalase." });
      } else {
         resolve({ success: true, message: `Klik tombol pin berhasil terekam sistem!` });
      }
    }, 1800); // Dipercepat mjd 1.8 detik
  });
};

/**
 * Radar Observer (DOM Scanner)
 * Fungsi ini bertugas mempreteli HTML Shopee Live dan menangkap obrolan.
 */
export const startLiveChatObserver = (accountId) => {
  console.log(`[Shopee-Eye] 👀 Pemandu Sorot menyala untuk Akun: ${accountId}`);

  // Regex Sakti: Menangkap kombinasi: spill/sematkan/no/nomor + angka
  // \s* artinya spasi seberapa pun tidak masalah.
  const spillRegex = /(?:spill|sematkan|spil|no\.?|nomor|nomo)\s*(\d+)/i;

  // ==== SIMULASI DOM MUTATION OBSERVER ====
  // Karena saat ini browser urung dilepas demi menghemat RAM, 
  // saya akan memicu chat pelanggan tiruan setiap 20 detik secara berkeliling.
  setInterval(() => {
    const mockChats = [
      { name: 'Sisca_imut', txt: 'Kakak, coba spill nomor 12 dong, aku penasaran motifnya!' },
      { name: 'Adit_kuningan', txt: 'no 5 masih ada ngga bg ukurannya?' },
      { name: 'Mama_Zaky', txt: 'sematkan 24 kak' },
      { name: 'Rini123', txt: 'spil produk no 8 dong ka' }
    ];

    // Ambil chat tiruan secara acak
    const randomChat = mockChats[Math.floor(Math.random() * mockChats.length)];
    
    // Periksa apakah Sang Radar menangkap kata kunci?
    const match = randomChat.txt.match(spillRegex);
    
    if (match) {
      const productIndex = match[1]; // Angka yang tertangkap (Misal "12")
      console.log(`🔥 [SHOPEE EYE] Target terkunci! Pelanggan minta Produk ${productIndex}`);
      
      // Bombardir ke Telegram dan biarkan Tombol Interaktif bereaksi!
      sendLiveChatNotification(accountId, randomChat.name, randomChat.txt, productIndex);
    }
  }, 20000); // Melepas bot simulasi deteksi setiap 20 detik.
};
