// In production (Vercel), set VITE_API_URL to your backend origin, e.g. https://your-backend.vercel.app
// (the /api path is added automatically if missing). In dev, the Vite proxy forwards /api to localhost:5000.
import { getApiBaseUrl } from '../utils/apiBaseUrl';

const BASE_URL = getApiBaseUrl();

let refreshPromise = null;

async function attemptTokenRefresh() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const primaryUrl = `${BASE_URL}/account/refresh`;
      let res;

      try {
        res = await fetch(primaryUrl, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err) {
        if (import.meta.env.DEV && BASE_URL !== '/api') {
          res = await fetch('/api/account/refresh', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          });
        } else {
          throw err;
        }
      }

      if (!res.ok) {
        throw new Error('Refresh failed');
      }

      return res.json();
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

const jsonHeaders = () => ({
  'Content-Type': 'application/json',
});

function normalizeProduct(product) {
  if (!product || typeof product !== 'object') return product;
  const normalizedId = product.id ?? product.productId ?? product._id ?? null;
  const normalizeBoolean = (value, fallback = false) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1') return true;
      if (normalized === 'false' || normalized === '0') return false;
    }
    return fallback;
  };

  const normalizedProduct = {
    ...product,
    isHidden: normalizeBoolean(product.isHidden, false),
  };

  return normalizedId ? { ...normalizedProduct, id: normalizedId } : normalizedProduct;
}

function normalizeProductsListResponse(data) {
  if (Array.isArray(data)) {
    return data.map(normalizeProduct);
  }
  if (data && Array.isArray(data.items)) {
    return data.items.map(normalizeProduct);
  }
  if (data && Array.isArray(data.products)) {
    return data.products.map(normalizeProduct);
  }
  return [];
}

async function request(url, options = {}) {
  options.credentials = 'include'; // Ensure cookies are sent with every request

  const primaryUrl = `${BASE_URL}${url}`;
  let res;

  try {
    res = await fetch(primaryUrl, options);
  } catch (err) {
    // Dev fallback: if VITE_API_URL is misconfigured, retry through Vite local proxy.
    if (import.meta.env.DEV && BASE_URL !== '/api') {
      res = await fetch(`/api${url}`, options);
    } else {
      throw err;
    }
  }

  if (!res.ok) {
    const shouldAttemptRefresh =
      res.status === 401 &&
      !options._retry &&
      !url.startsWith('/account/refresh') &&
      !url.startsWith('/account/login') &&
      !url.startsWith('/account/register') &&
      !url.startsWith('/account/logout');

    if (shouldAttemptRefresh) {
      try {
        await attemptTokenRefresh();
        return request(url, { ...options, _retry: true });
      } catch {
        // Fall through to normal error handling below.
      }
    }

    let message = `خطأ ${res.status}`;
    try {
      const text = await res.text();
      if (text) {
        try {
          const body = JSON.parse(text);
          // Handle FluentValidation errors
          if (body.errors) {
            const firstErr = Object.values(body.errors).flat()[0];
            message = firstErr || body.title || message;
          } else {
            message = body.error || body.message || body.title || body.detail || text;
          }
        } catch {
          message = text;
        }
      }
    } catch { /* empty */ }
    const errObj = new Error(message);
    errObj.status = res.status;
    throw errObj;
  }

  if (res.status === 204) return null;

  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text);
}

async function parseFetchError(res) {
  let message = `خطأ ${res.status}`;
  try {
    const text = await res.text();
    if (text) {
      try {
        const body = JSON.parse(text);
        if (body.errors) {
          const firstErr = Object.values(body.errors).flat()[0];
          message = firstErr || body.title || message;
        } else {
          message = body.error || body.message || body.title || body.detail || text;
        }
      } catch {
        message = text;
      }
    }
  } catch { /* empty */ }
  const errObj = new Error(message);
  errObj.status = res.status;
  throw errObj;
}

/** Multipart upload with cookie auth, dev proxy fallback, and 401 refresh retry. */
async function uploadFormData(path, file, fieldName = 'file', retry = false) {
  const buildBody = () => {
    const formData = new FormData();
    formData.append(fieldName, file, file.name || 'upload');
    return formData;
  };

  const options = {
    method: 'POST',
    body: buildBody(),
    credentials: 'include',
    _retry: retry,
  };

  const primaryUrl = `${BASE_URL}${path}`;
  let res;

  try {
    res = await fetch(primaryUrl, options);
  } catch (err) {
    if (import.meta.env.DEV && BASE_URL !== '/api') {
      res = await fetch(`/api${path}`, { ...options, body: buildBody() });
    } else {
      throw err;
    }
  }

  if (!res.ok) {
    const shouldAttemptRefresh =
      res.status === 401 &&
      !retry &&
      !path.startsWith('/account/refresh') &&
      !path.startsWith('/account/login') &&
      !path.startsWith('/account/register') &&
      !path.startsWith('/account/logout');

    if (shouldAttemptRefresh) {
      try {
        await attemptTokenRefresh();
        return uploadFormData(path, file, fieldName, true);
      } catch {
        // Fall through to error parsing below.
      }
    }

    await parseFetchError(res);
  }

  const text = await res.text();
  if (!text) return {};
  return JSON.parse(text);
}

// ─── Account ───
export async function login(phoneNumber, password) {
  return request('/account/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber, password }),
  });
}

export async function logout() {
  return request('/account/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function refreshToken() {
  return request('/account/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function register({ fullName, phoneNumber, password, city, address, locationUrl }) {
  return request('/account/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: fullName?.trim(),
      phoneNumber: phoneNumber?.trim(),
      password,
      city: city?.trim(),
      address: address?.trim(),
      locationUrl: locationUrl?.trim() || null,
    }),
  });
}

export async function getProfile() {
  return request('/account/profile', { headers: jsonHeaders() });
}

export async function updateProfile(data) {
  return request('/account/profile', {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  });
}

export async function changePassword(currentPassword, newPassword) {
  return request('/account/change-password', {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

// ─── Products ───
export async function getProducts({ city, maxPriceUsd, condition, specialOffers, trending, search, categoryName, brandId, pageNumber = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams();
  if (city) params.set('city', city);
  if (maxPriceUsd) params.set('maxPriceUsd', maxPriceUsd);
  if (condition !== undefined && condition !== null) params.set('condition', condition);
  if (specialOffers) params.set('specialOffers', 'true');
  if (trending) params.set('trending', 'true');
  if (search) params.set('search', search);
  if (categoryName) params.set('categoryName', categoryName);
  if (brandId) params.set('brandId', brandId);
  params.set('pageNumber', pageNumber);
  params.set('pageSize', pageSize);
  const data = await request(`/products?${params.toString()}`, { headers: jsonHeaders() });
  return normalizeProductsListResponse(data).filter((product) => !product?.isHidden);
}

export async function getProductById(id) {
  const data = await request(`/products/${id}`, { headers: jsonHeaders() });
  return normalizeProduct(data);
}

export async function getProductBySlug(slug) {
  const data = await request(`/products/by-slug/${encodeURIComponent(slug)}`, { headers: jsonHeaders() });
  return normalizeProduct(data);
}

export async function createProduct(data) {
  return request('/products', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  });
}

export async function updateProduct(id, data) {
  return request(`/products/${id}`, {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify({ id, ...data }),
  });
}

export async function deleteProduct(id) {
  return request(`/products/${id}`, {
    method: 'DELETE',
    headers: jsonHeaders(),
  });
}

export async function toggleProductVisibility(id) {
  return request(`/products/${id}/toggle-visibility`, {
    method: 'PATCH',
    headers: jsonHeaders(),
  });
}

export async function getMyProducts() {
  const data = await request('/products/my-products', { headers: jsonHeaders() });
  return normalizeProductsListResponse(data);
}

// ─── Image Upload & Gallery (Local API) ───
export async function uploadImageToCloudinary(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BASE_URL}/products/upload-image`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('فشل رفع الصورة');
  }

  const data = await res.json();
  return data.secure_url;
}

export async function addProductImage(productId, { url, altText, isPrimary, sortOrder }) {
  return request(`/products/${productId}/images`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ url, altText, isPrimary, sortOrder })
  });
}

export async function getProductImages(productId) {
  return request(`/products/${productId}/images`, { headers: jsonHeaders() });
}

export async function deleteProductImage(productId, imageId) {
  return request(`/products/${productId}/images/${imageId}`, {
    method: 'DELETE',
    headers: jsonHeaders()
  });
}

export async function setProductImagePrimary(productId, imageId) {
  return request(`/products/${productId}/images/${imageId}/primary`, {
    method: 'PATCH',
    headers: jsonHeaders()
  });
}

export async function reorderProductImages(productId, orderedIds) {
  return request(`/products/${productId}/images/reorder`, {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify({ orderedIds })
  });
}

// ─── Categories ───
export async function getCategories({ pageNumber, pageSize } = {}) {
  const params = new URLSearchParams();
  if (pageNumber) params.set('pageNumber', pageNumber);
  if (pageSize) params.set('pageSize', pageSize);
  const qs = params.toString();
  return request(`/categories${qs ? `?${qs}` : ''}`, { headers: jsonHeaders() });
}

export async function getCategoryBySlug(slug) {
  return request(`/categories/slug/${encodeURIComponent(slug)}`, { headers: jsonHeaders() });
}

export async function getProductsByCategory(categoryId) {
  return request(`/categories/${categoryId}/products`, { headers: jsonHeaders() });
}

// ─── Category Attributes ───
/**
 * Get all attributes for a category.
 * @param {string} categoryId
 * @param {string} [scopeFilter] e.g. 'PRODUCT,BOTH' (for seller form)
 */
export async function getCategoryAttributes(categoryId, scopeFilter) {
  const qs = scopeFilter ? `?scope=${encodeURIComponent(scopeFilter)}` : '';
  return request(`/categories/${categoryId}/attributes${qs}`, { headers: jsonHeaders() });
}

export async function createCategoryAttribute(categoryId, data) {
  return request(`/categories/${categoryId}/attributes`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  });
}

export async function updateCategoryAttribute(categoryId, attrId, data) {
  return request(`/categories/${categoryId}/attributes/${attrId}`, {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  });
}

export async function deleteCategoryAttribute(categoryId, attrId) {
  return request(`/categories/${categoryId}/attributes/${attrId}`, {
    method: 'DELETE',
    headers: jsonHeaders(),
  });
}

export async function reorderCategoryAttributes(categoryId, orderedIds) {
  return request(`/categories/${categoryId}/attributes/reorder`, {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify({ orderedIds }),
  });
}

export async function uploadCategoryIcon(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BASE_URL}/categories/upload-icon`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('فشل رفع أيقونة التصنيف');
  }

  const data = await res.json();
  return data.url;
}

// ─── Orders ───
export async function createOrder(data) {
  return request('/orders', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  });
}

export async function getMyOrders() {
  return request('/orders/my-orders', { headers: jsonHeaders() });
}

export async function trackMyOrder(code) {
  return request(`/orders/track/${encodeURIComponent(code)}`, { headers: jsonHeaders() });
}

export async function getSales() {
  return request('/orders/sales', { headers: jsonHeaders() });
}

export async function updateOrderStatus(orderId, status) {
  return request(`/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify({ orderId, status }),
  });
}

// ─── Admin ───
export async function getAdminDashboard() {
  return request('/admin/dashboard', { headers: jsonHeaders() });
}

export async function getAdminUsers() {
  return request('/admin/users', { headers: jsonHeaders() });
}

export async function blockUser(id) {
  return request(`/admin/users/${id}/block`, {
    method: 'PATCH',
    headers: jsonHeaders(),
  });
}

export async function changeUserRole(id, newRole) {
  return request(`/admin/users/${id}/role`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify({ newRole }),
  });
}

export async function deleteUser(id) {
  return request(`/admin/users/${id}`, {
    method: 'DELETE',
    headers: jsonHeaders(),
  });
}

export async function downloadDatabaseBackup() {
  const res = await fetch(`${BASE_URL}/admin/backup`, { credentials: 'include' });
  if (!res.ok) throw new Error('فشل تحميل النسخة الاحتياطية');
  return res.blob();
}

export async function restoreDatabaseBackup(file) {
  const formData = new FormData();
  formData.append('backupFile', file);

  const res = await fetch(`${BASE_URL}/admin/restore`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!res.ok) {
    let message = 'فشل استعادة النسخة الاحتياطية';
    try {
      const data = await res.json();
      message = data.message || data.error || message;
    } catch (e) {
      // Ignore JSON parse error if response is not JSON
    }
    throw new Error(message);
  }

  return res.json();
}

export async function getAdminProducts({ pageNumber, pageSize, search, status } = {}) {
  const params = new URLSearchParams();
  if (pageNumber) params.set('pageNumber', pageNumber);
  if (pageSize) params.set('pageSize', pageSize);
  if (search) params.set('search', search);
  if (status && status !== 'all') params.set('status', status);
  const qs = params.toString();
  const data = await request(`/admin/products${qs ? `?${qs}` : ''}`, { headers: jsonHeaders() });
  return normalizeProductsListResponse(data);
}

export async function deleteAdminProduct(id) {
  return request(`/admin/products/${id}`, {
    method: 'DELETE',
    headers: jsonHeaders(),
  });
}

// ─── Bulk Product Actions ───
export async function bulkUpdateAdminProductStatus(ids, isHidden) {
  return request(`/admin/products/bulk-status`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify({ ids, isHidden }),
  });
}

export async function bulkUpdateAdminProductCategory(ids, categoryId) {
  return request(`/admin/products/bulk-category`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify({ ids, categoryId }),
  });
}

export async function bulkDeleteAdminProducts(ids) {
  return request(`/admin/products/bulk-delete`, {
    method: 'DELETE',
    headers: jsonHeaders(),
    body: JSON.stringify({ ids }),
  });
}

export async function getAdminOrders(status) {
  const params = new URLSearchParams();
  if (status && status !== 'All') params.set('status', status);
  const qs = params.toString();
  return request(`/admin/orders${qs ? `?${qs}` : ''}`, { headers: jsonHeaders() });
}

export async function updateAdminOrderStatus(orderId, status) {
  return request(`/admin/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify({ status }),
  });
}

export async function resendAdminOrderNotification(orderId) {
  return request(`/admin/orders/${orderId}/notify`, {
    method: 'POST',
    headers: jsonHeaders(),
  });
}

export async function getAdminNotifications({ page = 1, pageSize = 30, channel, type } = {}) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  if (channel) params.set('channel', channel);
  if (type) params.set('type', type);
  return request(`/admin/notifications?${params}`, { headers: jsonHeaders() });
}

export async function getAdminNotificationCampaigns({ page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return request(`/admin/notifications/campaigns?${params}`, { headers: jsonHeaders() });
}

export async function sendAdminBroadcast({ title, body, channel = 'marketing', audience = 'all_customers', data } = {}) {
  return request('/admin/notifications/broadcast', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ title, body, channel, audience, data }),
  });
}

export async function createCategory(data) {
  return request('/categories', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  });
}

export async function updateCategory(id, data) {
  return request(`/categories/${id}`, {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify({ id, ...data }),
  });
}

export async function deleteCategory(id) {
  return request(`/categories/${id}`, {
    method: 'DELETE',
    headers: jsonHeaders(),
  });
}

// ─── Brands ───
export async function getBrands() {
  return request('/brands', { headers: jsonHeaders() });
}

export async function getBrandById(id) {
  return request(`/brands/${id}`, { headers: jsonHeaders() });
}

export async function getBrandBySlug(slug) {
  return request(`/brands/slug/${encodeURIComponent(slug)}`, { headers: jsonHeaders() });
}

export async function getProductsByBrand(brandId) {
  return request(`/brands/${brandId}/products`, { headers: jsonHeaders() });
}

export async function uploadBrandLogo(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE_URL}/brands/upload-logo`, { method: 'POST', body: formData, credentials: 'include' });
  if (!res.ok) throw new Error('فشل رفع الشعار');
  const data = await res.json();
  return data.url;
}

export async function createBrand(data) {
  return request('/brands', { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(data) });
}

export async function updateBrand(id, data) {
  return request(`/brands/${id}`, { method: 'PUT', headers: jsonHeaders(), body: JSON.stringify(data) });
}

export async function deleteBrand(id) {
  return request(`/brands/${id}`, { method: 'DELETE', headers: jsonHeaders() });
}

// ─── Scents ───
export async function getScents({ limit, includeInactive } = {}) {
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));
  if (includeInactive) params.set('includeInactive', 'true');
  const qs = params.toString() ? `?${params.toString()}` : '';
  return request(`/scents${qs}`, { headers: jsonHeaders() });
}

export async function getScentById(id) {
  return request(`/scents/${id}`, { headers: jsonHeaders() });
}

export async function getScentBySlug(slug) {
  return request(`/scents/slug/${encodeURIComponent(slug)}`, { headers: jsonHeaders() });
}

export async function getProductsByScent(scentId) {
  return request(`/scents/${scentId}/products`, { headers: jsonHeaders() });
}

export async function uploadScentImage(file) {
  const data = await uploadFormData('/scents/upload-image', file);
  if (!data?.url) {
    throw new Error('لم يُرجع الخادم رابط الصورة');
  }
  return data.url;
}

export async function createScent(data) {
  return request('/scents', { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(data) });
}

export async function updateScent(id, data) {
  return request(`/scents/${id}`, { method: 'PUT', headers: jsonHeaders(), body: JSON.stringify(data) });
}

export async function toggleScentActive(id) {
  return request(`/scents/${id}/toggle-active`, { method: 'PATCH', headers: jsonHeaders() });
}

export async function deleteScent(id) {
  return request(`/scents/${id}`, { method: 'DELETE', headers: jsonHeaders() });
}

export async function getExchangeRates() {
  return request('/SystemSettings/exchange-rates', { headers: jsonHeaders() });
}

export async function updateExchangeRates(data) {
  return request('/SystemSettings/exchange-rates', {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  });
}

export async function getStoreInfo() {
  return request('/SystemSettings/store-info', { headers: jsonHeaders() });
}

/** Public runtime site configuration */
export async function getSiteConfig() {
  return request('/config', { headers: jsonHeaders() });
}

export async function getAdminConfig() {
  return request('/admin/config', { headers: jsonHeaders() });
}

export async function updateSiteConfig(data) {
  const result = await request('/admin/config', {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  });
  return result;
}

export async function uploadConfigAsset(file, field) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('field', field);
  const res = await fetch(`${BASE_URL}/admin/config/upload-asset`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'فشل رفع الملف');
  return data;
}

export async function updateStoreInfo(data) {
  return request('/SystemSettings/store-info', {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  });
}


// ─── Enum Helpers ───
export const CurrencyMap = {
  1: 'ريال (صنعاء)',
  2: 'ريال (عدن)',
  3: 'دولار',
  4: 'ريال سعودي',
  5: 'يورو',
};
export const CurrencySymbol = {
  1: 'ريال (صنعاء)',
  2: 'ريال (عدن)',
  3: '$',
  4: 'ر.س',
  5: '€',
  YER_Sanaa: 'ريال (صنعاء)',
  YER_Aden: 'ريال (عدن)',
  USD: '$',
  SAR: 'ر.س',
  EUR: '€',
};

export function getCurrencySymbol(currency) {
  if (currency === null || currency === undefined || currency === '') return '';
  return CurrencySymbol[currency] || CurrencySymbol[String(currency)] || '';
}

export const ConditionMap = { 1: 'جديد', 2: 'مستعمل', 3: 'مجدد' };
export const ConditionEn = { 1: 'New', 2: 'Used', 3: 'Refurbished' };
export const RoleMap = { 1: 'Admin', 2: 'Seller', 3: 'Buyer' };

// ─── Banners ──────────────────────────────────────────────────────────────────

/** Get active banners for storefront (public). */
export async function getBanners(placement) {
  const params = new URLSearchParams();
  if (placement) params.set('placement', placement);
  const data = await request(`/banners${params.toString() ? `?${params}` : ''}`, { headers: jsonHeaders() });
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.banners)) return data.banners;
  return data ? [data] : [];
}

/** Track impression or click event (public). */
export async function trackBannerEvent(id, type) {
  return request(`/banners/${id}/track`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ type }),
  });
}

/** Get all banners for admin dashboard. */
export async function getAdminBanners() {
  return request('/banners/admin', { headers: jsonHeaders() });
}

/** Create a new banner. */
export async function createAdminBanner(data) {
  return request('/banners/admin', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  });
}

/** Update an existing banner. */
export async function updateAdminBanner(id, data) {
  return request(`/banners/admin/${id}`, {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  });
}

/** Permanently delete a banner. */
export async function deleteAdminBanner(id) {
  return request(`/banners/admin/${id}`, {
    method: 'DELETE',
    headers: jsonHeaders(),
  });
}

/** Duplicate a banner (creates a draft copy). */
export async function duplicateAdminBanner(id) {
  return request(`/banners/admin/${id}/duplicate`, {
    method: 'POST',
    headers: jsonHeaders(),
  });
}

/** Reorder banners by supplying ordered array of IDs. */
export async function reorderAdminBanners(ids) {
  return request('/banners/admin/reorder', {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify({ ids }),
  });
}

/** Archive a banner (soft delete — keeps analytics). */
export async function archiveAdminBanner(id) {
  return request(`/banners/admin/${id}/archive`, {
    method: 'PATCH',
    headers: jsonHeaders(),
  });
}

/** Upload a banner image to Cloudinary via the backend proxy. */
export async function uploadBannerImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE_URL}/banners/admin/upload-image`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  if (!res.ok) throw new Error('فشل رفع صورة البانر');
  const data = await res.json();
  return data.url;
}

// ─── Branches ─────────────────────────────────────────────────────────────────

/** Get all active branches (public storefront). Pass all=true to get all (admin). */
export async function getBranches({ all = false } = {}) {
  const qs = all ? '?all=true' : '';
  return request(`/branches${qs}`, { headers: jsonHeaders() });
}

/** Admin: create a new branch. */
export async function createBranch(data) {
  return request('/branches', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  });
}

/** Admin: update an existing branch. */
export async function updateBranch(id, data) {
  return request(`/branches/${id}`, {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  });
}

/** Admin: delete a branch. */
export async function deleteBranch(id) {
  return request(`/branches/${id}`, {
    method: 'DELETE',
    headers: jsonHeaders(),
  });
}



