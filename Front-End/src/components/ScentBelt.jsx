/**
 * ScentBelt — صف أفقي للروائح (يدعم نمط Shein)
 */

import React, { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Sparkles } from 'lucide-react';
import { getOptimizedImageUrl, IMAGE_WIDTHS } from '../utils/cloudinaryUrl';

const HOME_SCENT_LIMIT = 10;
const SKELETON_COUNT = 8;

function BeltItemSkeleton({ marketplace }) {
  return (
    <div className={`flex flex-col items-center gap-1 flex-shrink-0 ${marketplace ? 'w-[18%] min-w-[64px]' : 'w-[72px] sm:w-[80px]'}`}>
      <div className={`w-full skeleton-shimmer ${marketplace ? 'aspect-square rounded-full' : 'w-14 h-14 sm:w-[60px] sm:h-[60px] rounded-2xl'}`} />
      <div className="h-2 w-10 rounded skeleton-shimmer" />
    </div>
  );
}

const ScentBeltItem = React.memo(({ scent, marketplace }) => {
  const navigate = useNavigate();
  const { name, slug, imageUrl } = scent;
  const href = `/scents/${slug}`;

  if (marketplace) {
    return (
      <button
        type="button"
        onClick={() => navigate(href)}
        className="flex flex-col items-center gap-1 min-h-[44px] w-[18%] min-w-[64px] max-w-[76px] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 rounded-lg"
        aria-label={`تصفح عطور ${name}`}
      >
        <div className="w-full aspect-square rounded-full overflow-hidden bg-stone-100 dark:bg-stone-800 ring-1 ring-stone-200/80 dark:ring-stone-700/80">
          {imageUrl ? (
            <img
              src={getOptimizedImageUrl(imageUrl, IMAGE_WIDTHS.THUMBNAIL)}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-stone-400" aria-hidden="true" />
            </div>
          )}
        </div>
        <span className="text-[10px] font-semibold text-stone-800 dark:text-stone-200 text-center leading-tight line-clamp-2 w-full">
          {name}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => navigate(href)}
      className="group flex flex-col items-center gap-1.5 flex-shrink-0 w-[72px] sm:w-[80px] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50 rounded-lg"
      aria-label={`تصفح عطور ${name}`}
    >
      <div className="relative w-14 h-14 sm:w-[60px] sm:h-[60px] rounded-2xl overflow-hidden bg-gradient-to-br from-gold-50 to-amber-50 dark:from-gold-900/20 dark:to-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-sm group-hover:shadow-md transition-all group-active:scale-95 flex items-center justify-center">
        {imageUrl ? (
          <img
            src={getOptimizedImageUrl(imageUrl, IMAGE_WIDTHS.THUMBNAIL)}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <Sparkles className="w-5 h-5 text-gold-500/70" aria-hidden="true" />
        )}
      </div>
      <span className="text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 text-center leading-tight line-clamp-2 w-full">
        {name}
      </span>
    </button>
  );
});

ScentBeltItem.displayName = 'ScentBeltItem';

const ScentBelt = React.memo(({
  scents = [],
  isLoading = false,
  limit = HOME_SCENT_LIMIT,
  title = 'اختر رائحتك المفضلة',
  variant = 'default',
}) => {
  const scrollRef = useRef(null);
  const visible = scents.slice(0, limit);
  const marketplace = variant === 'marketplace';

  if (!isLoading && scents.length === 0) return null;

  return (
    <section id="scents-section" className="mb-3 sm:mb-4">
      <div className="flex items-center justify-between mb-2 px-0.5">
        <h2 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-white truncate">
          {title}
        </h2>
        <Link
          to="/scents"
          className="inline-flex items-center gap-0.5 min-h-[44px] min-w-[44px] px-1 text-[11px] sm:text-xs font-bold text-stone-600 dark:text-stone-300 hover:text-[#e6533d] transition-colors flex-shrink-0"
        >
          عرض الكل
          <ChevronLeft className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div
        ref={scrollRef}
        className={`flex overflow-x-auto scrollbar-hide pb-0.5 snap-x snap-mandatory ${
          marketplace ? 'gap-2 justify-between sm:justify-start' : 'gap-3 sm:gap-4 -mx-1 px-1'
        }`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {isLoading
          ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <BeltItemSkeleton key={`scent-skel-${i}`} marketplace={marketplace} />
            ))
          : visible.map((scent) => (
              <div key={scent.id} className="snap-start flex-shrink-0">
                <ScentBeltItem scent={scent} marketplace={marketplace} />
              </div>
            ))}
      </div>
    </section>
  );
});

ScentBelt.displayName = 'ScentBelt';
export default ScentBelt;
