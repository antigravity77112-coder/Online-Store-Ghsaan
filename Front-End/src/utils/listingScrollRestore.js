/**
 * Module-level listing scroll restore.
 * Survives React remounts / effect cleanups. No localStorage.
 * Wait for pagesReady / height, then one instant jump (no crawl).
 */

import {
  clearExpectedListingReturn,
  getListingMemory,
  isExpectedListingReturn,
  markListingExitToProduct,
} from './listingSessionMemory';

const THRESHOLD = 48;
const MAX_MS = 6000;
/** After pagesReady, briefly retry if images still growing height. */
const POST_READY_RETRY_MS = 400;

let activeKey = null;
/** Frozen Y for the active restore — never re-read from live scroll persist. */
let frozenTargetY = null;
let rafId = 0;
let startedAt = 0;
let pagesReadyFlag = false;
let safetyTimer = 0;
let postReadyTimer = 0;

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
  if (safetyTimer) {
    window.clearTimeout(safetyTimer);
    safetyTimer = 0;
  }
  if (postReadyTimer) {
    window.clearTimeout(postReadyTimer);
    postReadyTimer = 0;
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

function finish(listingKey) {
  stopListingScrollRestore();
  clearExpectedListingReturn(listingKey);
}

function jumpToTarget(listingKey, y) {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
  if (safetyTimer) {
    window.clearTimeout(safetyTimer);
    safetyTimer = 0;
  }
  applyY(y);
  // One short correction if layout grows right after jump (images).
  if (postReadyTimer) window.clearTimeout(postReadyTimer);
  postReadyTimer = window.setTimeout(() => {
    if (activeKey !== listingKey) return;
    applyY(y);
    finish(listingKey);
  }, POST_READY_RETRY_MS);
}

function tick() {
  const listingKey = activeKey;
  if (!listingKey) return;

  const y = frozenTargetY;
  if (typeof y !== 'number' || y <= 8) {
    finish(listingKey);
    return;
  }

  const maxY = maxScrollY();
  const elapsed = Date.now() - startedAt;
  const tallEnough = maxY >= y - THRESHOLD;

  // Wait — do NOT applyY while short (that caused the slow crawl UX).
  if (!tallEnough && !pagesReadyFlag && elapsed < MAX_MS) {
    rafId = requestAnimationFrame(tick);
    return;
  }

  // pagesReady but still short: clamp once and stop (best effort).
  if (!tallEnough && pagesReadyFlag) {
    applyY(Math.min(y, maxY));
    finish(listingKey);
    return;
  }

  if (tallEnough) {
    jumpToTarget(listingKey, y);
    return;
  }

  // Timed out still short
  applyY(Math.min(y, maxY));
  finish(listingKey);
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
    if (pagesReadyFlag) {
      clearTimers();
      tick();
    } else if (!rafId) {
      rafId = requestAnimationFrame(tick);
    }
    return;
  }

  stopListingScrollRestore();
  activeKey = listingKey;
  frozenTargetY = target;
  pagesReadyFlag = Boolean(pagesReady);
  startedAt = Date.now();

  tick();

  // Single safety timeout if pagesReady never arrives.
  safetyTimer = window.setTimeout(() => {
    if (activeKey === listingKey) tick();
  }, MAX_MS);
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
