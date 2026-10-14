const STORAGE_KEY = 'gisaah_recent_searches';
const MAX_ITEMS = 8;

export function getRecentSearches() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = JSON.parse(raw || '[]');
    return Array.isArray(list) ? list.filter((s) => typeof s === 'string' && s.trim()).slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

export function pushRecentSearch(query) {
  const q = String(query || '').trim();
  if (!q) return getRecentSearches();
  const prev = getRecentSearches().filter((s) => s.toLowerCase() !== q.toLowerCase());
  const next = [q, ...prev].slice(0, MAX_ITEMS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch { /* ignore quota */ }
  return next;
}

export function removeRecentSearch(query) {
  const q = String(query || '').trim().toLowerCase();
  const next = getRecentSearches().filter((s) => s.toLowerCase() !== q);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
  return next;
}

export function clearRecentSearches() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
  return [];
}
