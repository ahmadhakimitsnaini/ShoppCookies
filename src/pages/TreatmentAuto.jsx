import React, { useState } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ChevronDown, ChevronUp, Save } from 'lucide-react';

export const TreatmentAuto = () => {
  const [expandedId, setExpandedId] = useState(1);

  const studios = [
    { id: 1, name: 'Kosmetik VIP Store (S_001)', deleteCurrent: false, addNew: true, category: 'Kosmetik' },
    { id: 2, name: 'Gudang Promo 99 (S_002)', deleteCurrent: true, addNew: true, category: 'Dekorasi Rumah' },
    { id: 3, name: 'Fashion Mix JKT (S_003)', deleteCurrent: false, addNew: false, category: 'Fashion Wanita' },
  ];

  const categories = [
    "Alat Bangunan", "Fashion Anak", "Hijab", "Alat Perkebunan", "Fashion Pria",
    "Kaos", "Alat Tulis Sekolah", "Fashion Wanita", "Kemeja Pria", "Assesoris Fashion",
    "Gadget & Asesoris", "Kosmetik", "Bawahan Pria", "Gamis Pria", "Makanan & Minuman",
    "Bawahan Wanita", "Gamis Wanita", "Dekorasi Rumah", "Gerabah"
  ];

  const handleToggle = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto mt-4">
      <div className="mb-6">
        <h1 className="text-h2 font-bold text-gk-text-main">Treatment Auto</h1>
        <p className="text-gk-text-muted mt-1">Konfigurasi automasi kategori produk etalase per studio secara spesifik.</p>
      </div>

      <div className="space-y-4">
        {studios.map(studio => (
          <div key={studio.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Accordion Header */}
            <button 
              onClick={() => handleToggle(studio.id)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors border-b border-gray-200 text-left"
            >
              <h3 className="font-bold text-gray-800 text-lg">
                <span className="text-gray-400 font-mono mr-2">[{studio.id}]</span>
                | {studio.name}
              </h3>
              {expandedId === studio.id ? <ChevronUp className="text-gray-500" /> : <ChevronDown className="text-gray-500" />}
            </button>
            
            {/* Accordion Body */}
            {expandedId === studio.id && (
              <div className="p-6 animate-in slide-in-from-top-2 duration-300">
                
                <h4 className="font-semibold text-gray-700 mb-3 border-b pb-2">PILIHAN KATEGORI PRODUK</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                  {categories.map((cat, idx) => (
                    <label key={idx} className="flex items-center space-x-3 cursor-pointer group">
                      <input 
                        type="radio" 
                        name={`category_${studio.id}`} 
                        defaultChecked={cat === studio.category}
                        className="w-4 h-4 text-gk-primary border-gray-300 focus:ring-gk-primary" 
                      />
                      <span className="text-sm text-gray-700 group-hover:text-gk-primary transition-colors">{cat}</span>
                    </label>
                  ))}
                </div>

                <h4 className="font-semibold text-gray-700 mb-3 border-b pb-2">AKSI TREATMENT TARGET</h4>
                <div className="flex flex-col space-y-3 mb-6">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" defaultChecked={studio.deleteCurrent} className="w-5 h-5 rounded text-red-500 border-gray-300 focus:ring-red-500" />
                    <div>
                      <span className="text-sm font-bold text-gray-800">Delete Etalase</span>
                      <p className="text-xs text-gray-500">Hapus seluruh produk usang saat ini di etalase live sebelum memperbarui data.</p>
                    </div>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" defaultChecked={studio.addNew} className="w-5 h-5 rounded text-green-500 border-gray-300 focus:ring-green-500" />
                    <div>
                      <span className="text-sm font-bold text-gray-800">Tambah Etalase Produk Berkala</span>
                      <p className="text-xs text-gray-500">Suntikkan produk baru secara bertahap sesuai algoritma Auto-Treat kategori.</p>
                    </div>
                  </label>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <Button leftIcon={<Save size={18} />} onClick={() => alert('Konfigurasi Studio ' + studio.name + ' tersimpan.')}>
                    Simpan Konfigurasi Studio
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
