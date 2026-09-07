import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { useIsMobile } from './banners/bannerUtils';

const BackToTop = React.memo(() => {
  const { pathname } = useLocation();
  const isMobile = useIsMobile();
  const isProductPage = pathname.startsWith('/product/');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (isProductPage && isMobile) {
    return null;
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          key="back-to-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          id="back-to-top-btn"
          aria-label="العودة إلى أعلى الصفحة"
          className="fixed bottom-40 left-4 md:bottom-24 md:left-6 z-40 w-11 h-11 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 shadow-lg hover:bg-gold-50 dark:hover:bg-gold-900/30 hover:text-gold-600 dark:hover:text-gold-400 hover:border-gold-300 hover:scale-110 transition-all duration-200 flex items-center justify-center focus:outline-none"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          whileTap={{ scale: 0.9 }}
        >
          <ArrowUp className="w-4.5 h-4.5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
});

BackToTop.displayName = 'BackToTop';
export default BackToTop;
