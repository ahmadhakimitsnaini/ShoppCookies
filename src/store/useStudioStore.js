import { create } from 'zustand';
import { fetchApi } from '../lib/api';

export const useStudioStore = create((set) => ({
  studios: [],
  isLoading: false,
  error: null,

  fetchStudios: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetchApi('/api/studios');
      set({ 
        studios: response.data || [], 
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error.message, 
        isLoading: false 
      });
    }
  },
}));
