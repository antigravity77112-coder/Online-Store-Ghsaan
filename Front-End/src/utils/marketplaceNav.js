/**
 * Routes that use the Shein-style mobile shop chrome (dark header + category tabs + bottom nav).
 */
export function isShopChromeRoute(pathname) {
  if (!pathname) return false;
  if (pathname.startsWith('/product/')) return false;
  if (pathname.startsWith('/cart')) return false;
  if (pathname.startsWith('/checkout')) return false;
  if (pathname.startsWith('/auth')) return false;
  if (pathname.startsWith('/admin')) return false;
  if (pathname.startsWith('/profile')) return false;
  if (pathname.startsWith('/my-orders')) return false;
  if (pathname.startsWith('/about')) return false;
  if (pathname.startsWith('/contact')) return false;
  if (pathname.startsWith('/branches')) return false;
  if (pathname.startsWith('/privacy')) return false;

  return (
    pathname === '/'
    || pathname.startsWith('/products')
    || pathname.startsWith('/categories')
    || pathname.startsWith('/brands')
    || pathname.startsWith('/category/')
    || pathname.startsWith('/scents')
    || pathname.startsWith('/scent/')
    || pathname.startsWith('/favorites')
    || pathname.startsWith('/brand/')
  );
}
