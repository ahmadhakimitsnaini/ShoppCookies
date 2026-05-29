# 🚀 Product Requirements & Audit Report: Shopee Cookie

*Dokumen ini berisi analisis 360-derajat komprehensif dari sisi Product Management, UX/UI, dan Tech Architecture untuk proyek Shopee Cookie.*

---

## 1. Evaluasi Produk & UX (Product/Market Alignment)
Secara fungsional, proyek ini sudah melampaui fase MVP standar dan masuk ke ranah *Enterprise Tooling*. Fitur hirarki (Member ➡️ Studio ➡️ Account) dan Brankas Produk (Mandiri, Master, Bank) menunjukkan pemahaman mendalam tentang operasional studio Shopee *Live*.

**Analisis User Journey & Titik Hambatan (Friction Points):**
*   **Cookie Expiration Panic:** Umur *cookie* Shopee sering kali tidak tertebak. Jika *cookie* kedaluwarsa saat *live stream* sedang berlangsung dengan penonton tinggi, operator akan panik.
    *   *Saran UX:* Halaman `HomeDashboard` dan `DetailStudio` harus memiliki indikator status kesehatan *cookie* *(Traffic Light System: Hijau/Kuning/Merah)*. Berikan fitur pemberitahuan H-1 sebelum perkiraan kedaluwarsa, tidak hanya saat sudah mati.
*   **Input Data Massal:** Saat ini, mendaftarkan toko dan memasukkan *cookie* satu per satu akan melelahkan untuk *agency* besar.
    *   *Saran UX:* Buat fitur *Bulk Import* via Excel/CSV untuk manajemen Brankas Produk dan Toko.
*   **Kejelasan Status Bot:** Pada halaman `TreatmentAuto` atau saat `LiveController` berjalan, pengguna tidak tahu apakah bot sedang "bekerja", "mengantre", atau "gagal". Tambahkan *Real-time Activity Log* bergaya terminal di UI agar pengguna merasa aman.

---

## 2. Arsitektur & Teknologi (Scalability & Performance)
Kombinasi **React (Vite) + Tailwind + Express + Prisma + Playwright** adalah *stack* modern yang tangguh. Struktur folder sudah mencerminkan *Separation of Concerns* (SoC) yang baik (`controllers`, `services`, `routes`, `store`, `pages`).

**Evaluasi & Rekomendasi:**
*   **State Management:** Penggunaan **Zustand** (`useAuthStore`, `useStudioStore`, `useUIStore`) adalah pilihan yang **sangat tepat dan modern** untuk UI state.
*   **Data Fetching (Critical Issue):** Karena dashboard berurusan dengan pemantauan metrik *live* secara konstan (omzet, penonton, status bot), melakukan `fetch`/`axios` manual bersama `useEffect` akan memicu banyak bug *race-condition*.
    *   *Saran Arsitektur:* Segera adopsi **TanStack Query (React Query)**. Ini akan otomatis menangani *caching*, *polling* background (misal: memanggil API cek omzet setiap 30 detik tanpa membuat UI *lag*), dan *loading states*.
*   **Arsitektur Monolitik Playwright:** Saat ini API Server (Express) dan Bot Playwright (`startDynamicLiveObserver`) berjalan di satu mesin (Node.js *event loop* yang sama).
    *   *Risiko:* Playwright sangat rakus RAM/CPU. Jika banyak sesi *live* berjalan bersamaan, Chromium akan membuat RAM *out-of-memory* (OOM) dan API *server* akan mati.

---

## 3. Kualitas Kode & Standar Pengembangan (Code Health)
Berdasarkan ukuran *file* di repositori, ada beberapa area yang memerlukan *refactoring* agar skalabilitas kode tetap terjaga.

**Temuan & Rekomendasi:**
*   **Monster Components:** File `DetailStudio.jsx` berukuran raksasa (~36 KB). Ini melanggar prinsip *Single Responsibility*.
    *   *Solusi:* Pecah menjadi: `<StudioHeader />`, `<StudioVaultTab />`, `<StudioDeviceList />`.
*   **Hutang Teknis Ketiadaan TypeScript:** Proyek skala menengah-besar tanpa tipe data eksplisit berisiko tinggi, terutama saat bertukar objek payload yang kompleks antara Frontend, Prisma, dan Playwright.
    *   *Solusi:* Migrasi perlahan ke **TypeScript** (`.jsx` ➡️ `.tsx`).
*   **Standarisasi Kode:**
    *   *Solusi:* Tambahkan `prettier` dan `eslint-config-prettier` agar *styling* kode (tab vs space) lebih konsisten bagi seluruh anggota tim.

---

## 4. Manajemen Keamanan & Deployment (DevOps/SecOps)

*   **Enkripsi Session/Cookie:** Schema database sudah menggunakan field `raw_cookie_encrypted`. Pastikan AES Key atau kunci dekripsinya tidak di-*hardcode*, melainkan disuntikkan via layanan pengelolaan kunci terenkripsi (*KMS/Environment Variables*).
*   **Rate Limiting & WAF:** API internal perlu dilindungi dengan `express-rate-limit` agar *endpoint* sensitif (seperti `/api/cookies`) tidak mudah dibobol via *Brute Force*.
*   **Strategi Deployment:**
    *   *Frontend:* Vercel atau Netlify.
    *   *Backend:* Wajib menggunakan **Docker**. Men-*deploy* Playwright langsung ke OS VPS sangat rawan error *missing dependencies* (font, libX11, dll). Gunakan *image* resmi `mcr.microsoft.com/playwright`.

---

## 5. Action Plan (Rencana Tindak Lanjut)

### 🔥 Prioritas Jangka Pendek (Sprint 1-2)
1.  **Refactor "Monster Pages":** Pecah komponen `DetailStudio.jsx` dan `InputMember.jsx` menjadi sub-komponen kecil dalam struktur yang lebih rapi (misal: `/src/components/studio/...`).
2.  **Integrasi React Query:** Ganti manual fetching pada komponen metrik *live* (`CekOmzet.jsx`, `ServerPerformance.jsx`) dengan `@tanstack/react-query` untuk stabilisasi performa UI.
3.  **Implementasi Rate Limiter & Helmet:** Pasang perlindungan dasar (`helmet` dan `express-rate-limit`) pada *backend* untuk mengamankan API sebelum proyek ini diluncurkan (*Go-Live*).

### 🚀 Prioritas Jangka Menengah (Bulan 3-6 / Scaling Phase)
1.  **Pisahkan Bot Server (Microservices Pattern):** Pisahkan kode `services/bot` dari API utama. Gunakan **Redis & BullMQ** sebagai *Message Broker*. Web Server hanya bertugas menerima perintah dan mendelegasikannya. Jika Node Playwright *crash*, API utama dan *Dashboard* admin akan tetap hidup.
2.  **Migrasi Bertahap ke TypeScript:** Konversikan format *payload* API dan *state store* secara perlahan dari JS ke TS guna mengeliminasi bug *runtime* secara proaktif.
