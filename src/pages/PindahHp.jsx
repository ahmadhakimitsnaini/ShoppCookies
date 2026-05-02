import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ToastContainer } from '../components/ui/Toast';
import { ArrowRight, Smartphone, AlertCircle, RefreshCw, Plus, Unlink, Loader } from 'lucide-react';
import { getDevices, getStudios, registerDevice, transferDevice, unassignDevice } from '../lib/api';
import { useToast } from '../lib/useToast';

const STATUS_COLOR = {
  ACTIVE:      { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Aktif' },
  MAINTENANCE: { bg: 'bg-amber-100',   text: 'text-amber-800',   label: 'Maintenance' },
  BROKEN:      { bg: 'bg-red-100',     text: 'text-red-700',     label: 'Rusak' },
};

export const PindahHp = () => {
  const [devices, setDevices]         = useState([]);
  const [studios, setStudios]         = useState([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState(null);

  // State Transfer Modal
  const [transferModal, setTransferModal] = useState(null); // { account_id, username, currentDevice }
  const [targetDeviceId, setTargetDeviceId] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  // State Register Modal
  const [registerModal, setRegisterModal] = useState(false);
  const [regForm, setRegForm]             = useState({ studio_id: '', name: '', mac_address: '', notes: '' });
  const [isRegistering, setIsRegistering] = useState(false);

  const { toasts, addToast, removeToast } = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [devicesData, studiosData] = await Promise.all([
        getDevices(),
        getStudios(),
      ]);
      setDevices(devicesData);
      setStudios(studiosData?.data ?? studiosData ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Daftar HP yang masih kosong (belum ada akun) untuk pilihan tujuan transfer
  const freeDevices = devices.filter(d => d.status === 'ACTIVE' && d.accounts.length === 0);

  // ============================================================
  // Handler: Transfer Akun ke HP Baru
  // ============================================================
  const openTransferModal = (account, currentDevice) => {
    setTransferModal({ account_id: account.id, username: account.shopee_username, currentDevice });
    setTargetDeviceId('');
  };

  const handleTransfer = async () => {
    if (!targetDeviceId) return addToast('Pilih HP tujuan terlebih dahulu.', 'error');
    setIsTransferring(true);
    try {
      const res = await transferDevice(transferModal.account_id, targetDeviceId);
      addToast(res.message);
      setTransferModal(null);
      loadData();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsTransferring(false);
    }
  };

  // ============================================================
  // Handler: Lepaskan Akun dari HP (Unassign)
  // ============================================================
  const handleUnassign = async (deviceId, deviceName, username) => {
    if (!window.confirm(`Lepaskan @${username} dari HP "${deviceName}"?`)) return;
    try {
      const res = await unassignDevice(deviceId);
      addToast(res.message);
      loadData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // ============================================================
  // Handler: Daftarkan HP Baru
  // ============================================================
  const handleRegister = async () => {
    if (!regForm.studio_id || !regForm.name) return addToast('Studio dan Nama HP wajib diisi.', 'error');
    setIsRegistering(true);
    try {
      const res = await registerDevice(regForm);
      addToast(res.message);
      setRegisterModal(false);
      setRegForm({ studio_id: '', name: '', mac_address: '', notes: '' });
      loadData();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-h2 font-bold text-gk-text-main flex items-center gap-2">
            <Smartphone size={26} className="text-indigo-600" />
            Manajemen Perangkat (HP)
          </h1>
          <p className="text-gk-text-muted mt-1">
            Kelola inventaris perangkat fisik &amp; penugasan akun Shopee ke masing-masing HP.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />}
            onClick={loadData}
            disabled={isLoading}
          >
            Refresh
          </Button>
          <Button
            leftIcon={<Plus size={15} />}
            onClick={() => setRegisterModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Daftarkan HP Baru
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      {!isLoading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total HP', value: devices.length, color: 'text-gray-800' },
            { label: 'HP Aktif & Terisi', value: devices.filter(d => d.status === 'ACTIVE' && d.accounts.length > 0).length, color: 'text-emerald-700' },
            { label: 'HP Kosong (Siap)', value: freeDevices.length, color: 'text-blue-700' },
            { label: 'HP Maintenance/Rusak', value: devices.filter(d => d.status !== 'ACTIVE').length, color: 'text-red-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Loading / Error / Table */}
      <Card className="overflow-hidden border border-gray-200">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <CardTitle className="text-body font-semibold">Daftar Inventaris Perangkat</CardTitle>
        </CardHeader>

        {isLoading ? (
          <div className="py-16 flex flex-col items-center text-gray-400">
            <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm">Memuat data perangkat...</p>
          </div>
        ) : error ? (
          <div className="py-16 flex flex-col items-center">
            <AlertCircle size={40} className="text-red-400 mb-3" />
            <p className="text-red-600 font-medium text-sm">{error}</p>
            <Button className="mt-4" size="sm" onClick={loadData}>Coba Lagi</Button>
          </div>
        ) : devices.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-gray-400">
            <Smartphone size={44} className="mb-3 opacity-40" />
            <p className="text-sm">Belum ada perangkat terdaftar.</p>
            <Button size="sm" className="mt-4" onClick={() => setRegisterModal(true)}>Daftarkan HP Pertama</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50 text-xs text-gray-500 font-semibold uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Perangkat</th>
                  <th className="px-4 py-3">Studio</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Akun Terpasang</th>
                  <th className="px-4 py-3 text-center sticky right-0 bg-slate-50 z-10">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {devices.map(device => {
                  const account = device.accounts[0] ?? null;
                  const statusStyle = STATUS_COLOR[device.status] ?? STATUS_COLOR.ACTIVE;
                  const sessionStatus = account?.sessions?.[0]?.status ?? null;

                  return (
                    <tr key={device.id} className="hover:bg-gray-50 transition-colors">
                      {/* Nama HP */}
                      <td className="px-4 py-4 align-middle">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-indigo-50 rounded-lg">
                            <Smartphone size={18} className="text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{device.name}</p>
                            {device.mac_address && (
                              <p className="text-[10px] text-gray-400 font-mono">{device.mac_address}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Studio */}
                      <td className="px-4 py-4 align-middle text-gray-600">
                        {device.studio?.name ?? '-'}
                      </td>

                      {/* Status Device */}
                      <td className="px-4 py-4 align-middle">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusStyle.bg} ${statusStyle.text}`}>
                          {statusStyle.label}
                        </span>
                      </td>

                      {/* Akun Terpasang */}
                      <td className="px-4 py-4 align-middle">
                        {account ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                              {account.shopee_username[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">@{account.shopee_username}</p>
                              <p className="text-[10px] text-gray-400">{account.shopee_shop_name}</p>
                            </div>
                            {sessionStatus === 'LIVE' && (
                              <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded animate-pulse">LIVE</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">— Kosong —</span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="px-4 py-4 align-middle sticky right-0 bg-white z-10 border-l border-gray-100">
                        <div className="flex items-center justify-center gap-1.5">
                          {account && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 h-7 px-2"
                                leftIcon={<ArrowRight size={11} />}
                                onClick={() => openTransferModal(account, device)}
                              >
                                Pindahkan
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 h-7 px-2"
                                leftIcon={<Unlink size={11} />}
                                onClick={() => handleUnassign(device.id, device.name, account.shopee_username)}
                              >
                                Lepas
                              </Button>
                            </>
                          )}
                          {!account && device.status === 'ACTIVE' && (
                            <span className="text-[11px] text-emerald-600 font-medium">Siap pakai</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ===== MODAL TRANSFER HP ===== */}
      <Modal
        title="Pindahkan Akun ke HP Lain"
        isOpen={!!transferModal}
        onClose={() => setTransferModal(null)}
        maxWidth="sm:max-w-md"
        footer={
          <>
            <Button
              variant="primary"
              className="w-full sm:ml-3 sm:w-auto bg-indigo-600 hover:bg-indigo-700"
              onClick={handleTransfer}
              disabled={!targetDeviceId || isTransferring}
            >
              {isTransferring ? <><Loader size={14} className="animate-spin mr-1" />Memindahkan...</> : 'Ya, Pindahkan'}
            </Button>
            <Button variant="ghost" onClick={() => setTransferModal(null)} className="mt-3 w-full sm:mt-0 sm:w-auto">Batal</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-sm">
            <p className="text-gray-500">Akun yang dipindahkan:</p>
            <p className="font-bold text-indigo-800 mt-0.5">@{transferModal?.username}</p>
            <p className="text-xs text-gray-400 mt-1">Dari HP: <span className="font-medium text-gray-600">{transferModal?.currentDevice?.name}</span></p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">HP Tujuan (hanya HP kosong yang aktif)</label>
            {freeDevices.length === 0 ? (
              <div className="text-center py-4 text-sm text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                Tidak ada HP kosong yang tersedia. Tambahkan HP baru terlebih dahulu.
              </div>
            ) : (
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={targetDeviceId}
                onChange={e => setTargetDeviceId(e.target.value)}
              >
                <option value="">-- Pilih HP Tujuan --</option>
                {freeDevices.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.studio?.name})</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </Modal>

      {/* ===== MODAL DAFTARKAN HP BARU ===== */}
      <Modal
        title="Daftarkan Perangkat HP Baru"
        isOpen={registerModal}
        onClose={() => setRegisterModal(false)}
        maxWidth="sm:max-w-md"
        footer={
          <>
            <Button
              variant="primary"
              className="w-full sm:ml-3 sm:w-auto bg-indigo-600 hover:bg-indigo-700"
              onClick={handleRegister}
              disabled={isRegistering}
            >
              {isRegistering ? <><Loader size={14} className="animate-spin mr-1" />Menyimpan...</> : 'Simpan Perangkat'}
            </Button>
            <Button variant="ghost" onClick={() => setRegisterModal(false)} className="mt-3 w-full sm:mt-0 sm:w-auto">Batal</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Studio *</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={regForm.studio_id}
              onChange={e => setRegForm(p => ({ ...p, studio_id: e.target.value }))}
            >
              <option value="">Pilih Studio...</option>
              {studios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Perangkat *</label>
            <input
              type="text"
              placeholder="Contoh: Samsung S22 (HP-A1)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={regForm.name}
              onChange={e => setRegForm(p => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">MAC Address (opsional)</label>
            <input
              type="text"
              placeholder="Contoh: AA:BB:CC:DD:EE:FF"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={regForm.mac_address}
              onChange={e => setRegForm(p => ({ ...p, mac_address: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (opsional)</label>
            <textarea
              rows={2}
              placeholder="Keterangan tambahan..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={regForm.notes}
              onChange={e => setRegForm(p => ({ ...p, notes: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
