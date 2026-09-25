import React from 'react';
import { ProductCard, Product } from './ProductCard';
import { LISTING_PRODUCT_GRID_CLASS, VERTICAL_PRODUCT_GRID_CLASS } from './productGridClasses';

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
  isLoadingMore?: boolean;
  loadingCount?: number;
  onQuickAdd?: (product: Product) => void;
  onClick?: (product: Product) => void;
  onFavorite?: (product: Product, isFavorite: boolean) => void;
  title?: string;
  className?: string;
  compact?: boolean;
  variant?: 'vertical' | 'listing';
  /** Number of leading cards that load eagerly (above the fold). */
  priorityCount?: number;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  isLoading = false,
  isLoadingMore = false,
  loadingCount = 12,
  onQuickAdd,
  onClick,
  onFavorite,
  title,
  className = '',
  compact = true,
  variant = 'vertical',
  priorityCount = 4,
}) => {
  const gridClass = variant === 'listing' ? LISTING_PRODUCT_GRID_CLASS : VERTICAL_PRODUCT_GRID_CLASS;

  return (
    <div className={`w-full ${className}`}>
      {title && (
        <h2 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-white mb-2 px-0.5">
          {title}
        </h2>
      )}

      <div className={gridClass}>
        {isLoading ? (
          Array.from({ length: loadingCount }).map((_, index) => (
            <ProductCard key={`skeleton-initial-${index}`} isLoading compact={compact} />
          ))
        ) : (
          <>
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                compact={compact}
                priority={index < priorityCount}
                onQuickAdd={onQuickAdd}
                onClick={onClick}
                onFavorite={onFavorite}
              />
            ))}
            {isLoadingMore &&
              Array.from({ length: 6 }).map((_, index) => (
                <ProductCard key={`skeleton-more-${index}`} isLoading compact={compact} />
              ))}
          </>
        )}
      </div>
    </div>
  );
};
