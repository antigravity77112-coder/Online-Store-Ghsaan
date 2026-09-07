/** Client-side fallbacks — must match backend siteConfigDefaults */

export const DEFAULT_SITE_CONFIG = {
  brand: {
    siteName: 'GISAAH | قصة',
    siteShortName: 'GISAAH',
    appName: 'GISAAH | قصة',
    tagline: 'في زمن الكوبي خليك مع قصة',
    description: 'في زمن الكوبي خليك مع قصة — متجر العطور الفاخرة الأصلية',
    copyrightText: '© GISAAH قصة. جميع الحقوق محفوظة.',
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
    primary: '#DAA520',
    secondary: '#B8860B',
    accent: '#DAA520',
    background: '#F8F6EF',
    surface: '#FFFFFF',
    text: '#232323',
    textMuted: '#64748b',
    border: '#F0E2C5',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  contact: { phone: null, email: null, whatsapp: null, address: null, mapUrl: null },
  social: { facebook: null, instagram: null, tiktok: null, twitter: null, youtube: null },
  seo: {
    title: 'GISAAH | قصة',
    description: 'في زمن الكوبي خليك مع قصة — متجر العطور الفاخرة الأصلية',
    ogTitle: 'GISAAH | قصة',
    ogDescription: 'في زمن الكوبي خليك مع قصة — متجر العطور الفاخرة الأصلية',
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
      trending: { title: 'تريند', subtitle: 'المنتجات الأكثر طلباً الآن', visible: true },
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

export function mergeSiteConfig(apiConfig) {
  if (!apiConfig) return DEFAULT_SITE_CONFIG;
  return {
    brand: { ...DEFAULT_SITE_CONFIG.brand, ...apiConfig.brand },
    media: { ...DEFAULT_SITE_CONFIG.media, ...apiConfig.media },
    theme: { ...DEFAULT_SITE_CONFIG.theme, ...apiConfig.theme },
    contact: { ...DEFAULT_SITE_CONFIG.contact, ...apiConfig.contact },
    social: { ...DEFAULT_SITE_CONFIG.social, ...apiConfig.social },
    seo: { ...DEFAULT_SITE_CONFIG.seo, ...apiConfig.seo },
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
