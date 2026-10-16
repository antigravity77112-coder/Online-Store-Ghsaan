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
    // Logos: DB / admin upload only — never invent a local file.
    logoUrl: null,
    logoDarkUrl: null,
    logoMobileUrl: null,
    logoMobileDarkUrl: null,
    faviconUrl: '/favicon.png',
    ogImageUrl: null,
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
  contact: { phone: null, email: null, whatsapp: null, whatsappContacts: [], address: null, mapUrl: null },
  social: { facebook: null, instagram: null, tiktok: null, twitter: null, youtube: null, telegram: null, linkedin: null, threads: null },
  seo: {
    title: 'Smart Shopper | المتسوق الذكي',
    description: 'المتسوق الذكي — متجرك الإلكتروني لمنتجات متنوعة بأسعار منافسة وتجربة تسوق سهلة',
    ogTitle: 'Smart Shopper | المتسوق الذكي',
    ogDescription: 'المتسوق الذكي — متجرك الإلكتروني لمنتجات متنوعة بأسعار منافسة وتجربة تسوق سهلة',
    ogImageUrl: null,
  },
  content: {
    aboutUsText: '',
    privacyPolicyText: '',
    shippingOfferText: '',
    footerText: 'متجرك الإلكتروني — منتجات متنوعة بأسعار منافسة وتجربة تسوق سهلة.',
  },
  homepage: {
    offerBeltVisible: true,
    sections: {
      bestSellers: { title: 'العروض الحصرية', subtitle: 'منتجات مميزة وعروض مختارة', visible: true },
      newArrivals: { title: 'وصل حديثاً', subtitle: '', visible: true },
      trending: { title: 'ترندات', subtitle: 'المنتجات الأكثر طلباً الآن', visible: true },
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

function pickText(value, fallback) {
  if (value == null || typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function pickOgImageUrl(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function sanitizeBrand(brand = {}) {
  const base = { ...DEFAULT_SITE_CONFIG.brand, ...brand };
  return {
    ...base,
    siteName: pickText(base.siteName, DEFAULT_SITE_CONFIG.brand.siteName),
    siteShortName: pickText(base.siteShortName, DEFAULT_SITE_CONFIG.brand.siteShortName),
    siteNameAr: pickText(base.siteNameAr, DEFAULT_SITE_CONFIG.brand.siteNameAr),
    appName: pickText(base.appName, DEFAULT_SITE_CONFIG.brand.appName),
    tagline: pickText(base.tagline, DEFAULT_SITE_CONFIG.brand.tagline),
    description: pickText(base.description, DEFAULT_SITE_CONFIG.brand.description),
    copyrightText: pickText(base.copyrightText, DEFAULT_SITE_CONFIG.brand.copyrightText),
  };
}

function sanitizeSeo(seo = {}) {
  const base = { ...DEFAULT_SITE_CONFIG.seo, ...seo };
  return {
    ...base,
    title: pickText(base.title, DEFAULT_SITE_CONFIG.seo.title),
    description: pickText(base.description, DEFAULT_SITE_CONFIG.seo.description),
    ogTitle: pickText(base.ogTitle, DEFAULT_SITE_CONFIG.seo.ogTitle),
    ogDescription: pickText(base.ogDescription, DEFAULT_SITE_CONFIG.seo.ogDescription),
    // OG image: DB only — never invent a default file.
    ogImageUrl: pickOgImageUrl(base.ogImageUrl),
  };
}

function sanitizeMedia(media = {}) {
  const base = { ...DEFAULT_SITE_CONFIG.media, ...media };
  return {
    ...base,
    ogImageUrl: pickOgImageUrl(base.ogImageUrl),
  };
}

export function mergeSiteConfig(apiConfig) {
  if (!apiConfig) return DEFAULT_SITE_CONFIG;
  return {
    brand: sanitizeBrand(apiConfig.brand),
    media: sanitizeMedia(apiConfig.media),
    theme: { ...DEFAULT_SITE_CONFIG.theme, ...apiConfig.theme },
    contact: {
      ...DEFAULT_SITE_CONFIG.contact,
      ...apiConfig.contact,
      whatsappContacts: Array.isArray(apiConfig.contact?.whatsappContacts)
        ? apiConfig.contact.whatsappContacts
        : (DEFAULT_SITE_CONFIG.contact.whatsappContacts || []),
    },
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

function pickMediaUrl(value, fallback) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return fallback || null;
}

function guessImageMime(url) {
  const lower = String(url || '').toLowerCase();
  if (lower.includes('.svg')) return 'image/svg+xml';
  if (lower.includes('.webp')) return 'image/webp';
  if (lower.includes('.jpg') || lower.includes('.jpeg')) return 'image/jpeg';
  if (lower.includes('.ico')) return 'image/x-icon';
  return 'image/png';
}

/** Pick light or dark logo for the website (logoUrl / logoDarkUrl only). DB / admin URLs only. */
export function resolveSiteLogo(media, { dark = false } = {}) {
  const m = media || {};
  if (dark) {
    return pickMediaUrl(m.logoDarkUrl, null) || pickMediaUrl(m.logoUrl, null);
  }
  return pickMediaUrl(m.logoUrl, null) || pickMediaUrl(m.logoDarkUrl, null);
}

/** Mobile logo — prefers app assets, falls back to website logos. DB / admin URLs only. */
export function resolveMobileLogo(media, { dark = false } = {}) {
  const m = media || {};
  if (dark) {
    return pickMediaUrl(m.logoMobileDarkUrl, null)
      || pickMediaUrl(m.logoDarkUrl, null)
      || pickMediaUrl(m.logoMobileUrl, null)
      || pickMediaUrl(m.logoUrl, null);
  }
  return pickMediaUrl(m.logoMobileUrl, null) || pickMediaUrl(m.logoUrl, null);
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

/** Sync favicon, apple-touch-icon, theme-color, and PWA manifest from site config (DB first). */
export function applySiteMediaToDocument(config) {
  if (typeof document === 'undefined') return;

  const media = config?.media || {};
  const brand = config?.brand || DEFAULT_SITE_CONFIG.brand;
  const theme = config?.theme || DEFAULT_SITE_CONFIG.theme;

  const favicon = pickMediaUrl(media.faviconUrl, DEFAULT_SITE_CONFIG.media.faviconUrl);
  const logoLight = pickMediaUrl(media.logoUrl, DEFAULT_SITE_CONFIG.media.logoUrl);
  const appleIcon = favicon;
  const icon192 = resolveAbsoluteMediaUrl(favicon);
  const icon512 = resolveAbsoluteMediaUrl(logoLight || favicon);
  const iconType = guessImageMime(icon192);

  if (icon192) {
    // Bust browser favicon cache when Admin uploads a new URL
    const cacheBusted = icon192.includes('?') ? icon192 : `${icon192}?v=${encodeURIComponent(icon192.slice(-24))}`;
    upsertLink('icon', cacheBusted, { type: iconType });
    upsertLink('shortcut icon', cacheBusted, { type: iconType });
    upsertLink('apple-touch-icon', resolveAbsoluteMediaUrl(appleIcon) || cacheBusted);
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
      icon192 && { src: icon192, sizes: '192x192', type: iconType, purpose: 'any' },
      icon512 && { src: icon512, sizes: '512x512', type: guessImageMime(icon512), purpose: 'any maskable' },
    ].filter(Boolean),
  };

  // Backend manifest is DB-backed (/api/config/manifest.webmanifest).
  upsertLink('manifest', '/api/config/manifest.webmanifest');

  // Also keep an in-memory manifest for environments without the API proxy.
  manifestObjectUrl = URL.createObjectURL(
    new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }),
  );
}
