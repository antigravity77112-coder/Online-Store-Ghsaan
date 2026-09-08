/** Client-side fallbacks — must match backend siteConfigDefaults */

export const DEFAULT_SITE_CONFIG = {
  brand: {
    siteName: 'Smart Shopper | المتسوق الذكي',
    siteShortName: 'Smart Shopper',
    siteNameAr: 'المتسوق الذكي',
    appName: 'Smart Shopper | المتسوق الذكي',
    tagline: 'تسوق ذكي — منتجات متنوعة بأسعار منافسة',
    description: 'المتسوق الذكي — متجرك الإلكتروني لمنتجات متنوعة بأسعار منافسة وتجربة تسوق سهلة',
    copyrightText: '© Smart Shopper المتسوق الذكي. جميع الحقوق محفوظة.',
  },
  media: {
    logoUrl: '/Logo_light_192.png',
    logoDarkUrl: '/Logo_dark_192.png',
    logoMobileUrl: '/Logo_light_192.png',
    logoMobileDarkUrl: '/Logo_dark_192.png',
    faviconUrl: '/favicon.png',
    ogImageUrl: '/og-share.png',
  },
  theme: {
    primary: '#EA0001',
    secondary: '#B80001',
    accent: '#EA0001',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    text: '#565656',
    textMuted: '#7A7A7A',
    border: '#E5E5E5',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#EA0001',
  },
  contact: { phone: null, email: null, whatsapp: null, address: null, mapUrl: null },
  social: { facebook: null, instagram: null, tiktok: null, twitter: null, youtube: null },
  seo: {
    title: 'Smart Shopper | المتسوق الذكي',
    description: 'المتسوق الذكي — متجرك الإلكتروني لمنتجات متنوعة بأسعار منافسة وتجربة تسوق سهلة',
    ogTitle: 'Smart Shopper | المتسوق الذكي',
    ogDescription: 'المتسوق الذكي — متجرك الإلكتروني لمنتجات متنوعة بأسعار منافسة وتجربة تسوق سهلة',
    ogImageUrl: '/og-share.png',
  },
  content: {
    aboutUsText: '',
    shippingOfferText: '',
    footerText: 'متجرك الإلكتروني — منتجات متنوعة بأسعار منافسة وتجربة تسوق سهلة.',
  },
  homepage: {
    offerBeltVisible: true,
    sections: {
      bestSellers: { title: 'العروض الحصرية', subtitle: 'منتجات مميزة وعروض مختارة', visible: true },
      newArrivals: { title: 'وصل حديثاً', subtitle: '', visible: true },
      trending: { title: 'تريندات', subtitle: 'المنتجات الأكثر طلباً الآن', visible: true },
      featured: { title: 'منتجات مميزة', subtitle: 'مختارات من أفضل المنتجات', visible: true },
      categories: { title: 'الفئات', subtitle: '', visible: true },
    },
  },
  footerLinks: null,
};

function mergeHomepageSections(defaults, fromApi) {
  const merged = { ...defaults };
  if (!fromApi || typeof fromApi !== 'object') return merged;
  for (const [key, section] of Object.entries(fromApi)) {
    if (!section || typeof section !== 'object') continue;
    merged[key] = { ...defaults[key], ...section };
  }
  return merged;
}

/** Replace legacy GISAAH / قصة brand strings still returned by the API */
function sanitizeBrand(brand = {}) {
  const base = { ...DEFAULT_SITE_CONFIG.brand, ...brand };
  const looksLegacy = (value) => {
    if (typeof value !== 'string' || !value.trim()) return true;
    const v = value.trim();
    if (/GISAAH|Gisaah|GISAah/i.test(v)) return true;
    if (v === 'قصة' || v === 'قــصـــــة' || v === 'GISAAH | قصة') return true;
    return false;
  };

  return {
    ...base,
    siteName: looksLegacy(base.siteName) ? DEFAULT_SITE_CONFIG.brand.siteName : base.siteName,
    siteShortName: looksLegacy(base.siteShortName) ? DEFAULT_SITE_CONFIG.brand.siteShortName : base.siteShortName,
    siteNameAr: looksLegacy(base.siteNameAr) ? DEFAULT_SITE_CONFIG.brand.siteNameAr : (base.siteNameAr || DEFAULT_SITE_CONFIG.brand.siteNameAr),
    appName: looksLegacy(base.appName) ? DEFAULT_SITE_CONFIG.brand.appName : base.appName,
    tagline: looksLegacy(base.tagline) || (typeof base.tagline === 'string' && base.tagline.includes('خليك مع قصة'))
      ? DEFAULT_SITE_CONFIG.brand.tagline
      : (base.tagline || DEFAULT_SITE_CONFIG.brand.tagline),
    description: looksLegacy(base.description) || (typeof base.description === 'string' && (base.description.includes('خليك مع قصة') || base.description.includes('متجر العطور')))
      ? DEFAULT_SITE_CONFIG.brand.description
      : (base.description || DEFAULT_SITE_CONFIG.brand.description),
    copyrightText: looksLegacy(base.copyrightText)
      ? DEFAULT_SITE_CONFIG.brand.copyrightText
      : (base.copyrightText || DEFAULT_SITE_CONFIG.brand.copyrightText),
  };
}

function sanitizeSeo(seo = {}) {
  const base = { ...DEFAULT_SITE_CONFIG.seo, ...seo };
  const looksLegacy = (value) => {
    if (typeof value !== 'string' || !value.trim()) return true;
    const v = value.trim();
    if (/GISAAH|Gisaah|GISAah/i.test(v)) return true;
    if (v.includes('خليك مع قصة') || v.includes('متجر العطور')) return true;
    return false;
  };

  return {
    ...base,
    title: looksLegacy(base.title) ? DEFAULT_SITE_CONFIG.seo.title : base.title,
    description: looksLegacy(base.description) ? DEFAULT_SITE_CONFIG.seo.description : base.description,
    ogTitle: looksLegacy(base.ogTitle) ? DEFAULT_SITE_CONFIG.seo.ogTitle : base.ogTitle,
    ogDescription: looksLegacy(base.ogDescription) ? DEFAULT_SITE_CONFIG.seo.ogDescription : base.ogDescription,
  };
}

export function mergeSiteConfig(apiConfig) {
  if (!apiConfig) return DEFAULT_SITE_CONFIG;
  return {
    brand: sanitizeBrand(apiConfig.brand),
    media: { ...DEFAULT_SITE_CONFIG.media, ...apiConfig.media },
    theme: { ...DEFAULT_SITE_CONFIG.theme, ...apiConfig.theme },
    contact: { ...DEFAULT_SITE_CONFIG.contact, ...apiConfig.contact },
    social: { ...DEFAULT_SITE_CONFIG.social, ...apiConfig.social },
    seo: sanitizeSeo(apiConfig.seo),
    content: { ...DEFAULT_SITE_CONFIG.content, ...apiConfig.content },
    homepage: {
      ...DEFAULT_SITE_CONFIG.homepage,
      ...apiConfig.homepage,
      sections: mergeHomepageSections(
        DEFAULT_SITE_CONFIG.homepage.sections,
        apiConfig.homepage?.sections,
      ),
    },
    footerLinks: apiConfig.footerLinks ?? DEFAULT_SITE_CONFIG.footerLinks,
  };
}

export function applyThemeVariables(theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const t = { ...DEFAULT_SITE_CONFIG.theme, ...theme };

  Object.entries(t).forEach(([key, value]) => {
    if (value) root.style.setProperty(`--color-${key}`, value);
  });

  const {
    primary, secondary, accent, background, surface, text, textMuted, border,
    success, warning, error,
  } = t;
  const focus = accent || primary;

  // Gold scale (primary / secondary)
  root.style.setProperty('--gold-500', primary);
  root.style.setProperty('--gold-600', primary);
  root.style.setProperty('--gold-400', secondary);
  root.style.setProperty('--gold-700', secondary);
  root.style.setProperty('--gold-300', `color-mix(in srgb, ${primary} 65%, white)`);
  root.style.setProperty('--gold-200', `color-mix(in srgb, ${primary} 35%, white)`);
  root.style.setProperty('--gold-100', `color-mix(in srgb, ${primary} 18%, white)`);
  root.style.setProperty('--gold-50', `color-mix(in srgb, ${primary} 9%, white)`);
  root.style.setProperty('--gold-800', `color-mix(in srgb, ${secondary} 75%, black)`);
  root.style.setProperty('--gold-900', `color-mix(in srgb, ${secondary} 55%, black)`);
  root.style.setProperty('--gold-950', `color-mix(in srgb, ${secondary} 40%, black)`);

  root.style.setProperty('--color-focus', focus);

  // Dark-mode derived tokens
  root.style.setProperty('--color-background-dark', `color-mix(in srgb, ${background} 10%, #0a0a0a)`);
  root.style.setProperty('--color-surface-dark', `color-mix(in srgb, ${surface} 8%, #141414)`);
  root.style.setProperty('--color-text-on-dark', `color-mix(in srgb, ${text} 15%, #f8fafc)`);
  root.style.setProperty('--color-muted-on-dark', `color-mix(in srgb, ${textMuted} 50%, #94a3b8)`);
  root.style.setProperty('--color-border-on-dark', `color-mix(in srgb, ${border} 30%, #334155)`);

  // Status & accent soft fills
  root.style.setProperty('--color-success-soft', `color-mix(in srgb, ${success} 15%, white)`);
  root.style.setProperty('--color-warning-soft', `color-mix(in srgb, ${warning} 15%, white)`);
  root.style.setProperty('--color-error-soft', `color-mix(in srgb, ${error} 15%, white)`);
  root.style.setProperty('--color-success-soft-dark', `color-mix(in srgb, ${success} 22%, transparent)`);
  root.style.setProperty('--color-warning-soft-dark', `color-mix(in srgb, ${warning} 22%, transparent)`);
  root.style.setProperty('--color-error-soft-dark', `color-mix(in srgb, ${error} 22%, transparent)`);
  root.style.setProperty('--color-accent-soft', `color-mix(in srgb, ${focus} 12%, white)`);
  root.style.setProperty('--color-accent-soft-dark', `color-mix(in srgb, ${focus} 18%, transparent)`);

  root.classList.add('theme-transition');
  window.setTimeout(() => root.classList.remove('theme-transition'), 350);
}

export function resolveMediaUrl(url, baseUrl = '') {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('//')) return url;
  if (url.startsWith('/') && baseUrl) return `${baseUrl.replace(/\/$/, '')}${url}`;
  return url;
}

export function resolveAbsoluteMediaUrl(url) {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('//')) return url;
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${url.startsWith('/') ? url : `/${url}`}`;
  }
  return url;
}

/** Pick light or dark logo for the website (logoUrl / logoDarkUrl only). */
export function resolveSiteLogo(media, { dark = false } = {}) {
  const m = { ...DEFAULT_SITE_CONFIG.media, ...media };
  if (dark && m.logoDarkUrl) return m.logoDarkUrl;
  return m.logoUrl || DEFAULT_SITE_CONFIG.media.logoUrl;
}

/** Mobile logo — prefers app assets, falls back to website logos. */
export function resolveMobileLogo(media, { dark = false } = {}) {
  const m = { ...DEFAULT_SITE_CONFIG.media, ...media };
  if (dark) {
    return m.logoMobileDarkUrl || m.logoDarkUrl || DEFAULT_SITE_CONFIG.media.logoDarkUrl;
  }
  return m.logoMobileUrl || m.logoUrl || DEFAULT_SITE_CONFIG.media.logoUrl;
}

let manifestObjectUrl = null;

function upsertLink(rel, href, attrs = {}) {
  if (!href || typeof document === 'undefined') return;
  let link = document.querySelector(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    document.head.appendChild(link);
  }
  link.href = href;
  Object.entries(attrs).forEach(([key, value]) => {
    if (value != null) link.setAttribute(key, value);
  });
}

function upsertMeta(name, content) {
  if (!content || typeof document === 'undefined') return;
  let meta = document.querySelector(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = name;
    document.head.appendChild(meta);
  }
  meta.content = content;
}

/** Sync favicon, apple-touch-icon, theme-color, and PWA manifest from site config */
export function applySiteMediaToDocument(config) {
  if (typeof document === 'undefined') return;

  const media = config?.media || DEFAULT_SITE_CONFIG.media;
  const brand = config?.brand || DEFAULT_SITE_CONFIG.brand;
  const theme = config?.theme || DEFAULT_SITE_CONFIG.theme;

  const favicon = media.faviconUrl || DEFAULT_SITE_CONFIG.media.faviconUrl;
  const appleIcon = favicon;
  const icon192 = resolveAbsoluteMediaUrl(favicon);
  const icon512 = resolveAbsoluteMediaUrl(media.logoUrl || favicon);

  if (icon192) {
    upsertLink('icon', icon192, { type: 'image/png' });
    upsertLink('shortcut icon', icon192, { type: 'image/png' });
    upsertLink('apple-touch-icon', resolveAbsoluteMediaUrl(appleIcon) || icon192);
  }

  upsertMeta('theme-color', theme.primary || DEFAULT_SITE_CONFIG.theme.primary);

  if (manifestObjectUrl) {
    URL.revokeObjectURL(manifestObjectUrl);
    manifestObjectUrl = null;
  }

  const manifest = {
    name: brand.siteName || brand.appName || DEFAULT_SITE_CONFIG.brand.siteName,
    short_name: brand.siteShortName || DEFAULT_SITE_CONFIG.brand.siteShortName,
    description: brand.description || brand.tagline || DEFAULT_SITE_CONFIG.brand.description,
    start_url: '/',
    display: 'standalone',
    background_color: theme.background || DEFAULT_SITE_CONFIG.theme.background,
    theme_color: theme.primary || DEFAULT_SITE_CONFIG.theme.primary,
    icons: [
      icon192 && { src: icon192, sizes: '192x192', type: 'image/png', purpose: 'any' },
      icon512 && { src: icon512, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ].filter(Boolean),
  };

  manifestObjectUrl = URL.createObjectURL(
    new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }),
  );
  upsertLink('manifest', manifestObjectUrl);
}
