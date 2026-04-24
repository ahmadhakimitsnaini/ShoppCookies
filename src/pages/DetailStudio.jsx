import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchApi } from '../lib/api';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { ArrowLeft, ExternalLink, Download, StopCircle, RefreshCw, XCircle, Tag, ShieldAlert } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export const DetailStudio = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isInjecting, setIsInjecting] = useState(false);
  const [period, setPeriod] = useState(30);
  const [chartData, setChartData] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [isMetricsLoading, setIsMetricsLoading] = useState(true);

  // Helper: Format angka ke Rupiah singkat (Rp 84.5M / Rp 500K)
  const formatRupiah = (num) => {
    if (!num && num !== 0) return '-';
    if (num >= 1_000_000_000) return `Rp ${(num / 1_000_000_000).toFixed(1)}B`;
    if (num >= 1_000_000)     return `Rp ${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000)         return `Rp ${(num / 1_000).toFixed(0)}K`;
    return `Rp ${num.toLocaleString('id-ID')}`;
  };

  // Fetch data grafik dari backend (diganti setiap kali period atau id berubah)
  useEffect(() => {
    const fetchChart = async () => {
      setIsLoading(true);
      try {
        const data = await fetchApi(`/api/studios/${id}/chart?days=${period}`);
        setChartData(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('[DetailStudio] Gagal menarik data chart:', err);
        setChartData([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchChart();
  }, [period, id]);

  // Fetch data metrik finansial (hanya saat pertama buka atau ID berubah)
  useEffect(() => {
    const fetchMetrics = async () => {
      setIsMetricsLoading(true);
      try {
        const data = await fetchApi(`/api/studios/${id}/metrics`);
        setMetrics(data);
      } catch (err) {
        console.error('[DetailStudio] Gagal menarik metrik studio:', err);
        setMetrics(null);
      } finally {
        setIsMetricsLoading(false);
      }
    };
    fetchMetrics();
  }, [id]);

  const yAxisTickFormatter = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-100 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-700 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center space-x-2 text-sm mb-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
              <span className="text-gray-600 capitalize">{entry.name}:</span>
              <span className="font-bold whitespace-nowrap" style={{ color: entry.color }}>
                Rp {entry.value.toLocaleString('id-ID')}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomTrafficTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-100 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-700 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center space-x-2 text-sm mb-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-gray-600">{entry.name}:</span>
              <span className="font-bold" style={{ color: entry.color }}>
                {Number(entry.value || 0).toLocaleString('id-ID')} orang
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const StatBlock = ({ title, value, bgColor, textColor }) => (
    <div className={`p-5 rounded-2xl ${bgColor} border border-transparent flex-1 min-w-[200px]`}>
      <p className={`text-sm font-medium mb-1 opacity-90 ${textColor}`}>{title}</p>
      <h3 className={`text-2xl font-bold ${textColor}`}>{value}</h3>
    </div>
  );

  const [tableData, setTableData] = useState([]);

  useEffect(() => {
    const loadRealData = async () => {
      try {
        const response = await fetchApi(`/api/studios/${id}/details`);
        setTableData(response);
      } catch (err) {
        console.error('Gagal menarik detail studio:', err);
      }
    };
    loadRealData();
  }, [id]);

  const handleInjectProducts = async () => {
    if (!window.confirm('Yakin ingin mulai menginjeksi produk ke seluruh keranjang akun yang sedang LIVE di studio ini? (Bot akan mengosongkan keranjang lama terlebih dahulu)')) {
      return;
    }
    
    setIsInjecting(true);
    try {
      const res = await fetchApi(`/api/studios/${id}/inject-products`, {
        method: 'POST',
        body: JSON.stringify({ clearEtalase: true })
      });
      alert(res.message || 'Proses injeksi dimulai di latar belakang.');
    } catch (err) {
      alert(err.message || 'Gagal memulai injeksi produk.');
    } finally {
      setIsInjecting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            className="mr-4 px-2 hover:bg-gray-200" 
            onClick={() => navigate('/list-studio')}
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-h2 font-bold text-gk-text-main flex items-center">
              Detail Studio <span className="text-gray-400 mx-2">|</span> ID: {id || '001'}
            </h1>
            <p className="text-gk-text-muted mt-1">Kosmetik VIP - Budi Santoso</p>
          </div>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-2">
           <Button 
             variant="outline" 
             className="border-indigo-600 text-indigo-700 hover:bg-indigo-50"
             leftIcon={<Tag size={16} />}
             onClick={() => navigate(`/list-studio/${id}/produk`)}
           >
             Brankas Produk
           </Button>
           <Button 
             variant="primary" 
             leftIcon={<RefreshCw size={16} className={isInjecting ? "animate-spin" : ""} />}
             onClick={handleInjectProducts}
             disabled={isInjecting}
             className="bg-indigo-600 hover:bg-indigo-700"
           >
             {isInjecting ? "Memulai Bot..." : "Inject Massal (Bot)"}
           </Button>
        </div>
      </div>

      {/* Metric Cards Horizontal Scrollable */}
      <div className="flex space-x-4 overflow-x-auto pb-2 snap-x hide-scrollbar">
        <div className="snap-start">
          <StatBlock
            title="Omzet Total"
            value={isMetricsLoading ? 'Memuat...' : formatRupiah(metrics?.omzetTotal ?? 0)}
            bgColor="bg-purple-600" textColor="text-white"
          />
        </div>
        <div className="snap-start">
          <StatBlock
            title="Estimasi Komisi"
            value={isMetricsLoading ? 'Memuat...' : formatRupiah(metrics?.komisiTotal ?? 0)}
            bgColor="bg-teal-500" textColor="text-white"
          />
        </div>
        <div className="snap-start">
          <StatBlock
            title="Sedang Divalidasi *"
            value={isMetricsLoading ? 'Memuat...' : formatRupiah(metrics?.divalidasi ?? 0)}
            bgColor="bg-blue-400" textColor="text-white"
          />
        </div>
        <div className="snap-start">
          <StatBlock
            title="Menunggu Dibayar *"
            value={isMetricsLoading ? 'Memuat...' : formatRupiah(metrics?.menungguDibayar ?? 0)}
            bgColor="bg-amber-500" textColor="text-white"
          />
        </div>
        <div className="snap-start">
          <StatBlock
            title="Terbayar *"
            value={isMetricsLoading ? 'Memuat...' : formatRupiah(metrics?.terbayar ?? 0)}
            bgColor="bg-blue-900" textColor="text-white"
          />
        </div>
      </div>

      <Card>
        <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h3 className="text-lg font-bold text-gk-text-main">Grafik Omzet & Komisi Harian</h3>
            <p className="text-xs text-gray-500 mt-1">Menampilkan tren pergerakan finansial</p>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-lg mt-4 sm:mt-0">
            <button 
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${period === 7 ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setPeriod(7)}
            >
              7 Hari
            </button>
            <button 
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${period === 30 ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setPeriod(30)}
            >
              30 Hari
            </button>
            <button 
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${period === 90 ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setPeriod(90)}
            >
              3 Bulan
            </button>
          </div>
        </div>

        <CardContent className="p-6 h-[400px]">
          {isLoading ? (
            <Skeleton className="w-full h-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="date" 
                  fontSize={11} 
                  tickMargin={10} 
                  stroke="#9CA3AF" 
                  minTickGap={20}
                />
                <YAxis 
                  fontSize={11} 
                  stroke="#9CA3AF" 
                  tickFormatter={yAxisTickFormatter}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Line 
                  type="monotone" 
                  name="Omzet"
                  dataKey="omzet" 
                  stroke="#9333ea" 
                  strokeWidth={3}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  dot={period <= 30 ? { r: 3, strokeWidth: 0, fill: '#9333ea' } : false}
                />
                <Line 
                  type="monotone" 
                  name="Komisi"
                  dataKey="komisi" 
                  stroke="#14b8a6" 
                  strokeWidth={3}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  dot={period <= 30 ? { r: 3, strokeWidth: 0, fill: '#14b8a6' } : false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Grafik Traffic Harian */}
      <Card>
        <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h3 className="text-lg font-bold text-gk-text-main">Grafik Traffic Live Harian</h3>
            <p className="text-xs text-gray-500 mt-1">Puncak penonton & pembeli per hari (akumulasi semua akun)</p>
          </div>
          <div className="flex items-center gap-2 mt-3 sm:mt-0">
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 font-semibold">
              Periode: {period} Hari
            </span>
          </div>
        </div>
        <CardContent className="p-6 h-[300px]">
          {isLoading ? (
            <Skeleton className="w-full h-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" fontSize={11} tickMargin={10} stroke="#9CA3AF" minTickGap={20} />
                <YAxis fontSize={11} stroke="#9CA3AF" tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                <Tooltip content={<CustomTrafficTooltip />} />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Bar name="Penonton" dataKey="viewers" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar name="Pembeli" dataKey="buyers" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* COMPLEX MANAGEMENT TABLE SEC */}
      <h3 className="text-h3 font-bold text-gk-text-main mt-8 mb-2">Manajemen Operasional Studio Tersinkron</h3>
      
      <Card className="overflow-hidden border border-indigo-100 shadow-sm">
        <div className="overflow-x-auto w-full hide-scrollbar">
          <table className="w-full text-left bg-white/50 whitespace-nowrap min-w-[1600px] border-collapse">
            <thead className="bg-slate-50 border-b border-indigo-100">
              {/* HEADER ROW 1 */}
              <tr className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">
                <th className="px-3 py-3 border-r border-indigo-50" rowSpan={2}>ID</th>
                <th className="px-3 py-3 border-r border-indigo-50 text-center min-w-[220px]" rowSpan={2}>STATUS</th>
                <th className="px-4 py-3 border-r border-indigo-50 min-w-[260px]" rowSpan={2}>NAMA TOKO / JUDUL LIVE</th>
                
                <th colSpan={3} className="px-4 py-2 border-r border-b border-indigo-100 bg-indigo-50/40 text-center text-indigo-800">
                  ⚡ OMZET LIVE TERKINI
                </th>
                <th colSpan={3} className="px-4 py-2 border-r border-b border-indigo-100 bg-gray-100/50 text-center text-gray-600">
                  🕒 OMZET SESI SEBELUMNYA
                </th>
                
                <th className="px-3 py-3 border-r border-indigo-50 text-center" rowSpan={2}>PENONTON</th>
                <th className="px-3 py-3 border-r border-indigo-50 text-center" rowSpan={2}>PEMBELI</th>
                <th className="px-3 py-3 border-r border-indigo-50 text-center text-teal-700" rowSpan={2}>OMZET KOMISI</th>
                <th className="px-3 py-3 border-r border-indigo-50 text-center" rowSpan={2}>BANK</th>
                <th className="px-3 py-3 border-r border-indigo-50 text-center sticky right-[180px] z-10 bg-slate-50 shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.05)]" rowSpan={2}>LIHAT LIVE</th>
                <th className="px-3 py-3 text-center sticky right-0 z-10 bg-slate-50" rowSpan={2}>HENTIKAN LIVE</th>
              </tr>
              {/* HEADER ROW 2 */}
              <tr className="text-[10px] text-gray-400 font-bold uppercase">
                {/* OMZET LIVE SUB */}
                <th className="px-3 py-2 border-r border-indigo-50 bg-indigo-50/20 text-center font-medium">Omzet (Rp)</th>
                <th className="px-3 py-2 border-r border-indigo-50 bg-indigo-50/20 text-center font-medium">Jam</th>
                <th className="px-3 py-2 border-r border-indigo-100 bg-indigo-50/20 text-center font-medium text-indigo-700">Omzet/Jam</th>
                {/* OMZET SEB SUB */}
                <th className="px-3 py-2 border-r border-indigo-50 bg-white/40 text-center font-medium">Omzet (Rp)</th>
                <th className="px-3 py-2 border-r border-indigo-50 bg-white/40 text-center font-medium">Jam</th>
                <th className="px-3 py-2 border-r border-indigo-100 bg-white/40 text-center font-medium">Omzet/Jam</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-[13px] text-gray-700">
              {tableData.length === 0 && (
                <tr>
                   <td colSpan="11" className="text-center py-10 font-bold text-gray-400">Belum ada akun Shopee yang masuk ke Studio ini.</td>
                </tr>
              )}
              {tableData.map((item, idx) => (
                <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="px-3 py-4 border-r border-indigo-50/50 font-bold text-gray-500 align-top">{item.id}</td>
                  
                  {/* Status Complex Cell */}
                  <td className="px-3 py-4 border-r border-indigo-50/50 align-top">
                    <div className="flex flex-col space-y-3">
                      <div className="flex items-center justify-between">
                         {item.status.isLive && (
                           <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded animate-pulse shadow-sm">
                             LIVE
                           </span>
                         )}
                         <div className="flex flex-col items-end">
                           <span className="text-[11px] font-bold text-indigo-900 bg-indigo-100/80 px-2 py-0.5 rounded">
                             Σ {item.status.etalaseCount} Etalase
                           </span>
                           <span className="text-[9px] font-medium text-blue-600 cursor-pointer hover:underline mt-1 flex items-center">
                             <Download size={10} className="mr-0.5" /> Unduh List Produk
                           </span>
                         </div>
                      </div>
                      
                      {/* Health Mini Card */}
                      <div className="bg-indigo-900 text-white rounded-md p-2 mt-1 shadow-inner border border-indigo-800">
                        <div className="flex justify-between items-center text-[10px] mb-1 opacity-90 border-b border-indigo-700 pb-1">
                          <span>Total Sesi: <b className="text-white">{item.status.health.sessions}</b></span>
                          <span>Jml Pel.: <b className={item.status.health.pel > 0 ? "text-red-400" : "text-emerald-400"}>{item.status.health.pel}</b></span>
                        </div>
                        <div className="text-[10px] flex justify-between items-start mt-1">
                          <span className="opacity-80">Poin Pel.: {item.status.health.value}</span>
                          {item.status.health.warning && (
                            <span className="text-red-300 font-medium max-w-[100px] text-right leading-tight ml-2">
                              {item.status.health.warning}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-4 py-4 border-r border-indigo-50/50 w-[260px] whitespace-normal align-top leading-tight">
                    <p className="font-bold text-indigo-700 text-sm mb-1">{item.namaToko}</p>
                    <p className="font-medium text-xs text-gray-500 italic bg-gray-50/80 p-1.5 rounded line-clamp-2">
                      "{item.judulLive}"
                    </p>
                  </td>

                  {/* OMZET LIVE */}
                  <td className="px-3 py-4 border-r border-indigo-50/50 font-bold text-indigo-950 align-top text-center bg-indigo-50/10">
                    {item.omzetLive.omzet}
                  </td>
                  <td className="px-3 py-4 border-r border-indigo-50/50 text-gray-500 align-top text-center bg-indigo-50/10 text-xs">
                    {item.omzetLive.jam}
                  </td>
                  <td className="px-3 py-4 border-r border-indigo-50/50 font-extrabold text-blue-700 align-top text-center bg-indigo-50/10">
                    {item.omzetLive.rasio}
                  </td>

                  {/* OMZET SEB */}
                  <td className="px-3 py-4 border-r border-indigo-50/50 text-gray-600 align-top text-center">
                    {item.omzetSeb.omzet}
                  </td>
                  <td className="px-3 py-4 border-r border-indigo-50/50 text-gray-400 align-top text-center text-xs">
                    {item.omzetSeb.jam}
                  </td>
                  <td className="px-3 py-4 border-r border-indigo-50/50 text-gray-500 align-top text-center">
                    {item.omzetSeb.rasio}
                  </td>

                  <td className="px-3 py-4 border-r border-indigo-50/50 align-top text-center">
                    <span className="font-bold bg-blue-50 text-blue-800 px-2.5 py-1 rounded-sm">{item.penonton}</span>
                  </td>
                  <td className="px-3 py-4 border-r border-indigo-50/50 align-top text-center">
                    <span className="font-bold bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-sm">{item.pembeli}</span>
                  </td>
                  <td className="px-3 py-4 border-r border-indigo-50/50 align-top text-center">
                    <span className="text-sm font-black text-teal-600 bg-teal-50 px-2 min-w-[90px] inline-block py-1 rounded border border-teal-100">
                      {item.komisi}
                    </span>
                  </td>
                  
                  {/* BANK */}
                  <td className="px-3 py-4 border-r border-indigo-50/50 align-top text-center">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <span className="font-bold text-gray-700">{item.bank}</span>
                      {item.isVerif ? (
                        <span className="text-[10px] font-bold text-emerald-600 uppercase">VERIF ✓</span>
                      ) : (
                        <span className="text-[10px] font-bold text-orange-500 uppercase">PENDING</span>
                      )}
                    </div>
                  </td>

                  {/* LIHAT LIVE ACTIONS */}
                  <td className="px-3 py-4 border-r border-indigo-50/50 align-top sticky right-[180px] z-10 bg-white shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.05)]">
                    <div className="flex flex-col space-y-2 w-full">
                      <Button variant="primary" size="sm" className="w-full text-[10px] h-7 px-2" leftIcon={<ExternalLink size={12}/>}>
                        Buka Live Target
                      </Button>
                      <Button variant="secondary" size="sm" className="w-full text-[10px] bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-0 h-7 px-2">
                        List Treatment
                      </Button>
                    </div>
                  </td>

                  {/* HENTIKAN LIVE & ADVANCED ACTIONS */}
                  <td className="px-3 py-4 align-top sticky right-0 z-10 bg-white w-[180px]">
                    <div className="flex flex-col space-y-1.5 w-full">
                      <Button variant="danger" size="sm" className="w-full text-xs font-bold tracking-wider h-8" leftIcon={<StopCircle size={14}/>}>
                        STOP LIVE INI
                      </Button>
                      
                      <div className="grid grid-cols-2 gap-1 mt-1">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="text-[9px] bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 h-6 px-1 shadow-none"
                          onClick={() => navigate(`/list-studio/${item.studio_id}/produk`)}
                        >
                          <Tag size={10} className="mr-1"/> Produk
                        </Button>
                        <Button variant="secondary" size="sm" className="text-[9px] bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 h-6 px-1 shadow-none">
                          <RefreshCw size={10} className="mr-1"/> Input Treat
                        </Button>
                      </div>
                      <Button variant="danger" size="sm" className="w-full text-[9px] bg-red-50 text-red-700 border-red-200 hover:bg-red-100 h-6 mt-0.5 shadow-none">
                         <XCircle size={10} className="mr-1" /> Terminate Instance HP
                      </Button>
                      
                      <div className="mt-3 pt-2 border-t border-gray-100/80">
                         <span className="block text-[9px] font-bold text-center bg-gray-100 text-gray-500 py-1 rounded w-full border border-gray-200">
                           {item.kategori}
                         </span>
                      </div>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};
