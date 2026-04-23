import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, LineChart, Line, YAxis, Tooltip } from 'recharts';
import { Skeleton } from '../components/ui/Skeleton';
import { getStudiosAnalytics, getOmzetHistory, formatRupiah } from '../lib/api';
import { TrendingUp, TrendingDown } from 'lucide-react';

export const CekOmzet = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [studios, setStudios]     = useState([]);
  const [chartData, setChartData] = useState([]);
  const [error, setError]         = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studiosData, historyData] = await Promise.all([
          getStudiosAnalytics(),
          getOmzetHistory(7),
        ]);
        setStudios(studiosData);
        setChartData(historyData);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Petakan riwayat history ke tiap studio sebagai mini chart data
  const getStudioChart = (studioName) => {
    return chartData.map(day => ({
      day: day.date,
      omzet: day[studioName] || 0,
    }));
  };

  const MiniTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 text-white text-xs p-2 rounded shadow-xl">
          <div className="text-purple-300 font-semibold">{formatRupiah(payload[0]?.value)}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="mb-6">
        <h1 className="text-h2 font-bold text-gk-text-main">Cek Omzet Semua Studio</h1>
        <p className="text-gk-text-muted mt-1">Monitoring progres finansial seluruh studio — 7 hari terakhir</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          ⚠️ Gagal memuat data: {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading
          ? Array.from({length: 6}).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl w-full" />)
          : studios.length === 0
            ? (
              <div className="col-span-full text-center py-16 text-gk-text-muted">
                Belum ada studio aktif. Tambahkan studio dan akun terlebih dahulu.
              </div>
            )
            : studios.map(studio => {
                const miniData = getStudioChart(studio.name);
                const hasGrowth = miniData.length >= 2
                  ? miniData[miniData.length - 1].omzet >= miniData[miniData.length - 2].omzet
                  : true;

                return (
                  <div
                    key={studio.id}
                    onClick={() => navigate(`/list-studio/${studio.id}`)}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden cursor-pointer hover:shadow-lg transition-transform hover:-translate-y-1 group"
                  >
                    {/* Card Header */}
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center group-hover:bg-gray-50 transition-colors">
                      <div className="overflow-hidden">
                        <h3 className="font-semibold text-gray-800 text-sm truncate">{studio.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-500">7 Hari Terakhir</span>
                          {studio.is_live && (
                            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                              LIVE
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-xs text-gray-500">Hari Ini</p>
                        <p className="font-bold text-purple-700 text-sm">{formatRupiah(studio.omzet_live)}</p>
                      </div>
                    </div>

                    {/* Mini Chart */}
                    <div className="h-28 w-full p-2 bg-gray-50/30">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={miniData}>
                          <Tooltip content={<MiniTooltip />} cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }} />
                          <YAxis hide domain={['dataMin - 100000', 'dataMax + 100000']} />
                          <Line
                            type="monotone"
                            dataKey="omzet"
                            stroke={hasGrowth ? '#9333ea' : '#ef4444'}
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={true}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Card Footer */}
                    <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                      <span>Bulan ini: <span className="font-semibold text-gray-700">{formatRupiah(studio.omzet_bulan_ini)}</span></span>
                      <span className={`flex items-center gap-1 font-medium ${hasGrowth ? 'text-green-600' : 'text-red-500'}`}>
                        {hasGrowth ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {hasGrowth ? 'Naik' : 'Turun'}
                      </span>
                    </div>
                  </div>
                );
              })
        }
      </div>
    </div>
  );
};
