/**
 * Module-level listing scroll restore.
 * Survives React remounts / effect cleanups. No localStorage.
 * Apply target Y immediately to avoid top-flash, then correct once layout is tall enough.
 */

import {
  clearExpectedListingReturn,
  clearListingRestoreScrollY,
  getListingMemory,
  isExpectedListingReturn,
  markListingExitToProduct,
} from './listingSessionMemory';

const THRESHOLD = 48;
const MAX_MS = 6000;
/** After pagesReady, briefly retry if images still growing height. */
const POST_READY_RETRY_MS = 400;
/** If the user scrolls away from the restore target, abort (do not fight them). */
const USER_SCROLL_ABORT_PX = 120;

let activeKey = null;
/** Frozen Y for the active restore — never re-read from live scroll persist. */
let frozenTargetY = null;
let rafId = 0;
let startedAt = 0;
let pagesReadyFlag = false;
let safetyTimer = 0;
let postReadyTimer = 0;
/** Listing keys whose Back-restore already finished this visit (blocks load-more re-jumps). */
const finishedKeys = new Set();
let userScrollAbortBound = false;

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

function unbindUserScrollAbort() {
  if (!userScrollAbortBound) return;
  window.removeEventListener('wheel', onUserScrollAbort, true);
  window.removeEventListener('touchmove', onUserScrollAbort, true);
  window.removeEventListener('pointerdown', onUserScrollAbort, true);
  userScrollAbortBound = false;
}

function onUserScrollAbort() {
  const listingKey = activeKey;
  const y = frozenTargetY;
  if (!listingKey || typeof y !== 'number') return;
  const current = window.scrollY || document.documentElement.scrollTop || 0;
  // Only abort once the user has clearly moved away from the restore target.
  if (Math.abs(current - y) < USER_SCROLL_ABORT_PX) return;
  finish(listingKey);
}

function bindUserScrollAbort() {
  if (userScrollAbortBound) return;
  window.addEventListener('wheel', onUserScrollAbort, { capture: true, passive: true });
  window.addEventListener('touchmove', onUserScrollAbort, { capture: true, passive: true });
  window.addEventListener('pointerdown', onUserScrollAbort, { capture: true, passive: true });
  userScrollAbortBound = true;
}

/** Sync capture before navigating to a product (call from pointerdown). */
export function captureListingExit(listingKey) {
  if (listingKey) finishedKeys.delete(listingKey);
  markListingExitToProduct(listingKey);
}

export function stopListingScrollRestore() {
  activeKey = null;
  frozenTargetY = null;
  pagesReadyFlag = false;
  unbindUserScrollAbort();
  clearTimers();
}

function finish(listingKey) {
  if (listingKey) {
    finishedKeys.add(listingKey);
    clearListingRestoreScrollY(listingKey);
  }
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

  // Keep the best available position while waiting (avoids staying stuck at top).
  if (!tallEnough && !pagesReadyFlag && elapsed < MAX_MS) {
    applyY(Math.min(y, Math.max(maxY, 0)));
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
 * After finish(), further calls are no-ops until the next product exit
 * (prevents infinite-scroll pagesReady flaps from yanking scroll mid-browse).
 */
export function startListingScrollRestore(listingKey, { pagesReady = false } = {}) {
  if (!listingKey) return;
  if (typeof window === 'undefined') return;

  // Continue an in-flight restore only.
  if (activeKey === listingKey) {
    if (pagesReady) pagesReadyFlag = true;
    if (pagesReadyFlag) {
      clearTimers();
      tick();
    } else if (!rafId) {
      rafId = requestAnimationFrame(tick);
    }
    return;
  }

  // Do not restart after this visit's restore already completed.
  if (finishedKeys.has(listingKey)) return;

  const mem = getListingMemory(listingKey);
  // Prefer frozen exit Y; never fall back to live scrollY (that fights the user).
  const target = mem?.restoreScrollY;
  if (typeof target !== 'number' || target <= 8) return;

  stopListingScrollRestore();
  activeKey = listingKey;
  frozenTargetY = target;
  pagesReadyFlag = Boolean(pagesReady);
  startedAt = Date.now();
  bindUserScrollAbort();

  // Immediate paint at best-effort Y so Back never flashes the top of the page.
  applyY(Math.min(target, Math.max(maxScrollY(), 0)));

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
