import { useEffect, useRef } from 'react';
import { useNavigationType } from 'react-router-dom';
import { setListingMemory } from '../utils/listingSessionMemory';
import {
  captureListingExit,
  isListingScrollRestoreActive,
  isProductListingHref,
  shouldRestoreListing,
  startListingScrollRestore,
} from '../utils/listingScrollRestore';

function readScrollY() {
  return window.scrollY || document.documentElement.scrollTop || 0;
}

/**
 * Capture listing scroll on exit; restore window place via module-level loop on Back.
 *
 * @param {{ listingKey: string, ready?: boolean, pagesReady?: boolean }} opts
 */
export function useListingScrollMemory({ listingKey, ready = true, pagesReady = false }) {
  const navigationType = useNavigationType();
  const listingKeyRef = useRef(listingKey);
  listingKeyRef.current = listingKey;
  const startedRef = useRef('');

  useEffect(() => {
    startedRef.current = '';
  }, [listingKey]);

  // Persist scroll while browsing; snapshot before product navigation.
  useEffect(() => {
    if (!listingKey) return undefined;

    const persist = () => {
      // Never overwrite the frozen restore target while a Back-restore is running.
      if (isListingScrollRestoreActive()) return;
      const y = readScrollY();
      if (y > 8) setListingMemory(listingKeyRef.current, { scrollY: y });
    };

    const onProductIntent = (event) => {
      const target = event.target;
      if (!target || typeof target.closest !== 'function') return;
      const anchor = target.closest('a[href]');
      if (!anchor) return;
      const href = anchor.getAttribute('href') || '';
      if (!isProductListingHref(href)) return;
      // Capture BEFORE React Router navigates / ScrollToTop zeros the window.
      captureListingExit(listingKeyRef.current);
    };

    window.addEventListener('scroll', persist, { passive: true });
    document.addEventListener('pointerdown', onProductIntent, true);
    document.addEventListener('click', onProductIntent, true);

    return () => {
      // Do not persist on unmount if window was already scrolled to 0 by ScrollToTop.
      if (!isListingScrollRestoreActive()) {
        const y = readScrollY();
        if (y > 8) setListingMemory(listingKeyRef.current, { scrollY: y });
      }
      window.removeEventListener('scroll', persist);
      document.removeEventListener('pointerdown', onProductIntent, true);
      document.removeEventListener('click', onProductIntent, true);
    };
  }, [listingKey]);

  // Kick module-level restore once on Back. Do not cancel the module loop on cleanup.
  useEffect(() => {
    if (!listingKey || !ready) return;
    if (!shouldRestoreListing(listingKey, navigationType)) return;

    const startToken = `${listingKey}|back`;
    if (startedRef.current !== startToken) {
      startedRef.current = startToken;
      startListingScrollRestore(listingKey, { pagesReady });
      return;
    }

    if (pagesReady) {
      startListingScrollRestore(listingKey, { pagesReady: true });
    }
  }, [listingKey, ready, pagesReady, navigationType]);
}
