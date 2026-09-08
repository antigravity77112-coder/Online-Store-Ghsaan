import { useCallback, useRef } from 'react';

const SWIPE_THRESHOLD = 50;

/**
 * Horizontal swipe/drag for image galleries (touch + mouse pointer).
 * Ignores mostly-vertical gestures.
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

  const clearStart = useCallback(() => {
    pointerStart.current = null;
  }, []);

  return {
    onTouchStart: (e) => {
      const t = e.touches[0];
      if (!t) return;
      pointerStart.current = { x: t.clientX, y: t.clientY, kind: 'touch' };
    },
    onTouchEnd: (e) => {
      if (!pointerStart.current || pointerStart.current.kind !== 'touch') return;
      const t = e.changedTouches[0];
      if (!t) return;
      finishSwipe(pointerStart.current.x, t.clientX, pointerStart.current.y, t.clientY);
      clearStart();
    },
    onTouchCancel: clearStart,
    onPointerDown: (e) => {
      // Touch is handled via onTouch*; avoid double-firing.
      if (e.pointerType === 'touch') return;
      if (e.button !== 0) return;
      pointerStart.current = { x: e.clientX, y: e.clientY, kind: 'pointer', id: e.pointerId };
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    onPointerUp: (e) => {
      if (!pointerStart.current || pointerStart.current.kind !== 'pointer') return;
      if (pointerStart.current.id != null && e.pointerId !== pointerStart.current.id) return;
      finishSwipe(pointerStart.current.x, e.clientX, pointerStart.current.y, e.clientY);
      clearStart();
    },
    onPointerCancel: clearStart,
    onPointerLeave: (e) => {
      // Finish if pointer leaves while dragging (mouse without capture).
      if (!pointerStart.current || pointerStart.current.kind !== 'pointer') return;
      if (e.buttons === 0) {
        finishSwipe(pointerStart.current.x, e.clientX, pointerStart.current.y, e.clientY);
        clearStart();
      }
    },
  };
}
