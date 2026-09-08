/**
 * ScentTile — عنصر رائحة لصفحة التصفح
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { getOptimizedImageUrl, IMAGE_WIDTHS } from '../utils/cloudinaryUrl';

function ScentTileSkeleton() {
  return (
    <div className="flex flex-col items-center gap-1.5 px-1 py-2">
      <div className="w-[60px] h-[60px] sm:w-16 sm:h-16 rounded-2xl skeleton-shimmer" />
      <div className="h-2.5 w-14 rounded skeleton-shimmer" />
      <div className="h-2 w-10 rounded skeleton-shimmer" />
    </div>
  );
}

const ScentTile = React.memo(({ scent, isLoading = false }) => {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

  if (isLoading || !scent) return <ScentTileSkeleton />;

  const { name, slug, imageUrl, productsCount } = scent;
  const hasImage = imageUrl && !imgError;
  const href = `/scents/${slug}`;
  const countLabel = productsCount > 0 ? `${productsCount} منتج` : null;

  return (
    <button
      type="button"
      onClick={() => navigate(href)}
      className="group flex flex-col items-center gap-1.5 px-1 py-2 w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50 rounded-xl"
      aria-label={`تصفح منتجات ${name}`}
    >
      <div className="w-[60px] h-[60px] sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-gold-50 to-amber-50 dark:from-gold-900/20 dark:to-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-sm group-hover:shadow-md group-hover:border-gold-300 dark:group-hover:border-gold-600 transition-all duration-200 group-active:scale-95 flex items-center justify-center">
        {hasImage ? (
          <img
            src={getOptimizedImageUrl(imageUrl, IMAGE_WIDTHS.THUMBNAIL)}
            alt={name}
            loading="lazy"
            width="64"
            height="64"
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <Sparkles className="w-6 h-6 text-gold-500/70" aria-hidden="true" />
        )}
      </div>
      <span className="text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 text-center leading-tight line-clamp-2 w-full group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors">
        {name}
      </span>
      {countLabel && (
        <span className="text-[10px] text-slate-400 dark:text-slate-500">{countLabel}</span>
      )}
    </button>
  );
});

ScentTile.displayName = 'ScentTile';
export default ScentTile;
