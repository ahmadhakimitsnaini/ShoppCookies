import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatCard, Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DollarSign, Target, Activity, Server, Clock, ChevronRight, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getAnalyticsSummary, getOmzetChart, getStudiosAnalytics, formatRupiah } from '../lib/api';

// ============================================================
// Custom Tooltip untuk grafik omzet
// ============================================================
const OmzetTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white text-xs p-3 rounded-lg shadow-xl border border-gray-700">
        <p className="font-semibold text-gray-300 mb-1">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-gray-400">{p.name}:</span>
            <span className="font-bold">{formatRupiah(p.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ============================================================
// Main Component
// ============================================================
export const HomeDashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString('id-ID'));
  const [summary, setSummary]   = useState(null);
  const [chart, setChart]       = useState([]);
  const [studios, setStudios]   = useState([]);
  const [error, setError]       = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      // Fetch semua data paralel
      const [summaryData, chartData, studiosData] = await Promise.all([
        getAnalyticsSummary(),
        getOmzetChart(),
        getStudiosAnalytics(),
      ]);
      setSummary(summaryData);
      setChart(chartData);
      setStudios(studiosData);
      setLastUpdate(new Date().toLocaleTimeString('id-ID'));
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    // Auto-refresh setiap 30 detik
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* SECTION 1 — HEADER */}
      <section>
        <div className="flex justify-between items-end mb-4">
          <div>
            <h1 className="text-h2 font-bold text-gk-text-main">Dashboard Utama</h1>
            <p className="text-gk-text-muted mt-1 text-sm flex items-center gap-1">
              <Clock size={13} />
              Diperbarui: {lastUpdate}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gk-success opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-gk-success" />
            </span>
            <span className="text-sm font-medium text-gk-success">Live Syncing</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            ⚠️ Gagal memuat data: {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Omzet Hari Ini"
            value={formatRupiah(summary?.omzet_hari_ini)}
            icon={<DollarSign size={24} />}
          />
          <StatCard
            title="Komisi Hari Ini"
            value={formatRupiah(summary?.komisi_hari_ini)}
            icon={<Activity size={24} />}
          />
          <StatCard
            title="Studio Aktif Live"
            value={`${summary?.studio_live_count ?? 0} / ${summary?.studio_total_count ?? 0}`}
            icon={<Target size={24} />}
          />
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-small font-semibold text-gk-text-muted uppercase tracking-wider mb-1">Server Status</p>
                  <div className="flex items-center mt-2">
                    <div className="w-3 h-3 rounded-full mr-2 bg-gk-success animate-pulse" />
                    <h2 className="text-h2 font-bold text-gk-text-main">Online</h2>
                  </div>
                </div>
                <div className="p-3 bg-gray-100 rounded-lg text-gray-500">
                  <Server size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* SECTION 2 — GRAFIK OMZET HARI INI */}
      <section>
        <Card>
          <CardHeader className="flex flex-row justify-between items-center bg-gray-50/50">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp size={18} className="text-gk-success" />
                Omzet Hari Ini (Per Jam)
              </CardTitle>
              <p className="text-xs text-gk-text-muted mt-1">
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <Button variant="ghost" size="sm" rightIcon={<ChevronRight size={16} />} onClick={() => navigate('/omzet-analitik')}>
              Lihat Analitik
            </Button>
          </CardHeader>
          <CardContent className="p-6 h-[350px]">
            {chart.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gk-text-muted text-sm">
                Belum ada data omzet hari ini. Data akan muncul setelah bot pertama kali berjalan.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <defs>
                    <linearGradient id="colorOmzet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#1D9E75" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1D9E75" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorKomisi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="hour" fontSize={11} tickMargin={8} stroke="#9CA3AF" />
                  <YAxis fontSize={11} stroke="#9CA3AF" tickFormatter={v => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}jt` : `${(v/1000).toFixed(0)}rb`} />
                  <Tooltip content={<OmzetTooltip />} />
                  <Area type="monotone" dataKey="omzet"  name="Omzet"  stroke="#1D9E75" strokeWidth={2} fill="url(#colorOmzet)"  dot={false} />
                  <Area type="monotone" dataKey="komisi" name="Komisi" stroke="#6366F1" strokeWidth={2} fill="url(#colorKomisi)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      {/* SECTION 3 — LIVE STUDIO CARDS */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-h3 font-semibold text-gk-text-main">Live Studio Metrics</h2>
          <Button variant="ghost" size="sm" rightIcon={<ChevronRight size={14} />} onClick={() => navigate('/cek-omzet')}>
            Semua Studio
          </Button>
        </div>

        {studios.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gk-border">
            <p className="text-gk-text-muted">Belum ada studio yang aktif saat ini.</p>
          </div>
        ) : (
          <div className="flex overflow-x-auto pb-4 gap-4 snap-x hide-scrollbar">
            {studios.map(studio => (
              <div key={studio.id} className="snap-start min-w-[280px] lg:min-w-[320px] flex-shrink-0">
                <Card className={`h-full border-t-4 hover:shadow-lg transition-all ${studio.is_live ? 'border-t-green-500' : 'border-t-gray-300'}`}>
                  <CardContent className="p-5">
                    <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                      <h3 className="font-bold text-md text-gk-text-main truncate pr-2 w-[85%]">{studio.name}</h3>
                      {studio.is_live ? (
                        <span className="flex h-3 w-3 relative flex-shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                        </span>
                      ) : (
                        <span className="h-3 w-3 rounded-full bg-gray-300 flex-shrink-0" />
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Omzet Hari Ini</p>
                        <p className={`text-2xl font-bold px-3 py-1 rounded-md inline-block ${studio.is_live ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                          {formatRupiah(studio.omzet_live)}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Omzet Bulan</p>
                          <p className="text-sm font-bold text-gray-800">{formatRupiah(studio.omzet_bulan_ini)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Est. Komisi</p>
                          <p className="text-sm font-bold text-blue-600">{formatRupiah(studio.komisi_bulan)}</p>
                        </div>
                      </div>

                      <div className="flex justify-between text-xs text-gray-600 bg-gray-50 p-2 rounded">
                        <span>📱 {studio.account_count} Akun</span>
                        <span>{studio.is_live ? '🟢 Sedang Live' : '⚫ Offline'}</span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      className="w-full mt-4 text-sm"
                      rightIcon={<ChevronRight size={14} />}
                      onClick={() => navigate(`/list-studio/${studio.id}`)}
                    >
                      Detail Studio
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

// Internal Skeleton Component
const DashboardSkeleton = () => (
  <div className="space-y-8">
    <div className="flex justify-between items-end mb-4">
      <div>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-40" />
      </div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1,2,3,4].map(i => <Skeleton key={i} className="h-[120px] rounded-xl" />)}
    </div>
    <Skeleton className="h-[400px] rounded-xl" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1,2,3].map(i => <Skeleton key={i} className="h-[250px] rounded-xl" />)}
    </div>
  </div>
);
