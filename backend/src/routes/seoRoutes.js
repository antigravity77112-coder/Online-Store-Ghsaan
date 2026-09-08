/**
 * seoRoutes.js — SEO API Routes
 *
 * All routes are public (no auth required) — search engine crawlers
 * must be able to access these without authentication.
 */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const seoController = require('../controllers/seoController');

// Full combined sitemap (proxied by Vercel from /sitemap.xml)
router.get('/sitemap.xml', asyncHandler(seoController.getSitemap));

// Sitemap index (references sub-sitemaps)
router.get('/sitemap-index.xml', asyncHandler(seoController.getSitemapIndex));

// Individual sitemaps (proxied at online-store-ghsaan.vercel.app/sitemap-*.xml)
router.get('/sitemap-products.xml', asyncHandler(seoController.getSitemapProducts));
router.get('/sitemap-categories.xml', asyncHandler(seoController.getSitemapCategories));
router.get('/sitemap-brands.xml', asyncHandler(seoController.getSitemapBrands));
router.get('/sitemap-scents.xml', asyncHandler(seoController.getSitemapScents));
router.get('/sitemap-static.xml', asyncHandler(seoController.getSitemapStatic));

// robots.txt (proxied by Vercel from /robots.txt)
router.get('/robots.txt', asyncHandler(seoController.getRobots));

// RSS 2.0 feed
router.get('/rss.xml', asyncHandler(seoController.getRss));

// 301 redirect: UUID-based product URL → slug-based canonical URL
router.get('/redirect/product/:uuid', asyncHandler(seoController.redirectProductByUuid));

module.exports = router;
