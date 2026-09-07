/**
 * ProductCarousel — شريط منتجات أفقي (نمط Shein)
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { ProductCard } from './HighConversionGrid/ProductCard';

const CARD_CLASS = 'flex-shrink-0 w-[calc(44vw)] min-w-[140px] max-w-[168px] sm:w-[152px] md:w-[164px] snap-start';

const ProductCarousel = ({
  title,
  subtitle,
  viewAllHref,
  products,
  isLoading = false,
  loadingCount = 8,
  onQuickAdd,
  onClick,
  onFavorite,
  variant = 'default',
}) => {
  const isFlash = variant === 'flash';

  return (
    <section className="mb-3 sm:mb-4">
      <div className={`flex items-center justify-between mb-2 px-0.5 ${isFlash ? 'pb-1.5' : ''}`}>
        <div className="min-w-0">
          <h2 className={`font-extrabold tracking-tight truncate ${
            isFlash
              ? 'text-sm sm:text-base text-[#e6533d] dark:text-[#ff7a62] uppercase'
              : 'text-sm sm:text-base text-stone-900 dark:text-white'
          }`}
          >
            {title}
          </h2>
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

      <div
        className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide pb-0.5 snap-x snap-mandatory -mx-0.5 px-0.5"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {isLoading
          ? Array.from({ length: loadingCount }).map((_, i) => (
              <div key={`carousel-skel-${i}`} className={CARD_CLASS}>
                <ProductCard isLoading compact />
              </div>
            ))
          : products.map((product) => (
              <div key={product.id} className={CARD_CLASS}>
                <ProductCard
                  product={product}
                  compact
                  onQuickAdd={onQuickAdd}
                  onClick={onClick}
                  onFavorite={onFavorite}
                />
              </div>
            ))}
      </div>

      {!isLoading && products.length === 0 && (
        <p className="text-center text-sm text-stone-400 dark:text-stone-500 py-6">
          لا توجد منتجات في هذا القسم حالياً
        </p>
      )}
    </section>
  );
};

export default ProductCarousel;
