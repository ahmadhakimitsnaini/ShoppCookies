import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Textarea } from '../components/ui/Input';
import { ToastContainer } from '../components/ui/Toast';
import { RefreshCcw, ShieldAlert, Download, AlertCircle } from 'lucide-react';
import { getCookiesStatus, stopLiveSession } from '../lib/api';
import { fetchApi } from '../lib/api';
import { useToast } from '../lib/useToast';

function formatTimeAgo(dateStr) {
  if (!dateStr) return '-';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)   return 'Baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt yang lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam yang lalu`;
  return `${Math.floor(diff / 86400)} hari yang lalu`;
}

export const ExpiredCookies = () => {
  const [data, setData]               = useState([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState(null);
  const [isCookieModalOpen, setCookieModalOpen]   = useState(false);
  const [isStopModalOpen, setStopModalOpen]       = useState(false);
  const [activeAccount, setActiveAccount]         = useState(null);
  const [rawCookieText, setRawCookieText]         = useState('');
  const [validationStatus, setValidationStatus]   = useState(null); // 'valid' | 'invalid' | null
  const [isSaving, setIsSaving]                   = useState(false);
  const [isStopping, setIsStopping]               = useState(false);
  const { toasts, addToast, removeToast }          = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getCookiesStatus();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const expiredCount = data.filter((r) => r.isExpired).length;

  const handleEditCookies = (account) => {
    setActiveAccount(account);
    setRawCookieText('');
    setValidationStatus(null);
    setCookieModalOpen(true);
  };

  const handleStopLive = (account) => {
    setActiveAccount(account);
    setStopModalOpen(true);
  };

  const testCookies = () => {
    if (rawCookieText.includes('SPC_ST=') || rawCookieText.includes('_gcl_au=')) {
      setValidationStatus('valid');
    } else {
      setValidationStatus('invalid');
    }
  };

  const handleSaveCookies = async () => {
    if (!activeAccount || validationStatus !== 'valid') return;
    setIsSaving(true);
    try {
      await fetchApi('/api/cookies/inject', {
        method: 'POST',
        body: JSON.stringify({ account_id: activeAccount.id, cookie_text: rawCookieText }),
      });
      addToast(`Cookies @${activeAccount.username} berhasil diperbarui!`);
      setCookieModalOpen(false);
      loadData();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmStop = async () => {
    if (!activeAccount?.session_id) {
      addToast('Tidak ada sesi aktif yang bisa dihentikan.', 'error');
      setStopModalOpen(false);
      return;
    }
    setIsStopping(true);
    try {
      await stopLiveSession(activeAccount.session_id);
      addToast(`Live @${activeAccount.username} berhasil dihentikan.`);
      setStopModalOpen(false);
      loadData();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsStopping(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Toast Notifikasi via ToastContainer */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="mb-2">
        <h1 className="text-h2 font-bold text-gk-text-main flex items-center">
          Penanganan Cookies &amp; Live
          {expiredCount > 0 && (
            <span className="ml-3 px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-md font-bold flex items-center">
              <ShieldAlert size={14} className="mr-1" /> {expiredCount} Expired
            </span>
          )}
        </h1>
        <p className="text-gk-text-muted mt-1">Laman komando sentris pelaporan omzet real-time, mitigasi cookies kusam, dan pelanggaran kesehatan akun.</p>
      </div>

      <Card className="overflow-hidden border border-gray-200">
        <CardHeader className="bg-gray-50 flex flex-row items-center justify-between border-b border-gray-200">
          <CardTitle className="text-body font-semibold">Tabel Sinkronisasi Sistem</CardTitle>
          <Button variant="ghost" size="sm" leftIcon={<RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />} onClick={loadData} disabled={isLoading}>
            Sync Ulang
          </Button>
        </CardHeader>

        {isLoading ? (
          <div className="py-16 text-center flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-500 text-sm">Memuat data dari server...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center flex flex-col items-center">
            <AlertCircle size={40} className="text-red-400 mb-3" />
            <p className="text-red-600 font-medium">{error}</p>
            <Button className="mt-4" size="sm" onClick={loadData}>Coba Lagi</Button>
          </div>
        ) : data.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center">
            <div className="p-4 rounded-full bg-emerald-100 text-emerald-600 mb-4"><ShieldAlert size={40} className="text-emerald-500" /></div>
            <h3 className="text-lg font-medium text-emerald-700 mb-1">Kondisi Prima!</h3>
            <p className="text-emerald-600/70 text-sm">Semua cookies dalam kondisi baik tanpa pelanggaran.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="overflow-x-auto w-full hide-scrollbar hidden xl:block">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-[2000px]">
                <thead>
                  <tr className="bg-slate-100/50 text-xs text-gray-500 tracking-wider">
                    <th className="px-4 py-3 font-semibold border-b">ID / TGL UPDATE</th>
                    <th className="px-4 py-3 font-semibold border-b">STATUS &amp; KESEHATAN</th>
                    <th className="px-4 py-3 font-semibold border-b">NAMA TOKO / JUDUL LIVE</th>
                    <th className="px-4 py-3 font-semibold border-b">OMZET / RATA2 JAM</th>
                    <th className="px-4 py-3 font-semibold border-b">TRAFIK (VIEW/BUY)</th>
                    <th className="px-4 py-3 font-semibold border-b">KOMISI REALTIME</th>
                    <th className="px-4 py-3 font-semibold border-b">BANK</th>
                    <th className="px-4 py-3 font-semibold border-b sticky right-0 bg-slate-100/90 backdrop-blur z-10 text-center">EKSEKUSI OPERATIONAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((row) => (
                    <tr
                      key={row.id}
                      className={`transition-colors border-l-4 ${
                        row.isExpired
                          ? 'bg-red-50/40 hover:bg-red-50 border-l-red-500'
                          : row.isLive
                          ? 'bg-emerald-50/30 hover:bg-emerald-50/60 border-l-emerald-500'
                          : 'bg-white hover:bg-gray-50 border-l-gray-300'
                      }`}
                    >
                      <td className="px-4 py-4 align-top">
                        <p className="font-bold text-gray-900">#{row.shortId}</p>
                        <p className="text-xs text-gray-500 mt-1 flex items-center">
                          <RefreshCcw size={10} className="mr-1" /> {formatTimeAgo(row.lastUpdate)}
                        </p>
                      </td>

                      <td className="px-4 py-4 align-top w-64 whitespace-normal">
                        <div className="flex flex-col items-start gap-2">
                          <Badge status={row.isExpired ? 'EXPIRED' : (row.isLive ? 'LIVE' : 'OFFLINE')} label={row.statusLive} />
                          <div className="bg-white px-2 py-1.5 rounded border border-gray-200 text-xs w-full shadow-sm">
                            <div className="flex justify-between mb-1">
                              <span className="text-gray-500">Kesehatan:</span>
                              <span className={`font-semibold ${row.health === 'EXCELLENT' ? 'text-green-600' : row.health === 'WARNING' ? 'text-orange-500' : 'text-red-600'}`}>
                                {row.health === 'EXCELLENT' ? 'Sangat Baik' : row.health === 'WARNING' ? 'Perlu Perhatian' : 'Kritis'}
                              </span>
                            </div>
                            <div className="flex justify-between mb-1">
                              <span className="text-gray-500">Health Score:</span>
                              <span className="font-semibold text-gray-700">{row.health_score}/100</span>
                            </div>
                            <div className="flex justify-between mb-1">
                              <span className="text-gray-500">Total Sesi:</span>
                              <span className="font-semibold text-gray-700">{row.sessionTotal}</span>
                            </div>
                            {row.violations.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-red-100 text-red-600 font-medium text-[10px] leading-tight">
                                🚨 {row.violations.length} Pelanggaran!<br />
                                <span className="text-red-500 font-normal">"{row.violations[0]}"</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top w-72 whitespace-normal">
                        <p className="font-bold text-gk-primary text-base">{row.namaToko}</p>
                        <p className="text-xs text-gray-500 mt-0.5">@{row.username}</p>
                        <p className="text-xs text-gray-600 mt-1 font-medium bg-gray-100/50 p-2 rounded line-clamp-2">"{row.judulLive}"</p>
                        <button className="text-blue-600 hover:text-blue-800 text-[11px] mt-2 flex items-center font-medium transition-colors">
                          <Download size={12} className="mr-1" /> Unduh Daftar Produk CSV
                        </button>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <div className="space-y-1">
                          <p className="text-xl font-bold text-gray-900">{row.omzetLive}</p>
                          <p className="text-xs text-gray-500 flex justify-between w-40">
                            <span>Avg. Jam:</span><span className="font-medium text-gray-700">{row.omzetJam}</span>
                          </p>
                          <p className="text-xs text-gray-500 flex justify-between w-40">
                            <span>Level UP:</span>
                            <span className={row.omzetSebelum.includes('-') ? 'text-red-500 font-medium' : 'text-green-500 font-medium'}>
                              {row.omzetSebelum}
                            </span>
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <div className="flex space-x-3">
                          <div className="text-center p-2 bg-blue-50 text-blue-800 rounded min-w-[60px]">
                            <p className="text-[10px] font-bold uppercase opacity-70">Viewer</p>
                            <p className="text-lg font-bold">{row.viewers}</p>
                          </div>
                          <div className="text-center p-2 bg-emerald-50 text-emerald-800 rounded min-w-[60px]">
                            <p className="text-[10px] font-bold uppercase opacity-70">Buyer</p>
                            <p className="text-lg font-bold">{row.buyers}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <p className="text-lg font-bold text-teal-600">{row.omzetKomisi}</p>
                      </td>

                      <td className="px-4 py-4 align-top font-medium text-gray-700 text-xs">
                        <span className="px-2 py-1 bg-gray-100 rounded border border-gray-200">{row.bank}</span>
                      </td>

                      <td className="px-4 py-3 align-middle sticky right-0 z-10 shadow-[-10px_0_15px_-5px_rgba(0,0,0,0.05)] border-l border-gray-200 bg-white/95 backdrop-blur">
                        <div className="flex items-center justify-center space-x-1.5 opacity-90 hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 text-xs px-2.5 py-1.5" onClick={() => handleEditCookies(row)}>
                            Edit Cookies
                          </Button>
                          {row.isLive && (
                            <Button variant="ghost" size="sm" className="bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs px-2.5 py-1.5" onClick={() => handleStopLive(row)}>
                              Stop
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="xl:hidden flex flex-col p-4 space-y-4 bg-gray-50 border-t border-gray-100">
              {data.map((row) => (
                <div key={row.id} className={`p-4 rounded-xl shadow-sm border ${
                  row.isExpired ? 'bg-red-50/40 border-l-4 border-l-red-500' :
                  (row.isLive ? 'bg-emerald-50/30 border-l-4 border-l-emerald-500' : 'bg-white border-l-4 border-l-gray-300')
                }`}>
                  <div className="flex justify-between items-start mb-3 border-b border-gray-100/50 pb-3">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-bold text-gray-500">#{row.shortId}</span>
                        <Badge status={row.isExpired ? 'EXPIRED' : (row.isLive ? 'LIVE' : 'OFFLINE')} label={row.statusLive} />
                      </div>
                      <h3 className="font-bold text-gk-primary text-base">{row.namaToko}</h3>
                      <p className="text-xs text-gray-500 italic truncate w-48 mt-1">"{row.judulLive}"</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white/50 p-3 rounded text-left shadow-sm">
                      <p className="text-[10px] text-gray-500 font-bold mb-1">OMZET TERKINI</p>
                      <p className="text-base font-bold text-gray-800">{row.omzetLive}</p>
                    </div>
                    <div className="bg-white/50 p-3 rounded text-left shadow-sm">
                      <p className="text-[10px] text-gray-500 font-bold mb-1">KESEHATAN</p>
                      <p className={`font-semibold text-sm ${row.health === 'EXCELLENT' ? 'text-green-600' : 'text-orange-600'}`}>
                        {row.health === 'EXCELLENT' ? 'Sangat Baik' : row.health === 'WARNING' ? 'Perlu Perhatian' : 'Kritis'}
                      </p>
                      {row.violations.length > 0 && <p className="text-[10px] text-red-600 leading-tight">🚨 Pelanggaran Terdeteksi</p>}
                    </div>
                  </div>
                  <div className="flex space-x-2 pt-2 border-t border-gray-100/50">
                    <Button variant="secondary" size="sm" onClick={() => handleEditCookies(row)} className="flex-1 text-xs">Edit Cookies</Button>
                    {row.isLive && (
                      <Button variant="danger" size="sm" onClick={() => handleStopLive(row)} className="flex-1 text-xs">Stop Live</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { height: 6px; }
        .hide-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
        .hide-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .hide-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

      {/* MODAL EDIT COOKIES */}
      <Modal
        title="Edit Cookies Raw String"
        isOpen={isCookieModalOpen}
        onClose={() => setCookieModalOpen(false)}
        maxWidth="sm:max-w-xl"
        footer={
          <>
            <Button variant="primary" disabled={validationStatus !== 'valid' || isSaving} className="w-full sm:ml-3 sm:w-auto" onClick={handleSaveCookies}>
              {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
            <Button variant="ghost" onClick={() => setCookieModalOpen(false)} className="mt-3 w-full sm:mt-0 sm:w-auto">Batal</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 flex justify-between items-center">
            <span>Studio Target: <b className="text-gk-primary">{activeAccount?.namaToko}</b></span>
            <Badge status={activeAccount?.isExpired ? 'EXPIRED' : (activeAccount?.isLive ? 'LIVE' : 'OFFLINE')} label={activeAccount?.statusLive} />
          </div>
          <p className="text-sm font-medium text-gray-700">Tempel *(Paste)* cookies browser terbaru Anda di sini:</p>
          <Textarea
            className="font-mono text-xs w-full min-h-[150px] p-3 break-all bg-slate-800 text-emerald-400 placeholder-slate-500 focus:ring-emerald-500"
            placeholder="Ketik string yang diawali dengan _gcl_au=...; SPC_F... dst"
            value={rawCookieText}
            onChange={(e) => { setRawCookieText(e.target.value); setValidationStatus(null); }}
          />
          <div className="flex justify-between items-center bg-gray-50 px-3 py-2 border border-gray-200 rounded">
            <div className="flex items-center space-x-3">
              <Button size="sm" variant="secondary" onClick={testCookies}>Test Cookies</Button>
              {validationStatus === 'valid' && <span className="text-sm font-bold text-green-600">Valid ✓</span>}
              {validationStatus === 'invalid' && <span className="text-sm font-bold text-red-600 flex items-center"><ShieldAlert size={16} className="mr-1" /> Invalid!</span>}
            </div>
            <span className="text-xs text-gray-400">Length: {rawCookieText.length}</span>
          </div>
        </div>
      </Modal>

      {/* MODAL STOP LIVE */}
      <Modal
        title="Peringatan Keras!"
        isOpen={isStopModalOpen}
        onClose={() => setStopModalOpen(false)}
        footer={
          <>
            <Button variant="danger" className="w-full sm:ml-3 sm:w-auto" onClick={handleConfirmStop} disabled={isStopping}>
              {isStopping ? 'Menghentikan...' : 'Ya, Hentikan Live Sekarang!'}
            </Button>
            <Button variant="ghost" onClick={() => setStopModalOpen(false)} className="mt-3 w-full sm:mt-0 sm:w-auto">Batal</Button>
          </>
        }
      >
        <div className="flex items-start">
          <div className="flex-shrink-0 text-red-600 mr-4"><ShieldAlert size={40} /></div>
          <div>
            <h4 className="text-lg font-bold text-gray-900 mb-1">Membunuh Proses Live: {activeAccount?.namaToko}</h4>
            <p className="text-gray-600 text-sm">
              Apakah Anda sangat yakin ingin memaksa henti sesi Shopee Live ini? Aksi <em>Stop</em> melalui API ini akan langsung menjatuhkan live pada penonton di aplikasi. Aksi destruktif ini akan dicatat dalam Log Server.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
