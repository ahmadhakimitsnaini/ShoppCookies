import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Select, Textarea } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { AlertCircle, Link as LinkIcon, DatabaseZap } from 'lucide-react';

export const InputDataBank = () => {
  const [kategori, setKategori] = useState('');
  const [urlsStr, setUrlsStr] = useState('');
  const [validUrlsCount, setValidUrlsCount] = useState(0);
  const [errorLines, setErrorLines] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const kategoriOptions = [
    { value: '', label: 'Pilih Kategori Produk...' },
    { value: 'kosmetik', label: 'Kosmetik & Kecantikan' },
    { value: 'baju_wanita', label: 'Fashion Wanita' },
    { value: 'gadget', label: 'Gadget & Elektronik' },
    { value: 'dekorasi', label: 'Dekorasi Rumah' },
  ];

  // Parse validation real-time
  useEffect(() => {
    if (!urlsStr.trim()) {
      setValidUrlsCount(0);
      setErrorLines([]);
      return;
    }

    const lines = urlsStr.split('\n');
    let validCount = 0;
    let errors = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed === '') return;
      
      // Simple validation for shopee.co.id product shape
      if (trimmed.includes('shopee.co.id') && trimmed.length > 20) {
        validCount++;
      } else {
        errors.push(index + 1); // 1-indexed line
      }
    });

    setValidUrlsCount(validCount);
    setErrorLines(errors);
  }, [urlsStr]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!kategori) {
      alert("Pilih kategori terlebih dahulu.");
      return;
    }
    if (errorLines.length > 0) {
      alert("Terdapat format URL yang salah. Mohon perbaiki baris yang di-highlight merah.");
      return;
    }
    if (validUrlsCount === 0) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setUrlsStr('');
      alert(`${validUrlsCount} URL Produk Baru berhasil diamankan ke Bank Data Algoritma.`);
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto mt-4">
      <div className="mb-6">
        <h1 className="text-h2 font-bold text-gk-text-main flex items-center">
          Input Data Bank Produk <DatabaseZap className="ml-3 text-purple-500" />
        </h1>
        <p className="text-gk-text-muted mt-1">Distribusi dan daftarkan tautan produk afiliasi secara masif ke dalam kategori mesin treatment.</p>
      </div>

      <Card>
        <CardHeader className="bg-purple-50/50 border-b border-purple-100 flex justify-between flex-row items-center">
           <CardTitle className="text-purple-900">Formulator Link Database</CardTitle>
           <span className="font-mono text-sm bg-purple-200 text-purple-800 px-3 py-1 rounded-full font-bold">
             {validUrlsCount} URL Terdeteksi
           </span>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Select 
              label="Kategori / Etalase Sinkronisasi"
              options={kategoriOptions}
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              required
            />

            <div className="space-y-2">
              <label className="block text-body font-medium text-gk-text-main flex justify-between">
                <div>Daftar URL Produk Shopee <span className="text-red-500">*</span></div>
                {errorLines.length > 0 && (
                  <span className="text-xs text-red-500 font-bold flex items-center">
                    <AlertCircle size={14} className="mr-1" /> Error format pada baris: {errorLines.join(', ')}
                  </span>
                )}
              </label>
              
              <div className="relative">
                <Textarea 
                  placeholder="Masukkan satu URL per baris&#10;Contoh: https://shopee.co.id/product/908346763/24631613056"
                  rows={12}
                  className={`font-mono text-xs w-full hide-scrollbar leading-relaxed ${errorLines.length > 0 ? 'border-red-400 focus:ring-red-400 bg-red-50/10' : ''}`}
                  value={urlsStr}
                  onChange={(e) => setUrlsStr(e.target.value)}
                  containerClassName="mb-0"
                  required
                />
              </div>
              <p className="text-xs text-gray-500">
                Pemisahan antar URL ditentukan berdasarkan baris baru (Enter). Pastikan tautan tidak terdapat teks promosi tambahan.
              </p>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <Button 
                type="submit" 
                size="lg" 
                leftIcon={<LinkIcon size={18} />}
                isLoading={isSubmitting}
                disabled={errorLines.length > 0 || validUrlsCount === 0}
                className="w-full sm:w-auto"
              >
                Injeksi ke Bank Produk
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      <style>{`
        textarea {
          white-space: pre;
          overflow-wrap: normal;
          overflow-x: auto;
        }
      `}</style>
    </div>
  );
};
