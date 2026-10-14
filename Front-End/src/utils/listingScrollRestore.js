/**
 * Module-level listing scroll restore.
 * Survives React remounts / effect cleanups. No localStorage.
 *
 * Instant jump only (never smooth). Spacer keeps document tall enough so
 * Back never paints at Y=0 then climbs to the saved position.
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
const POST_READY_RETRY_MS = 200;
const USER_SCROLL_ABORT_PX = 48;

const SPACER_ATTR = 'data-listing-scroll-spacer';
const RESTORING_CLASS = 'listing-scroll-restoring';

let activeKey = null;
let frozenTargetY = null;
let startedAt = 0;
let pagesReadyFlag = false;
let safetyTimer = 0;
let postReadyTimer = 0;
let userInteracted = false;
const finishedKeys = new Set();
let userScrollAbortBound = false;

function readScrollY() {
  return window.scrollY || document.documentElement.scrollTop || 0;
}

/**
 * Always instant — global CSS `scroll-behavior: smooth` must not animate restore.
 */
function applyY(y) {
  const target = Math.max(0, y);
  const doc = document.documentElement;
  const prev = doc.style.scrollBehavior;
  doc.style.scrollBehavior = 'auto';
  try {
    window.scrollTo({ top: target, left: 0, behavior: 'instant' });
  } catch {
    window.scrollTo(0, target);
  }
  doc.scrollTop = target;
  if (document.body) document.body.scrollTop = target;
  doc.style.scrollBehavior = prev;
}

function ensureSpacer(targetY) {
  const doc = document.documentElement;
  if (!doc) return;
  const need = Math.ceil(targetY + window.innerHeight + 80);
  doc.style.minHeight = `${need}px`;
  doc.setAttribute(SPACER_ATTR, '1');
}

function clearSpacer() {
  const doc = document.documentElement;
  if (!doc || !doc.hasAttribute(SPACER_ATTR)) return;
  doc.style.minHeight = '';
  doc.removeAttribute(SPACER_ATTR);
}

function setRestoringClass(on) {
  const doc = document.documentElement;
  if (!doc) return;
  if (on) doc.classList.add(RESTORING_CLASS);
  else doc.classList.remove(RESTORING_CLASS);
}

function clearTimers() {
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
  userInteracted = true;
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
  clearSpacer();
  setRestoringClass(false);
  activeKey = null;
  frozenTargetY = null;
  pagesReadyFlag = false;
  userInteracted = false;
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

function jumpToTarget(listingKey, y, { allowRetry = false } = {}) {
  clearTimers();
  ensureSpacer(y);
  applyY(y);

  if (!allowRetry || userInteracted) {
    if (pagesReadyFlag || Date.now() - startedAt >= MAX_MS) {
      finish(listingKey);
    }
    return;
  }

  postReadyTimer = window.setTimeout(() => {
    if (activeKey !== listingKey) return;
    if (userInteracted) {
      finish(listingKey);
      return;
    }
    const current = readScrollY();
    if (Math.abs(current - y) <= THRESHOLD * 2) {
      ensureSpacer(y);
      applyY(y);
    }
    finish(listingKey);
  }, POST_READY_RETRY_MS);
}

/**
 * Start (or finalize) restoring window.scrollY for listingKey.
 * Call as early as possible on Back — do not wait for product rows to paint.
 */
export function startListingScrollRestore(listingKey, { pagesReady = false } = {}) {
  if (!listingKey) return;
  if (typeof window === 'undefined') return;

  // Listing restore must never run while a product page is showing (e.g. Back from
  // related product A←B). Doing so clears restoreScrollY and breaks the next Back to the list.
  if (window.location.pathname.startsWith('/product/')) return;

  if (activeKey === listingKey) {
    if (pagesReady) pagesReadyFlag = true;
    if (!pagesReadyFlag) return;
    if (userInteracted) {
      finish(listingKey);
      return;
    }
    const y = frozenTargetY;
    if (typeof y !== 'number' || y <= 8) {
      finish(listingKey);
      return;
    }
    jumpToTarget(listingKey, y, { allowRetry: true });
    return;
  }

  if (finishedKeys.has(listingKey)) return;

  const mem = getListingMemory(listingKey);
  const target = mem?.restoreScrollY;
  if (typeof target !== 'number' || target <= 8) return;

  stopListingScrollRestore();
  activeKey = listingKey;
  frozenTargetY = target;
  pagesReadyFlag = Boolean(pagesReady);
  userInteracted = false;
  startedAt = Date.now();
  setRestoringClass(true);
  bindUserScrollAbort();

  ensureSpacer(target);
  applyY(target);

  if (pagesReadyFlag) {
    jumpToTarget(listingKey, target, { allowRetry: true });
  } else {
    safetyTimer = window.setTimeout(() => {
      if (activeKey !== listingKey) return;
      if (userInteracted) {
        finish(listingKey);
        return;
      }
      jumpToTarget(listingKey, target, { allowRetry: false });
      finish(listingKey);
    }, MAX_MS);
  }
}

export function shouldRestoreListing(listingKey, navigationType) {
  return navigationType === 'POP' || isExpectedListingReturn(listingKey);
}

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
