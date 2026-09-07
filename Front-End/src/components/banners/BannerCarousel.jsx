import React, { useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BannerPreview from '../../pages/admin/banners/BannerPreview';
import { markTracked, getTrackedSet, BANNER_IMPRESSION_KEY } from './bannerUtils';
import { useBannerCarousel } from './useBannerCarousel';
import * as api from '../../services/api';

const DEFAULT_INTERVAL_MS = 5000;

export default function BannerCarousel({
  banners,
  placement,
  isMobile,
  autoPlayMs = DEFAULT_INTERVAL_MS,
  className = '',
  showDots = true,
  rounded = true,
}) {
  const { index, goTo, hasMultiple, swipeHandlers } = useBannerCarousel({
    itemCount: banners.length,
    autoPlayMs,
  });

  const banner = banners[index];

  useEffect(() => {
    if (!banner) return;
    const tracked = getTrackedSet(BANNER_IMPRESSION_KEY);
    if (tracked.has(banner.id)) return;
    markTracked(banner.id, BANNER_IMPRESSION_KEY);
    api.trackBannerEvent(banner.id, 'impression').catch(() => {});
  }, [banner?.id]);

  const handleCtaClick = useCallback(() => {
    if (!banner) return;
    api.trackBannerEvent(banner.id, 'click').catch(() => {});
  }, [banner?.id]);

  if (!banner) return null;

  const wrapClass = `${className} relative touch-pan-y select-none`.trim();

  const content = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={banner.id}
        className="gisaah-motion-carousel"
        initial={{ opacity: 0, x: isMobile ? 24 : 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: isMobile ? -24 : -40 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
      >
        <BannerPreview banner={banner} placement={placement} isMobile={isMobile} rounded={rounded} />
      </motion.div>
    </AnimatePresence>
  );

  return (
    <div className={wrapClass} aria-roledescription="carousel" {...swipeHandlers}>
      {banner.ctaUrl ? (
        <a
          href={banner.ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleCtaClick}
          className={`block ${rounded ? 'rounded-lg sm:rounded-xl overflow-hidden' : ''}`}
          draggable={false}
        >
          {content}
        </a>
      ) : (
        content
      )}

      {hasMultiple && showDots && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/30 backdrop-blur-sm">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              aria-label={`البانر ${i + 1}`}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => goTo(i)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-full"
            >
              <span
                className={`rounded-full transition-all ${i === index ? 'w-4 h-1 bg-gold-400' : 'w-1 h-1 bg-white/60'}`}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
