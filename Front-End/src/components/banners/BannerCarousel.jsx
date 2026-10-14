import React, { useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BannerPreview from '../../pages/admin/banners/BannerPreview';
import { markTracked, getTrackedSet, BANNER_IMPRESSION_KEY } from './bannerUtils';
import { useBannerCarousel } from './useBannerCarousel';
import * as api from '../../services/api';

const DEFAULT_INTERVAL_MS = 5000;

/**
 * @param {'default' | 'hero'} [variant]
 * hero = opacity fade + dots overlaid on the slide (matches HeroSection)
 */
export default function BannerCarousel({
  banners,
  placement,
  isMobile,
  autoPlayMs = DEFAULT_INTERVAL_MS,
  className = '',
  showDots = true,
  rounded = true,
  variant = 'default',
}) {
  const isHeroVariant = variant === 'hero';
  const isRtlPlacement = placement === 'product' || placement === 'sidebar';
  const { index, goTo, hasMultiple, swipeHandlers } = useBannerCarousel({
    itemCount: banners.length,
    autoPlayMs,
    rtl: isRtlPlacement,
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

  const slidePx = isMobile ? 24 : 40;
  const enterX = isRtlPlacement ? slidePx : -slidePx;
  const exitX = isRtlPlacement ? -slidePx : slidePx;
  const wrapClass = `${className} relative touch-pan-y select-none`.trim();

  const motionProps = isHeroVariant
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.35 },
      }
    : {
        initial: { opacity: 0, x: enterX },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: exitX },
        transition: { duration: 0.4, ease: 'easeInOut' },
      };

  const content = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={banner.id}
        className="gisaah-motion-carousel"
        {...motionProps}
      >
        <BannerPreview
          banner={banner}
          placement={placement}
          isMobile={isMobile}
          rounded={rounded && !isHeroVariant}
          imagePriority={index === 0}
        />
      </motion.div>
    </AnimatePresence>
  );

  const slide = banner.ctaUrl ? (
    <a
      href={banner.ctaUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleCtaClick}
      className={`block ${rounded && !isHeroVariant ? 'rounded-lg sm:rounded-xl overflow-hidden' : 'overflow-hidden'}`}
      draggable={false}
    >
      {content}
    </a>
  ) : (
    content
  );

  return (
    <div
      className={wrapClass}
      dir={isRtlPlacement ? 'rtl' : undefined}
      aria-roledescription="carousel"
      {...swipeHandlers}
    >
      {slide}

      {hasMultiple && showDots && (
        <div
          className={
            isHeroVariant
              ? 'absolute bottom-1.5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 pointer-events-auto'
              : 'mt-1.5 flex items-center justify-center gap-0.5'
          }
          role="tablist"
          aria-label="تنقل البانرات"
        >
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              role="tab"
              aria-label={`البانر ${i + 1}`}
              aria-selected={i === index}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => goTo(i)}
              className={
                isHeroVariant
                  ? 'p-1 flex items-center justify-center'
                  : 'p-1 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/70 rounded-full'
              }
            >
              <span
                className={`block rounded-full transition-all ${
                  isHeroVariant
                    ? (i === index ? 'w-2.5 h-0.5 bg-white' : 'w-1 h-0.5 bg-white/50')
                    : (i === index
                      ? 'w-2.5 h-0.5 bg-gold-500'
                      : 'w-1 h-0.5 bg-stone-300 dark:bg-stone-600')
                }`}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
