import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { MainLayout } from './components/layout/MainLayout'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { useAuthStore } from './store/useAuthStore'
import { HomeDashboard } from './pages/HomeDashboard'
import { ServerPerformance } from './pages/ServerPerformance'
import { ListStudio } from './pages/ListStudio'
import { DetailStudio } from './pages/DetailStudio'
import { DetailTokoProduk } from './pages/DetailTokoProduk'
import { InputMember } from './pages/InputMember'
import { InputToko } from './pages/InputToko'
import { InputCookies } from './pages/InputCookies'
import { InputCookiesAdmin } from './pages/InputCookiesAdmin'
import { PindahHp } from './pages/PindahHp'
import { ExpiredCookies } from './pages/ExpiredCookies'
import { ListAkunTreatment } from './pages/ListAkunTreatment'
import { TreatmentAuto } from './pages/TreatmentAuto'
import { TreatmentManual } from './pages/TreatmentManual'
import { SetStudio } from './pages/SetStudio'
import { InputDataBank } from './pages/InputDataBank'
import { CekOmzet } from './pages/CekOmzet'
import { Login } from './pages/Login'
import { NotFound } from './pages/NotFound'

// Simple mock for other pages
const PlaceholderPage = ({ title }) => (
  <div className="bg-white p-8 rounded-xl shadow-sm border border-gk-border flex items-center justify-center min-h-[400px]">
    <div className="text-center">
      <h2 className="text-2xl font-bold text-gray-400 mb-2">{title}</h2>
      <p className="text-gray-500">Halaman ini masih dalam tahap pengembangan.</p>
    </div>
  </div>
);

// Protected route wrapper stub
const AppRouter = () => {
  // Logic untuk memeriksa apakah user sudah login agar tidak bisa buka halaman login lagi
  const ProtectedLoginRoute = ({ children }) => {
    const { isAuthenticated } = useAuthStore();
    if (isAuthenticated) return <Navigate to="/" replace />;
    return children;
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          <ProtectedLoginRoute>
            <Login />
          </ProtectedLoginRoute>
        } />
        
        {/* Main Application Routes inside Layout that are Protected */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomeDashboard />} />
          <Route path="/input-member" element={<InputMember />} />
          <Route path="/input-toko" element={<InputToko />} />
          <Route path="/input-cookies" element={<InputCookies />} />
          <Route path="/input-cookies-admin" element={<InputCookiesAdmin />} />
          <Route path="/pindah-hp" element={<PindahHp />} />
          <Route path="/list-akun" element={<ListAkunTreatment />} />
          <Route path="/treatment-auto" element={<TreatmentAuto />} />
          <Route path="/performa-server" element={<ServerPerformance />} />
          <Route path="/list-studio" element={<ListStudio />} />
          <Route path="/list-studio/:id" element={<DetailStudio />} />
          <Route path="/list-studio/:id/produk" element={<DetailTokoProduk />} />
          <Route path="/cookies-expired" element={<ExpiredCookies />} />
          <Route path="/treatment-manual" element={<TreatmentManual />} />
          <Route path="/set-studio" element={<SetStudio />} />
          <Route path="/cek-omzet" element={<CekOmzet />} />
          <Route path="/laporan-treatment" element={<PlaceholderPage title="Laporan Treatment" />} />
          <Route path="/input-bank-produk" element={<InputDataBank />} />
          
          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>,
)
