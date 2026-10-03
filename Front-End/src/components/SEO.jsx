/**
 * SEO.jsx — Dynamic meta from centralized site config
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSiteConfig } from '../context/SiteConfigContext';
import { DEFAULT_SITE_CONFIG } from '../config/siteConfigDefaults';
import { storefrontUrl } from '../config/storefrontOrigin';
import { normalizeLocale } from '../i18n/localeUtils';

function resolveOgImageUrl(image, config) {
  const raw = image || config.seo?.ogImageUrl || config.media?.ogImageUrl || null;
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return storefrontUrl(trimmed.startsWith('/') ? trimmed : `/${trimmed}`);
}

const SEO = ({
  title,
  description,
  image,
  type = 'website',
  canonicalPath,
  jsonLd,
  noIndex = false,
}) => {
  const location = useLocation();
  const { i18n } = useTranslation();
  const { config } = useSiteConfig();
  const lang = normalizeLocale(i18n.language);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const canonical = canonicalPath
    ? storefrontUrl(canonicalPath)
    : storefrontUrl(location.pathname || '/');

  const siteName = config.seo?.title || DEFAULT_SITE_CONFIG.seo.title;
  const finalTitle = title ? `${title} | ${siteName}` : siteName;
  const finalDescription = description || config.seo?.description || DEFAULT_SITE_CONFIG.seo.description;
  // OG image from DB / page prop only — no /og-share.png default.
  const absoluteImage = resolveOgImageUrl(image, config);
  const ogTitle = config.seo?.ogTitle || finalTitle;
  const ogDescription = config.seo?.ogDescription || finalDescription;

  const schemas = jsonLd
    ? Array.isArray(jsonLd) ? jsonLd : [jsonLd]
    : [];

  return (
    <Helmet htmlAttributes={{ lang, dir }}>
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      <link rel="canonical" href={canonical} />
      <link rel="alternate" hrefLang="ar" href={canonical} />
      <link rel="alternate" hrefLang="ar-YE" href={canonical} />
      <link rel="alternate" hrefLang="x-default" href={canonical} />

      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      {absoluteImage && <meta property="og:image" content={absoluteImage} />}
      {absoluteImage && <meta property="og:image:width" content="1200" />}
      {absoluteImage && <meta property="og:image:height" content="630" />}
      {absoluteImage && <meta property="og:image:alt" content={ogTitle} />}
      <meta property="og:locale" content={lang === 'en' ? 'en_US' : 'ar_YE'} />
      <meta property="og:site_name" content={config.brand?.siteName || siteName} />

      <meta name="twitter:card" content={absoluteImage ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={ogTitle} />
      <meta name="twitter:description" content={ogDescription} />
      {absoluteImage && <meta name="twitter:image" content={absoluteImage} />}

      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(schema)}</script>
      ))}
    </Helmet>
  );
};

export default SEO;
