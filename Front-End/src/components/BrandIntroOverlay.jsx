import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import BrandTrio from './BrandTrio';

const SESSION_KEY = 'smart_shopper_brand_intro_seen';

/**
 * Short one-shot home intro that fades in place without pretending to dock into the header.
 */
export default function BrandIntroOverlay() {
  const reduceMotion = useReducedMotion();

  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return !sessionStorage.getItem(SESSION_KEY);
    } catch {
      return false;
    }
  });
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!visible) return undefined;

    const markSeen = () => {
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch { /* ignore */ }
    };

    if (reduceMotion) {
      markSeen();
      setVisible(false);
      return undefined;
    }

    const exitTimer = setTimeout(() => setExiting(true), 700);
    const hideTimer = setTimeout(() => {
      markSeen();
      setVisible(false);
    }, 1050);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(hideTimer);
    };
  }, [visible, reduceMotion]);

  if (!visible || reduceMotion) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-site-surface dark:bg-site-surface-dark"
      initial={{ opacity: 1 }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      aria-hidden="true"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: exiting ? 0 : 1, scale: exiting ? 0.98 : 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <BrandTrio
          size="splash"
          asLink={false}
          wordClassName="text-slate-900 dark:text-stone-50"
        />
      </motion.div>
    </motion.div>
  );
}
