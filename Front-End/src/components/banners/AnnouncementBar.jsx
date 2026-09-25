import React, { useCallback, useEffect, useMemo } from 'react';
import { Megaphone } from 'lucide-react';
import * as api from '../../services/api';
import { getTrackedSet, markTracked, BANNER_IMPRESSION_KEY } from './bannerUtils';

function bannerLabel(banner) {
  return [banner.title, banner.subtitle, banner.description].filter(Boolean).join(' — ');
}

/**
 * Scrolling announcement ticker (gisaah.com-style moving belt).
 * Multiple active banners are joined with · into one continuous RTL marquee.
 */
export default function AnnouncementBar({ banners, overlay = false }) {
  const segments = useMemo(
    () => (banners || []).map((b) => ({ id: b.id, label: bannerLabel(b), ctaUrl: b.ctaUrl })).filter((s) => s.label),
    [banners],
  );

  const primary = banners?.[0];
  const bgColor = primary?.bgColor && primary.bgColor !== 'transparent'
    ? primary.bgColor
    : '#C9A227';
  const textColor = primary?.textColor || '#ffffff';
  const scrollSpeed = Math.min(120, Math.max(8, Number(primary?.scrollSpeed) || 40));

  const joinedText = useMemo(
    () => segments.map((s) => s.label).join('  ·  '),
    [segments],
  );

  useEffect(() => {
    if (!banners?.length) return;
    const tracked = getTrackedSet(BANNER_IMPRESSION_KEY);
    for (const banner of banners) {
      if (tracked.has(banner.id)) continue;
      markTracked(banner.id, BANNER_IMPRESSION_KEY);
      api.trackBannerEvent(banner.id, 'impression').catch(() => {});
    }
  }, [banners]);

  const handleClick = useCallback(() => {
    const withCta = banners?.find((b) => b.ctaUrl) || primary;
    if (!withCta) return;
    api.trackBannerEvent(withCta.id, 'click').catch(() => {});
    if (withCta.ctaUrl) {
      window.open(withCta.ctaUrl, '_blank', 'noopener,noreferrer');
    }
  }, [banners, primary]);

  if (!segments.length || !joinedText) return null;

  const hasCta = Boolean(banners?.some((b) => b.ctaUrl));

  const track = (
    <div className="offer-belt-track flex w-max max-w-none items-center gap-10 whitespace-nowrap py-2.5 sm:py-3" style={{ animationDuration: `${scrollSpeed}s` }}>
      {[0, 1].map((copy) => (
        <span key={copy} className="inline-flex items-center gap-3 text-xs sm:text-sm font-bold leading-none" style={{ color: textColor }}>
          <Megaphone className="w-3.5 h-3.5 flex-shrink-0 opacity-90 hidden sm:block" aria-hidden="true" />
          <span>{joinedText}</span>
          <span className="opacity-50" aria-hidden="true">·</span>
          <span>{joinedText}</span>
        </span>
      ))}
    </div>
  );

  const inner = (
    <div
      className={`relative w-full overflow-hidden ${overlay ? '' : ''}`}
      style={overlay ? undefined : { backgroundColor: bgColor }}
    >
      {overlay ? (
        <div className="absolute inset-0 bg-black/35 backdrop-blur-md" />
      ) : null}
      <div className="relative z-10">
        <div className="offer-belt-viewport overflow-hidden" dir="ltr">
          {track}
        </div>
        {/* Static fallback for reduced motion (CSS hides the animated track) */}
        <p
          className="offer-belt-static hidden text-xs sm:text-sm font-bold text-center leading-snug px-4 py-2.5 line-clamp-2"
          style={{ color: textColor }}
        >
          {joinedText}
        </p>
      </div>
    </div>
  );

  if (hasCta) {
    return (
      <button type="button" onClick={handleClick} className="w-full text-right cursor-pointer">
        {inner}
      </button>
    );
  }

  return inner;
}
