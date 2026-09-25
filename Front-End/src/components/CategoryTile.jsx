/**
 * CategoryTile — عنصر فئة بنمط Shein (دائرة + صورة + اسم)
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { getOptimizedImageUrl, getRawCloudinaryUrl } from '../utils/cloudinaryUrl';

const TILE_WIDTHS = [200, 300, 400, 600];

function getCategoryHref(category) {
  const { name, slug } = category;
  return slug
    ? `/category/${encodeURIComponent(slug)}`
    : `/category/${encodeURIComponent(name)}`;
}

function CategoryTileSkeleton() {
  return (
    <div className="flex flex-col items-center gap-1.5 w-full">
      <div className="w-full aspect-square rounded-full skeleton-shimmer" />
      <div className="h-2.5 w-[85%] rounded skeleton-shimmer" />
    </div>
  );
}

const CategoryTile = React.memo(({ category, isLoading = false, priority = false }) => {
  // 0 = optimized, 1 = raw original, 2 = give up (show initial)
  const [imgFailures, setImgFailures] = useState(0);

  if (isLoading || !category) return <CategoryTileSkeleton />;

  const { name, iconUrl } = category;
  const hasImage = iconUrl && imgFailures < 2;
  const initial = name?.trim()?.charAt(0) || '؟';
  const href = getCategoryHref(category);
  const rawUrl = getRawCloudinaryUrl(iconUrl);
  const useRaw = imgFailures === 1;

  return (
    <Link
      to={href}
      className="group flex flex-col items-center gap-1.5 w-full min-h-[44px] rounded-lg p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 active:scale-[0.98] transition-transform"
      aria-label={`تصفح قسم ${name}`}
    >
      <div className="w-full aspect-square rounded-full overflow-hidden bg-stone-100 dark:bg-stone-800 border border-stone-200/90 dark:border-stone-700/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        {hasImage ? (
          <img
            src={useRaw ? rawUrl : getOptimizedImageUrl(rawUrl, 400)}
            srcSet={useRaw ? undefined : TILE_WIDTHS.map((w) => `${getOptimizedImageUrl(rawUrl, w)} ${w}w`).join(', ')}
            sizes={useRaw ? undefined : '(max-width: 640px) 25vw, 140px'}
            alt=""
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            width={400}
            height={400}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none"
            onError={() => setImgFailures((n) => n + 1)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-stone-200 dark:bg-stone-700 text-base font-bold text-stone-600 dark:text-stone-300">
            {initial}
          </div>
        )}
      </div>

      <span className="text-[10px] sm:text-[11px] font-semibold text-stone-900 dark:text-stone-100 text-center leading-tight line-clamp-2 w-full px-0.5 group-hover:text-[#e6533d] dark:group-hover:text-[#ff7a62] transition-colors">
        {name}
      </span>
    </Link>
  );
});

CategoryTile.displayName = 'CategoryTile';
CategoryTile.Skeleton = CategoryTileSkeleton;

export default CategoryTile;
