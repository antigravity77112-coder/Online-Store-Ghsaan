import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Plus } from 'lucide-react';

/**
 * Searchable multi-select for product scents.
 * Selected scents appear as removable chips.
 */
export function ScentPicker({ scents = [], value = [], onChange, disabled = false }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedIds = Array.isArray(value) ? value : [];
  const selectedScents = useMemo(
    () => selectedIds.map((id) => scents.find((s) => s.id === id)).filter(Boolean),
    [selectedIds, scents],
  );

  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scents
      .filter((s) => s.isActive !== false)
      .filter((s) => !selectedIds.includes(s.id))
      .filter((s) => !q || s.name.toLowerCase().includes(q) || (s.slug || '').toLowerCase().includes(q));
  }, [scents, selectedIds, query]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addScent = (id) => {
    if (!selectedIds.includes(id)) {
      onChange([...selectedIds, id]);
    }
    setQuery('');
    setOpen(false);
  };

  const removeScent = (id) => {
    onChange(selectedIds.filter((sid) => sid !== id));
  };

  return (
    <div ref={containerRef} className="space-y-2">
      {selectedScents.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedScents.map((scent) => (
            <span
              key={scent.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gold-50 dark:bg-gold-900/20 border border-gold-200 dark:border-gold-800 text-gold-800 dark:text-gold-200"
            >
              {scent.name}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeScent(scent.id)}
                  className="p-0.5 rounded-full hover:bg-gold-200/60 dark:hover:bg-gold-800/40"
                  aria-label={`إزالة ${scent.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {!disabled && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold-600 dark:text-gold-400 hover:text-gold-700 dark:hover:text-gold-300"
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة رائحة
          </button>

          {open && (
            <div className="absolute z-20 mt-2 w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-700">
                <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ابحث عن رائحة..."
                  className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
                  autoFocus
                />
              </div>
              <ul className="max-h-48 overflow-y-auto py-1">
                {available.length === 0 ? (
                  <li className="px-4 py-3 text-xs text-slate-400 text-center">لا توجد روائح متاحة</li>
                ) : (
                  available.map((scent) => (
                    <li key={scent.id}>
                      <button
                        type="button"
                        onClick={() => addScent(scent.id)}
                        className="w-full text-right px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
                      >
                        {scent.name}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
