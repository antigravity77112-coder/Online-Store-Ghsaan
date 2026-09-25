/**
 * Cloudinary URL Optimizer — أداة تحسين روابط Cloudinary
 * 
 * EN: Transforms raw Cloudinary URLs to include dynamic optimizations:
 *     - f_auto: Serves WebP/AVIF to compatible browsers (40-60% smaller files)
 *     - q_auto: AI-selected quality (no visible degradation)
 *     - w_{width}: Exact pixel width needed (prevents downloading giant images)
 *     - c_limit: Never upscale, only downscale
 *     - dpr_auto: Adapts to device pixel ratio (Retina displays)
 * 
 * AR: يحوّل روابط Cloudinary الخام لتشمل تحسينات ديناميكية:
 *     - f_auto: يقدم صيغة WebP/AVIF للمتصفحات المتوافقة (أصغر بـ 40-60%)
 *     - q_auto: جودة مختارة بالذكاء الاصطناعي (بدون تدهور مرئي)
 *     - w_{width}: العرض الدقيق المطلوب بالبكسل (يمنع تحميل صور ضخمة)
 *     - c_limit: لا تكبير أبداً، فقط تصغير
 *     - dpr_auto: يتكيف مع كثافة بكسلات الجهاز (شاشات ريتينا)
 */

// EN: Regex to match Cloudinary upload URLs
// AR: تعبير نمطي لمطابقة روابط رفع Cloudinary
const CLOUDINARY_REGEX = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(v\d+\/.+)$/;

// EN: Regex to detect if transformations are already present
// AR: تعبير نمطي للكشف عما إذا كانت التحويلات موجودة بالفعل
const HAS_TRANSFORMS_REGEX = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)([^v][^/]*\/)/;

/**
 * getOptimizedImageUrl — الحصول على رابط الصورة المُحسّن
 * 
 * EN: Takes a raw image URL and returns an optimized Cloudinary URL.
 *     If the URL is not from Cloudinary, returns it unchanged.
 *     If the URL already has transformations, replaces them.
 * 
 * AR: يأخذ رابط صورة خام ويرجع رابط Cloudinary مُحسّن.
 *     إذا لم يكن الرابط من Cloudinary، يرجعه كما هو.
 *     إذا كان الرابط يحتوي تحويلات بالفعل، يستبدلها.
 * 
 * @param {string} url - The original image URL / رابط الصورة الأصلي
 * @param {number} width - Target width in CSS pixels / العرض المستهدف بالبكسل
 * @returns {string} Optimized URL / الرابط المُحسّن
 */
/**
 * Strip Cloudinary delivery transforms and return the stored asset URL.
 * Used as a fallback when optimized delivery URLs 404 for certain uploads.
 */
export function getRawCloudinaryUrl(url) {
  if (!url || typeof url !== 'string') return url;
  const match = url.match(/^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(?:[^/]+\/)*(v\d+\/.+)$/);
  return match ? `${match[1]}${match[2]}` : url;
}

export function getOptimizedImageUrl(url, width = 400) {
  if (!url || typeof url !== 'string') return url;

  const rawUrl = getRawCloudinaryUrl(url);

  // Callers keep getRawCloudinaryUrl as an onError fallback in case a delivery transform 404s.
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

/**
 * Preset widths for common use cases / أعراض محددة مسبقاً للاستخدامات الشائعة
 * 
 * EN: These match the actual rendered sizes in the UI to avoid downloading
 *     unnecessary pixels. Calculated as: CSS width × 2 (for Retina).
 * 
 * AR: تطابق الأحجام المعروضة الفعلية في الواجهة لمنع تحميل بكسلات غير ضرورية.
 *     محسوبة كـ: عرض CSS × 2 (لشاشات ريتينا).
 */
export const IMAGE_WIDTHS = {
  GRID_CARD: 600,      // 2-column mobile grid: ~200px × 3dpr ≈ 600px
  GRID_CARD_RETINA: 900,
  BELT_CARD: 380,      // Belt card: ~190px × 2dpr = 380px
  THUMBNAIL: 150,      // Small thumbnail: ~75px × 2dpr = 150px
  CATEGORY_CARD: 400,  // Category full-bleed card: ~200px × 2dpr = 400px
  DETAIL: 1200,        // Product detail page: ~400px × 3dpr = 1200px
  HERO_MOBILE: 800,
  HERO_DESKTOP: 1400,
  BANNER_MOBILE: 640,
  BANNER_DESKTOP: 1000,
};

/**
 * Placement-aware banner URL optimization.
 * Non-Cloudinary URLs are returned unchanged by getOptimizedImageUrl.
 */
export function getBannerImageUrl(url, { placement = 'promo', isMobile = false } = {}) {
  if (!url) return url;
  const width =
    placement === 'hero'
      ? (isMobile ? IMAGE_WIDTHS.HERO_MOBILE : IMAGE_WIDTHS.HERO_DESKTOP)
      : (isMobile ? IMAGE_WIDTHS.BANNER_MOBILE : IMAGE_WIDTHS.BANNER_DESKTOP);
  return getOptimizedImageUrl(url, width);
}

function isCloudinaryImageUrl(url) {
  return typeof url === 'string' && url.includes('res.cloudinary.com');
}

/**
 * Build src/srcSet/sizes for Cloudinary images. Non-Cloudinary URLs return src only.
 */
export function getResponsiveCloudinarySources(url, { widths, sizes, fallbackWidth } = {}) {
  if (!url) {
    return { src: url, srcSet: undefined, sizes: undefined };
  }

  if (!isCloudinaryImageUrl(url)) {
    return { src: url, srcSet: undefined, sizes: undefined };
  }

  const uniqueWidths = [...new Set(widths.filter(Boolean))].sort((a, b) => a - b);
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

export const RESPONSIVE_WIDTHS = {
  HERO: [640, 800, 1200, 1400, 1600],
  DETAIL: [640, 800, 1200, 1600],
  BANNER: [640, 800, 1000, 1200, 1400],
};

export const RESPONSIVE_SIZES = {
  HERO: '100vw',
  DETAIL: '(max-width: 1023px) 100vw, 52vw',
  BANNER_FULL: '100vw',
  BANNER_SIDEBAR: '(max-width: 1023px) 100vw, 340px',
};

/**
 * Placement-aware responsive sources for storefront banners.
 */
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
