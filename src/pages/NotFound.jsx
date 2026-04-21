import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Compass } from 'lucide-react';

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 animate-in zoom-in-95 duration-500">
      <div className="bg-gray-100  p-8 rounded-full mb-6 relative">
        <Compass size={64} className="text-gray-400  animate-pulse" />
        <span className="absolute top-0 right-0 bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded shadow-sm transform translate-x-1/4 -translate-y-1/4">
          404
        </span>
      </div>
      <h1 className="text-3xl font-bold text-gk-text-main mb-2">Halaman Tidak Ditemukan</h1>
      <p className="text-gk-text-muted mb-8 max-w-md">
        Sepertinya Anda tersesat. Jalur yang Anda cari tidak tersedia di peladen GudangKreatif Studio saat ini.
      </p>
      <Button size="lg" onClick={() => navigate('/home')}>
        Kembali ke Dashboard
      </Button>
    </div>
  );
};
