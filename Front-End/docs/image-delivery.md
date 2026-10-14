# Storefront image delivery (Cloudinary + R2 + Cloudflare)

Product and catalog images may be served from **Cloudinary** or **Cloudflare R2**. The helper [`src/utils/cloudinaryUrl.js`](../src/utils/cloudinaryUrl.js) picks the delivery path.

## Behavior

| Source | With flags off | With CF resizing on |
|--------|----------------|---------------------|
| `res.cloudinary.com/...` | `f_auto,q_auto,w_*` transforms + `srcSet` | unchanged (Cloudinary path) |
| `*.r2.dev/...` or custom media host | Full object URL (upload-time WebP only) | `/cdn-cgi/image/width=…,quality=75,format=auto/…` + `srcSet` |

Frontend extras (work even when CF resizing is off):

1. **Intent preload** — on product-link `pointerdown` / `touchstart`, preload the DETAIL-width URL.
2. **PDP progressive hero** — first paint uses grid-card width (often HTTP-cached from the listing), then upgrades to DETAIL `srcSet`.

## Front-End env (Vercel / local Vite)

Copy into `Front-End/.env` or project env vars:

```bash
# Public origin of media (custom domain bound to the R2 bucket). No trailing slash.
# Example: https://media.yourdomain.com
# When set, pub-*.r2.dev URLs are rewritten onto this host before /cdn-cgi/image.
VITE_R2_PUBLIC_BASE_URL=https://media.yourdomain.com

# Enable Cloudflare Image Resizing for R2 / media hosts (1|true|yes|on).
# Leave unset/0 until the custom domain + Image Resizing are live.
VITE_CF_IMAGE_RESIZING=0
```

See also [`.env.example`](../.env.example).

## Cloudflare + R2 setup

1. **Custom domain on the R2 bucket** (e.g. `media.yourdomain.com`) in the Cloudflare dashboard → R2 → bucket → Custom Domains. Prefer this over `pub-*.r2.dev` for edge cache and Image Resizing.
2. **Image Resizing** enabled on that zone (Cloudflare Pro+ or Images product as applicable).
3. Confirm uploads still send long cache headers (`Cache-Control: public, max-age=31536000, immutable` from the backend R2 client).
4. Deploy the storefront with `VITE_R2_PUBLIC_BASE_URL` pointing at the custom domain.
5. Turn on `VITE_CF_IMAGE_RESIZING=1` and verify in DevTools Network:
   - Listing cards request `/cdn-cgi/image/width=360|600|900/...`
   - PDP first paints a ~600w URL, then upgrades to DETAIL widths
   - Cloudinary URLs still use `res.cloudinary.com` transforms (no `/cdn-cgi/image`)

## Delivery URL shape

```text
https://media.example.com/cdn-cgi/image/width=600,quality=75,format=auto,fit=scale-down/migrated/cloudinary/.../file.webp
```

Optional later: rewrite stored DB URLs from `*.r2.dev` → the custom domain. Until then the Vite helper rewrites the host when `VITE_R2_PUBLIC_BASE_URL` is set.

## Rollout checklist

- [ ] Ship frontend helper + progressive PDP + preload (safe with flag off)
- [ ] Bind R2 custom domain; enable Image Resizing
- [ ] Set `VITE_R2_PUBLIC_BASE_URL` in Vercel
- [ ] Set `VITE_CF_IMAGE_RESIZING=1`
- [ ] Confirm smaller bytes on listing + PDP; card → PDP feels instant
