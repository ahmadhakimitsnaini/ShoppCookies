# 🍪 Shopee Cookie Automation (Gudang Kreatif Studio)

Shopee Cookie Automation adalah sebuah *SaaS (Software as a Service)* berskala *Enterprise* yang dirancang khusus untuk mengelola, memantau, dan mengotomatiskan operasi **Shopee Affiliate Live Streaming**. 

Sistem ini menggabungkan antarmuka *dashboard* React modern dengan mesin *backend* Node.js yang tangguh, ditenagai oleh Puppeteer/Playwright *Stealth Mode* untuk injeksi produk otomatis tanpa terdeteksi oleh sistem keamanan (WAF) Shopee.

---

## 🏗️ Arsitektur Sistem
- **Frontend**: React.js (Vite), TailwindCSS, Recharts (untuk grafik analitik).
- **Backend**: Node.js, Express.js.
- **Database**: PostgreSQL (dikelola melalui Prisma ORM).
- **Bot Engine**: Playwright-core (dengan ekstensi `stealth` untuk mem- *bypass* deteksi bot).
- **Notifikasi**: Telegram Bot API terintegrasi per-Studio.

---

## 🌟 Fitur Utama & Fungsionalitas

### 1. Manajemen Hirarki (Member ➡️ Studio ➡️ Akun)
Sistem menggunakan konsep pemisahan aset yang ketat untuk skalabilitas operasional:
- **Member (Pemilik Akun)**: Entitas paling atas yang memiliki data rekening bank untuk pencairan komisi. Satu member bisa memiliki puluhan Akun Shopee.
- **Studio (Ruang Operasional)**: Entitas fisik/logis tempat *live streaming* dilakukan. Studio dapat dihapus tanpa menghilangkan riwayat Akun Shopee yang pernah bernaung di dalamnya.
- **Shopee Account**: Aset berharga yang menghasilkan omzet. Berisi *cookie* sesi, data analitik *live*, dan riwayat pelanggaran.

### 2. Tiga Lapis Brankas Produk (Product Vaults)
Mesin otomatisasi bot memiliki kecerdasan buatan (*fallback logic*) untuk mencari produk yang akan disuntikkan ke dalam *live stream*:
- **Prioritas 1 (Brankas Mandiri/Custom)**: Jika sebuah Akun diatur untuk menggunakan brankas khusus, bot akan mengambil produk spesifik yang ditugaskan hanya untuk akun tersebut.
- **Prioritas 2 (Brankas Master Studio)**: Jika akun tidak punya brankas mandiri, bot akan mengambil produk dari Brankas Master milik Studio tempat akun tersebut berada.
- **Prioritas 3 (Bank Produk Global)**: Jika Brankas Master kosong, bot akan melihat "Kategori Bank" yang ditugaskan ke Studio tersebut (misal: "Kosmetik"). Bot lalu akan secara dinamis menyedot hingga 30 produk secara acak dari Database Bank Produk pusat.

### 3. Mesin Injeksi Siluman (*Stealth Injector*)
- Robot dapat masuk ke dalam *Creator Center* Shopee menggunakan *Cookie* yang disediakan, tanpa perlu *login* manual.
- Menggunakan mode *stealth* yang memalsukan agen peramban (*User-Agent*), menghilangkan properti `navigator.webdriver`, dan menyamar sebagai peramban manusia biasa untuk menghindari *banned*.

### 4. Notifikasi Bot Telegram Real-Time
- Setiap Studio dapat dihubungkan ke Grup Telegram spesifik melalui `telegram_token` dan `chat_id`.
- Bot akan mengirim peringatan (*alert*) jika:
  - *Cookie* sebuah akun kedaluwarsa (Expired).
  - Terjadi pelanggaran/penalti (Account Violation).
  - Laporan omzet/komisi berkala.

### 5. Perlindungan PIN Master (Anti-Human Error)
- Tindakan destruktif seperti "Menghapus Studio" dilindungi oleh **PIN Admin Master** (disimpan aman di `.env` server).
- Ini mencegah penghapusan data secara tidak sengaja oleh operator.

---

## 🔄 User Flow (Alur Pengguna)

### Skenario 1: *Onboarding* Studio Baru
1. **Admin** masuk ke halaman **List Studio**.
2. Klik **Tambah Studio Baru**, masukkan Nama Studio.
3. Klik tombol **Konfigurasi Telegram (ikon Pesawat)**, masukkan Token Bot dan Chat ID grup Telegram kru studio tersebut. Lakukan Uji Coba (Test Ping).
4. Klik tombol **Detail**, tetapkan "Kategori Bank Produk" (misal: "Baju Wanita") jika kru studio malas mengunggah produk satu per satu.

### Skenario 2: Pendaftaran & Penempatan Akun Shopee
1. **Admin** membuka halaman **Input Member**, mendaftarkan pemilik akun beserta nomor rekening.
2. Membuka halaman **Input Akun**, memasukkan Data Akun, dan me- *paste* kode *Cookie* sesi Shopee.
3. Di halaman yang sama, Admin memasangkan Akun tersebut ke **Studio** yang sudah dibuat di Skenario 1.

### Skenario 3: Mempersiapkan Dagangan (Injeksi)
Admin bisa memilih salah satu dari dua jalur:
- **Jalur Cepat (Bank Produk)**: 
  - Buka halaman **Input Data Bank**, *paste* 100 URL produk ke kategori "Baju Wanita", klik Injeksi. Selesai. Bot akan mengurus sisanya jika Studio dikaitkan ke kategori ini.
- **Jalur Presisi (Brankas Master/Mandiri)**: 
  - Buka halaman **Detail Studio**. Di tab "Master Produk", masukkan URL spesifik satu per satu. Anda bisa mengatur urutannya (*drag & drop/order index*).

### Skenario 4: Eksekusi Live (Robot Beraksi)
1. Kru Studio menekan tombol "Mulai Live" di HP.
2. Sistem *Backend* (Cron Job / PM2) mendeteksi status "LIVE".
3. Mesin `ProductInjector.js` terbangun. Ia akan membaca hierarki brankas (mencari Brankas Mandiri ➡️ Brankas Master ➡️ Bank Produk).
4. Robot masuk ke peramban siluman, menginjeksi produk ke etalase *live*, dan mencatat status di terminal.

### Skenario 5: Penghapusan Studio (Masa Pensiun)
1. Studio tutup atau pindah manajemen.
2. Admin mengklik tombol **Tong Sampah** di List Studio.
3. Layar merah muncul meminta **PIN Admin**.
4. Admin memasukkan PIN. 
5. *Database Transaction* berjalan: Semua Akun dan HP (Device) yang ada di dalam Studio **dilepaskan** (Unassigned) sehingga tidak terhapus. Namun, Studio dan Brankas Produk Master dihancurkan selamanya.

---

## 🚀 Cara Menjalankan Proyek (Development)

### 1. Persyaratan Sistem
- Node.js versi 18+
- PostgreSQL Server
- Prisma CLI (`npm i -g prisma`)

### 2. Menjalankan Backend (Server & Mesin Bot)
```bash
# Buka terminal dan masuk ke folder proyek
cd "Shopee Cookie"

# Sinkronisasi Skema Database ke PostgreSQL
npx prisma db push
npx prisma generate

# Menjalankan server Express & Cron Jobs (Port 5001)
npm run server
```

### 3. Menjalankan Frontend (UI Dashboard)
```bash
# Buka terminal baru di folder yang sama
cd "Shopee Cookie"

# Menjalankan Vite Dev Server (Port 5173)
npm run dev
```

---

*Didokumentasikan oleh AI Assistant (Antigravity) untuk proyek Gudang Kreatif Studio.*
