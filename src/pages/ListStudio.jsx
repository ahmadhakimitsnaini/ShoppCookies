import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { fetchApi } from '../lib/api';
import { Search, Eye, ExternalLink, MonitorPlay, Plus, X, Loader2, Building2, Send, Settings2 } from 'lucide-react';

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

  // State Modal Telegram Settings
  const [showTgModal, setShowTgModal] = useState(false);
  const [activeStudio, setActiveStudio] = useState(null);
  const [tgToken, setTgToken]         = useState('');
  const [tgChatId, setTgChatId]       = useState('');
  const [isTesting, setIsTesting]     = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

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

  const handleCreateStudio = async (e) => {
    e.preventDefault();
    if (!studioName.trim()) return;
    setIsSaving(true);
    try {
      await fetchApi('/api/studios', {
        method: 'POST',
        body: JSON.stringify({ name: studioName.trim() })
      });
      showToast(`Studio "${studioName}" berhasil dibuat!`, 'success');
      setStudioName('');
      setShowModal(false);
      fetchStudios();
    } catch (err) {
      showToast(err.message || 'Gagal membuat studio.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const openTelegramSettings = (studio) => {
    setActiveStudio(studio);
    setTgToken(studio.telegram_token || '');
    setTgChatId(studio.telegram_chat_id || '');
    setShowTgModal(true);
  };

  const saveTelegramSettings = async () => {
    setIsSaving(true);
    try {
      await fetchApi(`/api/studios/${activeStudio.id}/telegram`, {
        method: 'PATCH',
        body: JSON.stringify({
          telegram_token: tgToken,
          telegram_chat_id: tgChatId
        })
      });
      showToast('Konfigurasi Telegram berhasil disimpan!', 'success');
      setShowTgModal(false);
      fetchStudios();
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan konfigurasi.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const testTelegram = async () => {
    if (!tgToken || !tgChatId) return showToast('Isi Token & Chat ID dulu!', 'error');
    setIsTesting(true);
    try {
      await fetchApi(`/api/studios/${activeStudio.id}/test-telegram`, {
        method: 'POST',
        body: JSON.stringify({ token: tgToken, chatId: tgChatId })
      });
      showToast('Pesan test terkirim! Cek Telegram Anda.', 'success');
    } catch (err) {
      showToast(err.message || 'Gagal kirim pesan test.', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const filteredData = initialData.filter(item => {
    const namaMatch = (item.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    let displayStatus = item.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif';
    const statusMatch = filterStatus === 'Semua' ? true : displayStatus === filterStatus;
    return namaMatch && statusMatch;
  });

  const columns = [
    { header: 'Nama Studio', cell: (row) => (
      <div className="flex flex-col">
        <span className="font-bold text-gray-800">{row.name}</span>
        <span className="text-[10px] text-gray-400 font-mono">{row.id.substring(0, 8)}</span>
      </div>
    )},
    { header: 'Bot Telegram', cell: (row) => (
      row.telegram_token ? (
        <Badge status="AMAN" label="AKTIF" />
      ) : (
        <Badge status="OFFLINE" label="BELUM SET" />
      )
    )},
    { header: 'Akun',  cell: (row) => <Badge status={row.activeAccountsCount > 0 ? 'AMAN' : 'WARNING'} label={`${row.activeAccountsCount} AKUN`} /> },
    { header: 'Total Live',  accessor: 'totalLiveSessions' },
    { header: 'Status',      cell: (row) => <Badge status={row.status === 'ACTIVE' ? 'AMAN' : 'OFFLINE'} label={row.status} /> },
    { header: 'Aksi', cell: (row) => (
      <div className="flex space-x-2">
        <Button
          variant="ghost" size="sm"
          className="text-blue-600 hover:bg-blue-50"
          onClick={() => openTelegramSettings(row)}
          title="Setting Telegram"
        >
          <Send size={16} />
        </Button>
        <Button
          variant="primary" size="sm"
          leftIcon={<Eye size={14} />}
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => navigate(`/list-studio/${row.id}`)}
        >Detail</Button>
      </div>
    )}
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-2xl text-sm font-medium ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        } animate-in slide-in-from-bottom-4`}>
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4">
        <div>
          <h1 className="text-h2 font-bold text-gk-text-main">List Studio</h1>
          <p className="text-gk-text-muted mt-1">Kelola seluruh studio operasional dan bot notifikasi</p>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setShowModal(true)}>
          Tambah Studio Baru
        </Button>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-100 bg-white flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="w-full md:w-1/3 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Cari nama studio..."
              containerClassName="mb-0 w-full"
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
            <Select
              containerClassName="mb-0"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              options={[
                { value: 'Semua', label: 'Semua Status' },
                { value: 'Aktif', label: 'Aktif' },
                { value: 'Nonaktif', label: 'Nonaktif' },
              ]}
            />
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  {columns.map((col, i) => (
                    <th key={i} className="px-6 py-4">{col.header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr><td colSpan={columns.length} className="px-6 py-10 text-center text-gray-400">Memuat data...</td></tr>
                ) : filteredData.length > 0 ? (
                  filteredData.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      {columns.map((col, j) => (
                        <td key={j} className="px-6 py-4">
                          {col.accessor ? row[col.accessor] : col.cell ? col.cell(row) : null}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={columns.length} className="px-6 py-16 text-center text-gray-400">Belum ada studio.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* MODAL TAMBAH STUDIO */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold">Tambah Studio Baru</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateStudio} className="p-6 space-y-4">
              <Input label="Nama Studio" placeholder="Studio 01" value={studioName} onChange={e => setStudioName(e.target.value)} required />
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Batal</Button>
                <Button type="submit" disabled={isSaving}>Buat Studio</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SETTINGS TELEGRAM */}
      {showTgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="bg-blue-600 p-6 text-white relative">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg"><Send size={24} /></div>
                <div>
                  <h2 className="text-xl font-bold">Konfigurasi Bot Studio</h2>
                  <p className="text-blue-100 text-sm">Target: {activeStudio?.name}</p>
                </div>
              </div>
              <button onClick={() => setShowTgModal(false)} className="absolute top-6 right-6 text-white/70 hover:text-white"><X size={24} /></button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                <Settings2 className="text-blue-600 shrink-0" size={20} />
                <p className="text-xs text-blue-800 leading-relaxed">
                   Setiap studio memiliki Bot Telegram sendiri. Bot ini akan mengirim <b>Rekap Omzet Harian (23:59)</b>, 
                   notifikasi <b>Cookies Expired</b>, dan status <b>Auto-Treatment</b>.
                </p>
              </div>

              <Input 
                label="Bot Token" 
                placeholder="12345678:ABCDEF..." 
                value={tgToken} 
                onChange={e => setTgToken(e.target.value)} 
                helperText="Dapatkan dari @BotFather"
              />
              <Input 
                label="Chat ID (Group/Channel)" 
                placeholder="-100123456..." 
                value={tgChatId} 
                onChange={e => setTgChatId(e.target.value)}
                helperText="ID grup atau channel tempat bot akan memposting"
              />

              <div className="flex flex-col sm:flex-row justify-between gap-4 pt-2">
                <Button 
                  variant="ghost" 
                  className="text-emerald-600 border-emerald-100 hover:bg-emerald-50"
                  onClick={testTelegram}
                  disabled={isTesting}
                >
                  {isTesting ? <Loader2 className="animate-spin mr-2" size={16} /> : <Send className="mr-2" size={16} />}
                  Test Kirim Pesan
                </Button>
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => setShowTgModal(false)}>Batal</Button>
                  <Button onClick={saveTelegramSettings} disabled={isSaving}>
                    {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                    Simpan Perubahan
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
