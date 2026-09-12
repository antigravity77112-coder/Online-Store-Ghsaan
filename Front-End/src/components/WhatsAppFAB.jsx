/**
 * WhatsAppFAB — زر واتساب العائم
 *
 * Floating WhatsApp button on the home page only.
 * Supports up to 4 labeled contacts from site config.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useSiteConfig } from '../context/SiteConfigContext';
import { useIsMobile } from './banners/bannerUtils';
import { resolveWhatsAppContacts, buildWhatsAppUrl } from '../utils/whatsappOrder';
import WhatsAppGlyph from './WhatsAppGlyph';

const DEFAULT_GREETING = 'مرحباً! أود الاستفسار عن منتجاتكم.';

const WhatsAppFAB = React.memo(() => {
  const { pathname } = useLocation();
  const isMobile = useIsMobile();
  const isHomePage = pathname === '/' || pathname === '';
  const { config } = useSiteConfig();
  const contact = config.contact || {};
  const [menuOpen, setMenuOpen] = useState(false);

  const contacts = useMemo(
    () => resolveWhatsAppContacts(contact),
    [contact],
  );

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  if (!isHomePage) return null;
  if (isMobile && pathname.startsWith('/product/')) return null;
  if (!contacts.length) return null;

  const openContact = (item) => {
    const href = buildWhatsAppUrl(item.url, DEFAULT_GREETING);
    if (!href) return;
    window.open(href, '_blank', 'noopener,noreferrer');
    setMenuOpen(false);
  };

  const handleFabClick = (e) => {
    if (contacts.length === 1) {
      e.preventDefault();
      openContact(contacts[0]);
      return;
    }
    e.preventDefault();
    setMenuOpen((v) => !v);
  };

  return (
    <AnimatePresence>
      <motion.div
        key="whatsapp-fab-wrap"
        className="fixed bottom-24 left-4 md:bottom-6 md:left-6 z-40 flex flex-col items-start gap-2"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        {menuOpen && contacts.length > 1 ? (
          <div
            role="menu"
            aria-label="اختر رقم واتساب"
            className="mb-1 w-56 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-stone-100 dark:border-stone-800">
              <span className="text-xs font-bold text-stone-700 dark:text-stone-200">تواصل عبر واتساب</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="p-1 rounded-full text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ul className="py-1">
              {contacts.map((item) => (
                <li key={`${item.label}-${item.url}`}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => openContact(item)}
                    className="w-full text-right px-3 py-2.5 text-sm font-semibold text-stone-800 dark:text-stone-100 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2"
                  >
                    <WhatsAppGlyph className="w-4 h-4 text-[#25D366] shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <motion.button
          type="button"
          id="whatsapp-fab"
          aria-label="تحدث معنا مباشرة عبر واتساب"
          title="تحدث معنا مباشرة"
          aria-expanded={menuOpen}
          onClick={handleFabClick}
          className="relative w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-xl shadow-green-900/40 hover:bg-[#1fb855] hover:scale-110 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
          whileTap={{ scale: 0.93 }}
        >
          <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-30" />
          <WhatsAppGlyph className="w-7 h-7 relative z-10" />
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
});

WhatsAppFAB.displayName = 'WhatsAppFAB';
export default WhatsAppFAB;
