import React, { useState, useEffect } from 'react';
import { StatCard, Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DollarSign, Target, Activity, Server, Clock, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const HomeDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString());
  const [data, setData] = useState({
    stats: null,
    traffic: [],
    studios: [],
    comments: []
  });

  // Simulator for fetching data and polling
  useEffect(() => {
    const fetchData = () => {
      // Mock data payload
      const mockTraffic = Array.from({ length: 24 }).map((_, i) => ({
        hour: `Jam ${i}`,
        traffic: Math.floor(Math.random() * 5000) + 500,
      }));

      const mockStudios = [
        { id: 1, name: 'Studio Kosmetik VIP', revenue: 'Rp 45.200.000', liveRevenue: 'Rp 2.100.000', commission: 'Rp 4.520.000', devices: 3, comments: 1240, isLive: true, colorTheme: 'violet-500' },
        { id: 2, name: 'Fashion Mix', revenue: 'Rp 38.100.000', liveRevenue: 'Rp 1.500.000', commission: 'Rp 3.810.000', devices: 2, comments: 850, isLive: true, colorTheme: 'green-500' },
        { id: 3, name: 'Elektronik Center', revenue: 'Rp 22.400.000', liveRevenue: 'Rp 0', commission: 'Rp 2.240.000', devices: 0, comments: 0, isLive: false, colorTheme: 'red-500' },
        { id: 4, name: 'Gudang Promo 99', revenue: 'Rp 19.800.000', liveRevenue: 'Rp 800.000', commission: 'Rp 1.980.000', devices: 1, comments: 420, isLive: true, colorTheme: 'blue-500' },
        { id: 5, name: 'Hijab Style', revenue: 'Rp 15.600.000', liveRevenue: 'Rp 400.000', commission: 'Rp 1.560.000', devices: 1, comments: 310, isLive: true, colorTheme: 'amber-500' },
        { id: 6, name: 'Otomotif Hub', revenue: 'Rp 12.100.000', liveRevenue: 'Rp 0', commission: 'Rp 1.210.000', devices: 0, comments: 0, isLive: false, colorTheme: 'teal-500' },
      ];

      const mockComments = Array.from({ length: 5 }).map((_, i) => ({
        id: Math.random().toString(36).substr(2, 9),
        sender: `user_${Math.floor(Math.random() * 9999)}`,
        store: mockStudios[Math.floor(Math.random() * 6)].name,
        timestamp: new Date(Date.now() - i * 60000).toLocaleTimeString(),
        message: `ID: ${Math.floor(Math.random() * 99999)} | @tokotes | Beli Paket Glowing | https://shopee.co.id/live/...`
      }));

      setData(prev => ({
        stats: { omzet: 'Rp 153.200.000', activeStudio: '4 / 6', commission: 'Rp 15.320.000', server: 'Online' },
        traffic: mockTraffic,
        studios: mockStudios,
        comments: [...mockComments, ...prev.comments].slice(0, 50) // Keep last 50
      }));
      setLastUpdate(new Date().toLocaleTimeString());
      setIsLoading(false);
    };

    // Initial load
    fetchData();

    // Setup polling every 30 seconds
    const intervalId = setInterval(() => {
      fetchData();
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  if (isLoading && !data.stats) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* SECTION 1 - HEADER METRIC SUMMARY */}
      <section>
        <div className="flex justify-between items-end mb-4">
          <div>
            <h1 className="text-h2 font-bold text-gk-text-main">Dashboard Utama</h1>
            <p className="text-gk-text-muted mt-1 text-sm flex items-center">
               <Clock size={14} className="mr-1" /> Last update: {lastUpdate}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gk-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-gk-success"></span>
            </span>
            <span className="text-sm font-medium text-gk-success">Live Syncing</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Total Omzet Hari Ini" 
            value={data.stats?.omzet} 
            icon={<DollarSign size={24} />} 
          />
          <StatCard 
            title="Total Studio Aktif" 
            value={data.stats?.activeStudio} 
            icon={<Target size={24} />} 
          />
          <StatCard 
            title="Total Komisi Bulan Ini" 
            value={data.stats?.commission} 
            icon={<Activity size={24} />} 
          />
          <Card>
            <CardContent className="p-6">
               <div className="flex justify-between items-start">
                  <div>
                    <p className="text-small font-semibold text-gk-text-muted uppercase tracking-wider mb-1">Server Status</p>
                    <div className="flex items-center mt-2">
                      <div className={`w-3 h-3 rounded-full mr-2 ${data.stats?.server === 'Online' ? 'bg-gk-success' : 'bg-gk-warning'}`}></div>
                      <h2 className="text-h2 font-bold text-gk-text-main">{data.stats?.server}</h2>
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

      {/* SECTION 2 - GRAFIK TRAFIK HARIAN */}
      <section>
        <Card>
          <CardHeader className="flex flex-row justify-between items-center bg-gray-50/50">
            <div>
              <CardTitle>Trafik & Aktivitas Harian</CardTitle>
              <p className="text-xs text-gk-text-muted mt-1">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <Button variant="ghost" size="sm" rightIcon={<ChevronRight size={16} />}>
              View Detail
            </Button>
          </CardHeader>
          <CardContent className="p-6 h-[350px]">
             {isLoading ? (
               <Skeleton className="w-full h-full" />
             ) : (
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={data.traffic} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                   <XAxis dataKey="hour" fontSize={12} tickMargin={10} stroke="#9CA3AF" />
                   <YAxis fontSize={12} stroke="#9CA3AF" tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val} />
                   <Tooltip 
                     contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                   />
                   <Line 
                     type="monotone" 
                     dataKey="traffic" 
                     stroke="#1D9E75" 
                     strokeWidth={3}
                     dot={{ r: 4, strokeWidth: 2 }}
                     activeDot={{ r: 6, stroke: '#1D9E75', strokeWidth: 2, fill: '#fff' }}
                   />
                 </LineChart>
               </ResponsiveContainer>
             )}
          </CardContent>
        </Card>
      </section>

      {/* SECTION 3 - LIVE OMZET STUDIO */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-h3 font-semibold text-gk-text-main">Live Studio Metrics</h2>
        </div>
        
        {data.studios.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gk-border">
             <p className="text-gk-text-muted">Belum ada studio yang aktif saat ini.</p>
          </div>
        ) : (
          <div className="flex overflow-x-auto pb-4 gap-4 snap-x hide-scrollbar">
            {data.studios.map(studio => (
              <div key={studio.id} className="snap-start min-w-[280px] lg:min-w-[320px] flex-shrink-0">
                <Card className="h-full border-t-4 hover:shadow-lg transition-all" style={{ borderTopColor: studio.colorTheme ? `var(--tw-colors-${studio.colorTheme})` : '#cbd5e1' }}>
                  <CardContent className="p-5">
                    <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                      <h3 className="font-bold text-md text-gk-text-main truncate pr-2 w-[80%]">{studio.name}</h3>
                      {studio.isLive ? (
                        <span className="flex h-3 w-3 relative">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75`}></span>
                          <span className={`relative inline-flex rounded-full h-3 w-3 bg-green-500`}></span>
                        </span>
                      ) : (
                        <span className="h-3 w-3 rounded-full bg-gray-300"></span>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Live Revenue</p>
                        <p className="text-2xl font-bold bg-green-50 text-green-700 px-3 py-1 rounded-md inline-block">
                          {studio.liveRevenue}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Omzet Bulan</p>
                          <p className="text-sm font-bold text-gray-800">{studio.revenue}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Est. Komisi</p>
                          <p className="text-sm font-bold text-blue-600">{studio.commission}</p>
                        </div>
                      </div>
                      
                      <div className="flex justify-between text-xs text-gray-600 bg-gray-50 p-2 rounded">
                        <span>📱 {studio.devices} Devices</span>
                        <span>💬 {studio.comments} Komen</span>
                      </div>
                    </div>
                    
                    <Button variant="ghost" className="w-full mt-4 text-sm" rightIcon={<ChevronRight size={14} />}>
                      Detail Studio
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 4 - LIVE FEED KOMENTAR */}
      <section>
        <Card>
          <CardHeader className="bg-gray-50/50">
            <CardTitle>Live Feed Komentar Terkini</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Dari</th>
                  <th className="px-6 py-3">Toko</th>
                  <th className="px-6 py-3">Tanggal</th>
                  <th className="px-6 py-3 w-1/2">Komen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.comments.slice(0, 10).map((comment, idx) => (
                  <tr 
                    key={comment.id} 
                    className={`hover:bg-gray-50 transition-colors ${idx === 0 ? 'animate-highlight bg-blue-50/50' : ''}`}
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">{comment.sender}</td>
                    <td className="px-6 py-4"><Badge status={comment.store} label={comment.store} className="bg-indigo-50 border-indigo-100 text-indigo-700 font-normal" /></td>
                    <td className="px-6 py-4 text-gray-500">{comment.timestamp}</td>
                    <td className="px-6 py-4">
                      <div className="max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-xl truncate text-gray-700">
                        {comment.message}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <CardContent className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
             <span className="text-xs text-gray-500">Menampilkan 10 komentar terbaru (Auto-Refresh)</span>
             <Button variant="secondary" size="sm">Lihat Semua</Button>
          </CardContent>
        </Card>
      </section>
      
      {/* Hide scrollbar styles locally */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes highlight {
          0% { background-color: #dcfce7; }
          50% { background-color: #dcfce7; }
          100% { background-color: transparent; }
        }
        .animate-highlight {
          animation: highlight 3s ease-out;
        }
      `}</style>
    </div>
  );
};

// Internal Skeleton Component for initial load
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
