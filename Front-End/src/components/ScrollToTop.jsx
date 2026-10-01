import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { clearAnyExpectedListingReturn } from '../utils/listingSessionMemory';

/**
 * Scroll to top on forward navigations only — never on browser Back (POP).
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    if (navigationType === 'POP') return;
    // Keep return-mark when opening a product; clear it for any other forward nav.
    if (!pathname.startsWith('/product/')) {
      clearAnyExpectedListingReturn();
    }
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname, navigationType]);

  return null;
};

export default ScrollToTop;
