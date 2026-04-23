import express from 'express';
import prisma from '../db.js';

const router = express.Router();

// ============================================================
// GET /api/members
// Ambil semua member aktif (deleted_at IS NULL)
// ============================================================
router.get('/', async (req, res) => {
  try {
    const members = await prisma.member.findMany({
      where: { deleted_at: null },
      orderBy: { joined_at: 'desc' },
      include: {
        _count: {
          select: { shopee_accounts: true }
        }
      }
    });

    const mapped = members.map(m => ({
      id:                   m.id,
      name:                 m.name,
      phone:                m.phone,
      email:                m.email,
      username_studio:      m.username_studio,
      alamat:               m.alamat,
      bank_name:            m.bank_name,
      bank_account_number:  m.bank_account_number ?? '',
      telegram_token_owner: m.telegram_token_owner ?? '',
      chat_id_owner:        m.chat_id_owner ?? '',
      telegram_token_pesan: m.telegram_token_pesan ?? '',
      chat_id_pesan:        m.chat_id_pesan ?? '',
      joined_at:            m.joined_at,
      total_accounts:       m._count.shopee_accounts,
    }));

    res.json(mapped);
  } catch (error) {
    console.error('[Members] GET error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST /api/members
// Buat member baru
// ============================================================
router.post('/', async (req, res) => {
  const {
    name, phone, email, username_studio, alamat,
    bank_name, bank_account_number,
    telegram_token_owner, chat_id_owner,
    telegram_token_pesan, chat_id_pesan,
  } = req.body;

  // Validasi wajib
  if (!name || !phone) {
    return res.status(400).json({ error: 'Nama dan Nomor HP wajib diisi.' });
  }

  try {
    const member = await prisma.member.create({
      data: {
        name:                 name.trim(),
        phone:                phone.trim(),
        email:                email?.trim() || null,
        username_studio:      username_studio?.toUpperCase().trim() || null,
        alamat:               alamat?.trim() || null,
        bank_name:            bank_name?.trim() || null,
        bank_account_number:  bank_account_number?.trim() || null,
        telegram_token_owner: telegram_token_owner?.trim() || null,
        chat_id_owner:        chat_id_owner?.trim() || null,
        telegram_token_pesan: telegram_token_pesan?.trim() || null,
        chat_id_pesan:        chat_id_pesan?.trim() || null,
      }
    });

    res.status(201).json({
      success: true,
      message: `Member ${member.name} berhasil disimpan.`,
      data: member,
    });
  } catch (error) {
    // Tangani duplikasi unique constraint (phone, email, username_studio)
    if (error.code === 'P2002') {
      const field = error.meta?.target?.join(', ') ?? 'data';
      return res.status(400).json({ error: `${field} sudah terdaftar di sistem.` });
    }
    console.error('[Members] POST error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PUT /api/members/:id
// Update data member
// ============================================================
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    name, phone, email, username_studio, alamat,
    bank_name, bank_account_number,
    telegram_token_owner, chat_id_owner,
    telegram_token_pesan, chat_id_pesan,
  } = req.body;

  try {
    const member = await prisma.member.update({
      where: { id },
      data: {
        name:                 name?.trim(),
        phone:                phone?.trim(),
        email:                email?.trim() || null,
        username_studio:      username_studio?.toUpperCase().trim() || null,
        alamat:               alamat?.trim() || null,
        bank_name:            bank_name?.trim() || null,
        bank_account_number:  bank_account_number?.trim() || null,
        telegram_token_owner: telegram_token_owner?.trim() || null,
        chat_id_owner:        chat_id_owner?.trim() || null,
        telegram_token_pesan: telegram_token_pesan?.trim() || null,
        chat_id_pesan:        chat_id_pesan?.trim() || null,
      }
    });

    res.json({ success: true, message: 'Data member berhasil diperbarui.', data: member });
  } catch (error) {
    if (error.code === 'P2002') {
      const field = error.meta?.target?.join(', ') ?? 'data';
      return res.status(400).json({ error: `${field} sudah terdaftar di sistem.` });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Member tidak ditemukan.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// DELETE /api/members/:id
// Soft delete — isi deleted_at (data tetap ada di database)
// ============================================================
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Cek apakah member masih punya akun aktif
    const activeAccounts = await prisma.shopeeAccount.count({
      where: { member_id: id, deleted_at: null }
    });

    if (activeAccounts > 0) {
      return res.status(400).json({
        error: `Member ini masih memiliki ${activeAccounts} akun Shopee aktif. Hapus akun Shopee-nya terlebih dahulu.`
      });
    }

    await prisma.member.update({
      where: { id },
      data:  { deleted_at: new Date() }
    });

    res.json({ success: true, message: 'Member berhasil dihapus.' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Member tidak ditemukan.' });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;
