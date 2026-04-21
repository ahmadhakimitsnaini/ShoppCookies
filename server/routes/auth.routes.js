import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password wajib diisi.' });
    }

    // Cari user di database
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ error: 'Kredensial tidak valid (Email tidak ditemukan).' });
    }

    // Verifikasi password hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Kredensial tidak valid (Sandi salah).' });
    }

    // Buat JWT Token
    const payload = {
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
      },
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret_fallback_key', {
      expiresIn: '24h',
    });

    res.status(200).json({
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error in /api/auth/login:', error);
    res.status(500).json({ error: 'Gagal melakukan login due to server error.' });
  }
});

export default router;
