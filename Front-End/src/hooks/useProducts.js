/**
 * SWR Data Hooks — خطافات جلب البيانات بتقنية SWR
 * 
 * EN: These hooks replace manual useState + useEffect + useCallback patterns
 *     with SWR's built-in stale-while-revalidate caching strategy.
 * 
 *     How SWR caching works on Vercel:
 *     1. First visit: fetches from API, stores in client memory cache
 *     2. Second visit: returns cached data INSTANTLY, then revalidates in background
 *     3. If new data differs from cache, UI updates seamlessly
 *     4. Each unique set of filter params gets its own cache entry
 *     5. dedupingInterval prevents duplicate requests within 60 seconds
 * 
 *     This dramatically reduces Vercel serverless function invocations
 *     and eliminates loading spinners on navigation back to the homepage.
 * 
 * AR: هذه الخطافات تستبدل أنماط useState + useEffect + useCallback اليدوية
 *     بإستراتيجية التخزين المؤقت stale-while-revalidate المدمجة في SWR.
 * 
 *     كيف يعمل تخزين SWR المؤقت على Vercel:
 *     1. الزيارة الأولى: يجلب من الـ API، يخزن في ذاكرة العميل المؤقتة
 *     2. الزيارة الثانية: يرجع البيانات المخزنة فوراً، ثم يحدّث في الخلفية
 *     3. إذا اختلفت البيانات الجديدة عن المخزنة، تتحدث الواجهة بسلاسة
 *     4. كل مجموعة فريدة من معاملات الفلترة تحصل على إدخال كاش خاص بها
 *     5. dedupingInterval يمنع الطلبات المكررة خلال 60 ثانية
 * 
 *     هذا يقلل بشكل كبير من استدعاءات دوال Vercel الخادمة
 *     ويزيل أيقونات التحميل عند العودة للصفحة الرئيسية.
 */

import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import * as api from '../services/api';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function fetchProductBySlugOrId(slug) {
  if (UUID_REGEX.test(slug)) {
    return api.getProductById(slug);
  }
  return api.getProductBySlug(slug);
}

// ─── Categories Hook / خطاف التصنيفات ───

/**
 * useCategories — خطاف التصنيفات
 * 
 * EN: Fetches categories with aggressive caching (5 min dedup).
 *     Categories rarely change, so we cache them longer.
 * 
 * AR: يجلب التصنيفات مع تخزين مؤقت قوي (5 دقائق منع تكرار).
 *     التصنيفات نادراً ما تتغير، لذلك نخزنها لفترة أطول.
 */
export function useCategories() {
  const { data, error, isLoading } = useSWR(
    'categories',
    async () => {
      const cats = await api.getCategories();
      return cats || [];
    },
    {
      revalidateOnFocus: false,
      // EN: Categories almost never change — 5 minute dedup window
      // AR: التصنيفات لا تتغير تقريباً — نافذة منع تكرار 5 دقائق
      dedupingInterval: 300000,
      // EN: Keep categories cached even when navigating away
      // AR: أبقِ التصنيفات مخزنة حتى عند الانتقال بعيداً
      revalidateOnReconnect: false,
      errorRetryCount: 2,
    }
  );

  return {
    data: data || [],
    isLoading,
    error,
  };
}

// ─── Brands Hook / خطاف   الماركات التجارية ───

/**
 * useBrands — خطاف   الماركات التجارية
 *
 * EN: Same caching strategy as useCategories (brands change rarely).
 * AR: نفس استراتيجية التخزين المؤقت مثل useCategories.
 */
export function useBrands() {
  const { data, error, isLoading } = useSWR(
    'brands',
    async () => {
      const brands = await api.getBrands();
      return brands || [];
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
      revalidateOnReconnect: false,
      errorRetryCount: 2,
    }
  );

  return {
    data: data || [],
    isLoading,
    error,
  };
}

/**
 * useScents — خطاف الروائح
 */
export function useScents({ limit } = {}) {
  const cacheKey = limit ? `scents-limit-${limit}` : 'scents-all';

  const { data, error, isLoading } = useSWR(
    cacheKey,
    async () => {
      const scents = await api.getScents(limit ? { limit } : {});
      return scents || [];
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
      revalidateOnReconnect: false,
      errorRetryCount: 2,
    }
  );

  return {
    data: data || [],
    isLoading,
    error,
  };
}

// ─── Products Infinite Hook / خطاف المنتجات (التمرير اللانهائي) ───

export function useProductsInfinite({ city = '', condition = '', maxPriceUsd = '', specialOffers = false, trending = false, search = '', categoryName = '', brandId = '', requireBrand = false } = {}) {
  const params = { city, condition, maxPriceUsd, specialOffers, trending, search, categoryName, brandId, requireBrand };

  const getKey = (pageIndex, previousPageData) => {
    if (params.requireBrand && !params.brandId) return null;
    // EN: Reached the end
    // AR: وصلنا إلى النهاية
    if (previousPageData && !previousPageData.length) return null;
    
    // EN: pageIndex is 0-based, our API uses 1-based pageNumber
    // AR: الـ pageIndex يبدأ من 0، والـ API لدينا يستخدم pageNumber يبدأ من 1
    const pageNumber = pageIndex + 1;
    
    const parts = ['products-infinite', `page:${pageNumber}`];
    if (params.city) parts.push(`city:${params.city}`);
    if (params.condition) parts.push(`cond:${params.condition}`);
    if (params.maxPriceUsd) parts.push(`max:${params.maxPriceUsd}`);
    if (params.specialOffers) parts.push('offers');
    if (params.trending) parts.push('trending');
    if (params.search) parts.push(`search:${params.search}`);
    if (params.categoryName) parts.push(`cat:${params.categoryName}`);
    if (params.brandId) parts.push(`brand:${params.brandId}`);
    if (params.requireBrand) parts.push('requireBrand');
    return [parts.join('|'), pageNumber, params]; // SWR array key
  };

  const fetcher = async ([_key, pageNumber, p]) => {
    const apiParams = { pageSize: 15, pageNumber };
    if (p.city) apiParams.city = p.city;
    if (p.condition) apiParams.condition = parseInt(p.condition);
    if (p.maxPriceUsd) apiParams.maxPriceUsd = parseFloat(p.maxPriceUsd);
    if (p.specialOffers) apiParams.specialOffers = true;
    if (p.trending) apiParams.trending = true;
    if (p.search) apiParams.search = p.search;
    if (p.categoryName) apiParams.categoryName = p.categoryName;
    if (p.brandId) apiParams.brandId = p.brandId;
    
    const data = await api.getProducts(apiParams);
    return data || [];
  };

  const { data, error, size, setSize, isLoading, isValidating, mutate } = useSWRInfinite(
    getKey,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000,
      keepPreviousData: true,
      errorRetryCount: 3,
    }
  );

  const products = data ? [].concat(...data) : [];
  const isLoadingMore =
    isLoading || (size > 0 && data && typeof data[size - 1] === 'undefined');
  const isEmpty = data?.[0]?.length === 0;
  const isReachingEnd =
    isEmpty || (data && data[data.length - 1]?.length < 15);

  return {
    data: products,
    isLoading: isLoading && !products.length,
    isLoadingMore,
    isValidating,
    isReachingEnd,
    size,
    setSize,
    error,
    mutate,
  };
}

/**
 * useProduct — single product by slug or UUID id
 */
export function useProduct(slug) {
  const { data, error, isLoading, mutate } = useSWR(
    slug ? ['product', slug] : null,
    () => fetchProductBySlugOrId(slug),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000,
      errorRetryCount: 2,
    },
  );

  const isNotFound = Boolean(
    error && (error.status === 404 || String(error.message || '').includes('404')),
  );

  return {
    product: data ?? null,
    isLoading,
    error,
    isNotFound,
    mutate,
  };
}

