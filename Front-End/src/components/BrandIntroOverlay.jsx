import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import BrandTrio from './BrandTrio';
import { useSiteConfig } from '../context/SiteConfigContext';
import { useTheme } from '../context/ThemeContext';
import { preloadSiteLogo } from '../utils/preloadSiteLogo';

const SESSION_KEY = 'smart_shopper_brand_intro_seen';
/** Shared with PDP hero feel */
const EASE_OUT_EXPO = [0.22, 1, 0.36, 1];
const HOLD_MS = 900;
const EXIT_MS = 0.35;
/** Safety only — prefer onLogoLoad after DB logo decode. */
const LOGO_WAIT_FALLBACK_MS = 3200;

const trioContainer = {
  hidden: {},
  show: {
    // No stagger — logo leads; words use their own delay.
    transition: { staggerChildren: 0, delayChildren: 0 },
  },
};

const wordVariant = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, delay: 0.2, ease: EASE_OUT_EXPO },
  },
};

const logoVariant = {
  hidden: { opacity: 0, scale: 0.92 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, delay: 0, ease: EASE_OUT_EXPO },
  },
};

/**
 * Short one-shot home intro that fades in place without docking into the header.
 * Logo (DB URL) is preloaded at highest priority and animates first.
 */
export default function BrandIntroOverlay() {
  const reduceMotion = useReducedMotion();
  const { config, isLoading: configLoading } = useSiteConfig();
  const { isDark } = useTheme();

  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return !sessionStorage.getItem(SESSION_KEY);
    } catch {
      return false;
    }
  });
  const [ready, setReady] = useState(false);
  const timersStarted = useRef(false);

  const markSeen = useCallback(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch { /* ignore */ }
  }, []);

  // Kick logo network/decode as soon as splash is eligible.
  useEffect(() => {
    if (!visible || configLoading) return;
    preloadSiteLogo(config, { dark: isDark });
  }, [visible, configLoading, config, isDark]);

  useEffect(() => {
    if (!visible) return undefined;
    if (reduceMotion) {
      markSeen();
      setVisible(false);
    }
    return undefined;
  }, [visible, reduceMotion, markSeen]);

  // Start hold after logo is ready, then unmount (AnimatePresence runs exit fade).
  useEffect(() => {
    if (!visible || reduceMotion || !ready || timersStarted.current) return undefined;
    timersStarted.current = true;
    const hideTimer = window.setTimeout(() => {
      markSeen();
      setVisible(false);
    }, HOLD_MS);
    return () => window.clearTimeout(hideTimer);
  }, [visible, reduceMotion, ready, markSeen]);

  // If logo never fires onLoad, still proceed.
  useEffect(() => {
    if (!visible || reduceMotion || ready) return undefined;
    const t = window.setTimeout(() => setReady(true), LOGO_WAIT_FALLBACK_MS);
    return () => window.clearTimeout(t);
  }, [visible, reduceMotion, ready]);

  if (reduceMotion) return null;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="brand-intro"
          className="fixed inset-0 z-[200] flex items-center justify-center bg-site-surface dark:bg-site-surface-dark pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: EXIT_MS, ease: EASE_OUT_EXPO } }}
          transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
          aria-hidden="true"
        >
          <motion.div
            className="relative"
            variants={trioContainer}
            initial="hidden"
            animate={ready ? 'show' : 'hidden'}
          >
            <BrandTrio
              size="splash"
              asLink={false}
              wordClassName="text-slate-900 dark:text-stone-50"
              introMotion
              wordVariants={wordVariant}
              logoVariants={logoVariant}
              logoClassName="ring-1 ring-[color:var(--site-accent)]/20 shadow-[0_0_40px_-12px_var(--site-accent)]"
              onLogoLoad={() => setReady(true)}
            />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
