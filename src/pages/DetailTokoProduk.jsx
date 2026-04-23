import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { 
  Link2, Trash2, Plus, ArrowLeft, PlayCircle, 
  BarChart3, Database, RefreshCw, Star, ShoppingCart, 
  MousePointer2, Package, CheckSquare, Square
} from 'lucide-react';
import { fetchApi } from '../lib/api';

export const DetailTokoProduk = () => {
  const { id } = useParams(); // id Studio
  const [activeTab, setActiveTab] = useState('brankas'); // 'brankas' | 'etalase'
  
  // State Brankas
  const [products, setProducts] = useState([]);
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkLinks, setBulkLinks] = useState('');
  
  // State Etalase Monitor
  const [liveProducts, setLiveProducts] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filterKomisi, setFilterKomisi] = useState('Semua');
  
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'brankas') {
      loadProducts();
    } else {
      loadLiveEtalase();
    }
  }, [id, activeTab]);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetchApi(`/api/studios/${id}/products`);
      setProducts(res);
    } catch (err) {
      console.error("Gagal menarik produk:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLiveEtalase = async () => {
    setIsLoading(true);
    try {
      const res = await fetchApi(`/api/studios/${id}/live-etalase`);
      setLiveProducts(res);
    } catch (err) {
      console.error("Gagal menarik etalase live:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    try {
      await fetchApi(`/api/studios/${id}/products`, {
        method: 'POST',
        body: JSON.stringify({ product_url: newUrl, product_name: newName })
      });
      setNewUrl('');
      setNewName('');
      loadProducts();
    } catch (err) {
      alert(`Gagal menyimpan produk: ${err.message}`);
    }
  };

  const handleBulkAdd = async (e) => {
    e.preventDefault();
    const links = bulkLinks
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('http'));

    if (links.length === 0) {
      alert("Masukkan minimal satu link Shopee yang valid (diawali http).");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetchApi(`/api/studios/${id}/products/bulk`, {
        method: 'POST',
        body: JSON.stringify({ product_urls: links })
      });
      alert(res.message);
      setBulkLinks('');
      setIsBulkMode(false);
      loadProducts();
    } catch (err) {
      alert(`Gagal import massal: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (prodId) => {
    if(!window.confirm("Bakar tautan ini?")) return;
    try {
      await fetchApi(`/api/studios/${id}/products/${prodId}`, { method: 'DELETE' });
      loadProducts();
    } catch(err) {
      alert("Gagal menghapus.");
    }
  };

  const toggleSelect = (prodId) => {
    if (selectedIds.includes(prodId)) {
        setSelectedIds(selectedIds.filter(i => i !== prodId));
    } else {
        setSelectedIds([...selectedIds, prodId]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === liveProducts.length) {
        setSelectedIds([]);
    } else {
        setSelectedIds(liveProducts.map(p => p.id));
    }
  };

  // Filtered Logic for Etalase
  const filteredEtalase = liveProducts.filter(p => {
    if (filterKomisi === 'Semua') return true;
    // Numeric filter: show only items with commission equal to selected number
    const komisiNum = Number(p.kom);
    const filterNum = Number(filterKomisi);
    if (!isNaN(filterNum)) {
      return komisiNum === filterNum;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto px-4 mt-6 pb-20">
      
      {/* Header & Navigasi */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
            <Link to={`/list-studio/${id}`} className="text-gray-400 hover:text-gk-primary bg-white p-2 border border-gray-200 rounded-full shadow-sm transition-transform hover:-translate-x-1">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-h2 font-bold text-gk-text-main">Manajemen Produk</h1>
              <p className="text-sm text-gk-text-muted mt-0.5">Studio ID: {id.substring(0,8)}...</p>
            </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-gray-200/50 rounded-lg w-fit">
          <button 
            onClick={() => setActiveTab('brankas')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'brankas' ? 'bg-white text-gk-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Database size={16} /> Brankas Bot
          </button>
          <button 
            onClick={() => setActiveTab('etalase')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'etalase' ? 'bg-white text-gk-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <BarChart3 size={16} /> Monitor Etalase
          </button>
        </div>
      </div>

      {activeTab === 'brankas' ? (
        <>
          {/* TAB 1: BRANKAS BOT */}
          <Card className="border-t-4 border-t-gk-primary shadow-lg ring-1 ring-black/5">
            <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Tambah Amunisi Injeksi</h3>
                        <p className="text-xs text-gray-500">Link yang Anda masukkan di sini akan disedot oleh robot Playwright saat Live dimulai.</p>
                    </div>
                    <button 
                        onClick={() => setIsBulkMode(!isBulkMode)}
                        className={`text-xs font-bold px-3 py-1.5 rounded border transition-colors ${isBulkMode ? 'bg-gk-primary text-white border-gk-primary' : 'bg-white text-gk-primary border-gk-primary/20 hover:bg-gk-primary/5'}`}
                    >
                        {isBulkMode ? 'Mode Satuan' : 'Mode Massal (Bulk)'}
                    </button>
                </div>

                {!isBulkMode ? (
                  <form onSubmit={handleAddProduct} className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                    <div className="flex-1 w-full space-y-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Judul Singkat</label>
                      <Input 
                        placeholder="Contoh: Baju Gamis" 
                        value={newName} 
                        onChange={(e) => setNewName(e.target.value)} 
                        containerClassName="mb-0" 
                      />
                    </div>
                    <div className="flex-[2] w-full space-y-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Link Shopee Affiliate *</label>
                      <Input 
                        placeholder="https://shope.ee/..." 
                        value={newUrl} 
                        onChange={(e) => setNewUrl(e.target.value)} 
                        containerClassName="mb-0" 
                        required
                      />
                    </div>
                    <Button type="submit" variant="primary" className="h-[42px] px-8 font-bold shadow-gk-primary/20 shadow-lg">
                        <Plus size={18} className="mr-2"/> Tambahkan
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleBulkAdd} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">List Link Shopee (Satu per baris)</label>
                      <textarea 
                        className="w-full h-40 p-3 text-sm font-mono border border-gray-200 rounded-lg focus:ring-2 focus:ring-gk-primary/30 focus:border-gk-primary outline-none transition-all"
                        placeholder="https://shope.ee/link1&#10;https://shope.ee/link2&#10;https://shope.ee/link3"
                        value={bulkLinks}
                        onChange={(e) => setBulkLinks(e.target.value)}
                        required
                      ></textarea>
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit" variant="primary" className="px-10 font-bold shadow-lg shadow-gk-primary/20">
                           Mulai Import ({bulkLinks.split('\n').filter(l => l.trim().startsWith('http')).length} Produk)
                        </Button>
                    </div>
                  </form>
                )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                Daftar Antrean Injeksi <Badge label={`${products.length} SKU`} status="AMAN" />
              </h3>
              <div className="bg-yellow-50 text-yellow-700 text-[10px] px-3 py-1.5 rounded-full font-bold flex items-center gap-1 border border-yellow-100 uppercase tracking-tighter">
                <PlayCircle size={12} className="text-yellow-500"/> Gunakan /inject di Telegram!
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-12 text-center text-gray-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 opacity-20" />
                    Memuat Brankas...
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-20 px-4">
                    <div className="bg-gray-100 h-16 w-16 mx-auto rounded-full flex items-center justify-center text-gray-300 mb-4">
                      <Link2 size={24} />
                    </div>
                    <h4 className="text-gray-900 font-bold">Brankas Kosong</h4>
                    <p className="text-gray-500 text-sm max-w-xs mx-auto">Anda belum menambahkan link produk untuk disuntikkan ke akun ini.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {products.map((prod, i) => (
                    <div key={prod.id} className="flex items-center p-4 hover:bg-gray-50/80 transition-colors group">
                        <div className="h-8 w-8 bg-gk-primary/10 text-gk-primary rounded flex items-center justify-center font-black text-xs mr-4 shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="font-bold text-gray-800 truncate text-sm">
                            {prod.product_name || 'Tanpa Judul'}
                          </p>
                          <code className="text-[10px] text-blue-500 truncate block opacity-70">
                            {prod.product_url}
                          </code>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(prod.id)} className="text-gray-300 hover:text-red-500 hover:bg-red-50 h-8 w-8 transition-all">
                          <Trash2 size={16} />
                        </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* TAB 2: MONITOR ETALASE LIVE */}
          <div className="flex justify-between items-center mb-2">
              <div className="flex gap-2">
                <Button 
                    variant="danger" 
                    size="sm" 
                    disabled={selectedIds.length === 0}
                    className="font-bold text-[11px] h-8 px-4 uppercase tracking-wider"
                >
                    Hapus Produk ({selectedIds.length})
                </Button>
                <Button 
                    variant="primary" 
                    size="sm" 
                    className="bg-teal-500 hover:bg-teal-600 font-bold text-[11px] h-8 px-4 uppercase tracking-wider"
                >
                    Tambah Produk
                </Button>
              </div>
              <div className="flex gap-4 items-center">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Filter Komisi:</span>
                    <select 
                        value={filterKomisi}
                        onChange={(e) => setFilterKomisi(e.target.value)}
                        className="bg-white border border-gray-200 text-[11px] font-bold rounded-md px-2 py-1 focus:ring-1 focus:ring-gk-primary outline-none"
                    >
                        <option value="Semua">Tampilkan Semua</option>
                        <option value="1">1%</option>
                        <option value="2">2%</option>
                        <option value="3">3%</option>
                        <option value="4">4%</option>
                        <option value="5">5%</option>
                    </select>
                </div>
                <Button variant="ghost" size="sm" onClick={loadLiveEtalase} className="text-gk-text-muted hover:text-gk-primary">
                    <RefreshCw size={14} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Sinkron Data Shopee
                </Button>
              </div>
          </div>

          <div className="bg-white rounded-xl border border-gk-border shadow-sm overflow-hidden overflow-x-auto">
             <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead className="bg-[#6b6666] text-white text-[11px] font-bold uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center border-r border-gray-500/30">ID</th>
                    <th className="px-4 py-3 border-r border-gray-500/30 min-w-[250px]">Barang</th>
                    <th className="px-4 py-3 border-r border-gray-500/30">URL</th>
                    <th className="px-4 py-3 border-r border-gray-500/30 text-center">Kom</th>
                    <th className="px-2 py-3 border-r border-gray-500/30 text-center">Stok</th>
                    <th className="px-2 py-3 border-r border-gray-500/30 text-center">Ker</th>
                    <th className="px-2 py-3 border-r border-gray-500/30 text-center">Klik</th>
                    <th className="px-2 py-3 border-r border-gray-500/30 text-center">Terj</th>
                    <th className="px-4 py-3 border-r border-gray-500/30 text-center">Harga</th>
                    <th className="px-4 py-3 border-r border-gray-500/30 text-center">Bintang</th>
                    <th className="px-4 py-3 text-center">
                        <button onClick={toggleSelectAll} className="hover:text-gk-primary transition-colors">
                            {selectedIds.length === liveProducts.length && liveProducts.length > 0 ? (
                                <CheckSquare size={16} className="mx-auto" />
                            ) : (
                                <Square size={16} className="mx-auto" />
                            )}
                        </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-[12px] text-gray-700">
                   {isLoading && filteredEtalase.length === 0 ? (
                      <tr><td colSpan="11" className="p-20 text-center text-gray-400 font-medium">Sedang menembus API Shopee...</td></tr>
                   ) : filteredEtalase.length === 0 ? (
                      <tr><td colSpan="11" className="p-20 text-center text-gray-400 font-medium italic">Tidak ada produk dengan kriteria komisi tersebut.</td></tr>
                   ) : filteredEtalase.map((prod, idx) => (
                      <tr key={prod.id} className="hover:bg-blue-50/30 transition-colors">
                         <td className="px-4 py-4 text-center font-mono text-gray-400 border-r border-gray-50">{idx + 1}.</td>
                         <td className="px-4 py-4 border-r border-gray-50">
                            <div className="flex flex-col items-center">
                               <img src={prod.image} alt={prod.name} className="w-20 h-20 object-cover rounded shadow-sm border border-gray-100 mb-2" />
                               <p className="text-[10px] font-bold text-blue-600 text-center leading-tight hover:underline cursor-pointer">
                                  {prod.name}
                               </p>
                               <div className="mt-1 flex flex-col items-center gap-0.5">
                                 <span className="text-[9px] text-gray-400 uppercase font-bold">URL:</span>
                                 <span className="text-[8px] text-gray-400 break-all text-center">{prod.url}</span>
                               </div>
                            </div>
                         </td>
                         <td className="px-4 py-4 border-r border-gray-50 max-w-[150px]">
                            <p className="text-[10px] text-gray-500 break-all leading-relaxed">{prod.url}</p>
                         </td>
                         <td className="px-4 py-4 text-center border-r border-gray-50 font-bold">{prod.kom}</td>
                         <td className="px-2 py-4 text-center border-r border-gray-50 font-mono text-[11px]">{prod.stok.toLocaleString('id-ID')}</td>
                         <td className="px-2 py-4 text-center border-r border-gray-50 font-bold text-gray-900">{prod.keranjang}</td>
                         <td className="px-2 py-4 text-center border-r border-gray-50 font-bold text-gray-900">{prod.klik}</td>
                         <td className="px-2 py-4 text-center border-r border-gray-50 font-bold text-gray-900">{prod.terjual}</td>
                         <td className="px-4 py-4 text-center border-r border-gray-50 font-black text-gray-800">
                            {prod.harga.toLocaleString('id-ID')}
                         </td>
                         <td className="px-4 py-4 text-center border-r border-gray-50 font-bold">
                            <div className="flex items-center justify-center gap-0.5">
                               {prod.bintang} <Star size={10} className="fill-yellow-400 text-yellow-400" />
                            </div>
                         </td>
                         <td className="px-4 py-4 text-center">
                            <button onClick={() => toggleSelect(prod.id)}>
                               {selectedIds.includes(prod.id) ? (
                                   <CheckSquare size={18} className="text-gk-primary" />
                               ) : (
                                   <Square size={18} className="text-gray-300" />
                               )}
                            </button>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </>
      )}
    </div>
  );
};
