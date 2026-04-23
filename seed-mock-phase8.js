import 'dotenv/config';
import prisma from './server/db.js';

async function main() {
  console.log('🌱 Memulai injeksi data ujian Phase 8...');

  try {
    // 1. Buat Member Fiktif
    const newMember = await prisma.member.upsert({
      where: { email: 'bos_gudang@example.com' },
      update: {},
      create: {
        name: 'Juragan Kosmetik',
        phone: '081233445566',
        email: 'bos_gudang@example.com',
        bank_name: 'BCA',
        bank_account_number: '8811223344'
      }
    });
    console.log(`✅ Member tercipta: ${newMember.name}`);

    // 2. Buat Studio Fiktif
    const studioKosmetik = await prisma.studio.upsert({
      where: { name: 'Studio VIP Kosmetik' },
      update: {},
      create: { name: 'Studio VIP Kosmetik', status: 'ACTIVE' }
    });
    const studioFashion = await prisma.studio.upsert({
      where: { name: 'Studio Fashion Indah' },
      update: {},
      create: { name: 'Studio Fashion Indah', status: 'ACTIVE' }
    });
    console.log(`✅ 2 Studio tercipta (Ka. Kosmetik & Fashion)`);

    // 3. Buat Shopee Accounts "Terdampar" (Tanpa Cookie)
    await prisma.shopeeAccount.upsert({
      where: { shopee_username: 'shimastore99' },
      update: {},
      create: {
        member_id: newMember.id,
        shopee_username: 'shimastore99',
        shopee_shop_name: 'Shima Kosmetik Original',
        status: 'ACTIVE',
        health_status: 'EXCELLENT'
      }
    });

    await prisma.shopeeAccount.upsert({
      where: { shopee_username: 'budi_fashion_jkt' },
      update: {},
      create: {
        member_id: newMember.id,
        shopee_username: 'budi_fashion_jkt',
        shopee_shop_name: 'Budi Baju Murah',
        status: 'ACTIVE',
        health_status: 'WARNING'
      }
    });

    await prisma.shopeeAccount.upsert({
      where: { shopee_username: 'gudang_sepatu_bdg' },
      update: {},
      create: {
        member_id: newMember.id,
        shopee_username: 'gudang_sepatu_bdg',
        shopee_shop_name: 'Gudang Sepatu Premium',
        status: 'ACTIVE',
        health_status: 'CRITICAL',
        studio_id: studioFashion.id // Sudah dialokasikan tapi tanpa session
      }
    });

    console.log('✅ 3 Akun Shopee Terdampar (Shimastore, Budi Fashion, Gudang Sepatu) Berhasil Disediakan!');
    console.log('🎉 Selesai! Silakan Anda pergi ke UI Tanam Cookies dan cari "shima" atau "budi"!');
    
  } catch (err) {
    console.error('❌ Terjadi kesalahan fatal:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
