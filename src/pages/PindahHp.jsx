import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Select } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ArrowRight, Smartphone, AlertCircle } from 'lucide-react';

export const PindahHp = () => {
  const [fromStudio, setFromStudio] = useState('');
  const [targetHp, setTargetHp] = useState('');
  const [toStudio, setToStudio] = useState('');

  const studios = [
    { value: '', label: 'Pilih Studio...' },
    { value: 'S_001', label: 'Studio Kosmetik VIP (S_001)' },
    { value: 'S_002', label: 'Fashion Mix (S_002)' },
    { value: 'S_003', label: 'Gudang Promo 99 (S_003)' },
  ];

  /* Mock database of HPs based on studio selected */
  const hpLists = {
    'S_001': [
      { value: 'HP_A1', label: 'Samsung S22 (HP_A1)' },
      { value: 'HP_A2', label: 'iPhone 13 (HP_A2)' },
    ],
    'S_002': [
      { value: 'HP_B1', label: 'Oppo Reno (HP_B1)' },
    ],
    'S_003': [], // No devices available / all mapped
  };

  const getHpOptions = () => {
    if (!fromStudio) return [{ value: '', label: 'Pilih studio asal terlebih dahulu' }];
    const devices = hpLists[fromStudio] || [];
    if (devices.length === 0) return [{ value: '', label: '-- Studio Tidak Punya HP Kosong --' }];
    return [{ value: '', label: 'Pilih Divais HP...' }, ...devices];
  };

  // Get labels for preview
  const fromLabel = studios.find(s => s.value === fromStudio)?.label || '[Asal]';
  const targetLabel = hpLists[fromStudio]?.find(h => h.value === targetHp)?.label || '[Nama HP]';
  const toLabel = studios.find(s => s.value === toStudio)?.label || '[Tujuan]';

  const isFormComplete = fromStudio && targetHp && toStudio;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl mx-auto mt-4">
      <div className="mb-6">
        <h1 className="text-h2 font-bold text-gk-text-main">Pindah Divais (Transfer HP)</h1>
        <p className="text-gk-text-muted mt-1">Mengalihkan konfigurasi operasional HP Live dari satu studio ke studio lainnya.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-8">
             
             {/* Source config */}
             <div className="space-y-4">
               <h3 className="font-semibold text-gray-800 flex items-center">
                 <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center mr-2 text-sm">1</div>
                 Pilih Sumber Divais
               </h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-8">
                 <Select 
                   label="Dari Studio Asal"
                   value={fromStudio}
                   onChange={(e) => {
                     setFromStudio(e.target.value);
                     setTargetHp(''); // Reset dependent HP field
                   }}
                   options={studios}
                   containerClassName="mb-0"
                 />
                 <Select 
                   label="Nama Toko / HP"
                   value={targetHp}
                   onChange={(e) => setTargetHp(e.target.value)}
                   options={getHpOptions()}
                   disabled={!fromStudio || (hpLists[fromStudio]?.length === 0)}
                   containerClassName="mb-0"
                 />
               </div>
             </div>

             {/* Target config */}
             <div className="space-y-4 pt-4 border-t border-gray-100">
               <h3 className="font-semibold text-gray-800 flex items-center">
                 <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center mr-2 text-sm">2</div>
                 Pilih Tujuan Transfer
               </h3>
               <div className="pl-8">
                 <Select 
                   label="Di Pindah Ke Studio"
                   value={toStudio}
                   onChange={(e) => setToStudio(e.target.value)}
                   options={studios.filter(s => s.value !== fromStudio || s.value === '')}
                   containerClassName="mb-0 max-w-sm"
                 />
               </div>
             </div>
             
             {/* Preview Config */}
             <div className="pt-6">
               <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 relative overflow-hidden">
                 {/* Background flair */}
                 <div className="absolute right-0 top-0 opacity-5 w-32 h-32 -mt-10 -mr-10"><Smartphone size={128} /></div>
                 
                 <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Pratinjau Aksi</h4>
                 <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
                    <div className="w-full sm:w-2/5 p-3 bg-white border border-gray-200 rounded-lg text-center shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Dari Asal</p>
                      <p className="font-medium text-sm text-gray-800 truncate" title={fromLabel}>{fromLabel}</p>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center">
                      <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-medium mb-2 border border-blue-100 whitespace-nowrap">
                        {targetLabel}
                      </div>
                      <ArrowRight className="text-gray-400 hidden sm:block" size={20} />
                      <div className="w-px h-6 bg-gray-300 sm:hidden"></div>
                    </div>

                    <div className="w-full sm:w-2/5 p-3 bg-white border border-gray-200 rounded-lg text-center shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Ke Tujuan</p>
                      <p className="font-medium text-sm text-green-700 truncate" title={toLabel}>{toLabel}</p>
                    </div>
                 </div>
               </div>
               
               {isFormComplete && (
                 <div className="mt-4 flex items-start text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-100">
                   <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" />
                   <p className="text-sm"><b>Peringatan:</b> Pastikan jadwal {targetLabel} tidak sedang digunakan live secara sinkron. Operasi perpindahan memakan waktu sinkronisasi ulang ± 10 menit pada cloud API Server.</p>
                 </div>
               )}
               
               <div className="mt-6 flex justify-end">
                 <Button type="button" size="lg" disabled={!isFormComplete} className="w-full sm:w-auto">
                   Konfirmasi Pemindahan HP
                 </Button>
               </div>
             </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
};
