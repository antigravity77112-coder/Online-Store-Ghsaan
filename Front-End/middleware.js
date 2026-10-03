/**
 * Run before static index.html so Telegram / Facebook / WhatsApp see DB OG tags.
 * Rewrites HTML page navigations to /api/spa-meta (which injects SystemSetting.ogImageUrl).
 */
import { next, rewrite } from '@vercel/functions';

export const config = {
  matcher: [
    // Pages only — skip API, assets, and any path with a file extension
    '/((?!api/|assets/|.*\\.[a-zA-Z0-9]+$).*)',
  ],
};

export default function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname || '/';

  // Safety: never loop spa-meta through middleware
  if (pathname === '/api/spa-meta' || pathname.startsWith('/api/')) {
    return next();
  }

  const dest = new URL('/api/spa-meta', request.url);
  // Preserve cache-bust query (?v=2) and pass the real page path for og:url
  for (const [key, value] of url.searchParams.entries()) {
    if (key !== '__path') dest.searchParams.append(key, value);
  }
  dest.searchParams.set('__path', pathname);

  return rewrite(dest);
}
