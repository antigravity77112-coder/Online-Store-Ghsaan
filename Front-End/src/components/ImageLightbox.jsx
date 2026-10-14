/**
 * ImageLightbox — عارض صور بملء الشاشة مع سحب للتنقل وتكبير (ضغط مزدوج / قرص).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useGallerySwipe } from '../hooks/useGallerySwipe';
import { getOptimizedImageUrl, getRawCloudinaryUrl } from '../utils/cloudinaryUrl';

const MAX_ZOOM = 4;
const DOUBLE_TAP_ZOOM = 2.5;
const LIGHTBOX_WIDTH = 1600;

function distance(a, b) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

export default function ImageLightbox({
  images = [],
  index = 0,
  open,
  onClose,
  onIndexChange,
  altByUrl = {},
  fallbackAlt = '',
}) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [broken, setBroken] = useState(() => new Set());
  const pinchRef = useRef(null);
  const panRef = useRef(null);
  const lastTapRef = useRef(0);

  const count = images.length;
  const safeIndex = Math.min(Math.max(index, 0), Math.max(count - 1, 0));
  const url = images[safeIndex];
  const zoomed = zoom > 1.01;

  const resetZoom = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const goPrev = useCallback(() => {
    if (count <= 1) return;
    resetZoom();
    onIndexChange?.((safeIndex - 1 + count) % count);
  }, [count, safeIndex, onIndexChange, resetZoom]);

  const goNext = useCallback(() => {
    if (count <= 1) return;
    resetZoom();
    onIndexChange?.((safeIndex + 1) % count);
  }, [count, safeIndex, onIndexChange, resetZoom]);

  const swipe = useGallerySwipe({ onPrev: goPrev, onNext: goNext, enabled: count > 1 && !zoomed });

  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      const rtl = document.documentElement.dir === 'rtl';
      if (e.key === 'ArrowLeft') (rtl ? goNext : goPrev)();
      if (e.key === 'ArrowRight') (rtl ? goPrev : goNext)();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, goNext, goPrev]);

  useEffect(() => {
    if (!open) resetZoom();
  }, [open, resetZoom]);

  // Preload current + neighbors so next/prev doesn't stick on the previous frame.
  useEffect(() => {
    if (!open || count <= 1) return undefined;
    const idxs = new Set([
      safeIndex,
      (safeIndex + 1) % count,
      (safeIndex - 1 + count) % count,
    ]);
    const loaders = [...idxs].map((i) => {
      const u = images[i];
      if (!u) return null;
      const img = new Image();
      img.src = getOptimizedImageUrl(u, LIGHTBOX_WIDTH);
      return img;
    });
    return () => {
      loaders.forEach((img) => {
        if (img) img.src = '';
      });
    };
  }, [open, images, safeIndex, count]);

  if (!open || !url) return null;

  const srcFor = (u) => (broken.has(u) ? getRawCloudinaryUrl(u) : getOptimizedImageUrl(u, LIGHTBOX_WIDTH));

  const toggleZoom = () => {
    if (zoomed) resetZoom();
    else setZoom(DOUBLE_TAP_ZOOM);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      pinchRef.current = { dist: distance(e.touches[0], e.touches[1]), zoom };
      return;
    }
    if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 280) {
        toggleZoom();
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;
      if (zoomed) {
        const t = e.touches[0];
        panRef.current = { x: t.clientX, y: t.clientY, offset };
        return;
      }
    }
    swipe.onTouchStart(e);
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const ratio = distance(e.touches[0], e.touches[1]) / pinchRef.current.dist;
      const next = Math.min(MAX_ZOOM, Math.max(1, pinchRef.current.zoom * ratio));
      setZoom(next);
      if (next <= 1.01) setOffset({ x: 0, y: 0 });
      return;
    }
    if (e.touches.length === 1 && panRef.current && zoomed) {
      const t = e.touches[0];
      setOffset({
        x: panRef.current.offset.x + (t.clientX - panRef.current.x),
        y: panRef.current.offset.y + (t.clientY - panRef.current.y),
      });
    }
  };

  const handleTouchEnd = (e) => {
    if (pinchRef.current && e.touches.length < 2) {
      pinchRef.current = null;
      return;
    }
    if (panRef.current) {
      panRef.current = null;
      return;
    }
    swipe.onTouchEnd(e);
  };

  const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
  const PrevIcon = rtl ? ChevronRight : ChevronLeft;
  const NextIcon = rtl ? ChevronLeft : ChevronRight;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex flex-col bg-black/95 text-white"
      role="dialog"
      aria-modal="true"
      aria-label="عرض الصور"
    >
      <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
        <button
          type="button"
          onClick={onClose}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
          aria-label="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>
        {count > 1 ? (
          <span className="text-sm font-bold tabular-nums">{safeIndex + 1} / {count}</span>
        ) : <span />}
        <button
          type="button"
          onClick={toggleZoom}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
          aria-label={zoomed ? 'تصغير' : 'تكبير'}
        >
          {zoomed ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
        </button>
      </div>

      <div
        className="relative flex-1 overflow-hidden touch-none select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={swipe.onTouchCancel}
        onPointerDown={zoomed ? undefined : swipe.onPointerDown}
        onPointerUp={zoomed ? undefined : swipe.onPointerUp}
        onPointerCancel={swipe.onPointerCancel}
        onDoubleClick={toggleZoom}
      >
        {images.map((imgUrl, idx) => {
          const isActive = idx === safeIndex;
          const isNear = Math.abs(idx - safeIndex) <= 1
            || (safeIndex === 0 && idx === count - 1)
            || (safeIndex === count - 1 && idx === 0);
          if (!isActive && !isNear) return null;
          return (
            <img
              key={`${imgUrl}-${idx}`}
              src={srcFor(imgUrl)}
              alt={isActive ? (altByUrl[imgUrl] || fallbackAlt) : ''}
              aria-hidden={!isActive}
              draggable={false}
              onError={() => setBroken((prev) => (prev.has(imgUrl) ? prev : new Set(prev).add(imgUrl)))}
              className={`absolute inset-0 m-auto max-w-full max-h-full object-contain transition-opacity duration-150 ease-out ${
                isActive ? 'opacity-100 z-[1]' : 'opacity-0 z-0 pointer-events-none'
              }`}
              style={isActive ? { transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` } : undefined}
              loading={isActive || isNear ? 'eager' : 'lazy'}
              decoding="async"
            />
          );
        })}

        {count > 1 && !zoomed ? (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute top-1/2 -translate-y-1/2 start-2 min-w-[44px] min-h-[44px] hidden sm:flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
              aria-label="الصورة السابقة"
            >
              <PrevIcon className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute top-1/2 -translate-y-1/2 end-2 min-w-[44px] min-h-[44px] hidden sm:flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
              aria-label="الصورة التالية"
            >
              <NextIcon className="w-6 h-6" />
            </button>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <div
          className="flex items-center justify-center gap-2 px-3 py-3 overflow-x-auto scrollbar-hide shrink-0"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          {images.map((thumb, idx) => (
            <button
              key={`${thumb}-${idx}`}
              type="button"
              onClick={() => { resetZoom(); onIndexChange?.(idx); }}
              aria-label={`صورة ${idx + 1}`}
              aria-current={idx === safeIndex ? 'true' : undefined}
              className={`flex-shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 ${
                idx === safeIndex ? 'border-white' : 'border-transparent opacity-60'
              }`}
            >
              <img src={getOptimizedImageUrl(thumb, 120)} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
