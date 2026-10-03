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
  ogImageUrl: null,
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

function pickText(value, fallback) {
  if (value == null || typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
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
    return value.trim();
  }
  return fallback;
}

/** Normalize up to 4 labeled WhatsApp contacts; keep legacy whatsappUrl as fallback. */
function normalizeWhatsAppContacts(contacts, legacyUrl = null) {
  const list = [];
  if (Array.isArray(contacts)) {
    for (const item of contacts) {
      if (!item || typeof item !== 'object') continue;
      const label = item.label != null ? String(item.label).trim() : '';
      let url = item.url != null ? String(item.url).trim() : '';
      if (!url) continue;
      if (!url.startsWith('http')) {
        const digits = url.replace(/\D/g, '');
        if (!digits) continue;
        url = `https://wa.me/${digits}`;
      }
      list.push({
        label: label || `واتساب ${list.length + 1}`,
        url,
      });
      if (list.length >= 4) break;
    }
  }
  if (list.length === 0 && legacyUrl && String(legacyUrl).trim()) {
    let url = String(legacyUrl).trim();
    if (!url.startsWith('http')) {
      const digits = url.replace(/\D/g, '');
      if (digits) url = `https://wa.me/${digits}`;
    }
    if (url.startsWith('http')) {
      list.push({ label: 'خدمة العملاء', url });
    }
  }
  return list;
}

function mergeRecord(record) {
  const r = record || {};
  const theme = mergeTheme(r.themeConfig);
  const homepage = mergeHomepage(r.homepageConfig);

  return {
    ...r,
    siteName: pickText(r.siteName, DEFAULT_BRAND.siteName),
    siteShortName: pickText(r.siteShortName, DEFAULT_BRAND.siteShortName),
    appName: pickText(r.appName, DEFAULT_BRAND.appName),
    tagline: pickText(r.tagline, DEFAULT_BRAND.tagline),
    siteDescription: pickText(r.siteDescription, DEFAULT_SEO.seoDescription),
    copyrightText: pickText(r.copyrightText, DEFAULT_BRAND.copyrightText),
    logoUrl: pickUrl(r.logoUrl, DEFAULT_MEDIA.logoUrl),
    logoDarkUrl: pickUrl(r.logoDarkUrl, DEFAULT_MEDIA.logoDarkUrl),
    logoMobileUrl: pickUrl(r.logoMobileUrl, DEFAULT_MEDIA.logoMobileUrl),
    logoMobileDarkUrl: pickUrl(r.logoMobileDarkUrl, DEFAULT_MEDIA.logoMobileDarkUrl),
    faviconUrl: pickUrl(r.faviconUrl, DEFAULT_MEDIA.faviconUrl),
    ogImageUrl: pickUrl(r.ogImageUrl, null),
    ogTitle: pickText(r.ogTitle || r.seoTitle, DEFAULT_SEO.ogTitle),
    ogDescription: pickText(r.ogDescription || r.seoDescription, DEFAULT_SEO.ogDescription),
    seoTitle: pickText(r.seoTitle, DEFAULT_SEO.seoTitle),
    seoDescription: pickText(r.seoDescription, DEFAULT_SEO.seoDescription),
    footerText: r.footerText || DEFAULT_FOOTER.footerText,
    themeConfig: theme,
    homepageConfig: homepage,
    whatsappContacts: normalizeWhatsAppContacts(r.whatsappContacts, r.whatsappUrl),
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
      whatsapp: (merged.whatsappContacts?.[0]?.url) || merged.whatsappUrl || null,
      whatsappContacts: Array.isArray(merged.whatsappContacts) ? merged.whatsappContacts : [],
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
      privacyPolicyText: merged.privacyPolicyText || null,
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
  normalizeWhatsAppContacts,
  toPublicConfig,
  toAbsoluteAssetUrl,
  buildWebManifest,
  isValidHexColor,
};
