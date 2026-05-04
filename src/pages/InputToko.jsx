import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ToastContainer } from '../components/ui/Toast';
import { getStudios, fetchApi } from '../lib/api';
import { useToast } from '../lib/useToast';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

export const InputToko = () => {
  const [studios, setStudios]     = useState([{ value: '', label: 'Memuat studio...' }]);
  const [form, setForm]           = useState({ studio_id: '', shopee_shop_name: '', shopee_username: '', address: '' });
  const [saveState, setSaveState] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const [errorMsg, setErrorMsg]   = useState('');
  const { toasts, addToast, removeToast } = useToast();
  const isFirstRender             = useRef(true);

  // Debounce form untuk auto-save
  const debouncedForm = useDebounce(form, 1500);

  // Load daftar studio saat mount
  useEffect(() => {
    getStudios()
      .then((res) => {
        const opts = [
          { value: '', label: 'Pilih Studio...' },
          ...(res?.data ?? []).map((s) => ({ value: s.id, label: `${s.name}` })),
        ];
        setStudios(opts);
      })
      .catch(() => setStudios([{ value: '', label: 'Gagal memuat studio' }]));
  }, []);

  // Auto-save dengan debounce (skip saat pertama render)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (!debouncedForm.studio_id || !debouncedForm.shopee_username || !debouncedForm.shopee_shop_name) return;
    handleSaveToServer(debouncedForm);
  }, [debouncedForm]);

  const handleSaveToServer = async (data) => {
    setSaveState('saving');
    setErrorMsg('');
    try {
      await fetchApi('/api/accounts', {
        method: 'POST',
        body: JSON.stringify({
          member_id:        null, // Akan diisi saat member dipilih; stub untuk auto-save
          studio_id:        data.studio_id,
          shopee_username:  data.shopee_username.trim().toLowerCase(),
          shopee_shop_name: data.shopee_shop_name.trim(),
        }),
      });
      setSaveState('saved');
    } catch (err) {
      setSaveState('error');
      setErrorMsg(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.studio_id || !form.shopee_username || !form.shopee_shop_name) {
      addToast('Harap isi semua field yang wajib.', 'error');
      return;
    }
    setSaveState('saving');
    try {
      await fetchApi('/api/accounts', {
        method: 'POST',
        body: JSON.stringify({
          member_id:        null,
          studio_id:        form.studio_id,
          shopee_username:  form.shopee_username.trim().toLowerCase(),
          shopee_shop_name: form.shopee_shop_name.trim(),
        }),
      });
      setSaveState('saved');
      addToast('Toko berhasil didaftarkan!');
      setForm({ studio_id: '', shopee_shop_name: '', shopee_username: '', address: '' });
      isFirstRender.current = true;
    } catch (err) {
      setSaveState('error');
      setErrorMsg(err.message);
      addToast(err.message, 'error');
    }
  };

  const handleChange = (field) => (e) => {
    setSaveState('idle');
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const SaveIndicator = () => {
    if (saveState === 'saving') return (
      <span className="text-xs font-medium flex items-center text-amber-500">
        <Loader size={12} className="mr-1.5 animate-spin" /> Menyimpan draft...
      </span>
    );
    if (saveState === 'saved') return (
      <span className="text-xs font-medium flex items-center text-emerald-500">
        <CheckCircle size={12} className="mr-1.5" /> Tersimpan otomatis
      </span>
    );
    if (saveState === 'error') return (
      <span className="text-xs font-medium flex items-center text-red-500">
        <AlertCircle size={12} className="mr-1.5" /> {errorMsg}
      </span>
    );
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-2xl mx-auto mt-4">
      {/* Toast via ToastContainer */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="mb-6">
        <h1 className="text-h2 font-bold text-gk-text-main">Input Toko Baru</h1>
        <p className="text-gk-text-muted mt-1">Daftarkan URL dan ID Shopee untuk studio yang sudah terdaftar</p>
      </div>

      <Card>
        <CardHeader className="bg-gray-50/50 flex flex-row items-center justify-between">
          <CardTitle>Form Detail Toko</CardTitle>
          <SaveIndicator />
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 pt-6">
            <Select
              label="Relasi Studio"
              options={studios}
              value={form.studio_id}
              onChange={handleChange('studio_id')}
              required
            />

            <Input
              label="Nama Toko Shopee"
              placeholder="Contoh: Official Gudang Kosmetik"
              helperText="Nama toko untuk profil publik di sistem"
              value={form.shopee_shop_name}
              onChange={handleChange('shopee_shop_name')}
              required
            />

            <Input
              label="Username Toko"
              placeholder="Contoh: officialkosmetik_jkt"
              helperText="Username url asli toko (contoh: shopee.co.id/username_toko)"
              value={form.shopee_username}
              onChange={handleChange('shopee_username')}
              required
            />

            <Input
              label="Alamat Pengiriman (Opsional)"
              placeholder="Jalan, Kota..."
              value={form.address}
              onChange={handleChange('address')}
            />

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={saveState === 'saving'}>
                {saveState === 'saving' ? 'Menyimpan...' : 'Simpan Toko'}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
};
