/**
 * BrandTile — بطاقة علامة كبيرة (شعار + اسم + عدد المنتجات)
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { getOptimizedImageUrl, getRawCloudinaryUrl, IMAGE_WIDTHS } from '../utils/cloudinaryUrl';

const TILE_WIDTHS = [360, IMAGE_WIDTHS.GRID_CARD, IMAGE_WIDTHS.GRID_CARD_RETINA];

function getBrandHref(brand) {
  const { slug } = brand;
  if (!slug) return null;
  return `/brand/${encodeURIComponent(slug)}`;
}

function BrandTileSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <div className="w-full aspect-square rounded-2xl skeleton-shimmer" />
      <div className="h-4 w-2/3 rounded skeleton-shimmer" />
      <div className="h-3 w-1/3 rounded skeleton-shimmer" />
    </div>
  );
}

const BrandTile = React.memo(({ brand, isLoading = false, priority = false }) => {
  const [imgFailures, setImgFailures] = useState(0);

  if (isLoading || !brand) return <BrandTileSkeleton />;

  const { name, logoUrl, productsCount } = brand;
  const href = getBrandHref(brand);
  const hasImage = logoUrl && imgFailures < 2;
  const initial = name?.trim()?.charAt(0) || '؟';
  const rawUrl = getRawCloudinaryUrl(logoUrl);
  const useRaw = imgFailures === 1;
  const count = Number(productsCount);
  const countLabel = Number.isFinite(count) ? `${count} منتج` : null;

  const inner = (
    <>
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-700/80 shadow-sm">
        {hasImage ? (
          <img
            src={useRaw ? rawUrl : getOptimizedImageUrl(rawUrl, IMAGE_WIDTHS.GRID_CARD)}
            srcSet={useRaw ? undefined : TILE_WIDTHS.map((w) => `${getOptimizedImageUrl(rawUrl, w)} ${w}w`).join(', ')}
            sizes={useRaw ? undefined : '(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 22vw'}
            alt=""
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            width={IMAGE_WIDTHS.GRID_CARD}
            height={IMAGE_WIDTHS.GRID_CARD}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transform-none"
            onError={() => setImgFailures((n) => n + 1)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-stone-400 dark:text-stone-500">
            {initial}
          </div>
        )}
      </div>

      <span className="block w-full pt-2 pb-0.5 text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 text-center leading-snug line-clamp-2 px-1 group-hover:text-[#e6533d] dark:group-hover:text-[#ff7a62] transition-colors">
        {name}
      </span>
      {countLabel ? (
        <span className="text-xs text-stone-400 dark:text-stone-500 text-center">
          {countLabel}
        </span>
      ) : null}
    </>
  );

  const className =
    'group flex flex-col items-center w-full min-h-[44px] rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 active:scale-[0.98] transition-transform';

  if (!href) {
    return (
      <div className={className} aria-label={name}>
        {inner}
      </div>
    );
  }

  return (
    <Link to={href} className={className} aria-label={`تصفح علامة ${name}`}>
      {inner}
    </Link>
  );
});

BrandTile.displayName = 'BrandTile';
BrandTile.Skeleton = BrandTileSkeleton;

export default BrandTile;
