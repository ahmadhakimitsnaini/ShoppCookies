import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Search, Cookie as CookieIcon, AlertCircle } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { fetchApi } from '../lib/api';

export const InputCookies = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [studios, setStudios] = useState([]);
  
  // Form State
  const [selectedStudioId, setSelectedStudioId] = useState('');
  const [rawCookie, setRawCookie] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Studios for Dropdown
  useEffect(() => {
    const fetchStudios = async () => {
      try {
        const res = await fetchApi('/api/studios');
        setStudios(res.data || []);
      } catch (err) {
        console.error("Gagal menarik daftar studio:", err);
      }
    };
    fetchStudios();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    
    try {
      const response = await fetchApi(`/api/cookies/search?username=${encodeURIComponent(searchTerm)}`);
      setSearchResults(response);
    } catch (err) {
      console.error('Pencarian gagal:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const openLinkModal = (account) => {
    setSelectedAccount(account);
    setSelectedStudioId(account.studio_id || '');
    setRawCookie(''); // Reset
    setIsModalOpen(true);
  };

  const handleLinkSubmit = async () => {
    if (!selectedStudioId || !rawCookie.trim()) {
      alert("Harap pilih Studio dan isi Raw Cookies!");
      return;
    }

    setIsSubmitting(true);
    try {
      await fetchApi('/api/cookies/inject', {
        method: 'POST',
        body: JSON.stringify({
          account_id: selectedAccount.id,
          studio_id: selectedStudioId,
          cookie_text: rawCookie
        })
      });

      alert("🎉 Berhasil! Cookie tersimpan dan Akun dipatenkan ke Studio terkait.");
      setIsModalOpen(false);
      // Refresh Data Pencarian
      handleSearch({ preventDefault: () => {} }); 
    } catch (err) {
      console.error('Gagal menghubungkan:', err);
      alert('Gagal menghubungkan cookie. Cek konsol log.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { header: 'Username Shopee', accessor: 'shopee_username' },
    { header: 'Nama Toko (Shopee)', accessor: 'shopee_shop_name' },
    { 
      header: 'Anggota / Pemilik', 
      cell: (row) => row.member ? row.member.name : '-' 
    },
    { 
      header: 'Status Sesi Terakhir', 
      cell: (row) => {
        if (!row.sessions || row.sessions.length === 0) return <span className="text-gray-400 font-bold">KOSONG</span>;
        return <span className="text-green-600 font-bold">LIVE</span>;
      }
    },
    { header: 'Aksi', cell: (row) => (
      <Button variant="primary" size="sm" onClick={() => openLinkModal(row)}>
        Hubungkan ke Studio
      </Button>
    )}
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto mt-4 px-4 sm:px-0">
      <div className="mb-6">
        <h1 className="text-h2 font-bold text-gk-text-main">Pencarian & Injeksi Cookies</h1>
        <p className="text-gk-text-muted mt-1">Cari Username dan tanamkan ekstrak Raw Cookie untuk melahirkan otomasi.</p>
      </div>

      <Card>
        <CardHeader className="bg-gray-50 border-b border-gray-100">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input 
                placeholder="Masukkan username Shopee target (contoh: shimastore)..." 
                containerClassName="mb-0"
                className="pl-10 py-3"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button type="submit" size="lg" className="w-full sm:w-auto" isLoading={isSearching}>
              {!isSearching ? "Cari Akun" : "Mencari..."}
            </Button>
          </form>
        </CardHeader>
        
        <CardContent className="p-0 min-h-[300px] flex flex-col justify-center">
          {!hasSearched && (
            <div className="py-16 text-center flex flex-col items-center">
              <div className="p-6 rounded-full bg-blue-50  mb-4 text-blue-400">
                 <CookieIcon size={48} />
              </div>
              <h3 className="text-lg font-medium text-gray-900  mb-1">Cari Akun Shopee Terdaftar</h3>
              <p className="text-gray-500  text-sm max-w-sm mx-auto">
                Ketik nama pengguna shopee secara persis untuk mencari database dan menanamkan session barunya.
              </p>
            </div>
          )}

          {hasSearched && !isSearching && searchResults.length === 0 && (
            <div className="py-16 text-center flex flex-col items-center animate-in zoom-in-95">
              <div className="p-5 rounded-full bg-red-50  text-red-500 mb-4">
                 <AlertCircle size={40} />
              </div>
              <h3 className="text-lg font-medium text-gray-900  mb-1">Username Tidak Ditemukan</h3>
              <p className="text-gray-500  text-sm max-w-sm mx-auto">
                Tidak ada riwayat database dengan username tersebut.
              </p>
            </div>
          )}

          {hasSearched && !isSearching && searchResults.length > 0 && (
            <div className="w-full animate-in fade-in overflow-x-auto">
              <Table columns={columns} data={searchResults} className="border-0 shadow-none rounded-none w-full whitespace-nowrap" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Injeksi */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Tanamkan Cookie Ekstensi"
        footer={
          <>
             <Button variant="primary" onClick={handleLinkSubmit} isLoading={isSubmitting}>
               Tanam & Patenkan Rekaman
             </Button>
             <Button variant="outline" className="mr-3" onClick={() => setIsModalOpen(false)}>
               Batal
             </Button>
          </>
        }
      >
        {selectedAccount && (
           <div className="space-y-4">
              <div className="bg-orange-50 p-3 rounded-md border border-orange-100 text-sm text-orange-800">
                  <p>Anda sedang mengutak-atik identitas dari toko: <strong>{selectedAccount.shopee_shop_name}</strong> (@{selectedAccount.shopee_username})</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  1. Pilih Ruang Studio
                </label>
                <select 
                  className="w-full h-11 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gk-primary focus:border-transparent transition-all"
                  value={selectedStudioId}
                  onChange={(e) => setSelectedStudioId(e.target.value)}
                >
                  <option value="" disabled>-- Pilih Studio Penanggung Jawab --</option>
                  {studios.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.activeAccountsCount} Aktif)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  2. Tempel Kode <i>Raw Cookie</i> (SPC_T, dsb)
                </label>
                <textarea 
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-gk-primary h-32"
                  placeholder="SPC_F=...; SPC_T=..."
                  value={rawCookie}
                  onChange={(e) => setRawCookie(e.target.value)}
                />
              </div>
           </div>
        )}
      </Modal>
    </div>
  );
};
