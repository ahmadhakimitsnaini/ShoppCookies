import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ArrowUpDown } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DetailTokoProduk = () => {
  // Mock data berdasarkan gambar referensi
  const [products, setProducts] = useState([
    {
      id: 1,
      image: "https://images.unsplash.com/photo-1602751584552-8ba7a74c6530?w=200&h=200&q=80&fit=crop", // Simulasi perhiasan
      name: "Cincin Emas Solitaire List Gold 10K Semar Nusantara",
      url: "https://shopee.co.id/product/52215352/5979037681",
      kom: 1,
      stok: "1.008",
      ker: 2,
      klik: 3,
      terj: "2.229.410",
      harga: "2.273.700",
      bintang: "4.90",
      selected: false
    },
    {
      id: 2,
      image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=200&h=200&q=80&fit=crop", // Simulasi gorden
      name: "Gorden (khusus 12 gelombang, 8, 9 gelombang) gorden blackout import minimalis polos embos",
      url: "https://shopee.co.id/product/132905393/20384827395",
      kom: 1,
      stok: "761",
      ker: 2,
      klik: 2,
      terj: "800.000",
      harga: "198.000",
      bintang: "4.90",
      selected: false
    },
    {
      id: 3,
      image: "https://images.unsplash.com/photo-1620405232753-4318de921ca4?w=200&h=200&q=80&fit=crop", // Simulasi bedcover
      name: "Goldenic - Bedcover Bayi Set Motif Harvest Katun Halus",
      url: "https://shopee.co.id/product/1090664533/24467752808",
      kom: 6,
      stok: "1.864",
      ker: 3,
      klik: 5,
      terj: "506.700",
      harga: "168.999",
      bintang: "4.90",
      selected: false
    },
    {
      id: 4,
      image: "https://images.unsplash.com/photo-1591561954557-26941169b49e?w=200&h=200&q=80&fit=crop", // Simulasi fashion
      name: "Tas Fashion Wanita Import Terbaru Selempang Trendy",
      url: "https://shopee.co.id/product/14326205/40405163804",
      kom: 3,
      stok: "638",
      ker: 3,
      klik: 3,
      terj: "438.000",
      harga: "229.000",
      bintang: "4.90",
      selected: false
    }
  ]);

  const [selectAll, setSelectAll] = useState(false);

  const handleSelectAll = () => {
    const newState = !selectAll;
    setSelectAll(newState);
    setProducts(products.map(p => ({ ...p, selected: newState })));
  };

  const handleSelectOne = (id) => {
    const newProducts = products.map(p => (p.id === id ? { ...p, selected: !p.selected } : p));
    setProducts(newProducts);
    setSelectAll(newProducts.every(p => p.selected));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 overflow-hidden">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center py-2 px-1">
        <h1 className="text-[22px] font-bold text-gray-800 tracking-tight">
          List Produk Akun 201, Toko: SHIMASTORE99
        </h1>
        <div className="text-xs text-gray-400 mt-2 lg:mt-0 font-medium">
          <Link to="/home" className="hover:text-gk-primary transition-colors">Home</Link>
           <span className="mx-2">/</span> 
          <span className="text-gk-primary">List Produk Akun 201, Toko: SHIMASTORE99</span>
        </div>
      </div>

      {/* TABLE SECTION */}
      <Card className="border-0 shadow-sm rounded-xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            {/* Header dengan style Project Pallete (Abu gelap netral) menggantikan coklat agar lebih modern */}
            <thead className="bg-[#566270] text-white text-[11px] font-medium tracking-wide">
              <tr>
                <th className="px-4 py-3 border-r border-[#697686] whitespace-nowrap">
                  <div className="flex items-center justify-between">
                    ID <ArrowUpDown size={12} className="opacity-60 ml-1"/>
                  </div>
                </th>
                <th className="px-6 py-3 border-r border-[#697686] min-w-[300px]">
                  <div className="flex items-center justify-center">
                    BARANG <ArrowUpDown size={12} className="opacity-60 ml-2"/>
                  </div>
                </th>
                <th className="px-4 py-3 border-r border-[#697686]">
                   <div className="flex items-center justify-center">
                    URL <ArrowUpDown size={12} className="opacity-60 ml-2"/>
                  </div>
                </th>
                <th className="px-3 py-3 border-r border-[#697686] text-center">KOM</th>
                <th className="px-3 py-3 border-r border-[#697686] text-center">STOK <ArrowUpDown size={10} className="inline opacity-60"/></th>
                <th className="px-3 py-3 border-r border-[#697686] text-center">KER <ArrowUpDown size={10} className="inline opacity-60"/></th>
                <th className="px-3 py-3 border-r border-[#697686] text-center">KLIK <ArrowUpDown size={10} className="inline opacity-60"/></th>
                <th className="px-3 py-3 border-r border-[#697686] text-center">TERJ <ArrowUpDown size={10} className="inline opacity-60"/></th>
                <th className="px-3 py-3 border-r border-[#697686] text-center">HARGA <ArrowUpDown size={10} className="inline opacity-60"/></th>
                <th className="px-3 py-3 border-r border-[#697686] text-center">BINTANG <ArrowUpDown size={10} className="inline opacity-60"/></th>
                
                {/* Kolom Aksi Khusus Akhir */}
                <th className="px-3 py-2 text-center w-[160px] bg-[#4a5563]">
                  <div className="flex flex-col space-y-2 items-center justify-center h-full">
                    <div className="flex items-center space-x-2 text-[10px] font-semibold text-gray-200">
                      <span>HAPUS</span>
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="w-3 h-3 rounded-sm text-gk-primary focus:ring-gk-primary bg-white border-transparent cursor-pointer"
                          checked={selectAll}
                          onChange={handleSelectAll}
                        />
                        <span className="whitespace-nowrap">PILIH SEMUA</span>
                      </label>
                    </div>
                    <Button size="sm" variant="danger" className="w-full text-[10px] py-1 h-7 border-0 bg-red-500 hover:bg-red-600 shadow-sm rounded">
                      Hapus Produk
                    </Button>
                    <Button size="sm" variant="primary" className="w-full text-[10px] py-1 h-7 border-0 bg-[#00c5a3] hover:bg-[#00b092] text-white shadow-sm rounded">
                      Tambah Produk
                    </Button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-[12px] text-gray-600">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-8 border-r border-gray-100 align-top text-gray-700 font-medium">
                    {p.id}.
                  </td>
                  <td className="px-6 py-6 border-r border-gray-100 align-top max-w-[340px]">
                    <div className="flex flex-col items-center justify-centertext-center w-full">
                      <div className="w-32 h-32 mb-3 bg-gray-50 flex items-center justify-center p-1 rounded-sm border border-gray-100 overflow-hidden shadow-sm">
                        <img src={p.image} alt={p.name} className="w-full h-full object-contain" />
                      </div>
                      <a href={p.url} target="_blank" rel="noreferrer" className="text-blue-600 text-[11px] font-medium text-center hover:underline leading-tight px-4 line-clamp-2">
                        {p.name}
                      </a>
                      <p className="text-[10px] text-gray-400 mt-1">URL:</p>
                      <a href={p.url} target="_blank" rel="noreferrer" className="text-[9px] text-gray-500 text-center truncate w-[90%] hover:text-blue-500">
                        {p.url}
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-8 border-r border-gray-100 align-top whitespace-nowrap">
                    <p className="text-[11px] text-gray-500 mt-1">{p.url}</p>
                  </td>
                  
                  {/* Statistik Numerik Tengah */}
                  <td className="px-3 py-8 border-r border-gray-100 text-center font-medium">{p.kom}</td>
                  <td className="px-3 py-8 border-r border-gray-100 text-center font-medium">{p.stok}</td>
                  <td className="px-3 py-8 border-r border-gray-100 text-center font-medium">{p.ker}</td>
                  <td className="px-3 py-8 border-r border-gray-100 text-center font-medium">{p.klik}</td>
                  <td className="px-3 py-8 border-r border-gray-100 text-center font-medium text-gray-800">{p.terj}</td>
                  <td className="px-3 py-8 border-r border-gray-100 text-center font-medium text-gray-800">{p.harga}</td>
                  <td className="px-3 py-8 border-r border-gray-100 text-center font-medium">{p.bintang}</td>
                  
                  {/* Kolom Checkbox */}
                  <td className="px-3 py-8 align-top text-center bg-gray-50/50">
                    <div className="flex items-center justify-center h-full pt-2">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded-md border-gray-300 text-gk-primary focus:ring-gk-primary/30 cursor-pointer shadow-sm transition-all"
                        checked={p.selected}
                        onChange={() => handleSelectOne(p.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      
      {/* Tambahan Spasi Bawah untuk nafas scrolling */}
      <div className="h-4"></div>
    </div>
  );
};
