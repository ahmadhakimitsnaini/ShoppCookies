import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Settings, AlertCircle, ShieldCheck, PlayCircle, Clock, Loader2 } from 'lucide-react';
import { fetchApi } from '../lib/api';

export const ListAkunTreatment = () => {
  const [akunList, setAkunList]     = useState([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [runningIds, setRunningIds] = useState(new Set()); // akun yang sedang di-treatment
  const [toast, setToast]           = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await fetchApi('/api/treatment/accounts');
      setAkunList(response);
    } catch (err) {
      console.error('Failed to grab treatment list:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
    // Auto-refresh setiap 30 detik untuk update status last_treatment
    const interval = setInterval(fetchAccounts, 30000);
    return () => clearInterval(interval);
  }, [fetchAccounts]);

  const handleStartTreatment = async (row) => {
    if (row.is_live) {
      showToast('Akun sedang LIVE, tidak bisa dijalankan treatment.', 'error');
      return;
    }

    setRunningIds(prev => new Set([...prev, row.full_id]));
    try {
      const res = await fetchApi(`/api/treatment/start/${row.full_id}`, { method: 'POST' });
      showToast(res.message, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      // Jangan langsung hapus — biarkan tetap "berjalan" sampai user refresh manual
      // Bot memakan waktu 10-15 menit, tidak bisa track real-time di sini
      setTimeout(() => {
        setRunningIds(prev => { const s = new Set(prev); s.delete(row.full_id); return s; });
        fetchAccounts();
      }, 10000); // Refresh setelah 10 detik untuk update state
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'AMAN':
        return <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800"><ShieldCheck size={12} className="mr-1"/>AMAN</div>;
      case 'PERLU PERHATIAN':
        return <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"><AlertCircle size={12} className="mr-1"/>PERHATIAN</div>;
      case 'KRITIS':
        return <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800"><AlertCircle size={12} className="mr-1"/>KRITIS</div>;
      default:
        return <Badge label={status} />;
    }
  };

  const formatLastTreatment = (lastTreatment) => {
    if (!lastTreatment) return <span className="text-gray-400 text-xs">Belum pernah</span>;

    const date = new Date(lastTreatment.created_at);
    const diff  = Date.now() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    const mins  = Math.floor((diff % 3600000) / 60000);

    const timeStr = hours > 0 ? `${hours}j ${mins}m lalu` : `${mins}m lalu`;
    const isCompleted = lastTreatment.status === 'COMPLETED';

    return (
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-red-400'}`} />
        <span className="text-xs text-gray-600">{timeStr}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto mt-4">

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl text-sm font-medium ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        } animate-in slide-in-from-bottom-4`}>
          {toast.msg}
        </div>
      )}

      <div className="flex justify-between items-end mb-2">
        <div>
          <h1 className="text-h2 font-bold text-gk-text-main">List Akun Treatment</h1>
          <p className="text-gk-text-muted mt-1">
            Daftar akun aktif yang perlu pemanasan rutin.
            <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              Auto-treatment berjalan setiap 6 jam
            </span>
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchAccounts}>
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gk-text-main whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Username</th>
                  <th className="px-6 py-4">Nama Toko</th>
                  <th className="px-6 py-4">Studio</th>
                  <th className="px-6 py-4">Kesehatan</th>
                  <th className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Clock size={12} /> Last Treatment
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-gray-400">
                      <Loader2 size={20} className="animate-spin inline mr-2" />
                      Memuat data...
                    </td>
                  </tr>
                ) : akunList.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-10 text-gray-400 font-medium">
                      Belum ada akun di database.
                    </td>
                  </tr>
                ) : akunList.map((row) => {
                  const isRunning = runningIds.has(row.full_id);
                  return (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-gray-400 font-mono text-xs">#{row.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800">@{row.username}</span>
                          {row.is_live && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full">
                              <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                              LIVE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{row.namaToko}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-medium">
                          {row.studioName}
                        </span>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(row.status)}</td>
                      <td className="px-6 py-4">{formatLastTreatment(row.last_treatment)}</td>
                      <td className="px-6 py-4 text-center">
                        {isRunning ? (
                          <div className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                            <Loader2 size={14} className="animate-spin" />
                            Berjalan...
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`${row.is_live
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
                            }`}
                            onClick={() => handleStartTreatment(row)}
                            disabled={row.is_live}
                          >
                            <PlayCircle size={14} className="mr-1" />
                            Mulai Treatment
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Info */}
          {!isLoading && akunList.length > 0 && (
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400 flex justify-between">
              <span>Total: {akunList.length} akun terdaftar</span>
              <span>{akunList.filter(a => !a.is_live).length} siap treatment · {akunList.filter(a => a.is_live).length} sedang LIVE</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
