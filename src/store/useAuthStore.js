import { create } from 'zustand';
import { fetchApi } from '../lib/api';

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('gk_user')) || null,
  token: localStorage.getItem('gk_token') || null,
  isAuthenticated: !!localStorage.getItem('gk_token'),
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await fetchApi('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      // Simpan token dan info user di LocalStorage agar tahan reload
      localStorage.setItem('gk_token', data.token);
      localStorage.setItem('gk_user', JSON.stringify(data.user));

      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
      });

      return true; // Sukses
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error.message 
      });
      return false; // Gagal
    }
  },

  logout: () => {
    localStorage.removeItem('gk_token');
    localStorage.removeItem('gk_user');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null
    });
  },

  clearError: () => set({ error: null })
}));
