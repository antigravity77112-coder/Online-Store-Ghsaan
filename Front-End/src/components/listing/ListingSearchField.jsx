import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Clock, Trash2 } from 'lucide-react';
import {
  getRecentSearches,
  pushRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} from '../../utils/recentSearches';

export default function ListingSearchField({
  value,
  onChange,
  onClear,
  onSubmit,
  placeholder = 'ابحث...',
  id,
  className = '',
  inputClassName = '',
  showRecent = true,
}) {
  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useState(() => getRecentSearches());
  const [panelBox, setPanelBox] = useState(null);
  const wrapRef = useRef(null);
  const panelRef = useRef(null);

  const showPanel = showRecent && focused && !String(value || '').trim() && recent.length > 0;

  const updatePanelBox = useCallback(() => {
    const el = wrapRef.current;
    if (!el) {
      setPanelBox(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setPanelBox({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useLayoutEffect(() => {
    if (!showPanel) {
      setPanelBox(null);
      return undefined;
    }
    updatePanelBox();
    window.addEventListener('resize', updatePanelBox);
    window.addEventListener('scroll', updatePanelBox, true);
    return () => {
      window.removeEventListener('resize', updatePanelBox);
      window.removeEventListener('scroll', updatePanelBox, true);
    };
  }, [showPanel, updatePanelBox]);

  useEffect(() => {
    if (!focused) return undefined;
    setRecent(getRecentSearches());
    const onDoc = (e) => {
      const t = e.target;
      if (wrapRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setFocused(false);
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [focused]);

  const commitSearch = (override) => {
    const q = String(override ?? value ?? '').trim();
    if (q) {
      setRecent(pushRecentSearch(q));
      onChange(q);
      onSubmit?.(q);
    } else {
      onSubmit?.();
    }
    setFocused(false);
  };

  const recentPanel = showPanel && panelBox && typeof document !== 'undefined'
    ? createPortal(
      <div
        ref={panelRef}
        className="fixed z-[80] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden"
        style={{
          top: panelBox.top,
          left: panelBox.left,
          width: panelBox.width,
        }}
        role="listbox"
        aria-label="آخر عمليات البحث"
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-500">آخر عمليات البحث</span>
          <button
            type="button"
            onClick={() => setRecent(clearRecentSearches())}
            className="text-[11px] font-semibold text-slate-400 hover:text-rose-500"
          >
            مسح الكل
          </button>
        </div>
        <ul className="max-h-56 overflow-y-auto py-1">
          {recent.map((term) => (
            <li key={term} className="flex items-center gap-1">
              <button
                type="button"
                role="option"
                className="flex-1 flex items-center gap-2 px-3 py-2.5 text-sm text-right text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[44px]"
                onClick={() => commitSearch(term)}
              >
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                <span className="truncate">{term}</span>
              </button>
              <button
                type="button"
                aria-label={`حذف ${term}`}
                className="p-2.5 text-slate-400 hover:text-rose-500"
                onClick={() => setRecent(removeRecentSearch(term))}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </div>,
      document.body,
    )
    : null;

  return (
    <form
      ref={wrapRef}
      onSubmit={(e) => {
        e.preventDefault();
        commitSearch();
      }}
      className={`relative ${className}`.trim()}
    >
      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none z-10">
        <Search className="w-4 h-4 text-slate-400" aria-hidden="true" />
      </div>
      <input
        id={id}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          setRecent(getRecentSearches());
          setFocused(true);
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`w-full pr-10 pl-9 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400 text-right appearance-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden ${inputClassName}`.trim()}
      />
      {value && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="absolute inset-y-0 left-0 pl-3 flex items-center justify-center min-w-[44px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 z-10"
          aria-label="مسح البحث"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {recentPanel}
    </form>
  );
}
