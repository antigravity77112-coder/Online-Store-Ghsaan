import React from 'react';
import { Search } from 'lucide-react';
import DiscoveryLinks from './DiscoveryLinks';
import SearchSuggestions from './SearchSuggestions';

export default function ListingEmptyState({
  title,
  description,
  searchTerm,
  onClear,
  showDiscovery = true,
  showSuggestions,
  clearLabel = 'مسح البحث',
}) {
  const heading = title || (searchTerm ? 'عذرًا، هذا المنتج غير متوفر' : 'لا توجد منتجات');
  const withSuggestions = showSuggestions ?? Boolean(searchTerm);

  return (
    <>
      <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 mb-4 text-slate-400">
          <Search className="w-7 h-7" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">{heading}</h3>
        {description ? (
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto text-sm leading-relaxed">{description}</p>
        ) : searchTerm ? (
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto text-sm leading-relaxed">
            لم نعثر على منتجات تطابق{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">&ldquo;{searchTerm}&rdquo;</span>
            . جرّب كلمات أخرى أو شاهد اقتراحاتنا بالأسفل.
          </p>
        ) : null}
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="mt-5 px-5 py-2.5 min-h-[44px] bg-gold-600 text-white font-semibold rounded-xl hover:bg-gold-500 transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40"
          >
            {clearLabel}
          </button>
        )}
        {showDiscovery && <DiscoveryLinks className="mt-6" compact />}
      </div>
      {withSuggestions && <SearchSuggestions className="mt-8" />}
    </>
  );
}
