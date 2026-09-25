/**
 * BannerRenderer — Storefront placement-aware banner component.
 *
 * Supports multiple banners per placement with auto-rotate carousels,
 * rotating announcement bar, per-popup dismiss, and mobile image variants.
 */

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import useSWR from 'swr';
import * as api from '../services/api';
import BannerPreview from '../pages/admin/banners/BannerPreview';
import BannerCarousel from './banners/BannerCarousel';
import AnnouncementBar from './banners/AnnouncementBar';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
import {
  useIsMobile,
  filterVisibleBanners,
  getDismissedPopups,
  markPopupDismissed,
  getTrackedSet,
  markTracked,
  BANNER_IMPRESSION_KEY,
} from './banners/bannerUtils';

const PLACEMENT_DEFAULTS = {
  promo_home: { className: 'w-full my-2 sm:my-3', autoPlayMs: 4500 },
  category: { className: 'w-full my-2 sm:my-3', autoPlayMs: 4500 },
  footer: { className: 'w-full my-2', autoPlayMs: 5500 },
  product: { className: 'w-full my-4', autoPlayMs: 4500 },
  sidebar: { className: 'w-full', autoPlayMs: 6000 },
};

function PopupBannerDialog({
  banner,
  isMobile,
  popupIndex,
  popupCount,
  onDismiss,
  onCtaClick,
}) {
  const dialogRef = useRef(null);
  const titleId = `popup-banner-title-${banner.id}`;
  const descriptionId = `popup-banner-desc-${banner.id}`;
  const dialogLabel = banner.title || 'بانر ترويجي';
  const dialogDescription = banner.subtitle || banner.description || '';

  useAccessibleDialog({
    isOpen: true,
    onClose: onDismiss,
    containerRef: dialogRef,
  });

  return (
    <AnimatePresence>
      <motion.div
        key={banner.id}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 gisaah-motion-carousel"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onDismiss}
        aria-hidden="true"
      >
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={dialogDescription ? descriptionId : undefined}
          tabIndex={-1}
          className="relative w-full max-w-md gisaah-motion-carousel outline-none"
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <span id={titleId} className="sr-only">{dialogLabel}</span>
          {dialogDescription ? (
            <span id={descriptionId} className="sr-only">{dialogDescription}</span>
          ) : null}
          <button
            type="button"
            onClick={onDismiss}
            className="absolute top-3 left-3 z-10 min-w-[44px] min-h-[44px] rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
          {banner.ctaUrl ? (
            <a
              href={banner.ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onCtaClick}
            >
              <BannerPreview banner={banner} placement="popup" isMobile={isMobile} />
            </a>
          ) : (
            <BannerPreview banner={banner} placement="popup" isMobile={isMobile} />
          )}
          {popupCount > 1 && (
            <p className="text-center text-xs text-white/70 mt-2" aria-live="polite">
              {popupIndex + 1} / {popupCount}
            </p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function BannerRenderer({ placement, className: classNameProp, overlay = false }) {
  const isMobile = useIsMobile();
  const [dismissedPopups, setDismissedPopups] = useState(() => getDismissedPopups());
  const [popupIndex, setPopupIndex] = useState(0);

  const { data: banners, isLoading } = useSWR(
    `banners-${placement}`,
    () => api.getBanners(placement),
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  );

  const visibleBanners = useMemo(
    () => filterVisibleBanners(banners, isMobile),
    [banners, isMobile]
  );

  const popupBanners = useMemo(
    () => visibleBanners.filter((b) => !dismissedPopups.has(b.id)),
    [visibleBanners, dismissedPopups]
  );

  const popupBanner = popupBanners[popupIndex] ?? null;

  const defaults = PLACEMENT_DEFAULTS[placement] || { className: 'w-full my-4', autoPlayMs: 5500 };
  const className = classNameProp || defaults.className;

  // Single-banner impression tracking (announcement/popup handle their own)
  const singleBanner = visibleBanners.length === 1 ? visibleBanners[0] : null;
  useEffect(() => {
    if (!singleBanner || placement === 'announcement' || placement === 'popup') return;
    const tracked = getTrackedSet(BANNER_IMPRESSION_KEY);
    if (tracked.has(singleBanner.id)) return;
    markTracked(singleBanner.id, BANNER_IMPRESSION_KEY);
    api.trackBannerEvent(singleBanner.id, 'impression').catch(() => {});
  }, [singleBanner?.id, placement]);

  const handlePopupDismiss = useCallback(() => {
    if (!popupBanner) return;
    markPopupDismissed(popupBanner.id);
    setDismissedPopups(getDismissedPopups());
    if (popupIndex < popupBanners.length - 1) {
      setPopupIndex((i) => i + 1);
    }
  }, [popupBanner, popupIndex, popupBanners.length]);

  const handlePopupCtaClick = useCallback(() => {
    if (!popupBanner) return;
    api.trackBannerEvent(popupBanner.id, 'click').catch(() => {});
  }, [popupBanner?.id]);

  useEffect(() => {
    if (!popupBanner) return;
    const tracked = getTrackedSet(BANNER_IMPRESSION_KEY);
    if (tracked.has(popupBanner.id)) return;
    markTracked(popupBanner.id, BANNER_IMPRESSION_KEY);
    api.trackBannerEvent(popupBanner.id, 'impression').catch(() => {});
  }, [popupBanner?.id]);

  if (isLoading) {
    // Secondary placements are usually empty; a skeleton there would flash on every page.
    if (placement !== 'promo_home') return null;
    return (
      <div className={`${className} aspect-[2.2/1] sm:aspect-[3.5/1] rounded-lg sm:rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse`} aria-hidden="true" />
    );
  }

  if (!visibleBanners.length) return null;

  // ── Popup ────────────────────────────────────────────────────────────────────
  if (placement === 'popup') {
    if (!popupBanner) return null;
    return (
      <PopupBannerDialog
        banner={popupBanner}
        isMobile={isMobile}
        popupIndex={popupIndex}
        popupCount={popupBanners.length}
        onDismiss={handlePopupDismiss}
        onCtaClick={handlePopupCtaClick}
      />
    );
  }

  // ── Announcement bar ─────────────────────────────────────────────────────────
  if (placement === 'announcement') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full"
      >
        <AnnouncementBar banners={visibleBanners} overlay={overlay} />
      </motion.div>
    );
  }

  // ── Single banner (no carousel needed) ─────────────────────────────────────────
  if (visibleBanners.length === 1) {
    const banner = visibleBanners[0];
    const handleCtaClick = () => {
      api.trackBannerEvent(banner.id, 'click').catch(() => {});
    };

    return (
      <motion.div
        className={className}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {banner.ctaUrl ? (
          <a
            href={banner.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleCtaClick}
            className="block rounded-lg sm:rounded-xl overflow-hidden"
          >
            <BannerPreview banner={banner} placement={placement} isMobile={isMobile} />
          </a>
        ) : (
          <BannerPreview banner={banner} placement={placement} isMobile={isMobile} />
        )}
      </motion.div>
    );
  }

  // ── Multiple banners → carousel ────────────────────────────────────────────────
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <BannerCarousel
        banners={visibleBanners}
        placement={placement}
        isMobile={isMobile}
        autoPlayMs={defaults.autoPlayMs}
        rounded={placement !== 'footer'}
      />
    </motion.div>
  );
}
