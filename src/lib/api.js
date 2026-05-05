// src/lib/api.js

/**
 * Helper function standard API call menggantikan axios.
 * Secara otomatis menempelkan Authorization Bearer token bila ada.
 */
export async function fetchApi(endpoint, options = {}) {
  const token = localStorage.getItem('gk_token');
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorMessage = 'Terjadi kesalahan pada server';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch (e) {}
    throw new Error(errorMessage);
  }

  if (response.status === 204) return null;

  return response.json();
}

// ============================================================
// Analytics API Helpers
// ============================================================

/** Ringkasan omzet hari ini, komisi, dan jumlah studio LIVE */
export const getAnalyticsSummary = () =>
  fetchApi('/api/analytics/summary');

/** Data omzet per jam hari ini untuk grafik HomeDashboard */
export const getOmzetChart = () =>
  fetchApi('/api/analytics/omzet-chart');

/** Performa semua studio aktif (status LIVE, omzet, komisi) */
export const getStudiosAnalytics = () =>
  fetchApi('/api/analytics/studios');

/** Riwayat omzet harian (N hari) untuk grafik stacked OmzetAnalitik */
export const getOmzetHistory = (days = 7) =>
  fetchApi(`/api/analytics/omzet-history?days=${days}`);

/** Data performa server real-time: CPU, RAM, active bots, DB status */
export const getSystemPerformance = () =>
  fetchApi('/api/system/performance');

/** Circular buffer riwayat CPU & RAM (5 menit terakhir) */
export const getCpuHistory = () =>
  fetchApi('/api/system/cpu-history');

/** Seluruh status sesi/cookies akun (untuk halaman ExpiredCookies) */
export const getCookiesStatus = () =>
  fetchApi('/api/cookies/status');

/** Daftar akun yang sedang LIVE (untuk halaman TreatmentManual) */
export const getActiveLive = () =>
  fetchApi('/api/treatment/active-live');

/** Stop sesi live secara manual */
export const stopLiveSession = (sessionId) =>
  fetchApi(`/api/treatment/stop/${sessionId}`, { method: 'POST' });

/** Dapatkan riwayat/log bot task (Laporan Treatment) */
export const getTreatmentLogs = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return fetchApi(`/api/treatment/logs${q ? `?${q}` : ''}`);
};

/** Simpan kumpulan URL ke Bank Produk */
export const injectBankProduk = (data) =>
  fetchApi('/api/bank/batch', { method: 'POST', body: JSON.stringify(data) });
export const getBankStats = () =>
  fetchApi('/api/bank/stats');

/** Global search semua entitas */
export const globalSearch = (q) =>
  fetchApi(`/api/search?q=${encodeURIComponent(q)}`);

/** Daftar semua studio */
export const getStudios = () =>
  fetchApi('/api/studios');

// ============================================================
// Studios API
// ============================================================
export const updateStudioTelegram = (id, data) => fetchApi(`/api/studios/${id}/telegram`, { method: 'PATCH', body: JSON.stringify(data) });
export const testStudioTelegram = (id) => fetchApi(`/api/studios/${id}/test-telegram`, { method: 'POST' });
export const updateStudioBankCategory = (id, category) => fetchApi(`/api/studios/${id}/bank-category`, { method: 'PATCH', body: JSON.stringify({ bank_category: category }) });
export const deleteStudio = (id, pin) => fetchApi(`/api/studios/${id}`, { method: 'DELETE', body: JSON.stringify({ pin }) });

// ============================================================
// Devices (Manajemen Inventaris HP)
// ============================================================

/** Daftar semua perangkat HP, opsional filter per studio */
export const getDevices = (studio_id) =>
  fetchApi(studio_id ? `/api/devices?studio_id=${studio_id}` : '/api/devices');

/** Daftarkan HP baru ke studio */
export const registerDevice = (payload) =>
  fetchApi('/api/devices', { method: 'POST', body: JSON.stringify(payload) });

/** Transfer akun ke HP tujuan */
export const transferDevice = (account_id, target_device_id) =>
  fetchApi('/api/devices/transfer', {
    method: 'POST',
    body: JSON.stringify({ account_id, target_device_id })
  });

/** Lepaskan akun dari HP (unassign) */
export const unassignDevice = (device_id) =>
  fetchApi(`/api/devices/${device_id}/unassign`, { method: 'DELETE' });

/** Ubah status HP */
export const updateDeviceStatus = (device_id, status) =>
  fetchApi(`/api/devices/${device_id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });

/**
 * Format angka ke Rupiah singkat
 * Contoh: 1500000 → "Rp 1,5jt"
 */
export function formatRupiah(number) {
  if (!number || number === 0) return 'Rp 0';
  if (number >= 1_000_000_000) return `Rp ${(number / 1_000_000_000).toFixed(1)}M`;
  if (number >= 1_000_000)     return `Rp ${(number / 1_000_000).toFixed(1)}jt`;
  if (number >= 1_000)         return `Rp ${(number / 1_000).toFixed(0)}rb`;
  return `Rp ${number.toLocaleString('id-ID')}`;
}
