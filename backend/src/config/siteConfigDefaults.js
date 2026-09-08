/** Smart Shopper default configuration — used when DB fields are null/missing */

const DEFAULT_THEME = {
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
};

const DEFAULT_HOMEPAGE = {
  offerBeltVisible: true,
  sections: {
    bestSellers: { title: 'الأكثر مبيعاً', subtitle: '', visible: true },
    newArrivals: { title: 'وصل حديثاً', subtitle: '', visible: true },
    trending: { title: 'الأكثر رواجاً', subtitle: 'منتجات رائجة الآن', visible: true },
    featured: { title: 'منتجات مميزة', subtitle: 'مختارات من أفضل المنتجات', visible: true },
    categories: { title: 'الفئات', subtitle: '', visible: true },
  },
};

const DEFAULT_BRAND = {
  siteName: 'Smart Shopper | المتسوق الذكي',
  siteShortName: 'Smart Shopper',
  siteNameAr: 'المتسوق الذكي',
  appName: 'Smart Shopper | المتسوق الذكي',
  tagline: 'تسوق ذكي — منتجات متنوعة بأسعار منافسة',
  siteDescription: 'المتسوق الذكي — متجرك الإلكتروني لمنتجات متنوعة بأسعار منافسة وتجربة تسوق سهلة',
  copyrightText: '© Smart Shopper المتسوق الذكي. جميع الحقوق محفوظة.',
};

const DEFAULT_MEDIA = {
  logoUrl: '/Logo_light_192.png',
  logoDarkUrl: '/Logo_dark_192.png',
  logoMobileUrl: '/Logo_light_192.png',
  logoMobileDarkUrl: '/Logo_dark_192.png',
  faviconUrl: '/favicon.png',
  ogImageUrl: '/og-share.png',
};

const DEFAULT_SEO = {
  seoTitle: 'Smart Shopper | المتسوق الذكي',
  seoDescription: 'المتسوق الذكي — متجرك الإلكتروني لمنتجات متنوعة بأسعار منافسة وتجربة تسوق سهلة',
  ogTitle: 'Smart Shopper | المتسوق الذكي',
  ogDescription: 'المتسوق الذكي — متجرك الإلكتروني لمنتجات متنوعة بأسعار منافسة وتجربة تسوق سهلة',
};

const DEFAULT_FOOTER = {
  footerText: 'متجرك الإلكتروني — منتجات متنوعة بأسعار منافسة وتجربة تسوق سهلة.',
};

/** Legacy GISAAH / قصة values still stored in DB — remap to Smart Shopper */
const LEGACY_BRAND_MAP = {
  siteName: new Set(['GISAAH | قصة', 'GISAAH|قصة', 'GISAAH']),
  siteShortName: new Set(['GISAAH', 'Gisaah', 'GISAah']),
  appName: new Set(['GISAAH | قصة', 'GISAAH|قصة', 'GISAAH']),
  tagline: new Set(['في زمن الكوبي خليك مع قصة']),
  siteDescription: new Set([
    'في زمن الكوبي خليك مع قصة — متجر العطور الفاخرة الأصلية',
  ]),
  copyrightText: new Set(['© GISAAH قصة. جميع الحقوق محفوظة.']),
  seoTitle: new Set(['GISAAH | قصة', 'GISAAH']),
  seoDescription: new Set([
    'في زمن الكوبي خليك مع قصة — متجر العطور الفاخرة الأصلية',
  ]),
  ogTitle: new Set(['GISAAH | قصة', 'GISAAH']),
  ogDescription: new Set([
    'في زمن الكوبي خليك مع قصة — متجر العطور الفاخرة الأصلية',
  ]),
};

function replaceLegacyBrandValue(field, value, fallback) {
  if (value == null || typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const legacy = LEGACY_BRAND_MAP[field];
  if (legacy && legacy.has(trimmed)) return fallback;
  // Any remaining GISAAH brand string from older DB rows
  if (/GISAAH|Gisaah|GISAah/i.test(trimmed)) return fallback;
  return trimmed;
}

const HEX_COLOR = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

function isValidHexColor(value) {
  return typeof value === 'string' && HEX_COLOR.test(value.trim());
}

function mergeTheme(stored) {
  const base = { ...DEFAULT_THEME };
  if (!stored || typeof stored !== 'object') return base;
  for (const key of Object.keys(base)) {
    const v = stored[key];
    if (isValidHexColor(v)) base[key] = v.trim();
  }
  return base;
}

function mergeHomepage(stored) {
  const base = JSON.parse(JSON.stringify(DEFAULT_HOMEPAGE));
  if (!stored || typeof stored !== 'object') return base;
  if (typeof stored.offerBeltVisible === 'boolean') base.offerBeltVisible = stored.offerBeltVisible;
  if (stored.sections && typeof stored.sections === 'object') {
    for (const [key, section] of Object.entries(stored.sections)) {
      if (!section || typeof section !== 'object') continue;
      base.sections[key] = {
        ...base.sections[key],
        ...(section.title != null ? { title: String(section.title) } : {}),
        ...(section.subtitle != null ? { subtitle: String(section.subtitle) } : {}),
        ...(typeof section.visible === 'boolean' ? { visible: section.visible } : {}),
      };
    }
  }
  return base;
}

function pickUrl(value, fallback) {
  if (value && typeof value === 'string' && value.trim()) {
    const trimmed = value.trim();
    if (/6eeb\.com|gisaah\.com|gisaah-store\.vercel\.app/i.test(trimmed)) {
      return fallback;
    }
    return trimmed;
  }
  return fallback;
}

function mergeRecord(record) {
  const r = record || {};
  const theme = mergeTheme(r.themeConfig);
  const homepage = mergeHomepage(r.homepageConfig);

  return {
    ...r,
    siteName: replaceLegacyBrandValue('siteName', r.siteName, DEFAULT_BRAND.siteName),
    siteShortName: replaceLegacyBrandValue('siteShortName', r.siteShortName, DEFAULT_BRAND.siteShortName),
    appName: replaceLegacyBrandValue('appName', r.appName, DEFAULT_BRAND.appName),
    tagline: replaceLegacyBrandValue('tagline', r.tagline, DEFAULT_BRAND.tagline),
    siteDescription: replaceLegacyBrandValue('siteDescription', r.siteDescription, DEFAULT_SEO.seoDescription),
    copyrightText: replaceLegacyBrandValue('copyrightText', r.copyrightText, DEFAULT_BRAND.copyrightText),
    logoUrl: pickUrl(r.logoUrl, DEFAULT_MEDIA.logoUrl),
    logoDarkUrl: pickUrl(r.logoDarkUrl, DEFAULT_MEDIA.logoDarkUrl),
    logoMobileUrl: pickUrl(r.logoMobileUrl, DEFAULT_MEDIA.logoMobileUrl),
    logoMobileDarkUrl: pickUrl(r.logoMobileDarkUrl, DEFAULT_MEDIA.logoMobileDarkUrl),
    faviconUrl: pickUrl(r.faviconUrl, DEFAULT_MEDIA.faviconUrl),
    ogImageUrl: pickUrl(r.ogImageUrl, DEFAULT_MEDIA.ogImageUrl),
    ogTitle: replaceLegacyBrandValue('ogTitle', r.ogTitle || r.seoTitle, DEFAULT_SEO.ogTitle),
    ogDescription: replaceLegacyBrandValue('ogDescription', r.ogDescription || r.seoDescription, DEFAULT_SEO.ogDescription),
    seoTitle: replaceLegacyBrandValue('seoTitle', r.seoTitle, DEFAULT_SEO.seoTitle),
    seoDescription: replaceLegacyBrandValue('seoDescription', r.seoDescription, DEFAULT_SEO.seoDescription),
    footerText: r.footerText || DEFAULT_FOOTER.footerText,
    themeConfig: theme,
    homepageConfig: homepage,
  };
}

function toPublicConfig(merged, { client = 'web' } = {}) {
  const isMobile = client === 'mobile';

  const media = isMobile
    ? {
        logoUrl: merged.logoMobileUrl || merged.logoUrl,
        logoDarkUrl: merged.logoMobileDarkUrl || merged.logoDarkUrl,
        logoMobileUrl: merged.logoMobileUrl || merged.logoUrl,
        logoMobileDarkUrl: merged.logoMobileDarkUrl || merged.logoDarkUrl,
      }
    : {
        logoUrl: merged.logoUrl,
        logoDarkUrl: merged.logoDarkUrl,
        faviconUrl: merged.faviconUrl,
        ogImageUrl: merged.ogImageUrl,
      };

  return {
    brand: {
      siteName: merged.siteName,
      siteShortName: merged.siteShortName,
      siteNameAr: DEFAULT_BRAND.siteNameAr,
      appName: merged.appName,
      tagline: merged.tagline,
      description: merged.siteDescription,
      copyrightText: merged.copyrightText,
    },
    media,
    theme: merged.themeConfig,
    contact: {
      phone: merged.contactPhone,
      email: merged.contactEmail,
      whatsapp: merged.whatsappUrl,
      address: merged.address || null,
      mapUrl: merged.mapUrl || null,
    },
    social: {
      facebook: merged.facebookUrl || null,
      instagram: merged.instagramUrl || null,
      tiktok: merged.tiktokUrl || null,
      twitter: merged.twitterUrl || null,
      youtube: merged.youtubeUrl || null,
      telegram: merged.telegramUrl || null,
      linkedin: merged.linkedinUrl || null,
      threads: merged.threadsUrl || null,
    },
    seo: {
      title: merged.seoTitle,
      description: merged.seoDescription,
      ogTitle: merged.ogTitle,
      ogDescription: merged.ogDescription,
      ogImageUrl: merged.ogImageUrl,
    },
    content: {
      aboutUsText: merged.aboutUsText,
      shippingOfferText: merged.shippingOfferText,
      footerText: merged.footerText,
    },
    homepage: merged.homepageConfig,
    footerLinks: merged.footerLinks || null,
  };
}

function toAbsoluteAssetUrl(url, baseUrl = process.env.PUBLIC_SITE_URL || process.env.PUBLIC_URL || 'https://online-store-ghsaan.vercel.app') {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/6eeb\.com|gisaah\.com|gisaah-store\.vercel\.app/i.test(trimmed)) {
    const path = trimmed.replace(/^https?:\/\/[^/]+/i, '') || '/og-share.png';
    const base = String(baseUrl).replace(/\/$/, '');
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const base = String(baseUrl).replace(/\/$/, '');
  return `${base}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
}

function buildWebManifest(publicConfig, baseUrl = process.env.PUBLIC_SITE_URL || process.env.PUBLIC_URL || 'https://online-store-ghsaan.vercel.app') {
  const brand = publicConfig?.brand || DEFAULT_BRAND;
  const media = publicConfig?.media || DEFAULT_MEDIA;
  const theme = publicConfig?.theme || DEFAULT_THEME;
  const favicon = media.faviconUrl || DEFAULT_MEDIA.faviconUrl;
  const logo512 = media.logoUrl || '/Logo_512.png';

  return {
    name: brand.siteName || brand.appName || DEFAULT_BRAND.siteName,
    short_name: brand.siteShortName || DEFAULT_BRAND.siteShortName,
    description: brand.description || brand.tagline || DEFAULT_BRAND.siteDescription,
    start_url: '/',
    display: 'standalone',
    background_color: theme.background || DEFAULT_THEME.background,
    theme_color: theme.primary || DEFAULT_THEME.primary,
    icons: [
      {
        src: toAbsoluteAssetUrl(favicon, baseUrl),
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: toAbsoluteAssetUrl(logo512, baseUrl),
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ].filter((icon) => icon.src),
  };
}

module.exports = {
  DEFAULT_THEME,
  DEFAULT_HOMEPAGE,
  DEFAULT_BRAND,
  DEFAULT_MEDIA,
  DEFAULT_SEO,
  mergeRecord,
  mergeTheme,
  mergeHomepage,
  toPublicConfig,
  toAbsoluteAssetUrl,
  buildWebManifest,
  isValidHexColor,
};
