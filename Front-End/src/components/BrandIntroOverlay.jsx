import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import BrandTrio from './BrandTrio';
import { useSiteConfig } from '../context/SiteConfigContext';
import { DEFAULT_SITE_CONFIG } from '../config/siteConfigDefaults';

const SESSION_KEY = 'gisaah_brand_intro_seen';

/**
 * One-shot home intro: English mark from left, Arabic from right → BrandTrio settles up → fade.
 */
export default function BrandIntroOverlay() {
  const reduceMotion = useReducedMotion();
  const { config } = useSiteConfig();
  const brandShort = config.brand?.siteShortName || DEFAULT_SITE_CONFIG.brand.siteShortName;
  const brandAr = config.brand?.siteNameAr || DEFAULT_SITE_CONFIG.brand.siteNameAr;

  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return !sessionStorage.getItem(SESSION_KEY);
    } catch {
      return false;
    }
  });
  const [phase, setPhase] = useState('enter'); // enter | settle | exit

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

    const t1 = setTimeout(() => setPhase('settle'), 850);
    const t2 = setTimeout(() => setPhase('exit'), 1600);
    const t3 = setTimeout(() => {
      markSeen();
      setVisible(false);
    }, 2100);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [visible, reduceMotion]);

  if (!visible || reduceMotion) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#F5F1E8] dark:bg-[#0B0A08]"
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === 'exit' ? 0 : 1 }}
      transition={{ duration: 0.35 }}
      aria-hidden="true"
    >
      {/* Sliding labels */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" dir="ltr">
        <motion.span
          className="absolute font-display font-bold text-3xl sm:text-4xl text-gold-700 dark:text-gold-300"
          initial={{ x: -180, opacity: 0 }}
          animate={
            phase === 'enter'
              ? { x: -110, opacity: 1 }
              : { x: 0, opacity: 0 }
          }
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ left: '12%' }}
        >
          {brandShort}
        </motion.span>
        <motion.span
          className="absolute font-display font-bold text-3xl sm:text-4xl text-gold-700 dark:text-gold-300"
          initial={{ x: 180, opacity: 0 }}
          animate={
            phase === 'enter'
              ? { x: 110, opacity: 1 }
              : { x: 0, opacity: 0 }
          }
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ right: '12%' }}
        >
          {brandAr}
        </motion.span>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 0 }}
        animate={
          phase === 'enter'
            ? { opacity: 1, scale: 1.08, y: 0 }
            : phase === 'settle'
              ? { opacity: 1, scale: 0.72, y: -140 }
              : { opacity: 0, scale: 0.68, y: -160 }
        }
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
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
