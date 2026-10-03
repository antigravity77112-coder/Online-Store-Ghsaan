import { useCallback, useEffect, useRef, useState } from 'react';

const SWIPE_THRESHOLD = 50;

/**
 * Auto-rotating carousel with touch swipe + mouse drag navigation.
 * Resets the autoplay timer after manual navigation.
 */
export function useBannerCarousel({ itemCount = 0, autoPlayMs = 5500, autoPlay = true, rtl = false }) {
  const [index, setIndex] = useState(0);
  const pointerStart = useRef(null);
  const [autoplayEpoch, setAutoplayEpoch] = useState(0);

  const count = itemCount || 0;
  const hasMultiple = count > 1;

  useEffect(() => {
    setIndex(0);
  }, [count]);

  const bumpAutoplay = useCallback(() => {
    setAutoplayEpoch((e) => e + 1);
  }, []);

  const goTo = useCallback(
    (next) => {
      if (count <= 0) return;
      setIndex(((next % count) + count) % count);
      bumpAutoplay();
    },
    [count, bumpAutoplay]
  );

  const goNext = useCallback(() => {
    setIndex((i) => {
      if (count <= 0) return 0;
      const next = (i + 1) % count;
      return next;
    });
    bumpAutoplay();
  }, [count, bumpAutoplay]);

  const goPrev = useCallback(() => {
    setIndex((i) => {
      if (count <= 0) return 0;
      const next = (i - 1 + count) % count;
      return next;
    });
    bumpAutoplay();
  }, [count, bumpAutoplay]);

  useEffect(() => {
    if (!autoPlay || !hasMultiple) return undefined;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) return undefined;

    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, autoPlayMs);
    return () => clearInterval(timer);
  }, [autoPlay, hasMultiple, count, autoPlayMs, autoplayEpoch]);

  const finishSwipe = useCallback(
    (startX, endX, startY, endY) => {
      if (!hasMultiple) return false;
      const dx = endX - startX;
      const dy = endY - startY;
      if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return false;
      // In RTL, swipe toward the start edge (right→left visually is positive dx) advances.
      const forward = rtl ? dx > 0 : dx < 0;
      if (forward) goNext();
      else goPrev();
      return true;
    },
    [hasMultiple, goNext, goPrev, rtl]
  );

  const swipeHandlers = {
    onTouchStart: (e) => {
      const t = e.touches[0];
      if (!t) return;
      pointerStart.current = { x: t.clientX, y: t.clientY, type: 'touch' };
    },
    onTouchEnd: (e) => {
      if (!pointerStart.current || pointerStart.current.type !== 'touch') return;
      const t = e.changedTouches[0];
      if (!t) return;
      finishSwipe(pointerStart.current.x, t.clientX, pointerStart.current.y, t.clientY);
      pointerStart.current = null;
    },
    onTouchCancel: () => {
      pointerStart.current = null;
    },
    onPointerDown: (e) => {
      if (e.pointerType === 'touch') return;
      pointerStart.current = { x: e.clientX, y: e.clientY, type: 'mouse', id: e.pointerId };
    },
    onPointerUp: (e) => {
      if (!pointerStart.current || pointerStart.current.type !== 'mouse') return;
      if (pointerStart.current.id !== e.pointerId) return;
      finishSwipe(pointerStart.current.x, e.clientX, pointerStart.current.y, e.clientY);
      pointerStart.current = null;
    },
    onPointerCancel: () => {
      pointerStart.current = null;
    },
  };

  return { index, goTo, goNext, goPrev, hasMultiple, swipeHandlers };
}
