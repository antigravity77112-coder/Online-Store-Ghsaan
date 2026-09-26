import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Megaphone } from 'lucide-react';
import * as api from '../../services/api';
import { getTrackedSet, markTracked, BANNER_IMPRESSION_KEY } from './bannerUtils';

function bannerLabel(banner) {
  return [banner.title, banner.subtitle, banner.description].filter(Boolean).join(' — ');
}

function resolveBg(banner) {
  const c = banner?.bgColor;
  if (c && c !== 'transparent') return c;
  return '#C9A227';
}

function resolveSpeed(banner) {
  return Math.min(120, Math.max(8, Number(banner?.scrollSpeed) || 40));
}

/**
 * Scrolling announcement ticker under the header.
 * Multiple banners play sequentially: one full loop each (own bg/text/speed), then cycle.
 */
export default function AnnouncementBar({ banners, overlay = false }) {
  const ordered = useMemo(() => {
    const list = Array.isArray(banners) ? [...banners] : [];
    list.sort((a, b) => (Number(a.priority) || 0) - (Number(b.priority) || 0));
    return list.filter((b) => bannerLabel(b));
  }, [banners]);

  const orderKey = useMemo(() => ordered.map((b) => b.id).join('|'), [ordered]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loopNonce, setLoopNonce] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
    setLoopNonce(0);
  }, [orderKey]);

  const safeIndex = ordered.length ? activeIndex % ordered.length : 0;
  const active = ordered[safeIndex] || null;
  const label = active ? bannerLabel(active) : '';
  const bgColor = resolveBg(active);
  const textColor = active?.textColor || '#ffffff';
  const scrollSpeed = resolveSpeed(active);

  useEffect(() => {
    if (!active?.id) return;
    const tracked = getTrackedSet(BANNER_IMPRESSION_KEY);
    if (tracked.has(active.id)) return;
    markTracked(active.id, BANNER_IMPRESSION_KEY);
    api.trackBannerEvent(active.id, 'impression').catch(() => {});
  }, [active?.id]);

  const advance = useCallback(() => {
    if (ordered.length <= 1) {
      setLoopNonce((n) => n + 1);
      return;
    }
    setActiveIndex((i) => (i + 1) % ordered.length);
  }, [ordered.length]);

  const handleClick = useCallback(() => {
    if (!active) return;
    api.trackBannerEvent(active.id, 'click').catch(() => {});
    if (active.ctaUrl) {
      window.open(active.ctaUrl, '_blank', 'noopener,noreferrer');
    }
  }, [active]);

  if (!ordered.length || !label) return null;

  const hasCta = Boolean(active?.ctaUrl);
  const trackKey = `${active?.id || 'banner'}-${safeIndex}-${loopNonce}`;

  const track = (
    <div
      key={trackKey}
      className="offer-belt-track offer-belt-track--once flex w-max max-w-none items-center gap-10 whitespace-nowrap py-2.5 sm:py-3"
      style={{ animationDuration: `${scrollSpeed}s` }}
      onAnimationEnd={(e) => {
        if (e.target !== e.currentTarget) return;
        advance();
      }}
    >
      {[0, 1].map((copy) => (
        <span
          key={copy}
          className="inline-flex items-center gap-3 text-xs sm:text-sm font-bold leading-none"
          style={{ color: textColor }}
        >
          <Megaphone className="w-3.5 h-3.5 flex-shrink-0 opacity-90 hidden sm:block" aria-hidden="true" />
          <span>{label}</span>
          <span className="opacity-50" aria-hidden="true">·</span>
          <span>{label}</span>
        </span>
      ))}
    </div>
  );

  const inner = (
    <div
      className="relative w-full overflow-hidden"
      style={overlay ? undefined : { backgroundColor: bgColor }}
    >
      {overlay ? (
        <div className="absolute inset-0 bg-black/35 backdrop-blur-md" />
      ) : null}
      <div className="relative z-10">
        <div className="offer-belt-viewport overflow-hidden" dir="ltr">
          {track}
        </div>
        <p
          className="offer-belt-static hidden text-xs sm:text-sm font-bold text-center leading-snug px-4 py-2.5 line-clamp-2"
          style={{ color: textColor }}
        >
          {label}
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
