import React, { useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Switch } from '../components/ui/Switch';
import { Button } from '../components/ui/Button';
import { useStudioStore } from '../store/useStudioStore';

export const SetStudio = () => {
  const { studios, fetchStudios, toggleShare, isLoading } = useStudioStore();

  useEffect(() => {
    // Only fetch if empty, or enforce a re-fetch to get latest status
    fetchStudios();
  }, []);

  const toggleSingle = (id, currentStatus) => {
    // Balik status saat ini dan lempar ke API
    toggleShare(id, !currentStatus);
  };

  const setAll = (targetState) => {
    // Optimalnya memakai batch update backend, untuk sekarang kita interasi
    studios.forEach(s => {
      if (s.is_share_on !== targetState) {
         toggleShare(s.id, targetState);
      }
    });
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
              {isLoading && studios.length === 0 && (
                 <tr>
                   <td colSpan="3" className="px-6 py-8 text-center text-gray-500">Memuat data studio...</td>
                 </tr>
              )}
              {studios.map((row) => (
                <tr 
                  key={row.id} 
                  className={`transition-colors duration-300 ${row.is_share_on ? 'bg-emerald-50 hover:bg-emerald-100' : 'bg-white hover:bg-gray-50'}`}
                >
                  <td className={`px-6 py-5 font-bold text-xs ${row.is_share_on ? 'text-emerald-700' : 'text-gray-500'}`}>
                    #{row.id.substring(0,8)}
                  </td>
                  <td className="px-6 py-5">
                    <p className={`font-semibold text-lg ${row.is_share_on ? 'text-emerald-900' : 'text-gray-700'}`}>
                      {row.name}
                    </p>
                  </td>
                  <td className="px-6 py-5 text-right flex justify-end items-center h-full pt-6">
                    <Switch 
                      checked={row.is_share_on} 
                      onChange={() => toggleSingle(row.id, row.is_share_on)} 
                      size="lg"
                    />
                    <span className={`ml-3 w-10 text-left font-bold text-sm ${row.is_share_on ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {row.is_share_on ? 'ON' : 'OFF'}
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
