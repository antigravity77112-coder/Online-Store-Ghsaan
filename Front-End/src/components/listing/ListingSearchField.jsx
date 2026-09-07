import React from 'react';
import { Search, X } from 'lucide-react';

export default function ListingSearchField({
  value,
  onChange,
  onClear,
  onSubmit,
  placeholder = 'ابحث...',
  id,
  className = '',
  inputClassName = '',
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
      className={`relative ${className}`.trim()}
    >
      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
        <Search className="w-4 h-4 text-slate-400" aria-hidden="true" />
      </div>
      <input
        id={id}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`w-full pr-10 pl-9 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400 text-right ${inputClassName}`.trim()}
      />
      {value && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="absolute inset-y-0 left-0 pl-3 flex items-center justify-center min-w-[44px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          aria-label="مسح البحث"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </form>
  );
}
