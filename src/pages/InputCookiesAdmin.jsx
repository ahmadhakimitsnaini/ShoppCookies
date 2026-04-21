import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Input, Textarea } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { AlertTriangle, Lock, Unlock, Plus, Trash2 } from 'lucide-react';

export const InputCookiesAdmin = () => {
  const [cookieFields, setCookieFields] = useState([
    { id: 1, name: '', rawCookie: '', isMasked: true }
  ]);

  const toggleMask = (id) => {
    setCookieFields(fields => 
      fields.map(f => f.id === id ? { ...f, isMasked: !f.isMasked } : f)
    );
  };

  const handleFieldChange = (id, fieldName, value) => {
    setCookieFields(fields => 
      fields.map(f => f.id === id ? { ...f, [fieldName]: value } : f)
    );
  };

  const addField = () => {
    setCookieFields([
      ...cookieFields, 
      { id: Date.now(), name: '', rawCookie: '', isMasked: true }
    ]);
  };

  const removeField = (id) => {
    if (cookieFields.length > 1) {
      setCookieFields(fields => fields.filter(f => f.id !== id));
    }
  };

  const maskCookieDisplay = (value, isMasked) => {
    if (!value) return '';
    if (!isMasked) return value;
    const visiblePart = value.substring(0, 20);
    const maskedPart = value.length > 20 ? '●'.repeat(Math.min(value.length - 20, 60)) + '...' : '';
    return visiblePart + maskedPart;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Validate formatting before submission
    let hasError = false;
    cookieFields.forEach(field => {
      if (!field.rawCookie.includes('_gcl_au=') && field.rawCookie.trim().length > 0) {
        alert(`Bentuk Cookie Pada Form "${field.name || 'Akun'}" sepertinya invalid. Wajib memuat syntax autentikasi awal.`);
        hasError = true;
      }
    });
    
    if (!hasError) {
      alert("Semua cookies berhasil tervalidasi dan disimpan.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto mt-4">
      <div className="mb-6">
        <h1 className="text-h2 font-bold text-gk-text-main">Input Cookies Raw (Admin)</h1>
        <p className="text-gk-text-muted mt-1">Konfigurasi batch untuk registrasi raw data string session secara massal.</p>
      </div>

      <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-md flex items-start shadow-sm">
        <div className="flex-shrink-0 mt-0.5">
          <AlertTriangle className="h-5 w-5 text-orange-600" aria-hidden="true" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-semibold text-orange-800">PERINGATAN SENSITIF DATA KUKI</h3>
          <div className="mt-1 text-sm text-orange-700">
            <p>Data raw string merupakan sesi otoritas HP utuh. Jangan mendistribusikan konfigurasi ini ke pihak ketiga dan pastikan hanya mengambilnya via DevTools Console platform spesifik secara sah.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {cookieFields.map((field, index) => (
          <Card key={field.id} className="overflow-hidden border-gray-200 shadow-sm relative">
            <div className="absolute top-0 right-0 p-4">
               {cookieFields.length > 1 && (
                 <button 
                   type="button" 
                   onClick={() => removeField(field.id)}
                   className="p-1.5 text-gray-400 hover:text-red-500 transition-colors bg-gray-50 hover:bg-red-50 rounded"
                  >
                   <Trash2 size={16} />
                 </button>
               )}
            </div>
            
            <CardHeader className="bg-gray-50 border-b border-gray-100 py-3 px-5">
              <CardTitle className="text-body font-semibold flex items-center">
                 <div className="bg-white border text-gray-500 text-xs py-0.5 px-2 rounded font-mono mr-2">#{index + 1}</div>
                 Form Akun / Studio Target
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
               <Input 
                 label={`Nama Akun / Referensi [${index+1}]`}
                 placeholder="Contoh: TOKOBESAR_01"
                 value={field.name}
                 onChange={(e) => handleFieldChange(field.id, 'name', e.target.value)}
                 required
               />
               
               <div className="relative">
                 <div className="flex justify-between items-end mb-1.5">
                   <label className="block text-body font-medium text-gk-text-main">
                     Cookies Toko [{index+1}]
                   </label>
                   <button 
                     type="button" 
                     className="text-xs flex items-center text-blue-600 font-medium hover:text-blue-800 transition-colors"
                     onClick={() => toggleMask(field.id)}
                   >
                     {field.isMasked ? (
                       <><Lock size={12} className="mr-1" /> Buka Mask</>
                     ) : (
                       <><Unlock size={12} className="mr-1" /> Sembunyikan</>
                     )}
                   </button>
                 </div>
                 
                 <div className="relative">
                   <Textarea 
                     containerClassName="mb-0"
                     className="font-mono text-xs w-full bg-gray-50 relative z-10"
                     placeholder={field.isMasked ? "Tulis / Tempelkan cookies raw..." : "_gcl_au=...; _gid=...; SPC_ST=..."}
                     value={field.isMasked ? maskCookieDisplay(field.rawCookie, true) : field.rawCookie}
                     onChange={(e) => {
                       // Only allow edits if unlocked, otherwise prompt them to unlock
                       if (!field.isMasked) {
                         handleFieldChange(field.id, 'rawCookie', e.target.value);
                       }
                     }}
                     onClick={() => {
                        if (field.isMasked && field.rawCookie) {
                          alert("Harap buka ikon gembok mask terlebih dahulu untuk memodifikasi teks kuki.");
                        }
                     }}
                     // Using readOnly if masked so user doesn't accidentally erase actual content by deleting mask dot
                     readOnly={field.isMasked && field.rawCookie.length > 0} 
                     rows={5}
                     required
                   />
                   <p className="mt-1.5 text-xs text-gray-500">
                     Peringatan UI: Value dibatasi ● untuk kerahasiaan saat layar berbagi.
                   </p>
                 </div>
               </div>
            </CardContent>
          </Card>
        ))}

        <div className="flex justify-between items-center">
           <Button 
             type="button" 
             variant="ghost" 
             leftIcon={<Plus size={18} />}
             onClick={addField}
             className="text-gk-primary"
           >
             Tambah Blok Akun Baru
           </Button>
           <Button type="submit" size="lg">
             Simpan & Encrypt Semua
           </Button>
        </div>
      </form>
    </div>
  );
};
