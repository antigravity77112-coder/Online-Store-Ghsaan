/**
 * BannerPreview — Live preview component for a banner object.
 *
 * Used in admin editor and storefront BannerRenderer.
 */

import React from 'react';
import { getBannerResponsiveSources } from '../../../utils/cloudinaryUrl';

const PLACEMENT_RATIOS = {
  hero: 'aspect-[4/5] sm:aspect-[16/9] lg:aspect-[21/8] min-h-[280px] sm:min-h-[240px]',
  promo_home: 'aspect-[2.2/1] sm:aspect-[3.5/1]',
  announcement: 'min-h-[40px]',
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
    bgColor = '#1A0A0A',
    textAlign = 'right',
    overlayOpacity = 30,
    placement = 'promo_home',
    ctaText = '',
  } = banner;

  const resolvedPlacement = placementProp || placement;
  const ratioClass = compact ? 'aspect-[16/5]' : (PLACEMENT_RATIOS[resolvedPlacement] || 'aspect-[4/1]');
  const alignClass = ALIGN_CLASSES[textAlign] || ALIGN_CLASSES.right;
  const overlayAlpha = Math.round((overlayOpacity / 100) * 255).toString(16).padStart(2, '0');
  const displayImageRaw = isMobile && mobileImageUrl ? mobileImageUrl : imageUrl;
  const displayImageSources = getBannerResponsiveSources(displayImageRaw, {
    placement: resolvedPlacement === 'hero' ? 'hero' : resolvedPlacement,
    isMobile,
  });
  const isAnnouncement = resolvedPlacement === 'announcement';

  if (isAnnouncement && !compact) {
    return null;
  }

  return (
    <div
      className={`relative w-full ${ratioClass} ${rounded ? 'rounded-2xl' : ''} overflow-hidden flex flex-col justify-end select-none`}
      style={{ background: bgColor || '#1A0A0A' }}
    >
      {displayImageSources.src && (
        <img
          src={displayImageSources.src}
          srcSet={displayImageSources.srcSet}
          sizes={displayImageSources.sizes}
          alt={title || 'بانر ترويجي'}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
          loading={imagePriority ? 'eager' : 'lazy'}
          fetchPriority={imagePriority ? 'high' : 'auto'}
        />
      )}

      {overlayOpacity > 0 && displayImageSources.src && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: `#000000${overlayAlpha}` }}
        />
      )}

      {(title || subtitle || description || ctaText) && (
        <div className={`relative z-10 p-3 sm:p-4 flex flex-col gap-0.5 ${alignClass}`}>
          {title && (
            <h2 className="text-white font-extrabold text-xs sm:text-sm lg:text-base leading-tight drop-shadow-lg">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-white/85 font-semibold text-[10px] sm:text-xs leading-snug drop-shadow">
              {subtitle}
            </p>
          )}
          {description && (
            <p className="text-white/70 text-[10px] sm:text-xs leading-relaxed mt-0.5 line-clamp-2">
              {description}
            </p>
          )}
          {ctaText && (
            <span className="inline-flex mt-2 self-start px-3 py-1 rounded-lg bg-gold-600 text-white text-[10px] sm:text-xs font-bold">
              {ctaText}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
