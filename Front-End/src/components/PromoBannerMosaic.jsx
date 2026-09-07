/**
 * PromoBannerMosaic — شبكة بانرات ترويجية (نمط Shein)
 *
 * EN: 2–3 clickable promo tiles in a tight grid between homepage sections.
 * AR: شبكة 2–3 بلاطات بانر مدمجة للصفحة الرئيسية.
 */

import React, { useMemo } from 'react';
import useSWR from 'swr';
import * as api from '../services/api';
import BannerPreview from '../pages/admin/banners/BannerPreview';
import { useIsMobile, filterVisibleBanners } from './banners/bannerUtils';

const MAX_TILES = 3;

export default function PromoBannerMosaic({
  placement = 'category',
  className = '',
  maxTiles = MAX_TILES,
}) {
  const isMobile = useIsMobile();

  const { data: banners, isLoading } = useSWR(
    `banners-mosaic-${placement}`,
    () => api.getBanners(placement),
    { revalidateOnFocus: false, dedupingInterval: 10000 },
  );

  const visible = useMemo(
    () => filterVisibleBanners(banners, isMobile).slice(0, maxTiles),
    [banners, isMobile, maxTiles],
  );

  if (isLoading) {
    const skeletonAspect = placement === 'promo_home'
      ? 'aspect-[2.2/1]'
      : 'aspect-[4/5] sm:aspect-[3/4]';
    return (
      <div
        className={`grid grid-cols-3 gap-1.5 sm:gap-2 ${className}`}
        aria-hidden="true"
      >
        {Array.from({ length: maxTiles }).map((_, i) => (
          <div
            key={`mosaic-skel-${i}`}
            className={`${skeletonAspect} rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse`}
          />
        ))}
      </div>
    );
  }

  if (!visible.length) return null;

  const gridCols = visible.length === 1
    ? 'grid-cols-1'
    : visible.length === 2
      ? 'grid-cols-2'
      : 'grid-cols-3';

  return (
    <div className={`grid ${gridCols} gap-1.5 sm:gap-2 ${className}`}>
      {visible.map((banner) => {
        const handleClick = () => {
          api.trackBannerEvent(banner.id, 'click').catch(() => {});
        };

        const tile = (
          <BannerPreview
            banner={banner}
            placement={placement}
            isMobile={isMobile}
            rounded
          />
        );

        return banner.ctaUrl ? (
          <a
            key={banner.id}
            href={banner.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className="block overflow-hidden rounded-sm active:scale-[0.98] transition-transform"
          >
            {tile}
          </a>
        ) : (
          <div
            key={banner.id}
            className="overflow-hidden rounded-sm"
          >
            {tile}
          </div>
        );
      })}
    </div>
  );
}
