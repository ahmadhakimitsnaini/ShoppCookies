/**
 * seed-mock-omzet.js
 * 
 * Menyuntikkan data omzet simulasi ke tabel live_performances
 * selama 7 hari terakhir (per jam) agar grafik dashboard terisi.
 * 
 * Jalankan: node seed-mock-omzet.js
 */

import dotenv from 'dotenv';
dotenv.config();

// Gunakan pola yang sama dengan server/db.js (Prisma Adapter PG untuk Supabase)
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });


// Konfigurasi data simulasi per studio (sesuaikan dengan data Anda)
const STUDIO_OMZET_RANGE = {
  default: { min: 500_000, max: 8_000_000 },   // range omzet per jam (Rp)
  komisi:  0.10,                                  // 10% dari omzet = komisi
};

async function main() {
  console.log('🚀 Memulai seed data omzet simulasi...\n');

  // 1. Ambil semua akun yang ada di database
  const accounts = await prisma.shopeeAccount.findMany({
    include: {
      sessions: { where: { status: 'LIVE' }, take: 1 },
      studio:   { select: { name: true } }
    }
  });

  if (accounts.length === 0) {
    console.error('❌ Tidak ada akun di database.');
    console.log('💡 Tip: Jalankan seed-mock-phase8.js terlebih dahulu untuk membuat data akun.');
    return;
  }

  console.log(`✅ Ditemukan ${accounts.length} akun. Mulai menyuntikkan data...\n`);

  const now = new Date();
  const entries = [];
  const DAYS  = 7;   // Hari ke belakang
  const HOURS = 24;  // Per jam dalam sehari

  for (const account of accounts) {
    // Tentukan jam-jam "aktif" acak (simulasi akun tidak live 24 jam penuh)
    const activeHoursStart = 8 + Math.floor(Math.random() * 4);  // Mulai jam 8-12
    const activeHoursEnd   = 20 + Math.floor(Math.random() * 3); // Selesai jam 20-22

    for (let d = DAYS - 1; d >= 0; d--) {
      for (let h = 0; h < HOURS; h++) {
        // Skip jam di luar jam aktif (simulasi live tidak 24 jam)
        if (h < activeHoursStart || h > activeHoursEnd) continue;

        const recordTime = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - d,
          h, 0, 0, 0
        );

        // Jam prime time (12-14 & 19-21) dapat omzet lebih tinggi
        const isPrimeTime = (h >= 12 && h <= 14) || (h >= 19 && h <= 21);
        const multiplier  = isPrimeTime ? 2.5 : 1;

        const omzet = Math.floor(
          (STUDIO_OMZET_RANGE.default.min +
            Math.random() * (STUDIO_OMZET_RANGE.default.max - STUDIO_OMZET_RANGE.default.min))
          * multiplier
        );

        const komisi  = Math.floor(omzet * STUDIO_OMZET_RANGE.komisi);
        const viewers = Math.floor(50 + Math.random() * 500 * multiplier);
        const buyers  = Math.floor(viewers * (0.02 + Math.random() * 0.08));

        entries.push({
          account_id:   account.id,
          session_id:   account.sessions[0]?.id ?? null,
          live_title:   `Live ${account.studio?.name ?? 'Studio'} — Sesi Jam ${h}:00`,
          viewers,
          buyers,
          omzet_live:   omzet,
          omzet_komisi: komisi,
          recorded_at:  recordTime,
        });
      }
    }
  }

  console.log(`📦 Menyuntikkan ${entries.length} data performa ke database...`);

  // Sisipkan dalam batch 500 agar tidak timeout
  const BATCH = 500;
  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);
    await prisma.livePerformance.createMany({ data: batch });
    process.stdout.write(`\r   Progress: ${Math.min(i + BATCH, entries.length)} / ${entries.length}`);
  }

  console.log('\n\n✅ Seed selesai! Ringkasan:');
  console.log(`   • Total akun  : ${accounts.length}`);
  console.log(`   • Total record: ${entries.length}`);
  console.log(`   • Periode     : ${DAYS} hari terakhir`);
  console.log('\n🎉 Refresh browser Anda — grafik dashboard seharusnya sudah terisi!\n');
}

main()
  .catch((e) => {
    console.error('\n❌ Error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
