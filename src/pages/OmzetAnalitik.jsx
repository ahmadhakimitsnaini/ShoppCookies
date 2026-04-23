import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { getOmzetHistory, getStudiosAnalytics, formatRupiah } from '../lib/api';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, Calendar, BarChart2 } from 'lucide-react';

// Palet warna untuk dibagi ke tiap studio
const COLORS = [
  '#6366F1', '#10B981', '#F59E0B', '#EF4444',
  '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6'
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white text-xs p-3 rounded-lg shadow-xl border border-gray-700 min-w-[180px]">
        <p className="font-semibold text-gray-300 mb-2">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-4 mb-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
              <span className="text-gray-400 truncate max-w-[100px]">{p.name}</span>
            </div>
            <span className="font-bold text-white">{formatRupiah(p.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const OmzetAnalitik = () => {
  const [isLoading, setIsLoading]   = useState(true);
  const [history, setHistory]       = useState([]);
  const [studios, setStudios]       = useState([]);
  const [days, setDays]             = useState(7);
  const [chartMode, setChartMode]   = useState('area'); // 'area' | 'bar'
  const [error, setError]           = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [hist, studioList] = await Promise.all([
          getOmzetHistory(days),
          getStudiosAnalytics(),
        ]);
        setHistory(hist);
        setStudios(studioList);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [days]);

  // Kumpulkan semua nama studio yang muncul di data history
  const studioNames = useMemo(() => {
    const names = new Set();
    history.forEach(day => {
      Object.keys(day).forEach(k => { if (k !== 'date') names.add(k); });
    });
    return Array.from(names);
  }, [history]);

  // Hitung total omzet keseluruhan dari semua studio
  const grandTotal = useMemo(() =>
    studios.reduce((sum, s) => sum + (s.omzet_bulan_ini || 0), 0)
  , [studios]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-h2 font-bold text-gk-text-main flex items-center gap-2">
            <TrendingUp size={24} className="text-gk-success" />
            Analitik Omzet
          </h1>
          <p className="text-gk-text-muted mt-1">Semua studio — tren omzet historis</p>
        </div>

        {/* Filter Periode */}
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-gray-400" />
          <span className="text-sm text-gray-500">Periode:</span>
          {[7, 14, 30].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 text-sm rounded-full font-medium transition-all ${
                days === d
                  ? 'bg-gk-primary text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {d} Hari
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          ⚠️ Gagal memuat data: {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? [1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)
          : studios.slice(0, 4).map((studio, i) => (
            <Card key={studio.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i] }} />
                  <p className="text-xs text-gray-500 truncate font-medium">{studio.name}</p>
                </div>
                <p className="text-lg font-bold text-gray-900">{formatRupiah(studio.omzet_bulan_ini)}</p>
                <p className="text-xs text-gray-400 mt-0.5">Bulan ini</p>
              </CardContent>
            </Card>
          ))
        }
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader className="flex flex-row justify-between items-center bg-gray-50/50">
          <div>
            <CardTitle>Tren Omzet Semua Studio</CardTitle>
            <p className="text-xs text-gk-text-muted mt-1">{days} hari terakhir · Semua studio ditampilkan sekaligus</p>
          </div>
          {/* Toggle chart mode */}
          <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
            <button
              onClick={() => setChartMode('area')}
              className={`p-1.5 rounded transition-all ${chartMode === 'area' ? 'bg-white shadow text-gk-primary' : 'text-gray-400'}`}
              title="Area Chart"
            >
              <TrendingUp size={16} />
            </button>
            <button
              onClick={() => setChartMode('bar')}
              className={`p-1.5 rounded transition-all ${chartMode === 'bar' ? 'bg-white shadow text-gk-primary' : 'text-gray-400'}`}
              title="Bar Chart"
            >
              <BarChart2 size={16} />
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-6 h-[400px]">
          {isLoading ? (
            <Skeleton className="w-full h-full" />
          ) : history.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gk-text-muted text-sm">
              Belum ada data riwayat omzet. Jalankan seed data atau tunggu bot crawl pertama.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'area' ? (
                <AreaChart data={history} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
                  <defs>
                    {studioNames.map((name, i) => (
                      <linearGradient key={name} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={COLORS[i % COLORS.length]} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="date" fontSize={11} stroke="#9CA3AF" tickMargin={8} />
                  <YAxis fontSize={11} stroke="#9CA3AF" tickFormatter={v => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}jt` : `${(v/1000).toFixed(0)}rb`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }} />
                  {studioNames.map((name, i) => (
                    <Area
                      key={name}
                      type="monotone"
                      dataKey={name}
                      name={name}
                      stroke={COLORS[i % COLORS.length]}
                      strokeWidth={2}
                      fill={`url(#grad-${i})`}
                      dot={false}
                    />
                  ))}
                </AreaChart>
              ) : (
                <BarChart data={history} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="date" fontSize={11} stroke="#9CA3AF" tickMargin={8} />
                  <YAxis fontSize={11} stroke="#9CA3AF" tickFormatter={v => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}jt` : `${(v/1000).toFixed(0)}rb`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }} />
                  {studioNames.map((name, i) => (
                    <Bar key={name} dataKey={name} name={name} stackId="stack" fill={COLORS[i % COLORS.length]} radius={i === studioNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Tabel Ringkasan per Studio */}
      <Card>
        <CardHeader className="bg-gray-50/50">
          <CardTitle>Ringkasan Performa Studio</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-y border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Studio</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Omzet Hari Ini</th>
                <th className="px-6 py-3">Omzet Bulan Ini</th>
                <th className="px-6 py-3">Estimasi Komisi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading
                ? Array.from({length: 4}).map((_, i) => (
                  <tr key={i}>
                    {[1,2,3,4,5].map(j => (
                      <td key={j} className="px-6 py-4">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
                : studios.map((studio, i) => (
                  <tr key={studio.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        {studio.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {studio.is_live
                        ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />LIVE</span>
                        : <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Offline</span>
                      }
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-800">{formatRupiah(studio.omzet_live)}</td>
                    <td className="px-6 py-4 font-semibold text-purple-700">{formatRupiah(studio.omzet_bulan_ini)}</td>
                    <td className="px-6 py-4 font-semibold text-blue-600">{formatRupiah(studio.komisi_bulan)}</td>
                  </tr>
                ))
              }
            </tbody>
            {!isLoading && studios.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td className="px-6 py-3 font-bold text-gray-700" colSpan={3}>Total Bulan Ini</td>
                  <td className="px-6 py-3 font-bold text-purple-700">{formatRupiah(grandTotal)}</td>
                  <td className="px-6 py-3 font-bold text-blue-600">
                    {formatRupiah(studios.reduce((s, st) => s + (st.komisi_bulan || 0), 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
    </div>
  );
};
