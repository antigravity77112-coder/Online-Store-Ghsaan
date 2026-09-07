/**
 * HomeProductFeed — شبكة منتجات كثيفة (نمط Shein)
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { ProductGrid } from './HighConversionGrid';

export default function HomeProductFeed({
  title = 'قد يعجبك',
  products = [],
  isLoading = false,
  loadingCount = 12,
  onFavorite,
  viewAllHref = '/products',
}) {
  if (!isLoading && products.length === 0) return null;

  return (
    <section className="pt-1" aria-label={title}>
      <div className="flex items-center justify-between mb-2 px-0.5">
        <h2 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-white truncate">
          {title}
        </h2>
        {viewAllHref && (
          <Link
            to={viewAllHref}
            className="inline-flex items-center justify-center gap-0.5 min-h-[44px] min-w-[44px] px-1 text-[11px] sm:text-xs font-bold text-stone-600 dark:text-stone-300 hover:text-[#e6533d] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 rounded-lg flex-shrink-0"
          >
            عرض الكل
            <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>

      <ProductGrid
        products={products}
        isLoading={isLoading}
        loadingCount={loadingCount}
        variant="vertical"
        onFavorite={onFavorite}
      />
    </section>
  );
}
