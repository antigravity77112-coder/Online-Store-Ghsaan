/**
 * CategoryCard — بطاقة القسم (مُعاد تصميمها)
 *
 * EN: Full-bleed image card. The category image fills the entire card.
 *     A gradient overlay at the bottom keeps the name legible.
 *     Falls back to an emoji + gradient background when no image is set.
 *
 * AR: بطاقة صورة ممتدة بالكامل. تملأ صورة القسم البطاقة بأكملها.
 *     تدرج لوني في الأسفل يجعل الاسم مقروءاً.
 *     تعود إلى إيموجي + خلفية متدرجة عند عدم وجود صورة.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOptimizedImageUrl, IMAGE_WIDTHS } from '../utils/cloudinaryUrl';

// ─── Fallback Emojis ───
const CATEGORY_EMOJI_MAP = {
  'هواتف': '📱',
  'لابتوبات': '💻',
  'إلكترونيات': '🔌',
  'الطاقة الشمسية': '☀️',
  'البن اليمني': '☕',
  'ملابس': '👕',
  'أحذية': '👟',
  'ساعات': '⌚',
  'مجوهرات': '💎',
  'أثاث': '🪑',
  'أجهزة منزلية': '🏠',
  'سيارات': '🚗',
  'رياضة': '⚽',
  'كتب': '📚',
  'ألعاب': '🎮',
  'عطور': '🧴',
  'صحة': '💊',
  'طعام': '🍽️',
  'حيوانات': '🐾',
  'أطفال': '👶',
};

const DEFAULT_EMOJI = '🏷️';

// ─── Gradient palette for no-image fallback ───
const GRADIENTS = [
  ['#6366f1', '#8b5cf6'],   // indigo → violet
  ['#0ea5e9', '#06b6d4'],   // sky → cyan
  ['#10b981', '#34d399'],   // emerald → green
  ['#f59e0b', '#f97316'],   // amber → orange
  ['#ec4899', '#f43f5e'],   // pink → rose
  ['#8b5cf6', '#c026d3'],   // violet → fuchsia
  ['#14b8a6', '#0ea5e9'],   // teal → sky
  ['#f97316', '#ef4444'],   // orange → red
];

function getGradientForName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

// ─── Skeleton ───
const CategoryCardSkeleton = () => (
  <div className="relative rounded-2xl overflow-hidden h-36 sm:h-44 bg-slate-200 dark:bg-slate-800 animate-pulse">
    <div className="absolute bottom-0 inset-x-0 p-3">
      <div className="h-3.5 w-3/4 bg-slate-300 dark:bg-slate-700 rounded-lg" />
      <div className="h-2.5 w-1/3 bg-slate-300 dark:bg-slate-700 rounded-lg mt-1.5" />
    </div>
  </div>
);

// ─── Main Component ───
const CategoryCard = React.memo(({ category, isLoading = false }) => {
  const navigate = useNavigate();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (isLoading || !category) return <CategoryCardSkeleton />;

  const { name, slug, iconUrl, _count } = category;
  const productCount = _count?.products ?? category.productCount ?? null;
  const hasImage = iconUrl && !imgError;
  const emoji = CATEGORY_EMOJI_MAP[name] || DEFAULT_EMOJI;
  const [gradFrom, gradTo] = getGradientForName(name);

  // Use slug if available, fall back to encoded name for backward compat
  const categoryHref = slug
    ? `/category/${encodeURIComponent(slug)}`
    : `/category/${encodeURIComponent(name)}`;

  return (
    <button
      onClick={() => navigate(categoryHref)}
        className="category-card group relative flex flex-col justify-end rounded-xl overflow-hidden h-28 sm:h-32 cursor-pointer appearance-none bg-transparent border border-slate-200/80 dark:border-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 shadow-sm hover:shadow-lg hover:shadow-black/15 dark:hover:shadow-black/30 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] w-full text-right"
      aria-label={`تصفح قسم ${name}`}
    >
      {/* ── Background: Image or Gradient ── */}
      {hasImage ? (
        <>
          {/* Skeleton shimmer while image loads */}
          {!imgLoaded && (
            <div className="absolute inset-0 skeleton-shimmer" />
          )}
          <img
            src={getOptimizedImageUrl(iconUrl, IMAGE_WIDTHS.CATEGORY_CARD)}
            alt={name}
            loading="lazy"
            width="300"
            height="176"
            className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
        </>
      ) : (
        /* Gradient fallback with large emoji */
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})` }}
        >
          <span className="text-5xl sm:text-6xl select-none opacity-80 group-hover:scale-110 transition-transform duration-400 drop-shadow-lg">
            {emoji}
          </span>
        </div>
      )}

      {/* ── Dark gradient overlay at bottom (always present) ── */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent group-hover:from-black/85 transition-all duration-300" />

      {/* ── Subtle shine sweep on hover ── */}
      <div className="card-shine-effect absolute -top-full -left-full w-full h-full bg-gradient-to-br from-white/20 to-transparent rotate-12 pointer-events-none" />

      {/* ── Text content ── */}
      <div className="relative z-10 px-3 pb-3 sm:px-4 sm:pb-4">
        <h3 className="text-sm sm:text-base font-extrabold text-white leading-tight line-clamp-1 drop-shadow-sm group-hover:text-gold-200 transition-colors duration-300">
          {name}
        </h3>
        {productCount !== null && productCount !== undefined && (
          <span className="text-[11px] sm:text-xs font-medium text-white/65 group-hover:text-white/85 transition-colors duration-300">
            {productCount} منتج
          </span>
        )}
      </div>
    </button>
  );
});

CategoryCard.displayName = 'CategoryCard';
export default CategoryCard;
