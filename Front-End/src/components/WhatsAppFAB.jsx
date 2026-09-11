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

function WhatsAppGlyph({ className = 'w-7 h-7' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

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
