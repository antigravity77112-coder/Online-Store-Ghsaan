import { useEffect, useLayoutEffect, useRef } from 'react';
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
 * Capture listing scroll on exit; restore instantly on Back (before paint).
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

  useEffect(() => {
    if (!listingKey) return undefined;

    const persist = () => {
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
      captureListingExit(listingKeyRef.current);
    };

    window.addEventListener('scroll', persist, { passive: true });
    document.addEventListener('pointerdown', onProductIntent, true);
    document.addEventListener('click', onProductIntent, true);

    return () => {
      if (!isListingScrollRestoreActive()) {
        const y = readScrollY();
        if (y > 8) setListingMemory(listingKeyRef.current, { scrollY: y });
      }
      window.removeEventListener('scroll', persist);
      document.removeEventListener('pointerdown', onProductIntent, true);
      document.removeEventListener('click', onProductIntent, true);
    };
  }, [listingKey]);

  // Start restore ASAP on Back — do NOT wait for products (that painted Y=0 then climbed).
  useLayoutEffect(() => {
    if (!listingKey) return;
    if (!shouldRestoreListing(listingKey, navigationType)) return;

    const startToken = `${listingKey}|back`;
    if (startedRef.current !== startToken) {
      startedRef.current = startToken;
      startListingScrollRestore(listingKey, { pagesReady: false });
    }

    if (ready && pagesReady && isListingScrollRestoreActive()) {
      startListingScrollRestore(listingKey, { pagesReady: true });
    }
  }, [listingKey, ready, pagesReady, navigationType]);
}
