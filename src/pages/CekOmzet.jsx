import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, LineChart, Line, YAxis, Tooltip } from 'recharts';
import { Skeleton } from '../components/ui/Skeleton';

export const CekOmzet = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  // Mock studios data
  const [studios, setStudios] = useState([]);

  useEffect(() => {
    // Generate mock grids
    const mockData = Array.from({ length: 6 }).map((_, idx) => {
      const chartLen = 7;
      const data = Array.from({ length: chartLen }).map((_, i) => ({
        day: `H-${chartLen - i}`,
        omzet: Math.floor(Math.random() * 5000) + 1000,
        komisi: Math.floor(Math.random() * 500) + 100
      }));
      return {
        id: idx + 1,
        name: `Studio ${String.fromCharCode(65 + idx)} - VIP Phase`,
        totalOmzet: `Rp ${(Math.random() * 50 + 10).toFixed(1)}juta`,
        chartData: data
      };
    });

    setTimeout(() => {
      setStudios(mockData);
      setIsLoading(false);
    }, 800);
  }, []);

  const MiniTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border-none text-white text-xs p-2 rounded shadow-xl">
           <div className="text-purple-300 font-semibold">Omzet: {payload[0].value}k</div>
           <div className="text-teal-300 font-semibold">Komisi: {payload[1].value}k</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="mb-6">
        <h1 className="text-h2 font-bold text-gk-text-main">Cek Omzet Semua Studio</h1>
        <p className="text-gk-text-muted mt-1">Monitoring progres finansial seluruh entitas 7 hari terakhir</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading 
          ? Array.from({length: 6}).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl w-full" />)
          : studios.map(studio => (
             <div 
               key={studio.id} 
               onClick={() => navigate(`/list-studio/${studio.id}`)}
               className="bg-white rounded-xl border border-gray-200 overflow-hidden cursor-pointer hover:shadow-lg transition-transform hover:-translate-y-1 group"
             >
               <div className="p-4 border-b border-gray-100 flex justify-between items-center group-hover:bg-gray-50 transition-colors">
                 <div>
                   <h3 className="font-semibold text-gray-800 text-sm truncate">{studio.name}</h3>
                   <span className="text-xs text-gray-500">7 Hari Terakhir</span>
                 </div>
                 <div className="text-right">
                   <p className="text-xs text-gray-500">Total Omzet</p>
                   <p className="font-bold text-purple-700">{studio.totalOmzet}</p>
                 </div>
               </div>
               <div className="h-32 w-full p-2 bg-gray-50/30">
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={studio.chartData}>
                     <Tooltip content={<MiniTooltip />} cursor={{ stroke: '#e5e7eb', strokeWidth: 2 }} />
                     <YAxis hide domain={['dataMin - 1000', 'dataMax + 1000']} />
                     <Line type="monotone" dataKey="omzet" stroke="#9333ea" strokeWidth={2} dot={false} isAnimationActive={true} />
                     <Line type="monotone" dataKey="komisi" stroke="#14b8a6" strokeWidth={2} dot={false} isAnimationActive={true} />
                   </LineChart>
                 </ResponsiveContainer>
               </div>
             </div>
          ))
        }
      </div>
    </div>
  );
};
