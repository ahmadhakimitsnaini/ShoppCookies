import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { Server, Database, Globe, Cpu, Clock, AlertTriangle, CheckCircle2, Zap, Bot } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getSystemPerformance, getCpuHistory } from '../lib/api';

// ========================================================
// Sub-komponen: Gauge Ring (untuk CPU & RAM visual)
// ========================================================
const GaugeRing = ({ percent, color, size = 120 }) => {
  const radius    = (size - 16) / 2;
  const circ      = 2 * Math.PI * radius;
  const progress  = circ - (percent / 100) * circ;
  const textColor = percent > 90 ? '#ef4444' : percent > 70 ? '#f59e0b' : color;

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size/2} cy={size/2} r={radius} stroke="#e5e7eb" strokeWidth={10} fill="none" />
      <circle
        cx={size/2} cy={size/2} r={radius}
        stroke={textColor}
        strokeWidth={10}
        fill="none"
        strokeDasharray={circ}
        strokeDashoffset={progress}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s' }}
      />
      <text
        x={size/2} y={size/2}
        textAnchor="middle" dominantBaseline="middle"
        className="rotate-90"
        style={{ fill: textColor, fontSize: size * 0.2, fontWeight: 700, transform: `rotate(90deg)`, transformOrigin: `${size/2}px ${size/2}px` }}
      >
        {percent}%
      </text>
    </svg>
  );
};

// ========================================================
// Sub-komponen: Status Badge per komponen
// ========================================================
const StatusChip = ({ status }) => {
  const map = {
    Operational: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Active:      'bg-blue-50 text-blue-700 border-blue-200',
    Degraded:    'bg-orange-50 text-orange-700 border-orange-200',
    Idle:        'bg-gray-100 text-gray-500 border-gray-200',
    Down:        'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${map[status] ?? map.Idle}`}>
      {status}
    </span>
  );
};

// ========================================================
// Icon map untuk komponen kartu
// ========================================================
const ICON_MAP = {
  Globe:    <Globe    size={20} />,
  Database: <Database size={20} />,
  Cpu:      <Cpu      size={20} />,
  Clock:    <Clock    size={20} />,
};

// ========================================================
// Custom Tooltip untuk grafik
// ========================================================
const PerfTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-gray-900 text-white text-xs p-2.5 rounded-lg shadow-xl border border-gray-700">
        <p className="text-gray-400 mb-1.5">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-gray-400">{p.name}:</span>
            <span className="font-bold">{p.value}%</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ========================================================
// Main Component
// ========================================================
export const ServerPerformance = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData]           = useState(null);
  const [history, setHistory]     = useState([]);
  const [lastUpdate, setLastUpdate] = useState('');
  const [error, setError]         = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [perf, hist] = await Promise.all([
        getSystemPerformance(),
        getCpuHistory(),
      ]);
      setData(perf);
      setHistory(hist);
      setLastUpdate(new Date().toLocaleTimeString('id-ID'));
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Polling setiap 5 detik
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ---- Loading state ----
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-[300px] w-full rounded-xl" />
      </div>
    );
  }

  const isCritical  = data?.globalStatus === 'Critical';
  const isDegraded  = data?.globalStatus === 'Degraded';
  const isHealthy   = data?.globalStatus === 'Operational';

  const headerColors = isCritical
    ? 'bg-red-50 border-red-200'
    : isDegraded
      ? 'bg-orange-50 border-orange-200'
      : 'bg-emerald-50 border-emerald-200';

  const iconColor = isCritical ? 'text-red-500' : isDegraded ? 'text-orange-500' : 'text-emerald-500';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* ---- HEADER STATUS ---- */}
      <div className={`p-6 rounded-xl border ${headerColors} flex flex-col md:flex-row items-center md:justify-between gap-4`}>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-full bg-white shadow-sm ${iconColor}`}>
            {isCritical || isDegraded
              ? <AlertTriangle size={32} />
              : <CheckCircle2 size={32} />
            }
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              System is <span className={iconColor}>{data?.globalStatus}</span>
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Uptime: <span className="font-medium text-gray-700">{data?.serverUptime}</span>
              · Diperbarui: <span className="font-medium">{lastUpdate}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex h-2.5 w-2.5 relative`}>
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isHealthy ? 'bg-emerald-400' : 'bg-orange-400'}`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isHealthy ? 'bg-emerald-500' : 'bg-orange-500'}`} />
          </div>
          <span className={`text-sm font-semibold ${isHealthy ? 'text-emerald-600' : 'text-orange-600'}`}>
            Live Monitoring
          </span>
        </div>
      </div>

      {/* Alert Overload */}
      {(isCritical || data?.bots?.is_overloaded) && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl">
          <div className="flex gap-3 items-start">
            <AlertTriangle className="text-red-500 mt-0.5 flex-shrink-0" size={18} />
            <div>
              <p className="text-sm font-semibold text-red-800">⚠️ Server Overload Terdeteksi!</p>
              <p className="text-xs text-red-700 mt-0.5">
                {data?.bots?.is_overloaded
                  ? `Terlalu banyak bot aktif (${data.bots.active}). Disarankan maksimal 10 instance.`
                  : `CPU/RAM sangat tinggi. Pertimbangkan untuk mengurangi bot aktif.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg">
          ⚠️ Data mungkin tidak akurat: {error}
        </div>
      )}

      {/* ---- GAUGE CARDS: CPU, RAM, Bots, DB ---- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* CPU */}
        <Card>
          <CardContent className="p-5 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-gray-500 text-sm font-semibold self-start w-full">
              <Cpu size={16} /> CPU Usage
            </div>
            <GaugeRing percent={data?.cpu?.percent ?? 0} color="#1D9E75" />
            <p className="text-xs text-gray-400 text-center">
              {data?.cpu?.cores} Core · {data?.cpu?.model?.split(' ').slice(0, 3).join(' ')}
            </p>
          </CardContent>
        </Card>

        {/* RAM */}
        <Card>
          <CardContent className="p-5 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-gray-500 text-sm font-semibold self-start w-full">
              <Server size={16} /> RAM Usage
            </div>
            <GaugeRing percent={data?.ram?.percent ?? 0} color="#6366F1" />
            <p className="text-xs text-gray-400 text-center">
              {data?.ram?.usedGb} GB / {data?.ram?.totalGb} GB
            </p>
          </CardContent>
        </Card>

        {/* Active Bots */}
        <Card className={data?.bots?.is_overloaded ? 'border-red-200 shadow-sm' : ''}>
          <CardContent className="p-5 flex flex-col items-center justify-center gap-3 h-full">
            <div className="flex items-center gap-2 text-gray-500 text-sm font-semibold self-start w-full">
              <Bot size={16} /> Active Bots
            </div>
            <div className={`text-6xl font-black ${data?.bots?.is_overloaded ? 'text-red-500' : 'text-gray-800'}`}>
              {data?.bots?.active ?? 0}
            </div>
            <div className="text-xs text-gray-400">
              Batas aman: <span className="font-semibold text-gray-600">{data?.bots?.limit_warning} instance</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${data?.bots?.is_overloaded ? 'bg-red-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, ((data?.bots?.active ?? 0) / data?.bots?.limit_warning) * 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Database */}
        <Card>
          <CardContent className="p-5 flex flex-col justify-between gap-3 h-full">
            <div className="flex items-center gap-2 text-gray-500 text-sm font-semibold">
              <Database size={16} /> Database
            </div>
            <div className="space-y-3 flex-1 flex flex-col justify-center">
              <div>
                <p className="text-xs text-gray-400">Status</p>
                <StatusChip status={data?.database?.dbStatus === 'OK' ? 'Operational' : 'Down'} />
              </div>
              <div>
                <p className="text-xs text-gray-400">Sesi LIVE</p>
                <p className="text-xl font-bold text-gray-800">{data?.database?.liveSessions ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Total Akun Aktif</p>
                <p className="text-xl font-bold text-gray-800">{data?.database?.totalAccounts ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ---- COMPONENT STATUS ---- */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Komponen Sistem</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(data?.components ?? []).map((comp, i) => (
            <Card key={i} className={comp.status === 'Down' ? 'border-red-200' : comp.status === 'Degraded' ? 'border-orange-200' : ''}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className={`p-2 rounded-lg ${comp.status === 'Down' ? 'bg-red-100 text-red-600' : comp.status === 'Degraded' ? 'bg-orange-100 text-orange-600' : comp.status === 'Active' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                    {ICON_MAP[comp.icon] ?? <Zap size={20} />}
                  </div>
                  <StatusChip status={comp.status} />
                </div>
                <p className="text-sm font-semibold text-gray-800">{comp.name}</p>
                <p className="text-xs text-gray-400 mt-1">{comp.ping}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ---- GRAFIK TREN CPU & RAM (5 Menit Terakhir) ---- */}
      <Card>
        <CardHeader className="bg-gray-50/50">
          <CardTitle className="flex items-center gap-2">
            <Zap size={16} className="text-blue-500" />
            Tren Beban CPU & RAM — 5 Menit Terakhir
          </CardTitle>
          <p className="text-xs text-gray-400 mt-1">Polling setiap 5 detik · {history.length} titik data</p>
        </CardHeader>
        <CardContent className="p-6 h-[300px]">
          {history.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              Menunggu data... (muncul setelah ± 15 detik pertama)
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1D9E75" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1D9E75" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gRam" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="time" fontSize={10} stroke="#9CA3AF" tickMargin={6} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} fontSize={11} stroke="#9CA3AF" unit="%" />
                <Tooltip content={<PerfTooltip />} />
                <Area type="monotone" dataKey="cpu" name="CPU" stroke="#1D9E75" strokeWidth={2} fill="url(#gCpu)" dot={false} />
                <Area type="monotone" dataKey="ram" name="RAM" stroke="#6366F1" strokeWidth={2} fill="url(#gRam)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

    </div>
  );
};
