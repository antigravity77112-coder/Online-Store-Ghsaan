import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { clearAnyExpectedListingReturn } from '../utils/listingSessionMemory';
import { isListingScrollRestoreActive } from '../utils/listingScrollRestore';

/**
 * Scroll to top on forward navigations only — never on browser Back (POP),
 * and never while a listing scroll restore is in progress.
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

    if (navigationType === 'POP') return;
    if (isListingScrollRestoreActive()) return;

    // Keep return-mark when opening a product; clear it for any other forward nav.
    if (!pathname.startsWith('/product/')) {
      clearAnyExpectedListingReturn();
    }

    // Re-clicking Home / logo while already on `/` must not yank the feed.
    if (pathname === '/' && prevPath === '/') return;

    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname, navigationType]);

  return null;
};

export default ScrollToTop;
