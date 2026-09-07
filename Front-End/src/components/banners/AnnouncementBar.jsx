import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone } from 'lucide-react';
import * as api from '../../services/api';
import { getTrackedSet, markTracked, BANNER_IMPRESSION_KEY } from './bannerUtils';

const ROTATE_MS = 4500;

export default function AnnouncementBar({ banners, overlay = false }) {
  const [index, setIndex] = useState(0);
  const banner = banners[index];
  const hasMultiple = banners.length > 1;

  useEffect(() => {
    setIndex(0);
  }, [banners.length]);

  useEffect(() => {
    if (!banner) return;
    const tracked = getTrackedSet(BANNER_IMPRESSION_KEY);
    if (tracked.has(banner.id)) return;
    markTracked(banner.id, BANNER_IMPRESSION_KEY);
    api.trackBannerEvent(banner.id, 'impression').catch(() => {});
  }, [banner?.id]);

  useEffect(() => {
    if (!hasMultiple) return undefined;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [hasMultiple, banners.length]);

  const handleClick = useCallback(() => {
    if (!banner) return;
    api.trackBannerEvent(banner.id, 'click').catch(() => {});
    if (banner.ctaUrl) {
      window.open(banner.ctaUrl, '_blank', 'noopener,noreferrer');
    }
  }, [banner]);

  if (!banner) return null;

  const label = [banner.title, banner.subtitle, banner.description].filter(Boolean).join(' — ');
  const bgStyle = banner.bgColor && banner.bgColor !== 'transparent'
    ? { backgroundColor: banner.bgColor }
    : undefined;

  const inner = (
    <div
      className={`relative w-full overflow-hidden ${overlay ? '' : ''}`}
      style={!overlay ? bgStyle : undefined}
    >
      <div className={`absolute inset-0 ${overlay ? 'bg-black/35 backdrop-blur-md' : 'bg-gradient-to-r from-gold-600/90 via-gold-500/90 to-gold-600/90'}`} />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-center gap-2 py-2 ${overlay ? 'min-h-[36px]' : 'min-h-[40px] sm:min-h-[44px]'}`}>
          <Megaphone className="w-3.5 h-3.5 text-white/90 flex-shrink-0 hidden sm:block" />
          <AnimatePresence mode="wait">
            <motion.p
              key={banner.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="text-xs sm:text-sm font-bold text-white text-center leading-snug line-clamp-2"
            >
              {label}
            </motion.p>
          </AnimatePresence>
          {hasMultiple && (
            <div className="flex items-center gap-1 mr-2 flex-shrink-0">
              {banners.map((b, i) => (
                <span
                  key={b.id}
                  className={`rounded-full transition-all ${i === index ? 'w-3 h-1 bg-white' : 'w-1 h-1 bg-white/50'}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (banner.ctaUrl) {
    return (
      <button type="button" onClick={handleClick} className="w-full text-right cursor-pointer">
        {inner}
      </button>
    );
  }

  return inner;
}
