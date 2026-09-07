/**
 * HeroSection — بانر رئيسي بنمط Shein (نص + زر + بطاقات منتجات)
 */

import React, { useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import * as api from '../services/api';
import { useIsMobile, filterVisibleBanners } from './banners/bannerUtils';
import { useBannerCarousel } from './banners/useBannerCarousel';
import { getBannerResponsiveSources, getOptimizedImageUrl } from '../utils/cloudinaryUrl';
import { useFormatDisplayPrice } from '../context/CurrencyContext';
import { mapStorefrontProduct } from '../utils/mapStorefrontProduct';

const AUTO_PLAY_MS = 5000;
const SESSION_KEY = 'gisaah_hero_impression';

function getHeroTrackedSet() {
  try { return new Set(JSON.parse(sessionStorage.getItem(SESSION_KEY) || '[]')); }
  catch { return new Set(); }
}

function markHeroTracked(id) {
  try {
    const set = getHeroTrackedSet();
    set.add(id);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...set]));
  } catch { /* ignore */ }
}

function HeroPeekCard({ product }) {
  const formatPrice = useFormatDisplayPrice();
  const image = product.image || product.mainImageUrl || product.imageUrl;
  if (!image) return null;

  const price = product.discountPrice ?? product.price;
  const href = `/product/${product.slug || product.id}`;

  return (
    <Link
      to={href}
      className="block w-[64px] sm:w-[80px] shrink-0 bg-white rounded-lg overflow-hidden shadow-lg ring-1 ring-black/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="aspect-[3/4] bg-stone-100">
        {image ? (
          <img
            src={getOptimizedImageUrl(image, 200)}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : null}
      </div>
      <p className="text-[10px] font-extrabold text-stone-900 text-center py-1 px-0.5 leading-none">
        {formatPrice(price, product.currency)}
      </p>
    </Link>
  );
}

const HeroSection = React.memo(() => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const { data: banners, isLoading } = useSWR(
    'banners-hero',
    () => api.getBanners('hero'),
    { revalidateOnFocus: false, dedupingInterval: 10000 },
  );

  const visibleBanners = useMemo(
    () => filterVisibleBanners(banners, isMobile),
    [banners, isMobile],
  );

  const { index: currentIndex, goTo, hasMultiple, swipeHandlers } = useBannerCarousel({
    itemCount: visibleBanners.length,
    autoPlayMs: AUTO_PLAY_MS,
  });

  const banner = visibleBanners[currentIndex] ?? null;
  const peek = useMemo(() => {
    if (!banner) return [];

    const ids = banner.peekProductIds;
    if (!Array.isArray(ids) || ids.length === 0) return [];

    return (banner.peekProducts || [])
      .slice(0, 2)
      .map(mapStorefrontProduct)
      .filter((p) => Boolean(p.image || p.imageUrl || p.mainImageUrl));
  }, [banner]);

  useEffect(() => {
    if (!banner) return;
    const tracked = getHeroTrackedSet();
    if (tracked.has(banner.id)) return;
    markHeroTracked(banner.id);
    api.trackBannerEvent(banner.id, 'impression').catch(() => {});
  }, [banner?.id]);

  const handleCta = useCallback(() => {
    if (banner) {
      api.trackBannerEvent(banner.id, 'click').catch(() => {});
      if (banner.ctaUrl) {
        window.open(banner.ctaUrl, '_blank', 'noopener,noreferrer');
        return;
      }
    }
    navigate('/products?promoted=true');
  }, [banner, navigate]);

  if (isLoading) {
    return (
      <section
        className="relative w-full overflow-hidden min-h-[240px] sm:min-h-[300px] lg:min-h-[360px] bg-stone-200/50 dark:bg-stone-800 animate-pulse"
        aria-hidden="true"
      />
    );
  }

  if (!banner) return null;

  const activeBanner = banner;

  const bgImageRaw = isMobile && activeBanner.mobileImageUrl ? activeBanner.mobileImageUrl : activeBanner.imageUrl;
  const bgImageSources = getBannerResponsiveSources(bgImageRaw, { placement: 'hero', isMobile });
  const bgColor = activeBanner.bgColor || '#c45c26';
  const hasImage = Boolean(bgImageSources.src);
  const overlayAlpha = Math.round(((activeBanner.overlayOpacity ?? 30) / 100) * 255).toString(16).padStart(2, '0');
  const overlayColor = `#000000${overlayAlpha}`;
  const titleLines = activeBanner.title ? activeBanner.title.split('\n') : [];
  const headline = titleLines[0] || '';
  const subheadline = titleLines.slice(1).join(' ') || activeBanner.description || '';
  const hasTextContent = Boolean(activeBanner.subtitle || headline || subheadline);
  const showCta = Boolean(activeBanner.ctaText || activeBanner.ctaUrl);
  const ctaLabel = activeBanner.ctaText || 'تسوق الآن';

  return (
    <section
      className="relative z-0 w-full overflow-hidden min-h-[240px] sm:min-h-[300px] lg:min-h-[360px] touch-pan-y select-none"
      style={{ backgroundColor: bgColor }}
      aria-roledescription="carousel"
      aria-label="بانرات العروض الرئيسية"
      {...swipeHandlers}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeBanner.id}
          className="absolute inset-0 gisaah-motion-carousel"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          {hasImage ? (
            <img
              src={bgImageSources.src}
              srcSet={bgImageSources.srcSet}
              sizes={bgImageSources.sizes}
              alt=""
              className="w-full h-full min-h-[240px] sm:min-h-[300px] lg:min-h-[360px] object-cover object-[center_10%] md:object-center"
              fetchPriority={currentIndex === 0 ? 'high' : 'auto'}
              loading={currentIndex === 0 ? 'eager' : 'lazy'}
              draggable={false}
            />
          ) : null}
          {(activeBanner.overlayOpacity ?? 30) > 0 && hasImage && (
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: overlayColor }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-l from-black/20 via-transparent to-black/30 pointer-events-none" />
        </motion.div>
      </AnimatePresence>

      {/* Promo copy + peek cards use physical sides so layout stays correct in EN/AR */}
      <div className="absolute inset-0 z-20 pointer-events-none px-3 sm:px-6">
        {(hasTextContent || showCta) && (
          <div className="absolute top-1/2 -translate-y-1/2 right-0 sm:right-1 max-w-[58%] sm:max-w-[50%] text-right">
            {activeBanner.subtitle && (
              <p className="text-[10px] sm:text-xs font-bold text-white/90 mb-1 drop-shadow-md">
                {activeBanner.subtitle}
              </p>
            )}
            {headline && (
              <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-white uppercase leading-[1.1] drop-shadow-lg line-clamp-3">
                {headline}
              </h1>
            )}
            {subheadline && (
              <p className="text-[10px] sm:text-xs text-white/85 mt-1 line-clamp-2 drop-shadow">
                {subheadline}
              </p>
            )}
            {showCta && (
              <button
                type="button"
                onClick={handleCta}
                className="pointer-events-auto mt-2 sm:mt-2.5 inline-flex items-center justify-center min-h-[40px] px-4 sm:px-5 border border-white text-white text-[11px] sm:text-xs font-extrabold uppercase tracking-wide bg-transparent hover:bg-white/15 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              >
                {ctaLabel}
              </button>
            )}
          </div>
        )}

        {peek.length > 0 && (
          <div
            className="absolute bottom-5 sm:bottom-7 left-0 flex flex-row flex-nowrap items-end gap-1.5 sm:gap-2 pointer-events-auto"
            dir="ltr"
          >
            {peek.map((p) => (
              <HeroPeekCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>

      {hasMultiple && banner && (
        <div
          className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 pointer-events-auto"
          role="tablist"
          aria-label="مؤشرات البانر"
        >
          {visibleBanners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              role="tab"
              aria-selected={i === currentIndex}
              aria-label={`البانر ${i + 1}`}
              onClick={() => goTo(i)}
              className="min-w-[32px] min-h-[32px] flex items-center justify-center"
            >
              <span
                className={`rounded-full transition-all ${i === currentIndex ? 'w-3 h-1 bg-white' : 'w-1 h-1 bg-white/50'}`}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
});

HeroSection.displayName = 'HeroSection';
export default HeroSection;
