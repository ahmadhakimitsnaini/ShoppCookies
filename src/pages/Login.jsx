import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export const Login = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    // Mock login delay
    setTimeout(() => {
      setLoading(false);
      navigate('/');
    }, 1500);
  };

  return (
    <div className="min-h-screen flex w-full bg-white">
      {/* Left side - Form (60%) */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-24 xl:px-32 relative z-10 w-full lg:w-[60%]">
        <div className="w-full max-w-md mx-auto">
          <div className="mb-10 text-center lg:text-left">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gk-primary to-gk-success bg-clip-text text-transparent mb-2">
              GudangKreatif Studio
            </h1>
            <p className="text-gk-text-muted text-body">Platform Manajemen Studio Live Streaming</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 bg-white p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Masuk ke Akun</h2>
              <p className="text-sm text-gray-500 mb-6">Silakan masukkan kredensial Anda untuk melanjutkan</p>
            </div>
            
            <Input 
              label="Username / Email" 
              placeholder="Masukkan username atau email" 
              autoComplete="username"
              required 
            />
            
            <div>
              <Input 
                type="password" 
                label="Password" 
                placeholder="••••••••" 
                autoComplete="current-password"
                required 
              />
              <div className="flex justify-end mt-1">
                <a href="#" className="text-sm font-medium text-gk-primary hover:text-gk-primaryHover transition-standard">
                  Lupa Password?
                </a>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full py-2.5 shadow-md shadow-gk-primary/20" 
              isLoading={loading}
              size="lg"
            >
              Masuk
            </Button>
          </form>
          
          <div className="mt-8 text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} GudangKreatif. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right side - Image/Illustration (40%) */}
      <div className="hidden lg:flex lg:w-[40%] bg-gradient-to-br from-gk-primary to-[#0f7653] flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-white opacity-5 mix-blend-overlay"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-black opacity-10 mix-blend-overlay"></div>
        
        <div className="relative z-10">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-white text-sm font-medium backdrop-blur-sm border border-white/10 mb-6">
            <span className="w-2 h-2 rounded-full bg-gk-secondary mr-2 animate-pulse"></span>
            Live Monitoring System
          </div>
        </div>

        <div className="relative z-10 text-white">
          <h2 className="text-4xl font-bold mb-4 leading-tight">
            Kelola Ratusan Studio <br/>Dalam Satu Dashboard
          </h2>
          <p className="text-lg text-white/80 max-w-md">
            Pusat kontrol terpadu untuk monitoring omzet, manajemen treatment cookies Shopee, dan performa live streaming Anda secara real-time.
          </p>
        </div>
        
        {/* Mockup UI representation */}
        <div className="relative z-10 mt-8 bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/20 shadow-2xl skew-y-2 transform origin-bottom-right group hover:skew-y-0 transition-all duration-500">
           <div className="flex items-center space-x-2 mb-3">
             <div className="w-3 h-3 rounded-full bg-red-400"></div>
             <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
             <div className="w-3 h-3 rounded-full bg-green-400"></div>
           </div>
           <div className="space-y-3">
             <div className="h-4 bg-white/20 rounded w-3/4"></div>
             <div className="h-4 bg-white/20 rounded w-1/2"></div>
             <div className="h-4 bg-white/20 rounded w-5/6"></div>
           </div>
        </div>
      </div>
    </div>
  );
};
