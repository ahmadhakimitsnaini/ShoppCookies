import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Menu, X, LayoutDashboard, MonitorPlay, Cookie, Settings, 
  Smartphone, ListTodo, Activity, AlertCircle, RefreshCw, 
  User, LogOut, ChevronDown, Bell, Search
} from 'lucide-react';
import { Badge } from '../ui/Badge';

export const MainLayout = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  
  const location = useLocation();

  // Handle route change for progress bar
  useEffect(() => {
    setIsNavigating(true);
    const timer = setTimeout(() => setIsNavigating(false), 500);
    
    // Automatically close sidebar on mobile if navigating
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
    return () => clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    // Handle Ctrl+K shortcut
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // simulate focus search
        alert('Global Search mock triggered. (Ctrl+K)');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

  const menuItems = [
    { section: 'MENU MEMBER' },
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/home' },
    { name: 'Input Member', icon: <User size={20} />, path: '/input-member' },
    { name: 'Input Toko', icon: <Settings size={20} />, path: '/input-toko' },
    { name: 'Input Cookies', icon: <Cookie size={20} />, path: '/input-cookies' },
    { name: 'Input Cookies Admin', icon: <Cookie size={20} />, path: '/input-cookies-admin' },
    { name: 'Pindah HP', icon: <Smartphone size={20} />, path: '/pindah-hp' },
    { name: 'List Akun Treatment', icon: <ListTodo size={20} />, path: '/list-akun', badge: 'NEW' },
    { name: 'Treatment Auto', icon: <RefreshCw size={20} />, path: '/treatment-auto' },
    { name: 'Cek Performa Server', icon: <Activity size={20} />, path: '/performa-server', badge: 'NEW' },
    { name: 'List Studio', icon: <MonitorPlay size={20} />, path: '/list-studio' },
    { name: 'Cookies Expired', icon: <AlertCircle size={20} />, path: '/cookies-expired' },
    { name: 'Treatment Manual', icon: <Settings size={20} />, path: '/treatment-manual' },
    { name: 'Set Studio', icon: <MonitorPlay size={20} />, path: '/set-studio' },
    { name: 'Cek Omzet', icon: <Activity size={20} />, path: '/cek-omzet' },
    { section: 'DATA TREATMENT' },
    { name: 'Laporan Treatment', icon: <ListTodo size={20} />, path: '/laporan-treatment' },
    { name: 'Input Bank Produk', icon: <Settings size={20} />, path: '/input-bank-produk' },
  ];

  return (
    <div className="min-h-screen bg-gk-background flex font-sans transition-colors duration-300">
      
      {/* Top routing progress bar */}
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 h-1 z-50 overflow-hidden">
          <div className="h-full bg-emerald-500 animate-pulse w-full"></div>
          <div className="absolute top-0 left-0 h-full bg-emerald-300 w-1/3 animate-[slideRight_1s_ease-in-out_infinite]"></div>
        </div>
      )}

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden backdrop-blur-sm transition-opacity" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 bg-gray-900 border-r border-gray-800 text-white transform transition-all duration-300 ease-in-out 
          ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'} 
          lg:translate-x-0 lg:static ${isSidebarOpen ? 'lg:w-64 flex-shrink-0' : 'lg:w-20'} flex flex-col group`}
      >
        <div className="h-[60px] flex items-center justify-between border-b border-gray-800 px-4">
           {isSidebarOpen ? (
             <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent truncate">
               ShopCookies
             </h1>
           ) : (
             <span className="text-2xl font-bold text-emerald-400 w-full text-center">GK</span>
           )}
           <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
             <X size={20} />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 hide-scrollbar select-none">
          <nav className="space-y-1 px-3">
            {menuItems.map((item, index) => {
              if (item.section) {
                return (
                  <div key={index} className={`pt-4 pb-2 px-3 text-[10px] font-bold text-gray-500 tracking-wider uppercase ${!isSidebarOpen && 'hidden'}`}>
                    {item.section}
                  </div>
                );
              }

              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={index}
                  to={item.path}
                  className={`flex items-center px-3 py-2.5 rounded-lg transition-colors group relative ${
                    isActive ? 'bg-emerald-600/20 text-emerald-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                  title={!isSidebarOpen ? item.name : ''}
                >
                  <span className={`${isActive ? 'text-emerald-400' : 'text-gray-400 group-hover:text-white'} flex-shrink-0`}>
                    {item.icon}
                  </span>
                  
                  <span className={`ml-3 flex-1 text-sm font-medium transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}>
                    {item.name}
                  </span>
                  
                  {isSidebarOpen && item.badge && (
                     <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                       {item.badge}
                     </span>
                  )}
                  
                  {/* Tooltip on collapse */}
                  {!isSidebarOpen && (
                    <div className="absolute left-full ml-4 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible whitespace-nowrap z-50">
                      {item.name}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Topbar */}
        <header className="h-[60px] bg-gk-surface border-b border-gk-border flex items-center justify-between px-4 z-30 transition-colors">
          <div className="flex items-center">
            <button onClick={toggleSidebar} className="p-2 mr-2 rounded-md text-gray-500 hover:bg-gray-100 focus:outline-none transition-standard">
              <Menu size={20} />
            </button>
            
            {/* Global Search Mock */}
            <div className="hidden lg:flex items-center bg-gray-100 px-3 py-1.5 rounded-md ml-4 group">
               <Search size={16} className="text-gray-400 group-hover:text-gray-500" />
               <span className="ml-2 text-sm text-gray-400 mr-8">Cari apapun...</span>
               <kbd className="text-[10px] font-mono bg-white text-gray-500 px-1.5 rounded border border-gray-200 shadow-sm">Ctrl+K</kbd>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Notification Bell */}
            <div className="relative">
              <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors relative">
                <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
                <Bell size={20} />
              </button>
              
              {/* Notif Dropdown */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="p-4 border-b border-gray-100 font-bold text-gk-text-main flex justify-between items-center bg-gray-50/50">
                    Notifikasi Terbaru
                    <span className="text-xs text-blue-600 font-medium cursor-pointer hover:underline">Tandai dibaca</span>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                     <div className="p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer flex gap-3">
                       <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                         <AlertCircle size={16} />
                       </div>
                       <div>
                         <p className="text-sm font-semibold text-gk-text-main">Cookies Expired!</p>
                         <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">Sesi Shopee pada S_002 (Gudang Promo) mendadak terputus.</p>
                         <p className="text-[10px] text-gray-400 mt-2">Baru saja</p>
                       </div>
                     </div>
                     <div className="p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer flex gap-3">
                       <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                         <RefreshCw size={16} />
                       </div>
                       <div>
                         <p className="text-sm font-semibold text-gk-text-main">Treatment Auto Selesai</p>
                         <p className="text-xs text-gray-500 mt-0.5">Berhasil inject 40 produk baru ke Fashion Mix.</p>
                         <p className="text-[10px] text-gray-400 mt-2">45 mnt yang lalu</p>
                       </div>
                     </div>
                  </div>
                  <div className="p-3 text-center text-sm text-gray-500 border-t border-gray-100 bg-gray-50/50 cursor-pointer hover:text-gray-700">
                    Lihat semua notifikasi →
                  </div>
                </div>
              )}
            </div>
            
            <div className="h-6 w-px bg-gray-200 mx-2"></div>
            
            <div className="flex items-center cursor-pointer group">
              <div className="w-8 h-8 rounded border border-gray-200 bg-gray-100 text-emerald-600 flex items-center justify-center font-bold text-sm shadow-sm transition-colors">
                OG
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 lg:p-8 pb-24">
          <div className="max-w-[1600px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      <style>{`
        @keyframes slideRight {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
};
