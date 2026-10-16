import { getOptimizedImageUrl } from './cloudinaryUrl';
import { resolveMediaUrl, resolveSiteLogo } from '../config/siteConfigDefaults';

/** Splash / header mark — small delivery width, retina-safe. */
export const SITE_LOGO_DISPLAY_WIDTH = 192;

const LOGO_CACHE_KEY = 'smart_shopper_site_logo_v1';
const warmed = new Set();

function isDarkDocument() {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}

function readLogoCache() {
  if (typeof localStorage === 'undefined') return { light: null, dark: null };
  try {
    const raw = localStorage.getItem(LOGO_CACHE_KEY);
    if (!raw) return { light: null, dark: null };
    const parsed = JSON.parse(raw);
    return {
      light: typeof parsed?.light === 'string' ? parsed.light : null,
      dark: typeof parsed?.dark === 'string' ? parsed.dark : null,
    };
  } catch {
    return { light: null, dark: null };
  }
}

function writeLogoCache(next) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LOGO_CACHE_KEY, JSON.stringify(next));
  } catch { /* ignore quota */ }
}

/** Sync last-known delivery URL (survives reloads so splash/header paint before /config). */
export function readCachedSiteLogo(dark = isDarkDocument()) {
  const cache = readLogoCache();
  return (dark ? cache.dark : cache.light) || cache.light || cache.dark || null;
}

export function resolveSiteLogoDeliveryUrl(media, { dark = false } = {}) {
  const raw = resolveMediaUrl(resolveSiteLogo(media, { dark }));
  if (!raw) return null;
  return getOptimizedImageUrl(raw, SITE_LOGO_DISPLAY_WIDTH) || raw;
}

/** Persist both theme variants from a site-config payload. */
export function persistSiteLogoUrls(configOrMedia) {
  const media = configOrMedia?.media || configOrMedia || {};
  const light = resolveSiteLogoDeliveryUrl(media, { dark: false });
  const dark = resolveSiteLogoDeliveryUrl(media, { dark: true });
  if (!light && !dark) return null;
  const prev = readLogoCache();
  writeLogoCache({
    light: light || prev.light,
    dark: dark || prev.dark,
  });
  return { light, dark };
}

/**
 * Highest-priority warm for a concrete delivery URL.
 * Injects <link rel=preload fetchpriority=high> and starts Image() decode.
 */
export function preloadSiteLogoUrl(href) {
  if (typeof document === 'undefined' || !href || typeof href !== 'string') return null;
  if (warmed.has(href)) return href;
  warmed.add(href);

  try {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = href;
    link.fetchPriority = 'high';
    document.head.appendChild(link);
  } catch { /* ignore */ }

  try {
    const img = new Image();
    img.decoding = 'async';
    if ('fetchPriority' in img) img.fetchPriority = 'high';
    img.src = href;
  } catch { /* ignore */ }

  return href;
}

/**
 * Highest-priority warm for the DB site logo (splash + header).
 */
export function preloadSiteLogo(configOrMedia, { dark = isDarkDocument() } = {}) {
  persistSiteLogoUrls(configOrMedia);
  const media = configOrMedia?.media || configOrMedia || {};
  const href =
    resolveSiteLogoDeliveryUrl(media, { dark }) ||
    readCachedSiteLogo(dark);
  return preloadSiteLogoUrl(href);
}

/** Call at boot (before React) — start logo bytes from last visit immediately. */
export function warmSiteLogoFromCache(dark = isDarkDocument()) {
  const href = readCachedSiteLogo(dark);
  return preloadSiteLogoUrl(href);
}

/** Catalog/image stampede waits on this so the splash/header logo is not last. */
let logoGateOpen = false;
const logoGateListeners = new Set();

export function isSiteLogoGateOpen() {
  return logoGateOpen;
}

export function openSiteLogoGate() {
  if (logoGateOpen) return;
  logoGateOpen = true;
  logoGateListeners.forEach((cb) => {
    try { cb(); } catch { /* ignore */ }
  });
  logoGateListeners.clear();
}

/** Subscribe once; fires immediately if the gate is already open. */
export function onSiteLogoGateOpen(cb) {
  if (typeof cb !== 'function') return () => {};
  if (logoGateOpen) {
    cb();
    return () => {};
  }
  logoGateListeners.add(cb);
  return () => logoGateListeners.delete(cb);
}

/** Resolves when the image is in HTTP cache / decoded, or after timeout. */
export function waitForSiteLogo(href, timeoutMs = 2000) {
  if (!href || typeof Image === 'undefined') {
    openSiteLogoGate();
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    let settled = false;
    const done = (ok) => {
      if (settled) return;
      settled = true;
      openSiteLogoGate();
      resolve(ok);
    };
    const timer = window.setTimeout(() => done(false), timeoutMs);
    try {
      const img = new Image();
      img.decoding = 'async';
      if ('fetchPriority' in img) img.fetchPriority = 'high';
      img.onload = () => {
        window.clearTimeout(timer);
        done(true);
      };
      img.onerror = () => {
        window.clearTimeout(timer);
        done(false);
      };
      img.src = href;
      if (img.complete && img.naturalWidth > 0) {
        window.clearTimeout(timer);
        done(true);
      }
    } catch {
      window.clearTimeout(timer);
      done(false);
    }
  });
}
