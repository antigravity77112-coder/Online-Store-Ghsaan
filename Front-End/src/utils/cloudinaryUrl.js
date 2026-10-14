/**
 * Image URL optimizer — Cloudinary delivery transforms + optional Cloudflare
 * Image Resizing in front of R2 / custom media hosts.
 *
 * Cloudinary: f_auto,q_auto,w_* on res.cloudinary.com
 * R2/media:   /cdn-cgi/image/width=*,quality=75,format=auto/... when
 *             VITE_CF_IMAGE_RESIZING=1 (and optional VITE_R2_PUBLIC_BASE_URL)
 */

const CLOUDINARY_REGEX = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(v\d+\/.+)$/;
const HAS_TRANSFORMS_REGEX = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)([^v][^/]*\/)/;
const CF_IMAGE_PREFIX = '/cdn-cgi/image/';

function readEnv(name) {
  try {
    return import.meta.env?.[name];
  } catch {
    return undefined;
  }
}

/** True when Cloudflare Image Resizing should wrap R2/media URLs. */
export function isCfImageResizingEnabled() {
  const raw = String(readEnv('VITE_CF_IMAGE_RESIZING') || '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

/**
 * Configured public media base (custom domain in front of R2), no trailing slash.
 * Example: https://media.example.com
 */
export function getConfiguredMediaBaseUrl() {
  const raw = String(readEnv('VITE_R2_PUBLIC_BASE_URL') || '').trim().replace(/\/$/, '');
  return raw || '';
}

function isCloudinaryImageUrl(url) {
  return typeof url === 'string' && url.includes('res.cloudinary.com');
}

function isR2DevUrl(url) {
  return typeof url === 'string' && /\.r2\.dev\//i.test(url);
}

/** Hosts we treat as R2 / storefront media (eligible for CF resizing). */
export function isMediaHostUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (isCloudinaryImageUrl(url)) return false;
  if (isR2DevUrl(url)) return true;
  const base = getConfiguredMediaBaseUrl();
  if (base && url.startsWith(base)) return true;
  try {
    const host = new URL(url).hostname;
    if (base) {
      const baseHost = new URL(base).hostname;
      if (host === baseHost) return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

function isTransformableCloudinaryUrl(url) {
  return isCloudinaryImageUrl(url);
}

/**
 * Strip Cloudinary delivery transforms and return the stored asset URL.
 * Used as a fallback when optimized delivery URLs 404 for certain uploads.
 * For non-Cloudinary URLs, strips a leading /cdn-cgi/image/.../ wrapper if present.
 */
export function getRawCloudinaryUrl(url) {
  if (!url || typeof url !== 'string') return url;

  const cfIdx = url.indexOf(CF_IMAGE_PREFIX);
  if (cfIdx !== -1) {
    try {
      const u = new URL(url);
      const path = u.pathname;
      const after = path.slice(path.indexOf(CF_IMAGE_PREFIX) + CF_IMAGE_PREFIX.length);
      // options/path — first segment is options, rest is object path
      const slash = after.indexOf('/');
      if (slash > 0) {
        const objectPath = after.slice(slash + 1);
        const origin = getConfiguredMediaBaseUrl() || `${u.protocol}//${u.host}`;
        return `${origin.replace(/\/$/, '')}/${objectPath.replace(/^\//, '')}`;
      }
    } catch {
      /* fall through */
    }
  }

  const match = url.match(/^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(?:[^/]+\/)*(v\d+\/.+)$/);
  return match ? `${match[1]}${match[2]}` : url;
}

/**
 * Rewrite pub-*.r2.dev (or any media URL) onto the configured custom media host
 * so /cdn-cgi/image can run on a Cloudflare-proxied zone.
 */
function resolveMediaDeliveryUrl(url) {
  const raw = getRawCloudinaryUrl(url);
  const base = getConfiguredMediaBaseUrl();
  if (!base || !raw) return raw;

  try {
    const u = new URL(raw);
    if (isCloudinaryImageUrl(raw)) return raw;
    // Already on configured host
    if (raw.startsWith(base)) return raw;
    // Map r2.dev (or other media) path onto custom domain
    if (isR2DevUrl(raw) || isMediaHostUrl(raw)) {
      return `${base}/${u.pathname.replace(/^\//, '')}${u.search || ''}`;
    }
  } catch {
    return raw;
  }
  return raw;
}

/**
 * Build Cloudflare Image Resizing URL for an origin media object URL.
 * @param {string} originUrl - Absolute URL on the media host (no cf wrapper)
 * @param {number} width
 */
function buildCfImageUrl(originUrl, width) {
  const w = Math.max(1, Math.round(Number(width) || 400));
  try {
    const u = new URL(originUrl);
    const originBase = getConfiguredMediaBaseUrl() || `${u.protocol}//${u.host}`;
    const objectPath = u.pathname.replace(/^\//, '');
    const options = `width=${w},quality=75,format=auto,fit=scale-down`;
    return `${originBase.replace(/\/$/, '')}${CF_IMAGE_PREFIX}${options}/${objectPath}`;
  } catch {
    return originUrl;
  }
}

/**
 * Optimized delivery URL for the given CSS pixel width.
 * Cloudinary → transforms; R2/media + CF flag → /cdn-cgi/image; else unchanged.
 */
export function getOptimizedImageUrl(url, width = 400) {
  if (!url || typeof url !== 'string') return url;

  if (isTransformableCloudinaryUrl(url)) {
    const rawUrl = getRawCloudinaryUrl(url);
    const transforms = `f_auto,q_auto:good,w_${width},c_limit`;

    const cleanMatch = rawUrl.match(CLOUDINARY_REGEX);
    if (cleanMatch) {
      return `${cleanMatch[1]}${transforms}/${cleanMatch[2]}`;
    }

    const transformMatch = rawUrl.match(HAS_TRANSFORMS_REGEX);
    if (transformMatch) {
      const baseUrl = transformMatch[1];
      const afterBase = rawUrl.substring(baseUrl.length);
      const versionMatch = afterBase.match(/(v\d+\/.+)$/);
      if (versionMatch) {
        return `${baseUrl}${transforms}/${versionMatch[1]}`;
      }
    }
    return url;
  }

  if (isCfImageResizingEnabled() && isMediaHostUrl(url)) {
    const origin = resolveMediaDeliveryUrl(url);
    return buildCfImageUrl(origin, width);
  }

  return url;
}

export const IMAGE_WIDTHS = {
  GRID_CARD: 600,
  GRID_CARD_RETINA: 900,
  BELT_CARD: 380,
  THUMBNAIL: 150,
  CATEGORY_CARD: 400,
  DETAIL: 1200,
  HERO_MOBILE: 800,
  HERO_DESKTOP: 1400,
  BANNER_MOBILE: 640,
  BANNER_DESKTOP: 1000,
};

export function getBannerImageUrl(url, { placement = 'promo', isMobile = false } = {}) {
  if (!url) return url;
  const width =
    placement === 'hero'
      ? (isMobile ? IMAGE_WIDTHS.HERO_MOBILE : IMAGE_WIDTHS.HERO_DESKTOP)
      : (isMobile ? IMAGE_WIDTHS.BANNER_MOBILE : IMAGE_WIDTHS.BANNER_DESKTOP);
  return getOptimizedImageUrl(url, width);
}

/**
 * Build src/srcSet/sizes for Cloudinary or CF-resized media URLs.
 * Plain R2 (flag off) returns src only.
 */
export function getResponsiveCloudinarySources(url, { widths, sizes, fallbackWidth } = {}) {
  if (!url) {
    return { src: url, srcSet: undefined, sizes: undefined };
  }

  const canResize = isCloudinaryImageUrl(url)
    || (isCfImageResizingEnabled() && isMediaHostUrl(url));

  if (!canResize) {
    return { src: url, srcSet: undefined, sizes: undefined };
  }

  const uniqueWidths = [...new Set((widths || []).filter(Boolean))].sort((a, b) => a - b);
  if (uniqueWidths.length === 0) {
    const src = getOptimizedImageUrl(url, fallbackWidth || 800);
    return { src, srcSet: undefined, sizes: undefined };
  }

  const srcSet = uniqueWidths.map((w) => `${getOptimizedImageUrl(url, w)} ${w}w`).join(', ');
  const src = getOptimizedImageUrl(url, fallbackWidth || uniqueWidths[uniqueWidths.length - 1]);

  return {
    src,
    srcSet,
    sizes: sizes || '100vw',
  };
}

/** Alias — same implementation for R2+CF and Cloudinary. */
export const getResponsiveImageSources = getResponsiveCloudinarySources;

export const RESPONSIVE_WIDTHS = {
  HERO: [640, 800, 1200, 1400, 1600],
  DETAIL: [640, 800, 1200, 1600],
  BANNER: [640, 800, 1000, 1200, 1400],
  GRID: [360, 600, 900],
};

export const RESPONSIVE_SIZES = {
  HERO: '100vw',
  DETAIL: '(max-width: 1023px) 100vw, 52vw',
  BANNER_FULL: '100vw',
  BANNER_SIDEBAR: '(max-width: 1023px) 100vw, 340px',
  GRID: '(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 16vw',
};

export function getBannerResponsiveSources(url, { placement = 'promo', isMobile = false } = {}) {
  if (!url) {
    return { src: url, srcSet: undefined, sizes: undefined };
  }

  let widths;
  let sizes;
  let fallbackWidth;

  if (placement === 'hero') {
    widths = isMobile ? [640, 800, 1200] : RESPONSIVE_WIDTHS.HERO;
    sizes = RESPONSIVE_SIZES.HERO;
    fallbackWidth = isMobile ? IMAGE_WIDTHS.HERO_MOBILE : IMAGE_WIDTHS.HERO_DESKTOP;
  } else if (placement === 'sidebar') {
    widths = [400, 640, 800];
    sizes = RESPONSIVE_SIZES.BANNER_SIDEBAR;
    fallbackWidth = IMAGE_WIDTHS.BANNER_MOBILE;
  } else {
    widths = isMobile ? [640, 800, 1000] : RESPONSIVE_WIDTHS.BANNER;
    sizes = RESPONSIVE_SIZES.BANNER_FULL;
    fallbackWidth = isMobile ? IMAGE_WIDTHS.BANNER_MOBILE : IMAGE_WIDTHS.BANNER_DESKTOP;
  }

  return getResponsiveCloudinarySources(url, { widths, sizes, fallbackWidth });
}
