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

  toggleShare: async (id, is_share_on) => {
    try {
      await fetchApi(`/api/studios/${id}/share`, {
        method: 'PATCH',
        body: JSON.stringify({ is_share_on })
      });
      // Update local state directly to be snappy
      set((state) => ({
        studios: state.studios.map(studio => 
          studio.id === id ? { ...studio, is_share_on } : studio
        )
      }));
    } catch (error) {
      set({ error: error.message });
      // Reload from server if optimistic update fails
      const currentStudios = useStudioStore.getState().studios;
      set({ studios: [...currentStudios] }); 
    }
  },
}));
