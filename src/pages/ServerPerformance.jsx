import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { Server, Database, Globe, Cpu, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const ServerPerformance = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    // Mock simulation
    setTimeout(() => {
      setData({
        globalStatus: 'Operational', // Operational, Degraded, Down
        uptime: '99.98%',
        components: [
          { name: 'Core API Endpoint', status: 'Operational', uptime: '100%', ping: '45ms', icon: <Globe size={20} /> },
          { name: 'Database Primary', status: 'Operational', uptime: '99.9%', ping: '12ms', icon: <Database size={20} /> },
          { name: 'Data Worker (Cookie)', status: 'Degraded', uptime: '98.5%', ping: '840ms', icon: <Cpu size={20} /> },
          { name: 'WebSocket Server', status: 'Operational', uptime: '99.99%', ping: '30ms', icon: <Server size={20} /> },
        ],
        pingHistory: Array.from({ length: 15 }).map((_, i) => ({
          time: `${i}m ago`,
          val: i === 5 || i === 6 ? 800 : Math.floor(Math.random() * 40) + 20
        })).reverse()
      });
      setIsLoading(false);
    }, 1500);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-[300px] w-full rounded-xl" />
      </div>
    );
  }

  const isGlobalDegraded = data.globalStatus !== 'Operational';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header Summary */}
      <div className={`p-6 rounded-xl border ${isGlobalDegraded ? 'bg-orange-50 border-orange-200' : 'bg-emerald-50 border-emerald-200'} flex flex-col md:flex-row items-center md:justify-between space-y-4 md:space-y-0`}>
        <div className="flex items-center">
          <div className={`p-3 rounded-full mr-4 bg-white shadow-sm ${isGlobalDegraded ? 'text-orange-500' : 'text-emerald-500'}`}>
            {isGlobalDegraded ? <AlertTriangle size={32} /> : <CheckCircle2 size={32} />}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              System is {data.globalStatus}
            </h1>
            <p className={`${isGlobalDegraded ? 'text-orange-700' : 'text-emerald-700'} text-sm mt-1`}>
              Last checked: 1 minute ago
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center md:items-end">
           <span className="text-sm font-medium text-gray-500 uppercase">Globel Uptime</span>
           <span className="text-3xl font-bold text-gray-900">{data.uptime}</span>
        </div>
      </div>

      {isGlobalDegraded && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Critical Alerts</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>Data Worker (Cookie) response time is heavily degraded due to high load. Auto-scaling is in progress.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <h2 className="text-h3 font-semibold text-gk-text-main mt-8">Component Status</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.components.map((comp, idx) => (
          <Card key={idx} className={comp.status === 'Degraded' ? 'border-orange-200 shadow-sm' : ''}>
            <CardContent className="p-5">
               <div className="flex justify-between items-start mb-4">
                 <div className={`p-2 rounded bg-gray-100 ${comp.status === 'Degraded' ? 'text-orange-500 bg-orange-100' : 'text-gray-600'}`}>
                   {comp.icon}
                 </div>
                 <Badge 
                    status={comp.status === 'Operational' ? 'AMAN' : 'EXPIRED'} 
                    label={comp.status} 
                    className={comp.status === 'Degraded' ? 'bg-orange-100 text-orange-800 border-orange-200' : ''}
                 />
               </div>
               <h3 className="font-semibold text-gray-900">{comp.name}</h3>
               <div className="mt-4 flex justify-between text-sm">
                 <span className="text-gray-500">Uptime: <span className="font-medium text-gray-900">{comp.uptime}</span></span>
                 <span className="text-gray-500">Ping: <span className={`font-medium ${comp.status === 'Degraded' ? 'text-orange-600' : 'text-green-600'}`}>{comp.ping}</span></span>
               </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Average Response Time</CardTitle>
        </CardHeader>
        <CardContent className="p-6 h-[300px]">
           <ResponsiveContainer width="100%" height="100%">
             <AreaChart data={data.pingHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
               <defs>
                 <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                   <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                   <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                 </linearGradient>
               </defs>
               <CartesianGrid strokeDasharray="3 3" vertical={false} />
               <XAxis dataKey="time" fontSize={12} stroke="#9CA3AF" />
               <YAxis fontSize={12} stroke="#9CA3AF" unit="ms" />
               <Tooltip />
               <Area type="monotone" dataKey="val" stroke="#3B82F6" fillOpacity={1} fill="url(#colorVal)" />
             </AreaChart>
           </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
