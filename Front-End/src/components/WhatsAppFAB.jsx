/**
 * WhatsAppFAB — زر واتساب العائم
 *
 * Floating WhatsApp button on the home page only.
 * Position: bottom-24 left-4 mobile | bottom-6 left-6 desktop.
 * Uses site config contact.whatsapp or contact.phone.
 * Hidden if no contact info available.
 */

import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { useSiteConfig } from '../context/SiteConfigContext';
import { useIsMobile } from './banners/bannerUtils';

const WhatsAppFAB = React.memo(() => {
  const { pathname } = useLocation();
  const isMobile = useIsMobile();
  const isHomePage = pathname === '/' || pathname === '';
  const { config } = useSiteConfig();
  const contact = config.contact || {};

  const waUrl = useMemo(() => {
    const phone = (contact.phone || '').replace(/\D/g, '');
    const phoneE164 = phone ? (phone.startsWith('967') ? phone : `967${phone}`) : '';

    let base = (contact.whatsapp || '').trim();
    if (base && !base.startsWith('http')) {
      const digits = base.replace(/\D/g, '');
      base = digits ? `https://wa.me/${digits.startsWith('967') ? digits : `967${digits}`}` : '';
    }

    const finalBase = base || (phoneE164 ? `https://wa.me/${phoneE164}` : '');
    if (!finalBase) return '';

    try {
      const url = new URL(finalBase);
      if (!url.searchParams.has('text')) {
        url.searchParams.set('text', 'مرحباً! أود الاستفسار عن منتجاتكم.');
      }
      return url.toString();
    } catch {
      return finalBase;
    }
  }, [contact.phone, contact.whatsapp]);

  // Home page only — avoid covering cart/checkout/product CTAs elsewhere
  if (!isHomePage) {
    return null;
  }

  // Extra guard on very small product overlays (kept for safety)
  if (isMobile && pathname.startsWith('/product/')) {
    return null;
  }

  return (
    <AnimatePresence>
      {waUrl && (
        <motion.a
          key="whatsapp-fab"
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          id="whatsapp-fab"
          aria-label="تحدث معنا مباشرة عبر واتساب"
          title="تحدث معنا مباشرة"
          className="fixed bottom-24 left-4 md:bottom-6 md:left-6 z-40 w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-xl shadow-green-900/40 hover:bg-[#1fb855] hover:scale-110 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          whileTap={{ scale: 0.93 }}
        >
          <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-30" />
          <MessageCircle className="w-6 h-6 relative z-10" />
        </motion.a>
      )}
    </AnimatePresence>
  );
});

WhatsAppFAB.displayName = 'WhatsAppFAB';
export default WhatsAppFAB;
