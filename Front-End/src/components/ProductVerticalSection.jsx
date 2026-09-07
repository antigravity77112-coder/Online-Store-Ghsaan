/**
 * ProductVerticalSection — قسم منتجات عمودي (نمط Shein: عمودين)
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { ProductCard } from './HighConversionGrid/ProductCard';
import { VERTICAL_PRODUCT_GRID_CLASS } from './HighConversionGrid/productGridClasses';

export default function ProductVerticalSection({
  title,
  subtitle,
  viewAllHref,
  products = [],
  isLoading = false,
  loadingCount = 6,
  limit,
  variant = 'default',
  onFavorite,
  onQuickAdd,
  className = '',
}) {
  const isFlash = variant === 'flash';
  const visible = limit != null ? products.slice(0, limit) : products;

  if (!isLoading && visible.length === 0) return null;

  return (
    <section className={`mb-3 sm:mb-4 ${className}`} aria-label={title}>
      {(title || viewAllHref) && (
        <div className={`flex items-center justify-between mb-2 px-0.5 ${isFlash ? 'pb-1' : ''}`}>
          <div className="min-w-0">
            {title && (
              <h2 className={`font-extrabold tracking-tight truncate ${
                isFlash
                  ? 'text-sm sm:text-base text-[#e6533d] dark:text-[#ff7a62] uppercase'
                  : 'text-sm sm:text-base text-stone-900 dark:text-white'
              }`}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-[10px] sm:text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-1">
                {subtitle}
              </p>
            )}
          </div>
          {viewAllHref && (
            <Link
              to={viewAllHref}
              className="inline-flex items-center justify-center gap-0.5 min-h-[44px] min-w-[44px] px-1 text-[11px] sm:text-xs font-bold text-stone-600 dark:text-stone-300 hover:text-[#e6533d] dark:hover:text-[#ff7a62] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 rounded-lg flex-shrink-0"
            >
              عرض الكل
              <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      )}

      <div className={VERTICAL_PRODUCT_GRID_CLASS}>
        {isLoading
          ? Array.from({ length: loadingCount }).map((_, i) => (
              <ProductCard key={`vertical-skel-${i}`} isLoading compact />
            ))
          : visible.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                compact
                onFavorite={onFavorite}
                onQuickAdd={onQuickAdd}
              />
            ))}
      </div>
    </section>
  );
}
