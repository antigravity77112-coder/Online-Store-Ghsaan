import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import {
  clearAnyExpectedListingReturn,
  getExpectedListingReturnKey,
} from '../utils/listingSessionMemory';
import {
  isListingScrollRestoreActive,
  startListingScrollRestore,
} from '../utils/listingScrollRestore';

function scrollWindowInstant(y) {
  const doc = document.documentElement;
  const prev = doc.style.scrollBehavior;
  doc.style.scrollBehavior = 'auto';
  try {
    window.scrollTo({ top: y, left: 0, behavior: 'instant' });
  } catch {
    window.scrollTo(0, y);
  }
  doc.scrollTop = y;
  if (document.body) document.body.scrollTop = y;
  doc.style.scrollBehavior = prev;
}

/**
 * Scroll to top on forward navigations only — never on browser Back (POP),
 * and never while a listing scroll restore is in progress.
 * Always instant (global CSS smooth scroll must not animate route jumps).
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useLayoutEffect(() => {
    const prevPath = prevPathRef.current;
    prevPathRef.current = pathname;

    if (navigationType === 'POP') {
      // Kick restore before the listing paints at Y=0 (smooth climb).
      const returnKey = getExpectedListingReturnKey();
      if (returnKey) startListingScrollRestore(returnKey, { pagesReady: false });
      return;
    }
    if (isListingScrollRestoreActive()) return;

    // Keep return-mark when opening a product; clear it for any other forward nav.
    if (!pathname.startsWith('/product/')) {
      clearAnyExpectedListingReturn();
    }

    // Re-clicking Home / logo while already on `/` must not yank the feed.
    if (pathname === '/' && prevPath === '/') return;

    scrollWindowInstant(0);
  }, [pathname, navigationType]);

  return null;
};

export default ScrollToTop;
