import { useState, useCallback } from 'react';

let toastIdCounter = 0;

/**
 * useToast — Custom hook untuk mengelola state notifikasi Toast.
 * Sesuai dengan interface ToastContainer dari src/components/ui/Toast.jsx
 *
 * @returns {{ toasts, addToast, removeToast }}
 *
 * Cara pakai:
 *   const { toasts, addToast, removeToast } = useToast();
 *   addToast('Berhasil disimpan!');
 *   addToast('Terjadi error.', 'error');
 *   // Render: <ToastContainer toasts={toasts} removeToast={removeToast} />
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}
