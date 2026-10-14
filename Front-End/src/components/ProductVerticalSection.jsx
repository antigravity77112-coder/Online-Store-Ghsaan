/**
 * ProductVerticalSection — قسم منتجات عمودي (نمط Shein: عمودين)
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { ProductCard } from './HighConversionGrid/ProductCard';
import { VERTICAL_PRODUCT_GRID_CLASS } from './HighConversionGrid/productGridClasses';

const MORE_SKELETON_COUNT = 4;

export default function ProductVerticalSection({
  title,
  subtitle,
  viewAllHref,
  products = [],
  isLoading = false,
  isLoadingMore = false,
  loadingCount = 6,
  limit,
  variant = 'default',
  onFavorite,
  onQuickAdd,
  className = '',
  priorityCount = 0,
  /** Fade/slide cards in as they appear (PDP related feed). */
  animateEntrance = false,
}) {
  const reduceMotion = useReducedMotion();
  const isFlash = variant === 'flash';
  const visible = limit != null ? products.slice(0, limit) : products;
  const showInitialSkeleton = isLoading && visible.length === 0;

  if (!isLoading && !isLoadingMore && visible.length === 0) return null;

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
        {showInitialSkeleton
          ? Array.from({ length: loadingCount }).map((_, i) => (
              <ProductCard key={`vertical-skel-${i}`} isLoading compact />
            ))
          : (
            <>
              {visible.map((product, index) => {
                const card = (
                  <ProductCard
                    product={product}
                    compact
                    priority={index < priorityCount}
                    onFavorite={onFavorite}
                    onQuickAdd={onQuickAdd}
                  />
                );

                if (!animateEntrance || reduceMotion) {
                  return <React.Fragment key={product.id}>{card}</React.Fragment>;
                }

                const stagger = Math.min(index % 6, 5) * 0.05;

                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut', delay: stagger }}
                  >
                    {card}
                  </motion.div>
                );
              })}
              {isLoadingMore &&
                Array.from({ length: MORE_SKELETON_COUNT }).map((_, i) => (
                  <ProductCard key={`vertical-more-skel-${i}`} isLoading compact />
                ))}
            </>
          )}
      </div>
    </section>
  );
}
