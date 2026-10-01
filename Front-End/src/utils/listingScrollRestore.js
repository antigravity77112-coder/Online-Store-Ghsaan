/**
 * Module-level listing scroll restore.
 * Survives React remounts / effect cleanups. No localStorage.
 */

import {
  clearExpectedListingReturn,
  getListingMemory,
  isExpectedListingReturn,
  markListingExitToProduct,
} from './listingSessionMemory';

const THRESHOLD = 48;
const MAX_MS = 6000;

let activeKey = null;
/** Frozen Y for the active restore — never re-read from live scroll persist. */
let frozenTargetY = null;
let rafId = 0;
let startedAt = 0;
let pagesReadyFlag = false;
const timeouts = [];

function readScrollY() {
  return window.scrollY || document.documentElement.scrollTop || 0;
}

function maxScrollY() {
  const doc = document.documentElement;
  return Math.max(0, (doc?.scrollHeight || 0) - window.innerHeight);
}

function applyY(y) {
  const target = Math.max(0, y);
  window.scrollTo(0, target);
  document.documentElement.scrollTop = target;
  if (document.body) document.body.scrollTop = target;
}

function clearTimers() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
  while (timeouts.length) {
    window.clearTimeout(timeouts.pop());
  }
}

export function isListingScrollRestoreActive() {
  return activeKey != null;
}

/** Sync capture before navigating to a product (call from pointerdown). */
export function captureListingExit(listingKey) {
  markListingExitToProduct(listingKey);
}

export function stopListingScrollRestore() {
  activeKey = null;
  frozenTargetY = null;
  pagesReadyFlag = false;
  clearTimers();
}

function tick() {
  const listingKey = activeKey;
  if (!listingKey) return;

  const y = frozenTargetY;
  if (typeof y !== 'number' || y <= 8) {
    stopListingScrollRestore();
    clearExpectedListingReturn(listingKey);
    return;
  }

  const maxY = maxScrollY();
  const elapsed = Date.now() - startedAt;
  const tallEnough = maxY >= y - THRESHOLD;

  // Wait until the document can reach the saved place (pages still loading).
  if (!tallEnough && !pagesReadyFlag && elapsed < MAX_MS) {
    // Do NOT applyY(maxY) here — that fires scroll events and used to corrupt saved Y.
    // Just wait for layout to grow.
    rafId = requestAnimationFrame(tick);
    return;
  }

  applyY(tallEnough ? y : Math.min(y, maxY));

  const current = readScrollY();
  const gap = Math.abs(current - (tallEnough ? y : Math.min(y, maxY)));

  if ((tallEnough && gap <= THRESHOLD) || elapsed >= MAX_MS) {
    if (tallEnough) applyY(y);
    stopListingScrollRestore();
    clearExpectedListingReturn(listingKey);
    return;
  }

  rafId = requestAnimationFrame(tick);
}

/**
 * Start (or continue) restoring window.scrollY for listingKey.
 * Loop lives outside React so remounts cannot cancel it.
 */
export function startListingScrollRestore(listingKey, { pagesReady = false } = {}) {
  if (!listingKey) return;
  if (typeof window === 'undefined') return;

  const mem = getListingMemory(listingKey);
  const target = mem?.restoreScrollY ?? mem?.scrollY;
  if (typeof target !== 'number' || target <= 8) return;

  if (pagesReady) pagesReadyFlag = true;

  if (activeKey === listingKey) {
    if (!rafId) rafId = requestAnimationFrame(tick);
    return;
  }

  stopListingScrollRestore();
  activeKey = listingKey;
  frozenTargetY = target;
  pagesReadyFlag = Boolean(pagesReady);
  startedAt = Date.now();

  tick();
  [40, 100, 200, 400, 700, 1100, 1600, 2200, 3000, 4000, 5000].forEach((ms) => {
    timeouts.push(
      window.setTimeout(() => {
        if (activeKey === listingKey) tick();
      }, ms),
    );
  });
}

export function shouldRestoreListing(listingKey, navigationType) {
  return navigationType === 'POP' || isExpectedListingReturn(listingKey);
}

/** True if href points at a storefront product route. */
export function isProductListingHref(href) {
  if (!href || href.startsWith('#') || href.startsWith('javascript:')) return false;
  try {
    const path = href.startsWith('http') || href.startsWith('//')
      ? new URL(href, window.location.origin).pathname
      : href.split('?')[0];
    return path.startsWith('/product/');
  } catch {
    return String(href).includes('/product/');
  }
}
