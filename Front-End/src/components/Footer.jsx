/**
 * Footer — تذييل المتسوق الذكي
 *
 * EN: Premium two-tier footer — brand + navigation + legal.
 *     Mobile accordions, desktop columns. Uses only real store data/routes.
 *
 * AR: تذييل احترافي من مستويين — العلامة + التنقل + القانوني.
 *     أكورديون على الجوال، أعمدة على سطح المكتب.
 */

import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  Phone,
  Mail,
  Instagram,
  Facebook,
  MapPin,
  Truck,
} from "lucide-react";
import { useSiteConfig } from "../context/SiteConfigContext";
import { DEFAULT_SITE_CONFIG } from "../config/siteConfigDefaults";
import BrandTrio from "./BrandTrio";

const SHOP_LINKS = [
  { to: "/", label: "الرئيسية" },
  { to: "/categories", label: "الفئات" },
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
        className="text-sm text-slate-400 hover:text-gold-400 transition-colors py-1 inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50 rounded"
      >
        {label}
      </Link>
    </li>
  );
}

function FooterColumn({ title, links }) {
  return (
    <nav aria-label={title}>
      <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
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
    <div className="border-b border-white/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-3.5 text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50 rounded"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="text-sm font-bold text-white">{title}</span>
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

function SocialLinks({ social, className = "" }) {
  const links = [
    social?.instagram && { href: social.instagram, label: "انستغرام", Icon: Instagram },
    social?.facebook && { href: social.facebook, label: "فيسبوك", Icon: Facebook },
    social?.tiktok && { href: social.tiktok, label: "تيك توك", Icon: TikTokIcon },
    social?.youtube && { href: social.youtube, label: "يوتيوب", Icon: TikTokIcon },
  ].filter(Boolean);

  if (!links.length) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {links.map(({ href, label, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-white/15 text-slate-400 hover:text-gold-400 hover:border-gold-600/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50"
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
  const shippingOffer = (config.content?.shippingOfferText || "").trim();
  const tagline = (config.content?.footerText || config.seo?.description || DEFAULT_SITE_CONFIG.content.footerText).trim();
  const siteName = config.brand?.siteShortName || DEFAULT_SITE_CONFIG.brand.siteShortName;
  const siteNameAr = config.brand?.siteNameAr || (config.brand?.siteName || '').split('|').pop()?.trim() || DEFAULT_SITE_CONFIG.brand.siteNameAr;
  const copyright = (config.brand?.copyrightText || `© ${new Date().getFullYear()} ${siteName} ${siteNameAr}. جميع الحقوق محفوظة.`).replace('{year}', String(new Date().getFullYear()));

  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-black border-t border-white/10" dir="rtl">
      {shippingOffer && (
        <div className="bg-black border-b border-white/10">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 flex items-center justify-center gap-2 text-xs font-medium text-slate-400">
            <Truck className="w-3.5 h-3.5 text-gold-400 flex-shrink-0" />
            <span className="text-center">{shippingOffer}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-10 pb-20 md:pb-10 md:pt-14">
        <div className="mb-10 flex flex-col items-center text-center md:mb-12">
          <div className="mb-6 flex w-full justify-center pt-2 sm:mb-8 sm:pt-4">
            <BrandTrio size="footer" wordClassName="text-white" />
          </div>
          <p className="mx-auto max-w-md text-xs leading-relaxed text-slate-400 line-clamp-3">
            {tagline}
          </p>
          <SocialLinks social={config.social} className="mt-5 justify-center" />
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
                className="inline-flex items-center gap-1.5 text-slate-400 hover:text-gold-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50 rounded"
              >
                <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                <span dir="ltr">{phone}</span>
              </a>
            )}
            {email && (
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-1.5 text-slate-400 hover:text-gold-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50 rounded"
              >
                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate max-w-[200px]">{email}</span>
              </a>
            )}
            <Link
              to="/branches"
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-gold-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50 rounded"
            >
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              فروعنا
            </Link>
          </div>
        )}

        <div className="pt-4 border-t border-white/10 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-[11px] text-slate-500 text-center sm:text-right">
            {copyright.includes('©') ? copyright : `© ${currentYear} ${copyright}`}
          </p>
          <div className="flex items-center justify-center sm:justify-end gap-4 text-[11px]">
            <Link
              to="/privacy-policy"
              className="text-slate-400 hover:text-gold-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50 rounded"
            >
              الخصوصية
            </Link>
            <Link
              to="/contact"
              className="text-slate-400 hover:text-gold-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50 rounded"
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
