import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ToastContainer } from '../components/ui/Toast';
import { getTreatmentLogs } from '../lib/api';
import { useToast } from '../lib/useToast';
import { 
  ClipboardList, RefreshCw, AlertCircle, CheckCircle, 
  Clock, XCircle, Search, ChevronLeft, ChevronRight, Eye 
} from 'lucide-react';

const TASK_ICONS = {
  AUTO_INJECT: <CheckCircle size={14} className="text-blue-500" />,
  AUTO_TREATMENT: <RefreshCw size={14} className="text-purple-500" />,
  STOP_LIVE: <XCircle size={14} className="text-red-500" />,
  CHECK_COOKIE: <Search size={14} className="text-emerald-500" />,
  SYNC_OMZET: <Clock size={14} className="text-amber-500" />
};

export const LaporanTreatment = () => {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 50, total_pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', task_type: '' });
  
  // Modal for viewing payload details
  const [selectedPayload, setSelectedPayload] = useState(null);

  const { toasts, removeToast } = useToast();

  const fetchLogs = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params = { page, limit: 50 };
      if (filters.status) params.status = filters.status;
      if (filters.task_type) params.task_type = filters.task_type;

      const res = await getTreatmentLogs(params);
      setLogs(res.data || []);
      setMeta(res.meta || { total: 0, page: 1, limit: 50, total_pages: 1 });
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(d);
  };

  const getDuration = (start, end) => {
    if (!start || !end) return '-';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-h2 font-bold text-gk-text-main flex items-center gap-2">
            <ClipboardList size={26} className="text-indigo-600" />
            Laporan Treatment
          </h1>
          <p className="text-gk-text-muted mt-1">
            Riwayat lengkap tugas bot otomatis (inject, warm-up, pengecekan). Riwayat akan dihapus otomatis setelah 30 hari.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
          <Button
            variant="ghost"
            leftIcon={<RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />}
            onClick={() => fetchLogs(meta.page)}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="bg-gray-50 border-b border-gray-100 py-3 px-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">Filter:</span>
            <select 
              className="text-sm border border-gray-300 rounded-md px-2 py-1.5 outline-none focus:border-indigo-500"
              value={filters.task_type}
              onChange={(e) => handleFilterChange('task_type', e.target.value)}
            >
              <option value="">Semua Tugas</option>
              <option value="AUTO_INJECT">Auto Inject</option>
              <option value="AUTO_TREATMENT">Auto Treatment (Warm-up)</option>
              <option value="STOP_LIVE">Stop Live</option>
              <option value="CHECK_COOKIE">Check Cookie</option>
              <option value="SYNC_OMZET">Sync Omzet</option>
            </select>
            
            <select 
              className="text-sm border border-gray-300 rounded-md px-2 py-1.5 outline-none focus:border-indigo-500"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">Semua Status</option>
              <option value="COMPLETED">Berhasil</option>
              <option value="FAILED">Gagal</option>
              <option value="PROCESSING">Diproses</option>
              <option value="PENDING">Menunggu</option>
            </select>
          </div>
          
          <div className="text-xs text-gray-500">
            Total {meta.total} rekaman ditemukan
          </div>
        </CardHeader>
        
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-gray-400">
              <RefreshCw size={32} className="animate-spin mb-3 text-indigo-400" />
              <p className="text-sm">Memuat log aktivitas...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-gray-400">
              <ClipboardList size={40} className="mb-3 opacity-30" />
              <p className="text-sm">Tidak ada riwayat tugas yang sesuai dengan filter.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-white text-xs text-gray-500 font-semibold uppercase border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Waktu Eksekusi</th>
                  <th className="px-4 py-3 font-semibold">Target Akun</th>
                  <th className="px-4 py-3 font-semibold">Tugas Bot</th>
                  <th className="px-4 py-3 font-semibold">Durasi</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-center">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {log.account ? (
                        <div>
                          <p className="font-semibold text-gray-800">@{log.account.shopee_username}</p>
                          <p className="text-[10px] text-gray-500 truncate max-w-[150px]">
                            {log.account.studio?.name ?? 'Tanpa Studio'}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Akun Dihapus</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {TASK_ICONS[log.task_type]}
                        <span className="font-medium text-gray-700">{log.task_type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs whitespace-nowrap">
                      {getDuration(log.executed_at || log.created_at, log.finished_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {log.status === 'COMPLETED' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                          <CheckCircle size={12} /> Sukses
                        </span>
                      ) : log.status === 'FAILED' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 px-2 py-1 rounded-full border border-red-100">
                          <AlertCircle size={12} /> Gagal
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-full border border-blue-100">
                          <RefreshCw size={12} className="animate-spin" /> {log.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => setSelectedPayload({ id: log.id, payload: log.payload, type: log.task_type })}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                        title="Lihat Log Detail"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination */}
        {!isLoading && meta.total_pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <span className="text-xs text-gray-500">
              Halaman {meta.page} dari {meta.total_pages}
            </span>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                disabled={meta.page <= 1}
                onClick={() => fetchLogs(meta.page - 1)}
                className="px-2"
              >
                <ChevronLeft size={16} />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                disabled={meta.page >= meta.total_pages}
                onClick={() => fetchLogs(meta.page + 1)}
                className="px-2"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Payload / Log Details Modal */}
      <Modal
        title={`Detail Log: ${selectedPayload?.type}`}
        isOpen={!!selectedPayload}
        onClose={() => setSelectedPayload(null)}
        maxWidth="sm:max-w-2xl"
      >
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all">
            {selectedPayload?.payload ? JSON.stringify(selectedPayload.payload, null, 2) : 'Tidak ada data log tambahan.'}
          </pre>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => setSelectedPayload(null)}>Tutup</Button>
        </div>
      </Modal>
    </div>
  );
};
