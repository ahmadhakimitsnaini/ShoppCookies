import prisma from './server/db.js';

async function listStudios() {
  try {
    const studios = await prisma.studio.findMany();
    console.log('--- DAFTAR STUDIO ---');
    studios.forEach(s => {
      console.log(`Name: ${s.name} | ID: ${s.id}`);
    });
    console.log('----------------------');
  } catch (err) {
    console.error('Gagal mengambil data:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

listStudios();
