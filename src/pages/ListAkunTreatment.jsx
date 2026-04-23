import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Settings, AlertCircle, ShieldCheck } from 'lucide-react';
import { fetchApi } from '../lib/api';

export const ListAkunTreatment = () => {
  const [akunList, setAkunList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await fetchApi('/api/treatment/accounts');
        setAkunList(response);
      } catch (err) {
        console.error('Failed to grab treatment list:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAccounts();
  }, []);

  const getStatusBadge = (status) => {
    switch(status) {
      case 'AMAN': return <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800"><ShieldCheck size={14} className="mr-1"/> AMAN</div>;
      case 'PERLU PERHATIAN': return <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"><AlertCircle size={14} className="mr-1"/> PERHATIAN</div>;
      case 'KRITIS': return <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800"><AlertCircle size={14} className="mr-1"/> KRITIS</div>;
      default: return <Badge label={status} />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto mt-4">
      <div className="mb-6">
        <h1 className="text-h2 font-bold text-gk-text-main">List Akun Treatment</h1>
        <p className="text-gk-text-muted mt-1">Daftar seluruh akun Shopee yang masuk ke dalam mesin treatment automasi dan manual.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-left text-body text-gk-text-main whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200 text-small font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">USERNAME STUDIO</th>
                <th className="px-6 py-4">NAMA TOKO</th>
                <th className="px-6 py-4">STATUS KESEHATAN</th>
                <th className="px-6 py-4 text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan="5" className="text-center py-6 text-gray-500 font-medium">Memuat data automasi...</td></tr>
              ) : akunList.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-6 text-red-500 font-medium font-bold">Belum ada akun di Database Prisma Anda!</td></tr>
              ) : akunList.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-gray-500 font-medium">#{row.id}</td>
                  <td className="px-6 py-4 font-bold text-gray-800">{row.username}</td>
                  <td className="px-6 py-4">{row.namaToko}</td>
                  <td className="px-6 py-4">
                     {getStatusBadge(row.status)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                      Cek Setelan
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};
