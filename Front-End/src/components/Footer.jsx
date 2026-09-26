/**
 * Footer — تذييل المتسوق الذكي
 *
 * EN: Premium two-tier footer — brand + navigation + legal.
 *     Mobile accordions, desktop columns. Uses only real store data/routes.
 *     Light: white surface; dark: dark surface.
 *
 * AR: تذييل احترافي من مستويين — العلامة + التنقل + القانوني.
 *     أكورديون على الجوال، أعمدة على سطح المكتب.
 *     فاتح: خلفية بيضاء؛ داكن: خلفية داكنة.
 */

import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Linkedin,
  MapPin,
  Truck,
  X,
} from "lucide-react";
import { useSiteConfig } from "../context/SiteConfigContext";
import { DEFAULT_SITE_CONFIG } from "../config/siteConfigDefaults";
import { resolveWhatsAppContacts, buildWhatsAppUrl } from "../utils/whatsappOrder";
import BrandTrio from "./BrandTrio";
import WhatsAppGlyph from "./WhatsAppGlyph";

const FOOTER_WA_GREETING = "مرحباً! أود الاستفسار عن منتجاتكم.";

const SHOP_LINKS = [
  { to: "/", label: "الرئيسية" },
  { to: "/categories", label: "الفئات" },
  { to: "/brands", label: "العلامات" },
  { to: "/products", label: "جميع المنتجات" },
  { to: "/products?promoted=true", label: "العروض" },
];

const HELP_LINKS = [
  { to: "/contact", label: "اتصل بنا" },
  { to: "/branches", label: "فروعنا" },
  { to: "/my-orders", label: "طلباتي" },
  { to: "/favorites", label: "المفضلة" },
];

const ABOUT_LINKS = [
  { to: "/about", label: "من نحن" },
  { to: "/privacy-policy", label: "سياسة الخصوصية" },
];

function FooterNavLink({ to, label }) {
  return (
    <li>
      <Link
        to={to}
        className="text-sm text-slate-600 hover:text-gold-600 dark:text-slate-400 dark:hover:text-gold-400 transition-colors py-1 inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50 rounded"
      >
        {label}
      </Link>
    </li>
  );
}

function FooterColumn({ title, links }) {
  return (
    <nav aria-label={title}>
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
        {title}
      </h3>
      <ul className="space-y-1">
        {links.map((link) => (
          <FooterNavLink key={link.to + link.label} {...link} />
        ))}
      </ul>
    </nav>
  );
}

function FooterAccordion({ title, links, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = `footer-panel-${title.replace(/\s/g, "-")}`;

  return (
    <div className="border-b border-slate-200 dark:border-white/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-3.5 text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50 rounded"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="text-sm font-bold text-slate-900 dark:text-white">{title}</span>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={undefined}
        className={`overflow-hidden transition-all duration-200 ${open ? "max-h-48 pb-3" : "max-h-0"}`}
        aria-hidden={!open}
      >
        <ul className="space-y-1 pr-1">
          {links.map((link) => (
            <FooterNavLink key={link.to + link.label} {...link} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function TikTokIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

function TelegramIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
      <path d="m21.854 2.147-10.94 10.939" />
    </svg>
  );
}

function ThreadsIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M19 7.5c-1.5-2.5-4-4-7-4-5 0-9 3.5-9 9s4 9 9 9c3.5 0 6.5-1.5 8-4" />
      <path d="M8.5 12c0-2 1.5-3.5 3.5-3.5s3.5 1.5 3.5 3.5-1.5 3.5-3.5 3.5c-1.2 0-2.2-.6-2.8-1.5" />
      <path d="M15.5 8.5c1 .8 1.5 2 1.5 3.5 0 3.5-2.5 6-6 6" />
    </svg>
  );
}

function YouTubeIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  );
}

function XIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M4 4l11.733 16h4.267l-11.733-16z" />
      <path d="M4 20l6.768-6.768M15.042 9.042 20 4" />
    </svg>
  );
}

const socialIconClass =
  "w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-gold-600 hover:border-gold-500/40 dark:border-white/15 dark:text-slate-400 dark:hover:text-gold-400 dark:hover:border-gold-600/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50";

function FooterWhatsAppControl({ contacts }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const onPointer = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [menuOpen]);

  if (!contacts?.length) return null;

  const openContact = (item) => {
    const href = buildWhatsAppUrl(item.url, FOOTER_WA_GREETING);
    if (!href) return;
    window.open(href, "_blank", "noopener,noreferrer");
    setMenuOpen(false);
  };

  if (contacts.length === 1) {
    const href = buildWhatsAppUrl(contacts[0].url, FOOTER_WA_GREETING);
    if (!href) return null;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="واتساب"
        className={socialIconClass}
      >
        <WhatsAppGlyph className="w-4 h-4" />
      </a>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-label="اختر رقم واتساب"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        onClick={() => setMenuOpen((v) => !v)}
        className={`${socialIconClass} ${menuOpen ? "text-[#25D366] border-emerald-400/50" : ""}`}
      >
        <WhatsAppGlyph className="w-4 h-4" />
      </button>
      {menuOpen ? (
        <div
          role="menu"
          aria-label="اختر رقم واتساب"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 z-30 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-xl overflow-hidden"
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
                  className="w-full text-right px-3 py-2.5 min-h-[44px] text-sm font-semibold text-stone-800 dark:text-stone-100 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2"
                >
                  <WhatsAppGlyph className="w-4 h-4 text-[#25D366] shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function SocialLinks({ social, waContacts = [], className = "" }) {
  const links = [
    social?.instagram && { href: social.instagram, label: "انستغرام", Icon: Instagram },
    social?.facebook && { href: social.facebook, label: "فيسبوك", Icon: Facebook },
    social?.tiktok && { href: social.tiktok, label: "تيك توك", Icon: TikTokIcon },
    social?.telegram && { href: social.telegram, label: "تيليجرام", Icon: TelegramIcon },
    social?.linkedin && { href: social.linkedin, label: "لينكدإن", Icon: Linkedin },
    social?.threads && { href: social.threads, label: "ثريدز", Icon: ThreadsIcon },
    social?.twitter && { href: social.twitter, label: "إكس", Icon: XIcon },
    social?.youtube && { href: social.youtube, label: "يوتيوب", Icon: YouTubeIcon },
  ].filter(Boolean);

  if (!links.length && !waContacts.length) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <FooterWhatsAppControl contacts={waContacts} />
      {links.map(({ href, label, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className={socialIconClass}
        >
          <Icon className="w-4 h-4" />
        </a>
      ))}
    </div>
  );
}

const Footer = () => {
  const { config } = useSiteConfig();
  const phone = (config.contact?.phone || "").trim();
  const phoneDigits = phone.replace(/[^\d]/g, "");
  const email = (config.contact?.email || "").trim();
  const waContacts = resolveWhatsAppContacts(config.contact || {});
  const shippingOffer = (config.content?.shippingOfferText || "").trim();
  const tagline = (config.content?.footerText || config.seo?.description || DEFAULT_SITE_CONFIG.content.footerText).trim();
  const siteName = config.brand?.siteShortName || DEFAULT_SITE_CONFIG.brand.siteShortName;
  const siteNameAr = config.brand?.siteNameAr || (config.brand?.siteName || '').split('|').pop()?.trim() || DEFAULT_SITE_CONFIG.brand.siteNameAr;
  const copyright = (config.brand?.copyrightText || `© ${new Date().getFullYear()} ${siteName} ${siteNameAr}. جميع الحقوق محفوظة.`).replace('{year}', String(new Date().getFullYear()));

  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-white border-t border-slate-200 dark:bg-slate-950 dark:border-white/10" dir="rtl">
      {shippingOffer && (
        <div className="bg-slate-50 border-b border-slate-200 dark:bg-slate-950 dark:border-white/10">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 flex items-center justify-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
            <Truck className="w-3.5 h-3.5 text-gold-500 dark:text-gold-400 flex-shrink-0" />
            <span className="text-center">{shippingOffer}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-10 pb-20 md:pb-10 md:pt-14">
        <div className="mb-10 flex flex-col items-center text-center md:mb-12">
          <div className="mb-6 flex w-full justify-center pt-2 sm:mb-8 sm:pt-4">
            <BrandTrio size="footer" wordClassName="text-slate-900 dark:text-white" />
          </div>
          <p className="mx-auto max-w-md text-xs leading-relaxed text-slate-600 dark:text-slate-400 line-clamp-3">
            {tagline}
          </p>
          <SocialLinks social={config.social} waContacts={waContacts} className="mt-5 justify-center" />
        </div>

        <div className="hidden md:grid md:grid-cols-3 gap-8 lg:gap-12 mb-8">
          <FooterColumn title="تسوق" links={SHOP_LINKS} />
          <FooterColumn title="المساعدة" links={HELP_LINKS} />
          <FooterColumn title="عن المتجر" links={ABOUT_LINKS} />
        </div>

        <div className="md:hidden mb-6" role="navigation" aria-label="روابط التذييل">
          <FooterAccordion title="تسوق" links={SHOP_LINKS} defaultOpen />
          <FooterAccordion title="المساعدة" links={HELP_LINKS} />
          <FooterAccordion title="عن المتجر" links={ABOUT_LINKS} />
        </div>

        {(phoneDigits || email) && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-6 text-xs">
            {phoneDigits && (
              <a
                href={`tel:${phoneDigits}`}
                className="inline-flex items-center gap-1.5 text-slate-600 hover:text-gold-600 dark:text-slate-400 dark:hover:text-gold-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50 rounded"
              >
                <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                <span dir="ltr">{phone}</span>
              </a>
            )}
            {email && (
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-1.5 text-slate-600 hover:text-gold-600 dark:text-slate-400 dark:hover:text-gold-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50 rounded"
              >
                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate max-w-[200px]">{email}</span>
              </a>
            )}
            <Link
              to="/branches"
              className="inline-flex items-center gap-1.5 text-slate-600 hover:text-gold-600 dark:text-slate-400 dark:hover:text-gold-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50 rounded"
            >
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              فروعنا
            </Link>
          </div>
        )}

        <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-[11px] text-slate-500 text-center sm:text-right">
            {copyright.includes('©') ? copyright : `© ${currentYear} ${copyright}`}
          </p>
          <div className="flex items-center justify-center sm:justify-end gap-4 text-[11px]">
            <Link
              to="/privacy-policy"
              className="text-slate-600 hover:text-gold-600 dark:text-slate-400 dark:hover:text-gold-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50 rounded"
            >
              الخصوصية
            </Link>
            <Link
              to="/contact"
              className="text-slate-600 hover:text-gold-600 dark:text-slate-400 dark:hover:text-gold-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50 rounded"
            >
              الدعم
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
