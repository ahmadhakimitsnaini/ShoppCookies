import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ToastContainer } from '../components/ui/Toast';
import { ExternalLink, Square, Activity, AlertCircle, RefreshCw } from 'lucide-react';
import { getActiveLive, stopLiveSession } from '../lib/api';
import { useToast } from '../lib/useToast';

export const TreatmentManual = () => {
  const [data, setData]               = useState([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState(null);
  const [isStopModalOpen, setStopModalOpen] = useState(false);
  const [activeItem, setActiveItem]   = useState(null);
  const [isStopping, setIsStopping]   = useState(false);
  const { toasts, addToast, removeToast } = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getActiveLive();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Agregasi summary dari data API
  const totalLive   = data.filter((r) => r.status === 'LIVE').length;
  const totalViewer = data.reduce((acc, r) => acc + (r.viewers || 0), 0);

  const handleStop = (item) => {
    setActiveItem(item);
    setStopModalOpen(true);
  };

  const handleConfirmStop = async () => {
    if (!activeItem?.session_id) {
      addToast('Tidak ada session_id untuk akun ini.', 'error');
      setStopModalOpen(false);
      return;
    }
    setIsStopping(true);
    try {
      await stopLiveSession(activeItem.session_id);
      addToast(`Live @${activeItem.username} berhasil dihentikan.`);
      setStopModalOpen(false);
      loadData();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsStopping(false);
    }
  };

  const getRowClass = (stateColor) => {
    switch (stateColor) {
      case 'green': return 'bg-emerald-50/40 hover:bg-emerald-50/70 border-l-4 border-l-emerald-500';
      case 'yellow': return 'bg-yellow-50/40 hover:bg-yellow-50/70 border-l-4 border-l-yellow-400';
      case 'red': return 'bg-red-50/40 hover:bg-red-50/70 border-l-4 border-l-red-500';
      default: return 'bg-gray-50/20 hover:bg-gray-50/50 border-l-4 border-l-gray-300 opacity-70';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Toast via ToastContainer */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="mb-2">
        <h1 className="text-h2 font-bold text-gk-text-main">Treatment Manual</h1>
        <p className="text-gk-text-muted mt-1">Monitoring dan override sesi perlakuan manual untuk optimasi produk berjalan.</p>
      </div>

      {/* Summary Pinned Bar */}
      <div className="flex flex-wrap gap-4 p-4 bg-gray-900 rounded-xl text-white shadow-lg sticky top-0 z-20 items-center justify-between">
        <div className="flex items-center space-x-2">
          <Activity className="text-emerald-400" />
          <span className="font-semibold">Summary Sistem:</span>
        </div>
        <div className="flex flex-wrap gap-6 text-sm">
          <div className="flex items-center"><span className="text-gray-400 mr-2">Total Live:</span> <span className="font-bold text-lg">{totalLive}</span></div>
          <div className="flex items-center"><span className="text-gray-400 mr-2">Total Penonton:</span> <span className="font-bold text-blue-300 text-lg">{totalViewer.toLocaleString('id-ID')}</span></div>
        </div>
        <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500" leftIcon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />} onClick={loadData} disabled={isLoading}>
          Refresh
        </Button>
      </div>

      <Card className="overflow-hidden border border-gk-border bg-gk-surface">
        {isLoading ? (
          <div className="py-16 text-center flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-500 text-sm">Memuat sesi live aktif...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center flex flex-col items-center">
            <AlertCircle size={40} className="text-red-400 mb-3" />
            <p className="text-red-600 font-medium">{error}</p>
            <Button className="mt-4" size="sm" onClick={loadData}>Coba Lagi</Button>
          </div>
        ) : data.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center">
            <div className="p-4 rounded-full bg-gray-100 text-gray-400 mb-4"><Activity size={40} /></div>
            <h3 className="text-lg font-medium text-gk-text-main mb-1">Tidak Ada Live</h3>
            <p className="text-gk-text-muted text-sm">Tidak ada sesi live aktif saat ini yang perlu ditangani.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="overflow-x-auto w-full hide-scrollbar hidden xl:block">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-[2200px]">
                <thead>
                  <tr className="bg-slate-100/80 text-xs text-gray-500 tracking-wider">
                    <th className="px-4 py-3 font-semibold border-b">ID</th>
                    <th className="px-4 py-3 font-semibold border-b text-center">STATUS</th>
                    <th className="px-4 py-3 font-semibold border-b">NAMA TOKO / JUDUL LIVE</th>
                    <th className="px-4 py-3 font-semibold border-b border-l border-gray-200 bg-gray-50 text-center" colSpan="3">⚡ OMZET LIVE TERKINI</th>
                    <th className="px-4 py-3 font-semibold border-b border-l border-gray-200 text-center" colSpan="3">🕒 OMZET SESI SEBELUMNYA</th>
                    <th className="px-4 py-3 font-semibold border-b border-l border-gray-200">TRAFIK</th>
                    <th className="px-4 py-3 font-semibold border-b">KOMISI</th>
                    <th className="px-4 py-3 font-semibold border-b">BANK</th>
                    <th className="px-4 py-3 font-semibold border-b sticky right-0 bg-slate-100/90 backdrop-blur z-10 text-center">KONTROL MANUAL</th>
                  </tr>
                  <tr className="bg-slate-50 text-[10px] text-gray-400 uppercase">
                    <th colSpan="3" className="border-b"></th>
                    <th className="px-4 py-2 border-b border-l border-gray-200 font-medium">Omzet (Rp)</th>
                    <th className="px-4 py-2 border-b font-medium">Jam</th>
                    <th className="px-4 py-2 border-b font-medium">Omzet / Jam</th>
                    <th className="px-4 py-2 border-b border-l border-gray-200 font-medium">Omzet (Rp)</th>
                    <th className="px-4 py-2 border-b font-medium">Jam</th>
                    <th className="px-4 py-2 border-b font-medium">Omzet / Jam</th>
                    <th colSpan="4" className="border-b border-l border-gray-200 sticky right-0 z-10 bg-slate-50"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((row) => (
                    <tr key={row.id} className={`transition-colors ${getRowClass(row.stateColor)}`}>
                      <td className="px-4 py-4 font-bold text-gray-600">#{row.shortId}</td>
                      <td className="px-4 py-4 text-center">
                        <Badge status={row.status === 'ERROR' ? 'EXPIRED' : row.status} label={row.status} />
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-bold text-gk-primary">{row.namaToko}</p>
                        <p className="text-[11px] text-gray-500 mt-1 max-w-[200px] truncate">"{row.judulLive}"</p>
                      </td>
                      <td className="px-4 py-4 border-l border-gray-200/50 bg-white/30 font-bold text-gray-800">{row.omzet}</td>
                      <td className="px-4 py-4 bg-white/30 text-gray-600 text-xs">{row.omzetJam}</td>
                      <td className="px-4 py-4 bg-white/30 text-emerald-600 font-semibold">-</td>
                      <td className="px-4 py-4 border-l border-gray-200/50 text-gray-500">{row.omzetSeb}</td>
                      <td className="px-4 py-4 text-gray-400 text-xs">{row.omzetJamSeb}</td>
                      <td className="px-4 py-4 text-gray-500">-</td>
                      <td className="px-4 py-4 border-l border-gray-200/50">
                        <div className="flex space-x-2">
                          <div className="bg-blue-50 text-blue-800 px-2 py-1 rounded text-xs">👀 {row.viewers}</div>
                          <div className="bg-emerald-50 text-emerald-800 px-2 py-1 rounded text-xs">🛒 {row.buyers}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-bold text-teal-600">{row.komisi}</td>
                      <td className="px-4 py-4 text-xs text-gray-500">{row.bank}</td>
                      <td className="px-4 py-4 align-middle sticky right-0 z-10 shadow-[-10px_0_15px_-5px_rgba(0,0,0,0.05)] border-l border-gray-200 bg-white/95 backdrop-blur">
                        <div className="flex justify-center space-x-2 opacity-90 hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" leftIcon={<ExternalLink size={14} />} className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs" disabled={row.status !== 'LIVE'}>
                            Lihat Live
                          </Button>
                          <Button variant="danger" size="sm" leftIcon={<Square size={14} className="fill-current" />} onClick={() => handleStop(row)} disabled={row.status !== 'LIVE'} className="text-xs">
                            HENTIKAN LIVE
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="xl:hidden flex flex-col p-4 space-y-4 bg-gray-50">
              {data.map((row) => (
                <div key={row.id} className={`p-4 rounded-xl shadow-sm border ${getRowClass(row.stateColor)}`}>
                  <div className="flex justify-between items-start mb-3 border-b border-gray-100/50 pb-3">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-bold text-gray-500">#{row.shortId}</span>
                        <Badge status={row.status === 'ERROR' ? 'EXPIRED' : row.status} label={row.status} />
                      </div>
                      <h3 className="font-bold text-gk-primary text-base">{row.namaToko}</h3>
                      <p className="text-xs text-gray-500 italic truncate w-48 mt-1">"{row.judulLive}"</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Komisi</p>
                      <p className="font-bold text-teal-600">{row.komisi}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white/50 p-3 rounded text-center shadow-sm">
                      <p className="text-[10px] text-gray-500 font-bold mb-1">OMZET TERKINI</p>
                      <p className="text-lg font-bold text-gray-800">{row.omzet}</p>
                    </div>
                    <div className="bg-white/50 p-3 rounded text-center shadow-sm">
                      <p className="text-[10px] text-gray-500 font-bold mb-1">TRAFIK</p>
                      <div className="flex justify-center space-x-2 mt-1">
                        <div className="text-xs text-blue-700 bg-blue-100 rounded px-2 py-0.5">👁 {row.viewers}</div>
                        <div className="text-xs text-emerald-700 bg-emerald-100 rounded px-2 py-0.5">🛒 {row.buyers}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2 pt-2 border-t border-gray-100/50">
                    <Button variant="danger" size="sm" onClick={() => handleStop(row)} disabled={row.status !== 'LIVE'} className="flex-1 text-xs">
                      HENTIKAN
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { height: 8px; }
        .hide-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
        .hide-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; border: 2px solid #f8fafc; }
        .hide-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

      {/* STOP MODAL */}
      <Modal
        title="Konfirmasi Henti Manual"
        isOpen={isStopModalOpen}
        onClose={() => setStopModalOpen(false)}
        footer={
          <>
            <Button variant="danger" className="w-full sm:ml-3 sm:w-auto" onClick={handleConfirmStop} disabled={isStopping}>
              {isStopping ? 'Menghentikan...' : 'Ya, Hentikan'}
            </Button>
            <Button variant="ghost" onClick={() => setStopModalOpen(false)} className="mt-3 w-full sm:mt-0 sm:w-auto">Batal</Button>
          </>
        }
      >
        <p className="text-gray-700">
          Tindakan ini akan menghentikan proses treatment Live pada <b className="text-gk-primary">{activeItem?.namaToko}</b> secara instan. Apakah Anda mengonfirmasi penarikan cookies secara manual dari sistem sinkronisasi?
        </p>
      </Modal>
    </div>
  );
};
