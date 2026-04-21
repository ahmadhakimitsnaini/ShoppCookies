import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Search, Cookie as CookieIcon, AlertCircle } from 'lucide-react';

export const InputCookies = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    
    // Simulate API search
    setTimeout(() => {
      setIsSearching(false);
      // Dummy logic: if "budi", return results. otherwise empty.
      if (searchTerm.toLowerCase().includes('budi') || searchTerm.toLowerCase() === 'test') {
        setSearchResults([
          { username: 'budisantos123', email: 'budi***@gmail.com', phone: '0812***890', name: 'Budi Santoso' },
        ]);
      } else {
        setSearchResults([]);
      }
    }, 600);
  };

  const columns = [
    { header: 'Username', accessor: 'username' },
    { header: 'Email Lengkap', accessor: 'email' },
    { header: 'No. Handphone', accessor: 'phone' },
    { header: 'Nama Lengkap', accessor: 'name' },
    { header: 'Aksi', cell: () => (
      <Button variant="primary" size="sm">
        Hubungkan ke Studio
      </Button>
    )}
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto mt-4">
      <div className="mb-6">
        <h1 className="text-h2 font-bold text-gk-text-main">Pencarian Cookies Akun</h1>
        <p className="text-gk-text-muted mt-1">Cari dan hubungkan sesi cookies akun Shopee mitra ke sistem Studio</p>
      </div>

      <Card>
        <CardHeader className="bg-gray-50 border-b border-gray-100">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input 
                placeholder="Masukkan username Shopee target..." 
                containerClassName="mb-0"
                className="pl-10 py-3"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button type="submit" size="lg" className="w-full sm:w-auto" isLoading={isSearching}>
              Cari Akun
            </Button>
          </form>
        </CardHeader>
        
        <CardContent className="p-0 min-h-[300px] flex flex-col justify-center">
          {!hasSearched && (
            <div className="py-16 text-center flex flex-col items-center">
              <div className="p-6 rounded-full bg-blue-50  mb-4 text-blue-400">
                 <CookieIcon size={48} />
              </div>
              <h3 className="text-lg font-medium text-gray-900  mb-1">Cari Akun Shopee</h3>
              <p className="text-gray-500  text-sm max-w-sm mx-auto">
                Ketik username secara persis untuk mencari riwayat otorisasi akun dan menyambungkannya dengan Studio terdaftar.
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
                Tidak ada riwayat cookies akun dengan identitas tersebut di database sistem.
              </p>
            </div>
          )}

          {hasSearched && !isSearching && searchResults.length > 0 && (
            <div className="w-full animate-in fade-in">
              <Table columns={columns} data={searchResults} className="border-0 shadow-none rounded-none" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
