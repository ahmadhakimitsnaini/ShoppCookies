import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MonitorPlay, Store, User, X, Loader } from 'lucide-react';
import { globalSearch } from '../../lib/api';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

const ICONS = {
  studio:  <MonitorPlay size={16} className="text-emerald-500 flex-shrink-0" />,
  account: <Store size={16} className="text-blue-500 flex-shrink-0" />,
  member:  <User size={16} className="text-purple-500 flex-shrink-0" />,
};

const TYPE_LABELS = {
  studio:  'Studio',
  account: 'Toko',
  member:  'Member',
};

/**
 * CommandPalette — Global Search Modal
 * Dipicu oleh Ctrl+K dari MainLayout.
 * Props: isOpen, onClose
 */
export const CommandPalette = ({ isOpen, onClose }) => {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState({ studios: [], accounts: [], members: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const debouncedQuery = useDebounce(query, 300);

  // Semua hasil dalam satu array flat untuk navigasi keyboard
  const flatResults = [
    ...results.studios,
    ...results.accounts,
    ...results.members,
  ];

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults({ studios: [], accounts: [], members: [] });
      setActiveIdx(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults({ studios: [], accounts: [], members: [] });
      return;
    }
    setIsLoading(true);
    globalSearch(debouncedQuery)
      .then((res) => { setResults(res); setActiveIdx(0); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [debouncedQuery]);

  const handleSelect = useCallback((item) => {
    navigate(item.url);
    onClose();
  }, [navigate, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, flatResults.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && flatResults[activeIdx]) { handleSelect(flatResults[activeIdx]); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, flatResults, activeIdx, handleSelect, onClose]);

  if (!isOpen) return null;

  const hasResults = flatResults.length > 0;
  const showEmpty  = debouncedQuery.length >= 2 && !isLoading && !hasResults;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center px-4 py-3 border-b border-gray-100">
          <Search size={18} className="text-gray-400 flex-shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Cari studio, toko, atau member..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent"
          />
          {isLoading && <Loader size={16} className="text-gray-400 animate-spin mr-2" />}
          <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!query && (
            <div className="py-10 text-center text-gray-400 text-sm">
              Ketik minimal 2 karakter untuk mencari...
            </div>
          )}

          {showEmpty && (
            <div className="py-10 text-center text-gray-400 text-sm">
              Tidak ada hasil untuk <span className="font-semibold text-gray-600">"{debouncedQuery}"</span>
            </div>
          )}

          {hasResults && (
            <div className="py-2">
              {[
                { key: 'studios',  list: results.studios  },
                { key: 'accounts', list: results.accounts },
                { key: 'members',  list: results.members  },
              ].map(({ key, list }) => {
                if (!list || list.length === 0) return null;
                return (
                  <div key={key}>
                    <div className="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/80">
                      {key === 'studios' ? 'Studio' : key === 'accounts' ? 'Toko / Akun' : 'Member'}
                    </div>
                    {list.map((item) => {
                      const globalIdx = flatResults.indexOf(item);
                      const isActive  = globalIdx === activeIdx;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => setActiveIdx(globalIdx)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            isActive ? 'bg-emerald-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <span className={`p-1.5 rounded-md ${isActive ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                            {ICONS[item.type]}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isActive ? 'text-emerald-800' : 'text-gray-800'}`}>
                              {item.title}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{item.sub}</p>
                          </div>
                          <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
                            {TYPE_LABELS[item.type]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-gray-100 px-4 py-2 flex items-center gap-4 text-[10px] text-gray-400">
          <span><kbd className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-500">↑↓</kbd> navigasi</span>
          <span><kbd className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-500">Enter</kbd> buka</span>
          <span><kbd className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-500">Esc</kbd> tutup</span>
        </div>
      </div>
    </div>
  );
};
