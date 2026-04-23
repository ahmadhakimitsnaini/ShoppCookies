import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { fetchApi } from '../lib/api';
import { Search, Eye, ExternalLink, MonitorPlay } from 'lucide-react';

export const ListStudio = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua');

  const [initialData, setInitialData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // MENGAMBIL DATA ASLI DARI DATABASE PRISMA
  React.useEffect(() => {
    const memuatDataStudio = async () => {
      try {
        const response = await fetchApi('/api/studios');
        // response.data berisi: id, name, status, activeAccountsCount
        setInitialData(response.data);
      } catch (err) {
        console.error("Gagal menarik daftar studio:", err);
      } finally {
        setIsLoading(false);
      }
    };
    memuatDataStudio();
  }, []);

  // Filtering Logic
  const filteredData = initialData.filter(item => {
    // Karena propertinya beda (dari Prisma), kita cocokan name
    const namaTokoAtauStudio = item.name ? item.name.toLowerCase() : '';
    const matchSearch = namaTokoAtauStudio.includes(searchTerm.toLowerCase());
    
    // Status dari database: 'ACTIVE', 'MAINTENANCE' dsb.
    let displayStatus = item.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif';
    const matchFilter = filterStatus === 'Semua' ? true : displayStatus === filterStatus;
    
    return matchSearch && matchFilter;
  });

  const columns = [
    { header: 'ID Studio', cell: (row) => <span className="text-xs text-gray-400">{row.id.substring(0,8)}...</span> },
    { header: 'Nama Studio', cell: (row) => <span className="font-bold whitespace-normal">{row.name}</span> },
    { header: 'Akun Aktif', cell: (row) => <Badge status={row.activeAccountsCount > 0 ? 'AMAN' : 'WARNING'} label={`${row.activeAccountsCount} AKUN`} /> },
    { header: 'Total Sesi', accessor: 'totalLiveSessions' },
    { header: 'Status', cell: (row) => {
        let statusBadge = row.status === 'ACTIVE' ? 'AMAN' : 'OFFLINE';
        return <Badge status={statusBadge} label={row.status} />;
      } 
    },
    { header: 'Eksekusi', cell: (row) => (
      <div className="flex space-x-2">
        <Button 
          variant="primary" 
          size="sm" 
          leftIcon={<Eye size={14} />} 
          className="bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-600"
          onClick={() => navigate(`/list-studio/${row.id}`)}
        >
          Detail
        </Button>
        <Button 
          variant="danger" 
          size="sm" 
          leftIcon={<ExternalLink size={14} />} 
          className="bg-orange-500 hover:bg-orange-600 focus:ring-orange-500"
        >
          Cek Etalase
        </Button>
      </div>
    )}
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4">
        <div>
          <h1 className="text-h2 font-bold text-gk-text-main">List Studio</h1>
          <p className="text-gk-text-muted mt-1">Kelola seluruh studio operasional yang terdaftar</p>
        </div>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-100 bg-white flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="w-full md:w-1/3 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <div className="ml-1">
              <Input 
                placeholder="Cari User Studio / Nama Toko..." 
                containerClassName="mb-0 w-full"
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="w-full md:w-48">
            <Select 
              containerClassName="mb-0"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              options={[
                { value: 'Semua', label: 'Filter: Semua Status' },
                { value: 'Aktif', label: 'Aktif' },
                { value: 'Nonaktif', label: 'Nonaktif' },
                { value: 'Dihapus', label: 'Dihapus' },
              ]}
            />
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-body text-gk-text-main whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gk-border text-small font-semibold text-gk-text-muted uppercase tracking-wider">
                <tr>
                  {columns.map((col, index) => (
                    <th key={index} className="px-6 py-4">
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-10 text-center text-gray-500">
                       Memuat Daftar Studio dari Database Prisma...
                    </td>
                  </tr>
                ) : filteredData.length > 0 ? (
                  filteredData.map((row, rowIndex) => {
                    return (
                      <tr 
                        key={rowIndex} 
                        className={`hover:bg-gray-50 transition-standard`}
                      >
                        {columns.map((col, colIndex) => (
                          <td key={colIndex} className="px-6 py-4">
                            {col.accessor ? row[col.accessor] : col.cell ? col.cell(row) : null}
                          </td>
                        ))}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-16 text-center text-gk-text-muted bg-gray-50/50 ">
                      <div className="flex flex-col items-center">
                        {searchTerm ? (
                          <>
                            <div className="w-12 h-12 bg-gray-100  rounded-full flex items-center justify-center mb-3">
                              <Search className="text-gray-400" size={24} />
                            </div>
                            <p className="text-gray-600  font-medium text-base">Tidak ditemukan hasil untuk "{searchTerm}"</p>
                            <p className="text-xs text-gray-500 mt-1">Coba gunakan kata kunci berbeda.</p>
                          </>
                        ) : (
                          <>
                            <div className="w-16 h-16 bg-blue-50  rounded-full flex items-center justify-center mb-4">
                              <MonitorPlay className="text-blue-500 " size={32} />
                            </div>
                            <p className="text-gray-600  font-bold text-lg mb-2">Belum ada studio</p>
                            <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">Tambahkan studio pertama Anda untuk mulai mengelola cookies dan automasi etalase.</p>
                            <Button variant="primary" size="sm">Tambah Studio Pertama →</Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Mock Pagination */}
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <p className="text-sm text-gray-500">Menampilkan {filteredData.length} item dari {filteredData.length} total baris</p>
            <div className="flex space-x-2">
              <Button variant="ghost" size="sm" disabled>Prev</Button>
              <Button variant="primary" size="sm" className="w-8 h-8 p-0 grid object-center justify-center">1</Button>
              <Button variant="ghost" size="sm" disabled>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
    </div>
  );
};
