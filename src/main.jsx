import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { MainLayout } from './components/layout/MainLayout'
import { HomeDashboard } from './pages/HomeDashboard'
import { ServerPerformance } from './pages/ServerPerformance'
import { ListStudio } from './pages/ListStudio'
import { DetailStudio } from './pages/DetailStudio'
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
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Main Application Routes inside Layout */}
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<MainLayout><HomeDashboard /></MainLayout>} />
        <Route path="/input-member" element={<MainLayout><InputMember /></MainLayout>} />
        <Route path="/input-toko" element={<MainLayout><InputToko /></MainLayout>} />
        <Route path="/input-cookies" element={<MainLayout><InputCookies /></MainLayout>} />
        <Route path="/input-cookies-admin" element={<MainLayout><InputCookiesAdmin /></MainLayout>} />
        <Route path="/pindah-hp" element={<MainLayout><PindahHp /></MainLayout>} />
        <Route path="/list-akun" element={<MainLayout><ListAkunTreatment /></MainLayout>} />
        <Route path="/treatment-auto" element={<MainLayout><TreatmentAuto /></MainLayout>} />
        <Route path="/performa-server" element={<MainLayout><ServerPerformance /></MainLayout>} />
        <Route path="/list-studio" element={<MainLayout><ListStudio /></MainLayout>} />
        <Route path="/list-studio/:id" element={<MainLayout><DetailStudio /></MainLayout>} />
        <Route path="/cookies-expired" element={<MainLayout><ExpiredCookies /></MainLayout>} />
        <Route path="/treatment-manual" element={<MainLayout><TreatmentManual /></MainLayout>} />
        <Route path="/set-studio" element={<MainLayout><SetStudio /></MainLayout>} />
        <Route path="/cek-omzet" element={<MainLayout><CekOmzet /></MainLayout>} />
        <Route path="/laporan-treatment" element={<MainLayout><PlaceholderPage title="Laporan Treatment" /></MainLayout>} />
        <Route path="/input-bank-produk" element={<MainLayout><InputDataBank /></MainLayout>} />
        
        {/* Fallback */}
        <Route path="*" element={<MainLayout><NotFound /></MainLayout>} />
      </Routes>
    </BrowserRouter>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>,
)
