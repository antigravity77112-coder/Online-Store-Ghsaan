/**
 * BannerPreview — Live preview component for a banner object.
 *
 * Used in admin editor and storefront BannerRenderer.
 */

import React from 'react';
import { Megaphone } from 'lucide-react';
import { getBannerResponsiveSources } from '../../../utils/cloudinaryUrl';

const PLACEMENT_RATIOS = {
  hero: 'aspect-[4/5] sm:aspect-[16/9] lg:aspect-[21/8] min-h-[280px] sm:min-h-[240px]',
  // Match HeroSection proportions on the homepage promo strip
  promo_home: 'min-h-[140px] sm:min-h-[200px] lg:min-h-[240px] aspect-[21/9] sm:aspect-[21/8]',
  announcement: 'min-h-[44px]',
  category: 'aspect-[2/1] sm:aspect-[3/1]',
  product: 'aspect-[2/1] sm:aspect-[3/1]',
  sidebar: 'aspect-[2/1] lg:aspect-[9/16] lg:max-h-[420px]',
  footer: 'aspect-[2/1] sm:aspect-[5/1]',
  popup: 'aspect-[4/3] sm:aspect-[4/3]',
};

const ALIGN_CLASSES = {
  right: 'text-right items-start',
  center: 'text-center items-center',
  left: 'text-left items-end',
};

export default function BannerPreview({
  banner,
  compact = false,
  placement: placementProp,
  isMobile = false,
  rounded = true,
  imagePriority = false,
}) {
  if (!banner) return null;

  const {
    title = '',
    subtitle = '',
    description = '',
    imageUrl = '',
    mobileImageUrl = '',
    bgColor = '',
    textColor = '',
    scrollSpeed = 40,
    textAlign = 'right',
    overlayOpacity = 30,
    placement = 'promo_home',
    ctaText = '',
  } = banner;

  const resolvedPlacement = placementProp || placement;
  const isAnnouncement = resolvedPlacement === 'announcement';
  const resolvedBg = bgColor || (isAnnouncement ? '#FFFFFF' : '#1A0A0A');
  const resolvedText = textColor || (isAnnouncement ? '#111827' : '#ffffff');

  if (isAnnouncement) {
    const label = [title, subtitle, description].filter(Boolean).join(' — ') || 'نص الشريط المتحرك...';
    const speed = Math.min(120, Math.max(8, Number(scrollSpeed) || 40));
    return (
      <div
        className={`relative w-full overflow-hidden ${rounded ? 'rounded-xl' : ''} ${compact ? '' : 'min-h-[44px]'}`}
        style={{ backgroundColor: resolvedBg }}
      >
        <div className="offer-belt-viewport overflow-hidden" dir="ltr">
          <div
            className="offer-belt-track flex w-max max-w-none items-center gap-8 whitespace-nowrap py-2.5 px-2"
            style={{ animationDuration: `${speed}s` }}
          >
            {[0, 1].map((copy) => (
              <span
                key={copy}
                className="inline-flex items-center gap-2 text-xs font-bold"
                style={{ color: resolvedText }}
              >
                <Megaphone className="w-3.5 h-3.5 opacity-90" aria-hidden="true" />
                <span>{label}</span>
                <span className="opacity-50">·</span>
                <span>{label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const ratioClass = compact ? 'aspect-[16/5]' : (PLACEMENT_RATIOS[resolvedPlacement] || 'aspect-[4/1]');
  const forceRtl = resolvedPlacement === 'product' || resolvedPlacement === 'sidebar';
  const isPromoHome = resolvedPlacement === 'promo_home';
  const alignClass = ALIGN_CLASSES[forceRtl || isPromoHome ? 'right' : textAlign] || ALIGN_CLASSES.right;
  const overlayAlpha = Math.round((overlayOpacity / 100) * 255).toString(16).padStart(2, '0');
  const displayImageRaw = isMobile && mobileImageUrl ? mobileImageUrl : imageUrl;
  const displayImageSources = getBannerResponsiveSources(displayImageRaw, {
    placement: resolvedPlacement === 'hero' || isPromoHome ? 'hero' : resolvedPlacement,
    isMobile,
  });

  const hasImage = Boolean(displayImageSources.src);
  // Image banners keep light text over the photo; color banners use the chosen text color.
  const copyColor = hasImage ? '#ffffff' : resolvedText;
  const justifyClass = isPromoHome ? 'justify-center' : 'justify-end';

  return (
    <div
      dir={forceRtl || isPromoHome ? 'rtl' : undefined}
      className={`relative w-full ${ratioClass} ${rounded ? 'rounded-2xl' : ''} overflow-hidden flex flex-col ${justifyClass} select-none`}
      style={{ background: resolvedBg }}
    >
      {hasImage && (
        <img
          src={displayImageSources.src}
          srcSet={displayImageSources.srcSet}
          sizes={displayImageSources.sizes}
          alt={title || 'بانر ترويجي'}
          className={`absolute inset-0 w-full h-full object-cover ${isPromoHome ? 'object-[center_10%] md:object-center' : ''}`}
          draggable={false}
          loading={imagePriority ? 'eager' : 'lazy'}
          fetchPriority={imagePriority ? 'high' : 'auto'}
        />
      )}

      {overlayOpacity > 0 && hasImage && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: `#000000${overlayAlpha}` }}
        />
      )}
      {isPromoHome && hasImage && (
        <div className="absolute inset-0 bg-gradient-to-l from-black/20 via-transparent to-black/30 pointer-events-none" />
      )}

      {(title || subtitle || description || ctaText) && (
        <div
          className={`relative z-10 p-3 sm:px-6 sm:py-4 flex flex-col gap-0.5 ${alignClass} ${
            isPromoHome ? 'max-w-[58%] sm:max-w-[50%] self-end sm:self-end' : ''
          }`}
        >
          {title && (
            <h2
              className={
                isPromoHome
                  ? 'text-lg font-black uppercase leading-[1.15] drop-shadow-lg sm:text-2xl md:text-3xl'
                  : 'font-extrabold text-xs sm:text-sm lg:text-base leading-tight drop-shadow-lg'
              }
              style={{ color: copyColor }}
            >
              {title}
            </h2>
          )}
          {subtitle && (
            <p
              className={
                isPromoHome
                  ? 'text-[10px] sm:text-xs font-bold mt-1.5 drop-shadow-md'
                  : 'font-semibold text-[10px] sm:text-xs leading-snug drop-shadow'
              }
              style={{ color: copyColor, opacity: 0.9 }}
            >
              {subtitle}
            </p>
          )}
          {description && (
            <p
              className={
                isPromoHome
                  ? 'text-[10px] sm:text-xs mt-1 line-clamp-2 drop-shadow'
                  : 'text-[10px] sm:text-xs leading-relaxed mt-0.5 line-clamp-2'
              }
              style={{ color: copyColor, opacity: isPromoHome ? 0.85 : 0.75 }}
            >
              {description}
            </p>
          )}
          {ctaText && (
            isPromoHome ? (
              <span className="inline-flex mt-2 sm:mt-2.5 self-start min-h-[40px] items-center justify-center px-4 sm:px-5 border border-white text-white text-[11px] sm:text-xs font-extrabold uppercase tracking-wide bg-transparent">
                {ctaText}
              </span>
            ) : (
              <span className="inline-flex mt-2 self-start px-3 py-1 rounded-lg bg-gold-600 text-white text-[10px] sm:text-xs font-bold">
                {ctaText}
              </span>
            )
          )}
        </div>
      )}
    </div>
  );
}
