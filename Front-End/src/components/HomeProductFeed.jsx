/**
 * HomeProductFeed — شبكة منتجات كثيفة مع تمرير لانهائي (نمط Shein)
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { ProductGrid } from './HighConversionGrid';
import InfiniteScrollTrigger from './InfiniteScrollTrigger';

export default function HomeProductFeed({
  title = 'قد يعجبك',
  products = [],
  isLoading = false,
  isLoadingMore = false,
  isReachingEnd = true,
  onLoadMore,
  loadingCount = 12,
  onFavorite,
  viewAllHref = '/products',
}) {
  if (!isLoading && products.length === 0) return null;

  return (
    <section className="pt-1" aria-label={title}>
      <div className="flex items-center justify-between mb-2 px-0.5">
        <h2 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-white truncate leading-[1.45]">
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
        isLoadingMore={isLoadingMore}
        loadingCount={loadingCount}
        variant="vertical"
        onFavorite={onFavorite}
        priorityCount={0}
      />

      {typeof onLoadMore === 'function' ? (
        <InfiniteScrollTrigger
          onIntersect={onLoadMore}
          isLoadingMore={isLoadingMore}
          isReachingEnd={isReachingEnd}
        />
      ) : null}

      {isReachingEnd && products.length > 0 && !isLoading ? (
        <p className="text-center text-xs text-stone-400 dark:text-stone-500 py-4">
          وصلت إلى نهاية المنتجات
        </p>
      ) : null}
    </section>
  );
}
