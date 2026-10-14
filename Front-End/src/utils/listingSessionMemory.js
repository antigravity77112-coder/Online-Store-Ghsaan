/**
 * In-memory listing session state for the current SPA runtime.
 * Survives listing → product → Back remounts. Cleared on hard refresh (F5).
 * No localStorage / sessionStorage.
 */

const listingMemory = new Map();

/** Listing key we expect to restore after opening a product (SPA only). */
let expectedReturnKey = null;

/**
 * @param {string} key
 * @returns {{ scrollY?: number, size?: number, shuffleSeed?: string|number, restoreScrollY?: number } | undefined}
 */
export function getListingMemory(key) {
  if (!key) return undefined;
  return listingMemory.get(key);
}

/**
 * Merge a patch into the memory entry for `key` (does not replace unrelated fields).
 * @param {string} key
 * @param {{ scrollY?: number, size?: number, shuffleSeed?: string|number, restoreScrollY?: number }} patch
 */
export function setListingMemory(key, patch) {
  if (!key || !patch || typeof patch !== 'object') return;
  const prev = listingMemory.get(key) || {};
  listingMemory.set(key, { ...prev, ...patch });
}

/**
 * Call synchronously when the user opens a product from a listing (before navigate).
 * Saves scrollY immediately and marks this listing for restore on return.
 * `restoreScrollY` is frozen for Back and must not be overwritten by live scroll persist.
 */
export function markListingExitToProduct(listingKey) {
  if (!listingKey) return;
  const y = window.scrollY || document.documentElement.scrollTop || 0;
  setListingMemory(listingKey, { scrollY: y, restoreScrollY: y });
  expectedReturnKey = listingKey;
}

export function isExpectedListingReturn(listingKey) {
  return Boolean(listingKey && expectedReturnKey === listingKey);
}

export function clearExpectedListingReturn(listingKey) {
  if (listingKey == null || expectedReturnKey === listingKey) {
    expectedReturnKey = null;
  }
}

/** Drop pending return mark (e.g. user navigated away via a new PUSH). */
export function clearAnyExpectedListingReturn() {
  expectedReturnKey = null;
}

/** Drop frozen Back-restore Y so load-more cannot re-jump to an old position. */
export function clearListingRestoreScrollY(listingKey) {
  if (!listingKey) return;
  const prev = listingMemory.get(listingKey);
  if (!prev || prev.restoreScrollY == null) return;
  const next = { ...prev };
  delete next.restoreScrollY;
  listingMemory.set(listingKey, next);
}

/**
 * Return an existing shuffleSeed for `key`, or create + store a new one.
 * Stable across SPA remounts; new on F5.
 */
export function ensureShuffleSeed(key) {
  if (!key) return String(Math.random());
  const existing = getListingMemory(key)?.shuffleSeed;
  if (existing != null && existing !== '') return existing;
  const seed =
    (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
  setListingMemory(key, { shuffleSeed: seed });
  return seed;
}
