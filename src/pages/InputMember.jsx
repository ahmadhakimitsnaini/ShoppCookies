import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { HelpCircle, Trash2, Edit, Loader2, UserPlus, Users, ShoppingBag, Plus, X, Store } from 'lucide-react';
import { fetchApi } from '../lib/api';

const EMPTY_FORM = {
  tanggal:              new Date().toISOString().slice(0, 16),
  name:                 '',
  phone:                '',
  email:                '',
  username_studio:      '',
  alamat:               '',
  bank_name:            '',
  bank_account_number:  '',
  telegram_token_owner: '',
  chat_id_owner:        '',
  telegram_token_pesan: '',
  chat_id_pesan:        '',
};

export const InputMember = () => {
  const [formData, setFormData]         = useState(EMPTY_FORM);
  const [members, setMembers]           = useState([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [isSaving, setIsSaving]         = useState(false);
  const [editId, setEditId]             = useState(null);
  const [deleteModal, setDeleteModal]   = useState({ open: false, member: null });
  const [toast, setToast]               = useState(null);

  // State Modal Tambah Akun Shopee
  const [accountModal, setAccountModal] = useState({ open: false, member: null });
  const [memberAccounts, setMemberAccounts] = useState([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [newAccount, setNewAccount]     = useState({ shopee_username: '', shopee_shop_name: '' });
  const [isSavingAccount, setIsSavingAccount] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ---- Fetch semua member dari database ----
  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchApi('/api/members');
      setMembers(data);
    } catch (err) {
      showToast('Gagal memuat data member: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  // ---- Fetch akun Shopee milik satu member ----
  const fetchMemberAccounts = async (memberId) => {
    setIsLoadingAccounts(true);
    try {
      const data = await fetchApi(`/api/accounts/member/${memberId}`);
      setMemberAccounts(data);
    } catch (err) {
      showToast('Gagal memuat akun: ' + err.message, 'error');
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const openAccountModal = (member) => {
    setAccountModal({ open: true, member });
    setNewAccount({ shopee_username: '', shopee_shop_name: '' });
    fetchMemberAccounts(member.id);
  };

  const closeAccountModal = () => {
    setAccountModal({ open: false, member: null });
    setMemberAccounts([]);
    fetchMembers(); // refresh count akun di tabel
  };

  // ---- Simpan akun Shopee baru ----
  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!newAccount.shopee_username || !newAccount.shopee_shop_name) {
      showToast('Username dan Nama Toko wajib diisi.', 'error');
      return;
    }
    setIsSavingAccount(true);
    try {
      await fetchApi('/api/accounts', {
        method: 'POST',
        body: JSON.stringify({
          member_id:        accountModal.member.id,
          shopee_username:  newAccount.shopee_username,
          shopee_shop_name: newAccount.shopee_shop_name,
        })
      });
      showToast(`@${newAccount.shopee_username} berhasil didaftarkan! ✅`, 'success');
      setNewAccount({ shopee_username: '', shopee_shop_name: '' });
      fetchMemberAccounts(accountModal.member.id);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSavingAccount(false);
    }
  };

  // ---- Hapus akun Shopee ----
  const handleDeleteAccount = async (accountId, username) => {
    if (!window.confirm(`Hapus akun @${username}?`)) return;
    try {
      await fetchApi(`/api/accounts/${accountId}`, { method: 'DELETE' });
      showToast(`Akun @${username} dihapus.`, 'success');
      fetchMemberAccounts(accountModal.member.id);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'username_studio' ? value.toUpperCase() : value
    }));
  };

  // ---- Simpan (Create atau Update) ----
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      showToast('Nama dan Nomor HP wajib diisi.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name:                 formData.name,
        phone:                formData.phone,
        email:                formData.email,
        username_studio:      formData.username_studio,
        alamat:               formData.alamat,
        bank_name:            formData.bank_name,
        bank_account_number:  formData.bank_account_number,
        telegram_token_owner: formData.telegram_token_owner,
        chat_id_owner:        formData.chat_id_owner,
        telegram_token_pesan: formData.telegram_token_pesan,
        chat_id_pesan:        formData.chat_id_pesan,
      };

      if (editId) {
        // Mode update
        await fetchApi(`/api/members/${editId}`, { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Data member berhasil diperbarui.', 'success');
      } else {
        // Mode tambah baru
        await fetchApi('/api/members', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Member baru berhasil ditambahkan! 🎉', 'success');
      }

      setFormData({ ...EMPTY_FORM, tanggal: new Date().toISOString().slice(0, 16) });
      setEditId(null);
      fetchMembers();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ---- Mode Edit: isi form dengan data member ----
  const handleEdit = (member) => {
    setEditId(member.id);
    setFormData({
      tanggal:              new Date(member.joined_at).toISOString().slice(0, 16),
      name:                 member.name,
      phone:                member.phone,
      email:                member.email ?? '',
      username_studio:      member.username_studio ?? '',
      alamat:               member.alamat ?? '',
      bank_name:            member.bank_name ?? '',
      bank_account_number:  member.bank_account_number ?? '',
      telegram_token_owner: member.telegram_token_owner ?? '',
      chat_id_owner:        member.chat_id_owner ?? '',
      telegram_token_pesan: member.telegram_token_pesan ?? '',
      chat_id_pesan:        member.chat_id_pesan ?? '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setFormData({ ...EMPTY_FORM, tanggal: new Date().toISOString().slice(0, 16) });
  };

  // ---- Hapus Member ----
  const executeDelete = async () => {
    try {
      await fetchApi(`/api/members/${deleteModal.member.id}`, { method: 'DELETE' });
      showToast('Member berhasil dihapus.', 'success');
      setDeleteModal({ open: false, member: null });
      fetchMembers();
    } catch (err) {
      showToast(err.message, 'error');
      setDeleteModal({ open: false, member: null });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium max-w-sm ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        } animate-in slide-in-from-bottom-4`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-h2 font-bold text-gk-text-main">Manajemen Member</h1>
          <p className="text-gk-text-muted mt-1">
            {editId ? (
              <span className="text-orange-600 font-medium">✏️ Mode Edit — mengubah data member</span>
            ) : (
              'Input data member baru dan konfigurasi notifikasi Telegram'
            )}
          </p>
        </div>
        {editId && (
          <Button variant="ghost" onClick={handleCancelEdit}>
            Batal Edit
          </Button>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSave}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Identitas Member */}
          <Card className={editId ? 'border-orange-200 shadow-sm' : ''}>
            <CardHeader className={`${editId ? 'bg-orange-50/50' : 'bg-gray-50/50'}`}>
              <CardTitle className="flex items-center gap-2">
                <UserPlus size={18} />
                {editId ? 'Edit Identitas Member' : 'Identitas Member Baru'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <Input
                label="Tanggal Input"
                type="datetime-local"
                name="tanggal"
                value={formData.tanggal}
                className="bg-gray-50 cursor-not-allowed text-gray-500"
                readOnly
              />
              <Input
                label="Nama Pemilik / Pengelola"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Masukkan nama lengkap"
                required
              />
              <Input
                label="Nomor HP (Wajib Unik)"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Contoh: 08123456789"
                helperText="Digunakan sebagai identifikasi utama member"
                required
              />
              <Input
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@contoh.com (opsional)"
              />
              <Input
                label="Username Studio"
                name="username_studio"
                value={formData.username_studio}
                onChange={handleChange}
                placeholder="Contoh: GUDANGPROMO"
                helperText="Otomatis huruf besar, harus unik"
              />
              <Input
                label="Alamat Lengkap"
                name="alamat"
                value={formData.alamat}
                onChange={handleChange}
                placeholder="Jalan, Kota, Kode Pos (opsional)"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Nama Bank"
                  name="bank_name"
                  value={formData.bank_name}
                  onChange={handleChange}
                  placeholder="BCA, Mandiri, dll"
                />
                <Input
                  label="No. Rekening"
                  name="bank_account_number"
                  value={formData.bank_account_number}
                  onChange={handleChange}
                  placeholder="Nomor rekening"
                />
              </div>
            </CardContent>
          </Card>

          {/* Konfigurasi Telegram */}
          <Card>
            <CardHeader className="bg-blue-50/50 border-b border-blue-100 flex flex-row items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3 text-blue-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </div>
              <CardTitle>Notifikasi Telegram</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">

              <div className="p-4 bg-gray-50 border border-gk-border rounded-lg space-y-4 relative">
                <div className="absolute top-2 right-2 group">
                  <HelpCircle size={18} className="text-gray-400 cursor-help" />
                  <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded right-0 top-6 w-52 z-10">
                    Digunakan untuk notifikasi teknis (cookies expired, omzet harian) ke pemilik studio.
                  </div>
                </div>
                <h3 className="font-semibold text-sm text-gray-700">Bot Laporan (Owner)</h3>
                <Input
                  label="Token Bot Telegram"
                  name="telegram_token_owner"
                  value={formData.telegram_token_owner}
                  onChange={handleChange}
                  placeholder="123456789:AAXXXXXXXXXX"
                />
                <Input
                  label="ID Chat Telegram"
                  name="chat_id_owner"
                  value={formData.chat_id_owner}
                  onChange={handleChange}
                  placeholder="1234567890"
                  helperText="Dapatkan chat ID dari @userinfobot"
                />
              </div>

              <div className="p-4 bg-gray-50 border border-gk-border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-gray-700">Bot Notifikasi Pesan Pembeli</h3>
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded font-medium">Customer Service</span>
                </div>
                <Input
                  label="Token Bot Telegram"
                  name="telegram_token_pesan"
                  value={formData.telegram_token_pesan}
                  onChange={handleChange}
                  placeholder="123456789:AAXXXXXXXXXX"
                />
                <Input
                  label="ID Chat Telegram"
                  name="chat_id_pesan"
                  value={formData.chat_id_pesan}
                  onChange={handleChange}
                  placeholder="1234567890"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                {editId && (
                  <Button type="button" variant="ghost" onClick={handleCancelEdit}>
                    Batal
                  </Button>
                )}
                <Button type="submit" disabled={isSaving}>
                  {isSaving
                    ? <><Loader2 size={16} className="animate-spin mr-2" />Menyimpan...</>
                    : editId ? 'Perbarui Data Member' : 'Simpan Member Baru'
                  }
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>

      {/* Tabel Daftar Member */}
      <Card>
        <CardHeader className="flex flex-row justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-gray-500" />
            <CardTitle>Daftar Member Sistem</CardTitle>
          </div>
          <span className="text-sm text-gray-500">{members.length} member terdaftar</span>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-y border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Studio</th>
                <th className="px-5 py-3">Nama</th>
                <th className="px-5 py-3">No. HP</th>
                <th className="px-5 py-3">Total Akun</th>
                <th className="px-5 py-3">Telegram</th>
                <th className="px-5 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-gray-400">
                    <Loader2 size={18} className="animate-spin inline mr-2" />
                    Memuat data member...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-gray-400">
                    <UserPlus size={32} className="mx-auto mb-2 opacity-30" />
                    <p>Belum ada member. Isi formulir di atas untuk menambahkan.</p>
                  </td>
                </tr>
              ) : members.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    {m.username_studio
                      ? <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">{m.username_studio}</span>
                      : <span className="text-gray-400 text-xs">—</span>
                    }
                  </td>
                  <td className="px-5 py-4 font-semibold text-gray-800">{m.name}</td>
                  <td className="px-5 py-4 text-gray-600">{m.phone}</td>
                  <td className="px-5 py-4">
                    <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-1 rounded-full">
                      {m.total_accounts} akun
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {m.telegram_token_owner
                      ? <span className="text-xs text-emerald-600 font-medium">✓ Terkonfigurasi</span>
                      : <span className="text-xs text-gray-400">Belum diatur</span>
                    }
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost" size="sm"
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50"
                        onClick={() => openAccountModal(m)}
                        title="Tambah / Lihat Akun Shopee"
                      >
                        <Store size={15} />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="p-1.5 text-blue-600 hover:bg-blue-50"
                        onClick={() => handleEdit(m)}
                        title="Edit"
                      >
                        <Edit size={15} />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="p-1.5 text-red-600 hover:bg-red-50"
                        onClick={() => setDeleteModal({ open: true, member: m })}
                        title="Hapus"
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Konfirmasi Hapus */}
      <Modal
        title="Hapus Member?"
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, member: null })}
        footer={
          <>
            <Button variant="danger" onClick={executeDelete} className="w-full sm:ml-3 sm:w-auto">
              Ya, Hapus Permanen
            </Button>
            <Button variant="ghost" onClick={() => setDeleteModal({ open: false, member: null })} className="mt-3 w-full sm:mt-0 sm:w-auto">
              Batal
            </Button>
          </>
        }
      >
        <p>
          Yakin hapus member <b>{deleteModal.member?.name}</b>{' '}
          {deleteModal.member?.username_studio ? `(@${deleteModal.member.username_studio})` : ''}?
        </p>
        <p className="text-sm text-red-600 mt-2">
          ⚠️ Pastikan member ini tidak memiliki akun Shopee aktif sebelum menghapus.
        </p>
      </Modal>

      {/* ===================================================
          MODAL: Tambah & Lihat Akun Shopee
      =================================================== */}
      {accountModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            
            {/* Header Modal */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Store size={20} className="text-emerald-600" />
                  Kelola Akun Shopee
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Member: <span className="font-semibold text-gray-700">{accountModal.member?.name}</span>
                  {accountModal.member?.username_studio && (
                    <span className="ml-2 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono">
                      {accountModal.member.username_studio}
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={closeAccountModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-6">

              {/* Form Tambah Akun Baru */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-emerald-800 mb-3 flex items-center gap-1.5">
                  <Plus size={15} /> Tambah Akun Shopee Baru
                </h3>
                <form onSubmit={handleSaveAccount} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Username Shopee"
                      placeholder="Contoh: shimastore99"
                      value={newAccount.shopee_username}
                      onChange={e => setNewAccount(prev => ({ ...prev, shopee_username: e.target.value.trim().toLowerCase() }))}
                      helperText="Tanpa tanda @"
                      required
                    />
                    <Input
                      label="Nama Toko"
                      placeholder="Contoh: Shima Official Store"
                      value={newAccount.shopee_shop_name}
                      onChange={e => setNewAccount(prev => ({ ...prev, shopee_shop_name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" disabled={isSavingAccount}>
                      {isSavingAccount
                        ? <><Loader2 size={14} className="animate-spin mr-1.5" />Menyimpan...</>
                        : <><Plus size={14} className="mr-1.5" />Daftarkan Akun</>
                      }
                    </Button>
                  </div>
                </form>
              </div>

              {/* Daftar Akun yang Sudah Terdaftar */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                  <ShoppingBag size={15} />
                  Akun Terdaftar
                  <span className="ml-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-normal">
                    {memberAccounts.length} akun
                  </span>
                </h3>

                {isLoadingAccounts ? (
                  <div className="text-center py-8 text-gray-400">
                    <Loader2 size={20} className="animate-spin inline mr-2" />
                    Memuat akun...
                  </div>
                ) : memberAccounts.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 border border-dashed rounded-xl">
                    <Store size={28} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Belum ada akun Shopee. Tambahkan di form di atas.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 border rounded-xl overflow-hidden">
                    {memberAccounts.map(acc => (
                      <div key={acc.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">@{acc.shopee_username}</p>
                          <p className="text-xs text-gray-500">{acc.shopee_shop_name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Status cookies */}
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            acc.session_status === 'LIVE'    ? 'bg-green-100 text-green-700' :
                            acc.session_status === 'OFFLINE' ? 'bg-gray-100 text-gray-600'  :
                            acc.session_status === 'EXPIRED' ? 'bg-red-100 text-red-600'    :
                            'bg-yellow-50 text-yellow-700'
                          }`}>
                            {acc.session_status === 'KOSONG' ? '⚠ Belum ada Cookie' : acc.session_status}
                          </span>
                          {/* Studio */}
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            {acc.studio_name}
                          </span>
                          {/* Hapus */}
                          <button
                            onClick={() => handleDeleteAccount(acc.id, acc.shopee_username)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tips */}
              <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
                💡 Setelah mendaftarkan akun, buka menu <strong>Input Cookies</strong> → cari username tersebut → tanamkan cookies-nya.
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t flex justify-end">
              <Button variant="ghost" onClick={closeAccountModal}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
