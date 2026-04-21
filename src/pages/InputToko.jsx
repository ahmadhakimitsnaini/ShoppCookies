import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export const InputToko = () => {
  const activeStudios = [
    { value: '', label: 'Pilih Studio...' },
    { value: 'STUDIOA', label: 'STUDIOA - Budi Santoso' },
    { value: 'FASHIONB', label: 'FASHIONB - Siti Aminah' },
  ];

  const [draftStatus, setDraftStatus] = useState(''); // '' | 'saving' | 'saved'

  // Mock auto save
  React.useEffect(() => {
    const timer = setInterval(() => {
      setDraftStatus('saving');
      setTimeout(() => setDraftStatus('saved'), 1000);
    }, 15000); // 15s for demo
    return () => clearInterval(timer);
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    // Simulate save
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-2xl mx-auto mt-4">
      <div className="mb-6">
        <h1 className="text-h2 font-bold text-gk-text-main">Input Toko Baru</h1>
        <p className="text-gk-text-muted mt-1">Daftarkan URL dan ID Shopee untuk studio yang sudah terdaftar</p>
      </div>

      <Card>
        <CardHeader className="bg-gray-50/50  flex flex-row items-center justify-between">
          <CardTitle>Form Detail Toko</CardTitle>
          {draftStatus && (
            <span className={`text-xs font-medium flex items-center transition-colors ${draftStatus === 'saving' ? 'text-amber-500' : 'text-gray-400'}`}>
              {draftStatus === 'saving' ? 'Menyimpan draft...' : 'Tersimpan otomatis'} 
              <span className={`ml-1.5 h-1.5 w-1.5 rounded-full ${draftStatus === 'saving' ? 'bg-amber-500 animate-pulse' : 'bg-gray-400'}`}></span>
            </span>
          )}
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="space-y-6 pt-6">
            <Select 
              label="Relasi Studio" 
              options={activeStudios} 
              required
            />
            
            <Input 
              label="Nama Toko Shopee" 
              placeholder="Contoh: Official Gudang Kosmetik" 
              helperText="Nama toko untuk profil publik di sistem"
              required 
            />
            
            <Input 
              label="Username Toko" 
              placeholder="Contoh: officialkosmetik_jkt" 
              helperText="Username url asli toko (contoh: shopee.co.id/username_toko)"
              required 
            />
            
            <Input 
              label="Alamat Pengiriman (Opsional)" 
              placeholder="Jalan, Kota..." 
            />

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <Button type="submit" size="lg" className="w-full sm:w-auto">Simpan Toko</Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
};
