import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function seedAdmin() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const email = 'admin@gudang.com';
    const rawPassword = 'admin';

    // 1. Cek apakah user sudah ada
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log('✅ Admin sudah ada! Anda bisa gunakan:');
      console.log('Username/Email : admin@gudang.com');
      console.log('Password       : admin');
      return;
    }

    // 2. Hash password menggunakan bcrypt
    console.log('⏳ Mengenkripsi password rahasia...');
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(rawPassword, salt);

    // 3. Masukkan ke database
    const newAdmin = await prisma.user.create({
      data: {
        email: email,
        password_hash: password_hash,
        role: 'ADMIN' // Pastikan ini cocok dengan enum `UserRole` Anda (huruf kapital)
      }
    });

    console.log('🎉 Sukses! Akun Admin perdana Anda berhasil diselundupkan ke Supabase.');
    console.log('=================================');
    console.log(`✉️ Email   : ${email}`);
    console.log(`🔑 Password: ${rawPassword}`);
    console.log('=================================');
    console.log('Sekarang Anda bisa Login di halaman UI Web!');
  } catch (err) {
    console.error('❌ Terjadi kesalahan saat membuat admin:', err.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

seedAdmin();
