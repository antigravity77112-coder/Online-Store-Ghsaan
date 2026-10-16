/**
 * CategoryTile — عنصر فئة بنمط Shein (دائرة + صورة + اسم)
 */

import React, { useEffect, useRef, useState } from 'react';
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
    <div className="flex flex-col items-center gap-1.5 w-full" aria-hidden="true">
      <div className="relative w-full aspect-square rounded-full overflow-hidden border border-stone-200/80 dark:border-stone-700/70 bg-stone-100 dark:bg-stone-900">
        <div className="absolute inset-0 skeleton-shimmer opacity-90" />
        <div className="absolute inset-[18%] rounded-full bg-stone-200/50 dark:bg-stone-800/60" />
      </div>
      <div className="h-2.5 w-[85%] rounded-full skeleton-shimmer" />
      <div className="h-2 w-1/2 rounded-full skeleton-shimmer opacity-70" />
    </div>
  );
}

const CategoryTile = React.memo(({ category, isLoading = false, priority = false, subtitle = '' }) => {
  // 0 = optimized, 1 = raw original, 2 = give up (show initial)
  const [imgFailures, setImgFailures] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef(null);

  const iconUrl = category?.iconUrl;
  const useRaw = imgFailures === 1;

  useEffect(() => {
    setImgLoaded(false);
    setImgFailures(0);
  }, [iconUrl]);

  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      setImgLoaded(true);
    }
  }, [iconUrl, useRaw, imgFailures]);

  if (isLoading || !category) return <CategoryTileSkeleton />;

  const { name } = category;
  const hasImage = iconUrl && imgFailures < 2;
  const initial = name?.trim()?.charAt(0) || '؟';
  const href = getCategoryHref(category);
  const rawUrl = getRawCloudinaryUrl(iconUrl);

  return (
    <Link
      to={href}
      className="group flex flex-col items-center gap-1.5 w-full min-h-[44px] rounded-lg p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 active:scale-[0.98] transition-transform"
      aria-label={`تصفح قسم ${name}`}
    >
      <div className="relative w-full aspect-square rounded-full overflow-hidden bg-stone-50 dark:bg-stone-900 border border-stone-200/90 dark:border-stone-700/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-inset ring-black/[0.03] dark:ring-white/[0.04]">
        {hasImage ? (
          <>
            {!imgLoaded && (
              <div className="absolute inset-0 z-[1] skeleton-shimmer" aria-hidden="true" />
            )}
            <img
              ref={imgRef}
              src={useRaw ? rawUrl : getOptimizedImageUrl(rawUrl, 400)}
              srcSet={useRaw ? undefined : TILE_WIDTHS.map((w) => `${getOptimizedImageUrl(rawUrl, w)} ${w}w`).join(', ')}
              sizes={useRaw ? undefined : '(max-width: 640px) 25vw, 140px'}
              alt=""
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              decoding="async"
              width={400}
              height={400}
              className={`w-full h-full object-cover transition-[opacity,transform] duration-300 group-hover:scale-[1.03] motion-reduce:transform-none ${
                imgLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImgLoaded(true)}
              onError={() => {
                setImgLoaded(false);
                setImgFailures((n) => n + 1);
              }}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-stone-100 to-stone-200 dark:from-stone-800 dark:to-stone-900 text-base font-bold text-stone-500 dark:text-stone-300">
            {initial}
          </div>
        )}
      </div>

      <span className="block w-full min-h-[2.7em] px-0.5 pt-0.5 pb-0.5 text-[10px] sm:text-[11px] font-semibold text-stone-900 dark:text-stone-100 text-center leading-[1.45] line-clamp-2 group-hover:text-[#e6533d] dark:group-hover:text-[#ff7a62] transition-colors">
        {subtitle || name}
      </span>
    </Link>
  );
});

CategoryTile.displayName = 'CategoryTile';
CategoryTile.Skeleton = CategoryTileSkeleton;

export default CategoryTile;
