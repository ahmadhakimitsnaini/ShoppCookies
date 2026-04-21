import React, { useEffect } from 'react';
import { StatCard, StudioCard, Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { DollarSign, Users, Activity, Target, Plus, Search, AlertCircle, RefreshCw } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

export const Dashboard = () => {
  const { studios, isLoading, fetchStudios } = useStudioStore();

  useEffect(() => {
    fetchStudios();
  }, []);

  const totalOmzetUser = "Rp 0"; // TODO: Aggregation of actual revenue if available in Studio model
  const activeStudiosCount = studios.filter(s => s.status === 'ACTIVE').length;
  const liveSessionsCount = studios.reduce((acc, curr) => acc + (curr.totalLiveSessions || 0), 0);
  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-white rounded-xl border border-gk-border shadow-sm">
        <div>
          <h1 className="text-h2 font-bold text-gk-text-main">Ringkasan Hari Ini</h1>
          <p className="text-gk-text-muted mt-1">Pantau performa seluruh studio live streaming Anda</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button 
            variant="secondary" 
            leftIcon={<RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />}
            onClick={() => fetchStudios()}
            disabled={isLoading}
          >
            {isLoading ? "Memuat..." : "Refresh Data"}
          </Button>
          <Button leftIcon={<Plus size={18} />}>
            Tambah Studio
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Omzet" 
          value="Rp 124.5M" 
          icon={<DollarSign size={24} />} 
          trend="up" 
          trendValue="+12.5%" 
        />
        <StatCard 
          title="Studio Aktif / Live" 
          value={`${activeStudiosCount} / ${liveSessionsCount}`} 
          icon={<Target size={24} />} 
          trend="neutral" 
          trendValue="Data Real-Time" 
        />
        <StatCard 
          title="Total Klik" 
          value="1.2M" 
          icon={<Activity size={24} />} 
          trend="down" 
          trendValue="-2.1%" 
        />
        <StatCard 
          title="Konversi" 
          value="8.4%" 
          icon={<Users size={24} />} 
          trend="up" 
          trendValue="+0.4%" 
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Content Area - Table */}
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Performa Studio Teratas</CardTitle>
              <div className="w-64">
                <Input 
                  placeholder="Cari studio..." 
                  containerClassName="mb-0" 
                  className="py-1.5"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table 
                columns={[
                  { header: 'Nama Studio', accessor: 'name' },
                  { header: 'Status', cell: (row) => <Badge status={row.status} /> },
                  { header: 'Omzet', accessor: 'revenue' },
                  { header: 'Klik', accessor: 'clicks' },
                  { header: 'Cookies', cell: (row) => <Badge status={row.cookiesStatus === 'Aman' ? 'AMAN' : 'EXPIRED'} /> },
                  { header: 'Aksi', cell: () => <Button variant="ghost" size="sm">Detail</Button> }
                ]}
                data={studios.map(studio => ({
                   name: studio.name,
                   status: studio.status,
                   revenue: 'Rp 0', // Placeholder until revenue tracking is added
                   clicks: '-',
                   cookiesStatus: studio.activeAccountsCount > 0 ? 'Aman' : 'Expired'
                }))}
                className="border-0 shadow-none rounded-none"
              />
              {studios.length === 0 && !isLoading && (
                <div className="p-8 text-center text-gray-500">Belum ada data studio. Coba jalankan cURL POST Anda.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar - Status Stream */}
        <div className="space-y-6">
          <h3 className="text-h3 font-semibold text-gk-text-main flex items-center">
             Alert Sistem
             <span className="ml-2 flex h-2.5 w-2.5 relative">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gk-danger opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gk-danger"></span>
             </span>
          </h3>
          
          <div className="space-y-4">
             <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-start">
               <div className="bg-red-100 p-2 rounded-full text-red-600 mr-3">
                 <AlertCircle size={16} />
               </div>
               <div>
                 <h4 className="text-sm font-semibold text-red-800">Cookies Expired</h4>
                 <p className="text-xs text-red-600 mt-1">3 Studio membutuhkan update cookies (Elektronik Center, Fashion B, Gadget Termurah).</p>
               </div>
             </div>
             
             <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-start">
               <div className="bg-blue-100 p-2 rounded-full text-blue-600 mr-3">
                 <Activity size={16} />
               </div>
               <div>
                 <h4 className="text-sm font-semibold text-blue-800">Treatment Auto Sukses</h4>
                 <p className="text-xs text-blue-600 mt-1">Sistem berhasil memproses treatment untuk 45 akun dalam 10 menit terakhir.</p>
               </div>
             </div>
          </div>

          <h3 className="text-h3 font-semibold text-gk-text-main mt-8 mb-4">Akses Cepat</h3>
          <div className="grid grid-cols-2 gap-4">
             {studios.slice(0, 4).map((studio) => (
               <StudioCard key={studio.id} name={studio.name} status={studio.status} revenue="Rp 0" />
             ))}
             {studios.length === 0 && (
               <div className="col-span-2 text-sm text-gray-400">Tidak ada studio aktif</div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
