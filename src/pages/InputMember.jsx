import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { HelpCircle, Trash2, Edit } from 'lucide-react';

export const InputMember = () => {
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().slice(0, 16),
    pemilikToko: '',
    usernameStudio: '',
    nama: '',
    namaStudio: '',
    alamat: '',
    tokenOwner: '',
    chatIdOwner: '',
    tokenPesan: '',
    chatIdPesan: ''
  });

  const [members, setMembers] = useState([
    { id: 1, username: 'STUDIOA', nama: 'Budi Santoso', namaToko: 'Kosmetik VIP', alamat: 'Jakarta', tokenOwner: '12345:ABCDE' },
    { id: 2, username: 'FASHIONB', nama: 'Siti Aminah', namaToko: 'Fashion Mix', alamat: 'Bandung', tokenOwner: '67890:FGHIJ' },
  ]);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'usernameStudio' ? value.toUpperCase() : value
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    const newMember = {
      id: members.length + 1,
      username: formData.usernameStudio,
      nama: formData.nama,
      namaToko: formData.namaStudio,
      alamat: formData.alamat,
      tokenOwner: formData.tokenOwner
    };
    setMembers([newMember, ...members]);
    // Reset partial form
    setFormData({ ...formData, nama: '', namaStudio: '', usernameStudio: '', alamat: '' });
  };

  const confirmDelete = (member) => {
    setMemberToDelete(member);
    setIsDeleteModalOpen(true);
  };

  const executeDelete = () => {
    setMembers(members.filter(m => m.id !== memberToDelete.id));
    setIsDeleteModalOpen(false);
    setMemberToDelete(null);
  };

  const columns = [
    { header: '#', cell: (row) => row.id },
    { header: 'Username', accessor: 'username' },
    { header: 'Nama', accessor: 'nama' },
    { header: 'Nama Toko', accessor: 'namaToko' },
    { header: 'Alamat', accessor: 'alamat' },
    { header: 'Token Owner', cell: (row) => <span className="text-gray-500 font-mono text-xs">{row.tokenOwner}</span> },
    { header: 'Aksi', cell: (row) => (
      <div className="flex space-x-2">
        <Button variant="ghost" size="sm" className="px-2 text-blue-600 hover:bg-blue-50">
          <Edit size={16} />
        </Button>
        <Button variant="ghost" size="sm" className="px-2 text-red-600 hover:bg-red-50" onClick={() => confirmDelete(row)}>
          <Trash2 size={16} />
        </Button>
      </div>
    )}
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-h2 font-bold text-gk-text-main">Manajemen Member</h1>
          <p className="text-gk-text-muted mt-1">Input data member dan konfigurasi notifikasi Telegram</p>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Identitas Member */}
          <Card>
            <CardHeader className="bg-gray-50/50">
              <CardTitle>Identitas Member</CardTitle>
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
                label="Pemilik Toko" 
                name="pemilikToko"
                value={formData.pemilikToko}
                onChange={handleChange}
                placeholder="Masukkan nama pemilik" 
                required 
              />
              <Input 
                label="Username Studio" 
                name="usernameStudio"
                value={formData.usernameStudio}
                onChange={handleChange}
                placeholder="Contoh: GUDANGPROMO" 
                helperText="Otomatis diformat menjadi huruf besar"
                required 
              />
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Nama Pengelola" 
                  name="nama"
                  value={formData.nama}
                  onChange={handleChange}
                  placeholder="Nama representatif" 
                  required 
                />
                <Input 
                  label="Nama Studio / Toko" 
                  name="namaStudio"
                  value={formData.namaStudio}
                  onChange={handleChange}
                  placeholder="Nama yang tampil publik" 
                  required 
                />
              </div>
              <Input 
                label="Alamat Lengkap" 
                name="alamat"
                value={formData.alamat}
                onChange={handleChange}
                placeholder="Jalan, Kota, Kode Pos" 
              />
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
                   <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded right-0 top-6 w-48 z-10">
                     Digunakan untuk notifikasi teknis dan laporan khusus ke pemilik studio.
                   </div>
                 </div>
                 <h3 className="font-semibold text-sm text-gray-700">Bot Notifikasi Laporan (Owner)</h3>
                 <Input 
                   label="Token Bot Telegram" 
                   name="tokenOwner"
                   value={formData.tokenOwner}
                   onChange={handleChange}
                   placeholder="123456789:AAXXXXXXXXXX" 
                 />
                 <Input 
                   label="ID Chat Telegram" 
                   name="chatIdOwner"
                   value={formData.chatIdOwner}
                   onChange={handleChange}
                   placeholder="1234567890" 
                   helperText="Dapatkan chat ID dari bot @userinfobot"
                 />
              </div>

              <div className="p-4 bg-gray-50 border border-gk-border rounded-lg space-y-4">
                 <div className="flex items-center justify-between">
                   <h3 className="font-semibold text-sm text-gray-700">Bot Notifikasi Pesan Pembeli</h3>
                   <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded font-medium">Customer Service</span>
                 </div>
                 <Input 
                   label="Token Bot Telegram" 
                   name="tokenPesan"
                   value={formData.tokenPesan}
                   onChange={handleChange}
                   placeholder="123456789:AAXXXXXXXXXX" 
                 />
                 <Input 
                   label="ID Chat Telegram" 
                   name="chatIdPesan"
                   value={formData.chatIdPesan}
                   onChange={handleChange}
                   placeholder="1234567890" 
                 />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <Button type="button" variant="ghost">Batal</Button>
                <Button type="submit">Simpan Member</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Member Sistem</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table columns={columns} data={members} className="border-0 shadow-none rounded-none" />
        </CardContent>
      </Card>

      <Modal 
        title="Hapus Member?" 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)}
        footer={
          <>
            <Button variant="danger" onClick={executeDelete} className="w-full sm:ml-3 sm:w-auto">
              Ya, Hapus
            </Button>
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)} className="mt-3 w-full sm:mt-0 sm:w-auto">
              Batal
            </Button>
          </>
        }
      >
        <p>Yakin hapus <b>{memberToDelete?.nama}</b> ({memberToDelete?.username})? Aksi ini akan menghapus semua konfigurasi yang terkait dan tidak bisa dibatalkan.</p>
      </Modal>

    </div>
  );
};
