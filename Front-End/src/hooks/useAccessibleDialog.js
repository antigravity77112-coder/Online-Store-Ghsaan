import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Minimal focus trap + Escape + scroll lock for modal dialogs.
 */
export function useAccessibleDialog({ isOpen, onClose, containerRef }) {
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !containerRef?.current) return undefined;

    const container = containerRef.current;
    previousFocusRef.current = document.activeElement;

    const getFocusable = () => [...container.querySelectorAll(FOCUSABLE_SELECTOR)];

    const focusFirst = () => {
      const focusable = getFocusable();
      (focusable[0] || container).focus();
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    focusFirst();
    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocusRef.current?.focus) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose, containerRef]);
}
