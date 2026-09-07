import { useCallback, useRef } from 'react';

const SWIPE_THRESHOLD = 50;

/**
 * Horizontal swipe for image galleries. Ignores mostly-vertical gestures.
 */
export function useGallerySwipe({ onPrev, onNext, enabled = true }) {
  const pointerStart = useRef(null);

  const finishSwipe = useCallback((startX, endX, startY, endY) => {
    if (!enabled) return;
    const dx = endX - startX;
    const dy = endY - startY;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) onNext();
    else onPrev();
  }, [enabled, onNext, onPrev]);

  return {
    onTouchStart: (e) => {
      const t = e.touches[0];
      if (!t) return;
      pointerStart.current = { x: t.clientX, y: t.clientY };
    },
    onTouchEnd: (e) => {
      if (!pointerStart.current) return;
      const t = e.changedTouches[0];
      if (!t) return;
      finishSwipe(pointerStart.current.x, t.clientX, pointerStart.current.y, t.clientY);
      pointerStart.current = null;
    },
    onTouchCancel: () => {
      pointerStart.current = null;
    },
  };
}
