import express from 'express';
import prisma from '../db.js';

const router = express.Router();

// ============================================================
// GET /api/devices
// Mendapatkan semua perangkat HP, dikelompokkan dengan akun yang sedang dipasang
// ============================================================
router.get('/', async (req, res) => {
  try {
    const { studio_id } = req.query;

    const where = { deleted_at: undefined };
    if (studio_id) where.studio_id = studio_id;

    const devices = await prisma.device.findMany({
      where: studio_id ? { studio_id } : {},
      include: {
        studio: { select: { id: true, name: true } },
        accounts: {
          where: { deleted_at: null },
          select: {
            id: true,
            shopee_username: true,
            shopee_shop_name: true,
            health_status: true,
            sessions: {
              orderBy: { created_at: 'desc' },
              take: 1,
              select: { status: true }
            }
          }
        }
      },
      orderBy: { created_at: 'asc' }
    });

    res.json(devices);
  } catch (error) {
    console.error('[Devices] GET / error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST /api/devices
// Daftarkan perangkat HP baru ke sebuah studio
// ============================================================
router.post('/', async (req, res) => {
  try {
    const { studio_id, name, mac_address, notes } = req.body;

    if (!studio_id || !name) {
      return res.status(400).json({ error: 'studio_id dan name wajib diisi.' });
    }

    const device = await prisma.device.create({
      data: {
        studio_id,
        name: name.trim(),
        mac_address: mac_address?.trim() || null,
        notes: notes?.trim() || null,
      },
      include: { studio: { select: { name: true } } }
    });

    res.status(201).json({ success: true, message: `Perangkat "${device.name}" berhasil didaftarkan.`, device });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'MAC Address sudah terdaftar pada perangkat lain.' });
    }
    console.error('[Devices] POST / error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PATCH /api/devices/:id/status
// Ubah status perangkat (ACTIVE, MAINTENANCE, BROKEN)
// ============================================================
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['ACTIVE', 'MAINTENANCE', 'BROKEN'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status tidak valid. Pilihan: ${validStatuses.join(', ')}` });
    }

    const device = await prisma.device.update({
      where: { id },
      data: { status }
    });

    res.json({ success: true, message: `Status perangkat diubah ke ${status}.`, device });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST /api/devices/transfer
// Pindahkan akun dari HP lama ke HP tujuan (dalam studio baru)
// Aturan: 1 Akun = 1 HP. Jika HP tujuan sudah terisi, tolak.
// ============================================================
router.post('/transfer', async (req, res) => {
  try {
    const { account_id, target_device_id } = req.body;

    if (!account_id || !target_device_id) {
      return res.status(400).json({ error: 'account_id dan target_device_id wajib diisi.' });
    }

    // Cek apakah HP tujuan sudah memiliki akun yang terpasang
    const targetDevice = await prisma.device.findUnique({
      where: { id: target_device_id },
      include: {
        accounts: { where: { deleted_at: null }, select: { id: true, shopee_username: true } }
      }
    });

    if (!targetDevice) {
      return res.status(404).json({ error: 'Perangkat tujuan tidak ditemukan.' });
    }

    if (targetDevice.accounts.length > 0) {
      const occupant = targetDevice.accounts[0];
      return res.status(409).json({
        error: `HP "${targetDevice.name}" sudah ditempati oleh @${occupant.shopee_username}. Lepaskan akun tersebut terlebih dahulu.`
      });
    }

    // Pindahkan: update relasi device_id pada akun
    const updatedAccount = await prisma.shopeeAccount.update({
      where: { id: account_id },
      data: {
        device_id: target_device_id,
        studio_id: targetDevice.studio_id // Ikut pindah studio sesuai HP tujuan
      },
      include: {
        device: { select: { name: true } },
        studio: { select: { name: true } }
      }
    });

    res.json({
      success: true,
      message: `@${updatedAccount.shopee_username} berhasil dipindahkan ke HP "${updatedAccount.device?.name}" di Studio "${updatedAccount.studio?.name}".`,
      account: updatedAccount
    });
  } catch (error) {
    console.error('[Devices] POST /transfer error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// DELETE /api/devices/:id/unassign
// Lepaskan (putuskan) relasi akun dari HP ini
// ============================================================
router.delete('/:id/unassign', async (req, res) => {
  try {
    const { id } = req.params;

    // Cari akun yang sedang terpasang di HP ini
    const device = await prisma.device.findUnique({
      where: { id },
      include: { accounts: { where: { deleted_at: null }, select: { id: true, shopee_username: true } } }
    });

    if (!device) return res.status(404).json({ error: 'Perangkat tidak ditemukan.' });
    if (device.accounts.length === 0) return res.status(400).json({ error: 'Tidak ada akun yang terpasang di perangkat ini.' });

    const accountId = device.accounts[0].id;
    const username  = device.accounts[0].shopee_username;

    await prisma.shopeeAccount.update({
      where: { id: accountId },
      data: { device_id: null }
    });

    res.json({ success: true, message: `@${username} berhasil dilepaskan dari HP "${device.name}".` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
