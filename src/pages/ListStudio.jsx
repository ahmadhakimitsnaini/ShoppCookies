import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { fetchApi } from '../lib/api';
import { Search, Eye, ExternalLink, MonitorPlay, Plus, X, Loader2, Building2 } from 'lucide-react';

export const ListStudio = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm]     = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [initialData, setInitialData]   = useState([]);
  const [isLoading, setIsLoading]       = useState(true);

  // State Modal Tambah Studio
  const [showModal, setShowModal]   = useState(false);
  const [studioName, setStudioName] = useState('');
  const [isSaving, setIsSaving]     = useState(false);
  const [toast, setToast]           = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch studios
  const fetchStudios = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchApi('/api/studios');
      setInitialData(response.data || []);
    } catch (err) {
      console.error('Gagal menarik daftar studio:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => { fetchStudios(); }, [fetchStudios]);

  // Simpan studio baru
  const handleCreateStudio = async (e) => {
    e.preventDefault();
    if (!studioName.trim()) return;

    setIsSaving(true);
    try {
      await fetchApi('/api/studios', {
        method: 'POST',
        body: JSON.stringify({ name: studioName.trim() })
      });
      showToast(`Studio "${studioName}" berhasil dibuat! 🎉`, 'success');
      setStudioName('');
      setShowModal(false);
      fetchStudios();
    } catch (err) {
      showToast(err.message || 'Gagal membuat studio.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Filtering
  const filteredData = initialData.filter(item => {
    const namaMatch = (item.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    let displayStatus = item.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif';
    const statusMatch = filterStatus === 'Semua' ? true : displayStatus === filterStatus;
    return namaMatch && statusMatch;
  });

  const columns = [
    { header: 'ID Studio',   cell: (row) => <span className="text-xs text-gray-400 font-mono">{row.id.substring(0, 8)}...</span> },
    { header: 'Nama Studio', cell: (row) => <span className="font-bold whitespace-normal">{row.name}</span> },
    { header: 'Akun Aktif',  cell: (row) => <Badge status={row.activeAccountsCount > 0 ? 'AMAN' : 'WARNING'} label={`${row.activeAccountsCount} AKUN`} /> },
    { header: 'Total Sesi',  accessor: 'totalLiveSessions' },
    { header: 'Status',      cell: (row) => <Badge status={row.status === 'ACTIVE' ? 'AMAN' : 'OFFLINE'} label={row.status} /> },
    { header: 'Eksekusi', cell: (row) => (
      <div className="flex space-x-2">
        <Button
          variant="primary" size="sm"
          leftIcon={<Eye size={14} />}
          className="bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-600"
          onClick={() => navigate(`/list-studio/${row.id}`)}
        >Detail</Button>
        <Button
          variant="danger" size="sm"
          leftIcon={<ExternalLink size={14} />}
          className="bg-orange-500 hover:bg-orange-600 focus:ring-orange-500"
        >Cek Etalase</Button>
      </div>
    )}
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium max-w-sm ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        } animate-in slide-in-from-bottom-4`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4">
        <div>
          <h1 className="text-h2 font-bold text-gk-text-main">List Studio</h1>
          <p className="text-gk-text-muted mt-1">
            Kelola seluruh studio operasional yang terdaftar
            <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {initialData.length} studio
            </span>
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus size={16} />}
          onClick={() => setShowModal(true)}
        >
          Tambah Studio Baru
        </Button>
      </div>

      {/* Tabel */}
      <Card>
        <div className="p-4 border-b border-gray-100 bg-white flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="w-full md:w-1/3 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <div className="ml-1">
              <Input
                placeholder="Cari nama studio..."
                containerClassName="mb-0 w-full"
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="w-full md:w-48">
            <Select
              containerClassName="mb-0"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              options={[
                { value: 'Semua', label: 'Filter: Semua Status' },
                { value: 'Aktif', label: 'Aktif' },
                { value: 'Nonaktif', label: 'Nonaktif' },
              ]}
            />
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-body text-gk-text-main whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gk-border text-small font-semibold text-gk-text-muted uppercase tracking-wider">
                <tr>
                  {columns.map((col, i) => (
                    <th key={i} className="px-6 py-4">{col.header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-10 text-center text-gray-400">
                      <Loader2 size={20} className="animate-spin inline mr-2" />
                      Memuat data studio...
                    </td>
                  </tr>
                ) : filteredData.length > 0 ? (
                  filteredData.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-standard">
                      {columns.map((col, j) => (
                        <td key={j} className="px-6 py-4">
                          {col.accessor ? row[col.accessor] : col.cell ? col.cell(row) : null}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-16 text-center text-gk-text-muted bg-gray-50/50">
                      <div className="flex flex-col items-center">
                        {searchTerm ? (
                          <>
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                              <Search className="text-gray-400" size={24} />
                            </div>
                            <p className="text-gray-600 font-medium">Tidak ditemukan "{searchTerm}"</p>
                          </>
                        ) : (
                          <>
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                              <MonitorPlay className="text-blue-500" size={32} />
                            </div>
                            <p className="text-gray-600 font-bold text-lg mb-2">Belum ada studio</p>
                            <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
                              Tambahkan studio pertama Anda untuk mulai mengelola cookies dan automasi etalase.
                            </p>
                            <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
                              Tambah Studio Pertama →
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Menampilkan {filteredData.length} dari {initialData.length} studio
            </p>
            <div className="flex space-x-2">
              <Button variant="ghost" size="sm" disabled>Prev</Button>
              <Button variant="primary" size="sm" className="w-8 h-8 p-0 grid place-items-center">1</Button>
              <Button variant="ghost" size="sm" disabled>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== MODAL TAMBAH STUDIO ===== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <Building2 size={20} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Tambah Studio Baru</h2>
                  <p className="text-xs text-gray-500">Studio adalah ruang kerja untuk mengelola akun Shopee</p>
                </div>
              </div>
              <button
                onClick={() => { setShowModal(false); setStudioName(''); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateStudio} className="p-6 space-y-4">
              <Input
                label="Nama Studio"
                placeholder="Contoh: Studio Kosmetik VIP 001"
                value={studioName}
                onChange={e => setStudioName(e.target.value)}
                helperText="Nama studio harus unik di dalam sistem."
                autoFocus
                required
              />

              {/* Tips */}
              <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 space-y-1">
                <p className="font-semibold">💡 Tips Penamaan Studio:</p>
                <ul className="list-disc list-inside space-y-0.5 text-blue-600">
                  <li>Gunakan nama yang mudah diidentifikasi, misal: <strong>Studio 01 — Kosmetik</strong></li>
                  <li>Setiap studio bisa menampung banyak akun Shopee</li>
                  <li>Akun Shopee bisa dipindahkan antar studio kapan saja</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setShowModal(false); setStudioName(''); }}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving
                    ? <><Loader2 size={15} className="animate-spin mr-2" />Menyimpan...</>
                    : <><Plus size={15} className="mr-2" />Buat Studio</>
                  }
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
