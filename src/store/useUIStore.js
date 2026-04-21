import { create } from 'zustand';

// Store untuk semua state UI Global (Sidebar, Theme, Modals)
export const useUIStore = create((set) => ({
  isSidebarOpen: window.innerWidth >= 1024,
  isNotifOpen: false,
  isNavigating: false,
  
  // Actions
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  setNotifOpen: (isOpen) => set({ isNotifOpen: isOpen }),
  setNavigating: (isNav) => set({ isNavigating: isNav }),
  
  // Method untuk menghandle Resize logic secara global (terpusat)
  updateViewport: () => {
    if (window.innerWidth < 1024) {
      set({ isSidebarOpen: false });
    } else {
      set({ isSidebarOpen: true });
    }
  }
}));
