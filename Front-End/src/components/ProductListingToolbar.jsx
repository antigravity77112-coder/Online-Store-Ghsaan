/**
 * ProductListingToolbar — شريط فلترة وترتيب المنتجات
 */

import React from 'react';
import { SlidersHorizontal, ArrowUpDown, Loader2 } from 'lucide-react';

const SORT_OPTIONS = [
  { value: 'default', label: 'الافتراضي' },
  { value: 'trending', label: 'تريند' },
  { value: 'newest', label: 'الأحدث' },
  { value: 'price-asc', label: 'السعر: الأقل' },
  { value: 'price-desc', label: 'السعر: الأعلى' },
  { value: 'rating', label: 'التقييم' },
];

const ProductListingToolbar = ({
  productCount = 0,
  isValidating = false,
  sortOrder,
  onSortChange,
  showFilters = false,
  onToggleFilters,
  activeFilterCount = 0,
}) => {
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortOrder)?.label || 'الترتيب';

  return (
    <div className="flex items-center justify-between gap-2 py-2.5 px-3 mb-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 min-w-0">
        {isValidating && <Loader2 className="w-3.5 h-3.5 animate-spin text-gold-500 flex-shrink-0" />}
        <span className="truncate">{productCount} منتج</span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {onToggleFilters && (
          <button
            type="button"
            onClick={onToggleFilters}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-lg text-xs font-bold border transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-gold-50 dark:bg-gold-900/30 border-gold-300 dark:border-gold-700 text-gold-700 dark:text-gold-300'
                : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-gold-300 dark:hover:border-gold-600'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>فلترة</span>
            {activeFilterCount > 0 && (
              <span className="min-w-[16px] h-4 px-1 rounded-full bg-gold-500 text-white text-[10px] flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}

        <div className="relative">
          <select
            value={sortOrder}
            onChange={(e) => onSortChange(e.target.value)}
            className="appearance-none pl-8 pr-3 py-1.5 min-h-[44px] rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-gold-500/40 cursor-pointer"
            aria-label="ترتيب المنتجات"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ArrowUpDown className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <span className="sr-only">ترتيب: {sortLabel}</span>
        </div>
      </div>
    </div>
  );
};

export default ProductListingToolbar;
