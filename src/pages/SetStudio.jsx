import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Switch } from '../components/ui/Switch';
import { Button } from '../components/ui/Button';

export const SetStudio = () => {
  const initialStudios = [
    { id: 1, userStudio: 'Gudang Promo S_001', isShareOn: true },
    { id: 2, userStudio: 'Kosmetik VIP S_002', isShareOn: false },
    { id: 3, userStudio: 'Fashion Mix S_003', isShareOn: false },
    { id: 4, userStudio: 'Baju Anak S_004', isShareOn: true },
  ];

  const [studios, setStudios] = useState(initialStudios);

  const toggleSingle = (id) => {
    setStudios(studios.map(s => s.id === id ? { ...s, isShareOn: !s.isShareOn } : s));
  };

  const setAll = (state) => {
    setStudios(studios.map(s => ({ ...s, isShareOn: state })));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto mt-4">
      <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-h2 font-bold text-gk-text-main">Set Studio (Share ON/OFF)</h1>
          <p className="text-gk-text-muted mt-1">Nyalakan / Matikan sinkronisasi SHARE pengikut. Berikut List Studio yang Anda punya.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0 border-b border-gray-100">
          <CardTitle>Daftar Sinkronisasi Share</CardTitle>
          <div className="flex space-x-2">
            <Button variant="primary" size="sm" onClick={() => setAll(true)} className="bg-emerald-600 hover:bg-emerald-700">
              Aktifkan Semua
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setAll(false)} className="bg-gray-200 text-gray-700 hover:bg-gray-300">
              Nonaktifkan Semua
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-left text-body text-gk-text-main whitespace-nowrap">
            <thead className="bg-white border-b border-gk-border text-small font-semibold text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 w-24">ID</th>
                <th className="px-6 py-4">USER STUDIO / TOKO</th>
                <th className="px-6 py-4 text-right w-48">TOGGLE ON / OFF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {studios.map((row) => (
                <tr 
                  key={row.id} 
                  className={`transition-colors duration-300 ${row.isShareOn ? 'bg-emerald-50 hover:bg-emerald-100' : 'bg-white hover:bg-gray-50'}`}
                >
                  <td className={`px-6 py-5 font-bold ${row.isShareOn ? 'text-emerald-700' : 'text-gray-500'}`}>
                    #{row.id}
                  </td>
                  <td className="px-6 py-5">
                    <p className={`font-semibold text-lg ${row.isShareOn ? 'text-emerald-900' : 'text-gray-700'}`}>
                      {row.userStudio}
                    </p>
                  </td>
                  <td className="px-6 py-5 text-right flex justify-end items-center h-full pt-6">
                    <Switch 
                      checked={row.isShareOn} 
                      onChange={() => toggleSingle(row.id)} 
                      size="lg"
                    />
                    <span className={`ml-3 w-10 text-left font-bold text-sm ${row.isShareOn ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {row.isShareOn ? 'ON' : 'OFF'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};
