import prisma from './server/db.js';

async function check() {
  const studios = await prisma.studio.findMany({
    include: { shopee_accounts: true }
  });
  
  console.log('=== DAFTAR STUDIO ===');
  studios.forEach(s => {
    console.log(`[STUDIO] Name: ${s.name} | ID: ${s.id}`);
    s.shopee_accounts.forEach(a => {
      console.log(`   └─ [AKUN] User: ${a.shopee_username} | ID: ${a.id}`);
    });
  });
  
  await prisma.$disconnect();
}

check();
