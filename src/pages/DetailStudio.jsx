import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export const DetailStudio = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState(30); // 7, 30, 90
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    setIsLoading(true);
    // Simulate API fetch delay
    const timer = setTimeout(() => {
      // Generate mock chart data based on selected period
      const data = Array.from({ length: period }).map((_, i) => {
        const date = new Date(Date.now() - (period - i - 1) * 24 * 60 * 60 * 1000);
        return {
          date: date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
          rawDate: date,
          omzet: Math.floor(Math.random() * 8000000) + 1000000, // 1M - 9M
          komisi: Math.floor(Math.random() * 800000) + 100000 // 10% estimation
        };
      });
      setChartData(data);
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [period, id]);

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

  const StatBlock = ({ title, value, bgColor, textColor }) => (
    <div className={`p-5 rounded-2xl ${bgColor} border border-transparent flex-1 min-w-[200px]`}>
      <p className={`text-sm font-medium mb-1 opacity-90 ${textColor}`}>{title}</p>
      <h3 className={`text-2xl font-bold ${textColor}`}>{value}</h3>
    </div>
  );

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
           <Button variant="danger" leftIcon={<ExternalLink size={16} />}>Kunjungi Toko</Button>
        </div>
      </div>

      {/* Metric Cards Horizontal Scrollable */}
      <div className="flex space-x-4 overflow-x-auto pb-2 snap-x hide-scrollbar">
        <div className="snap-start"><StatBlock title="Omzet Total" value="Rp 84.5M" bgColor="bg-purple-600" textColor="text-white" /></div>
        <div className="snap-start"><StatBlock title="Estimasi Komisi" value="Rp 8.4M" bgColor="bg-teal-500" textColor="text-white" /></div>
        <div className="snap-start"><StatBlock title="Sedang Divalidasi" value="Rp 2.1M" bgColor="bg-blue-400" textColor="text-white" /></div>
        <div className="snap-start"><StatBlock title="Menunggu Dibayar" value="Rp 4.3M" bgColor="bg-amber-500" textColor="text-white" /></div>
        <div className="snap-start"><StatBlock title="Terbayar" value="Rp 34.2M" bgColor="bg-blue-900" textColor="text-white" /></div>
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
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};
