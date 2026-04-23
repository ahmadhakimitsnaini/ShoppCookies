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
