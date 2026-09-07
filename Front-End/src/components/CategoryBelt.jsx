/**
 * CategoryBelt — حزام الفئات الدائري للصفحة الرئيسية
 *
 * EN: Premium horizontal circular category discovery belt for the homepage.
 *     Lightweight circles with gold outline, image/logo centered, name below.
 *     No product counts — discovery-first presentation.
 *
 * AR: حزام فئات دائري أفقي فاخر للصفحة الرئيسية.
 */

import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, LayoutGrid } from 'lucide-react';
import { getOptimizedImageUrl, IMAGE_WIDTHS } from '../utils/cloudinaryUrl';

const SKELETON_COUNT = 8;
const CIRCLE_SIZE = 'w-16 h-16 sm:w-[72px] sm:h-[72px]';
const ITEM_WIDTH = 'w-[72px] sm:w-[80px]';

function getCategoryHref(category) {
  const { name, slug } = category;
  return slug
    ? `/category/${encodeURIComponent(slug)}`
    : `/category/${encodeURIComponent(name)}`;
}

function CategoryCircle({ iconUrl, name }) {
  const [imgError, setImgError] = useState(false);
  const hasImage = iconUrl && !imgError;
  const initial = name?.trim()?.charAt(0) || '؟';

  return (
    <div
      className={`${CIRCLE_SIZE} rounded-full overflow-hidden bg-bone-50 dark:bg-slate-900/90 border border-gold-500/20 group-hover:border-gold-500/45 group-focus-visible:border-gold-500/50 flex items-center justify-center p-2 transition-colors duration-200 motion-reduce:transition-none`}
    >
      {hasImage ? (
        <img
          src={getOptimizedImageUrl(iconUrl, IMAGE_WIDTHS.CATEGORY_CARD)}
          alt=""
          loading="lazy"
          width={72}
          height={72}
          className="max-w-full max-h-full object-contain motion-reduce:transform-none group-hover:scale-105 transition-transform duration-200"
          onError={() => setImgError(true)}
        />
      ) : (
        <span
          className="text-base sm:text-lg font-semibold text-gold-600/80 dark:text-gold-400/90 select-none leading-none"
          aria-hidden="true"
        >
          {initial}
        </span>
      )}
    </div>
  );
}

function BeltItemSkeleton() {
  return (
    <div className={`flex flex-col items-center gap-1.5 flex-shrink-0 ${ITEM_WIDTH}`}>
      <div className={`${CIRCLE_SIZE} rounded-full skeleton-shimmer`} />
      <div className="h-3 w-12 rounded skeleton-shimmer" />
    </div>
  );
}

const CategoryBeltItem = React.memo(({ category }) => {
  const { name, iconUrl } = category;
  const href = getCategoryHref(category);

  return (
    <Link
      to={href}
      className={`group flex flex-col items-center gap-1.5 flex-shrink-0 ${ITEM_WIDTH} min-h-[44px] py-0.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 motion-reduce:transition-none active:scale-[0.98] motion-reduce:active:scale-100`}
      aria-label={`تصفح قسم ${name}`}
    >
      <CategoryCircle iconUrl={iconUrl} name={name} />
      <span className="text-[13px] sm:text-sm font-medium text-slate-600 dark:text-slate-400 text-center leading-snug line-clamp-2 w-full group-hover:text-gold-700 dark:group-hover:text-gold-400 transition-colors duration-200 motion-reduce:transition-none">
        {name}
      </span>
    </Link>
  );
});

CategoryBeltItem.displayName = 'CategoryBeltItem';

const CategoryBelt = React.memo(({ categories = [], isLoading = false, limit = 16, title = 'الفئات' }) => {
  const scrollRef = useRef(null);
  const visibleCategories = categories.slice(0, limit);

  return (
    <section id="categories-section" className="mb-4 sm:mb-5" aria-labelledby="category-belt-heading">
      <div className="flex items-center justify-between mb-2.5 sm:mb-3 gap-3">
        <h2
          id="category-belt-heading"
          className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight"
        >
          {title}
        </h2>
        <Link
          to="/categories"
          className="inline-flex items-center justify-center gap-1 min-h-[44px] min-w-[44px] px-1 text-xs sm:text-sm font-bold text-gold-600 dark:text-gold-400 hover:text-gold-700 dark:hover:text-gold-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 rounded-lg"
        >
          <span>عرض الكل</span>
          <ChevronLeft className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
        </Link>
      </div>

      <div
        ref={scrollRef}
        className="category-belt-scroll flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide pb-0.5 -mx-1 px-1 snap-x snap-mandatory"
        style={{ WebkitOverflowScrolling: 'touch' }}
        role="list"
      >
        {isLoading
          ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <div key={`belt-skel-${i}`} className="snap-start" role="listitem">
                <BeltItemSkeleton />
              </div>
            ))
          : visibleCategories.map((cat) => (
              <div key={cat.id} className="snap-start" role="listitem">
                <CategoryBeltItem category={cat} />
              </div>
            ))}

        {!isLoading && categories.length > limit && (
          <Link
            to="/categories"
            className={`group flex flex-col items-center gap-1.5 flex-shrink-0 ${ITEM_WIDTH} min-h-[44px] py-0.5 snap-start focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 rounded-lg`}
            aria-label="عرض المزيد من الفئات"
          >
            <div className={`${CIRCLE_SIZE} rounded-full bg-bone-50 dark:bg-slate-900/90 border border-dashed border-gold-500/25 group-hover:border-gold-500/45 flex items-center justify-center transition-colors duration-200 motion-reduce:transition-none`}>
              <ChevronLeft className="w-5 h-5 text-gold-500/70 group-hover:text-gold-600" aria-hidden="true" />
            </div>
            <span className="text-[13px] sm:text-sm font-medium text-slate-500 dark:text-slate-400 text-center leading-snug">
              المزيد
            </span>
          </Link>
        )}
      </div>

      {!isLoading && categories.length === 0 && (
        <p className="text-center text-sm text-slate-400 dark:text-slate-500 py-3 flex items-center justify-center gap-2">
          <LayoutGrid className="w-4 h-4 opacity-50" aria-hidden="true" />
          لا توجد فئات حالياً
        </p>
      )}
    </section>
  );
});

CategoryBelt.displayName = 'CategoryBelt';
export default CategoryBelt;
