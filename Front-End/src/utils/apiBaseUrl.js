/**
 * Resolves the API base used by the Vite app.
 * - Dev: Vite proxy sends /api → http://localhost:5000
 * - Prod: Vercel rewrite proxies /api → backend Vercel deployment
 * Both environments use same-origin /api, so cookies work seamlessly.
 */
export function getApiBaseUrl() {
  return '/api';
}
