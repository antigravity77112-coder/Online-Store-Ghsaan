import { useCallback, useRef } from 'react';

const SWIPE_THRESHOLD = 50;

function isRtlDocument() {
  if (typeof document === 'undefined') return false;
  return (document.documentElement.dir || document.dir || '').toLowerCase() === 'rtl';
}

/**
 * Horizontal swipe/drag for image galleries (touch + mouse pointer).
 * Ignores mostly-vertical gestures. In RTL, swiping right reveals the next image.
 */
export function useGallerySwipe({ onPrev, onNext, enabled = true }) {
  const pointerStart = useRef(null);
  const suppressClick = useRef(false);

  const finishSwipe = useCallback((startX, endX, startY, endY) => {
    if (!enabled) return;
    const dx = endX - startX;
    const dy = endY - startY;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
    suppressClick.current = true;
    const forward = isRtlDocument() ? dx > 0 : dx < 0;
    if (forward) onNext();
    else onPrev();
  }, [enabled, onNext, onPrev]);

  const clearStart = useCallback(() => {
    pointerStart.current = null;
  }, []);

  return {
    onTouchStart: (e) => {
      const t = e.touches[0];
      if (!t) return;
      suppressClick.current = false;
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
      suppressClick.current = false;
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
    onClickCapture: (e) => {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
  };
}
