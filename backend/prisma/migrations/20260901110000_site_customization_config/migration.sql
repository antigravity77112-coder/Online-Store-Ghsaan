-- Site customization: extend SystemSetting (additive, preserves existing data)
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "siteName" TEXT NOT NULL DEFAULT 'GISAAH | قصة';
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "siteShortName" TEXT NOT NULL DEFAULT 'GISAAH';
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "appName" TEXT NOT NULL DEFAULT 'GISAAH | قصة';
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "tagline" TEXT NOT NULL DEFAULT 'في زمن الكوبي خليك مع قصة';
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "siteDescription" TEXT;
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "copyrightText" TEXT;
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "logoDarkUrl" TEXT;
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "logoMobileUrl" TEXT;
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "faviconUrl" TEXT;
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "ogImageUrl" TEXT;
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "ogTitle" TEXT;
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "ogDescription" TEXT;
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "mapUrl" TEXT;
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "youtubeUrl" TEXT;
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "footerText" TEXT;
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "footerLinks" JSONB;
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "themeConfig" JSONB;
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "homepageConfig" JSONB;

-- Seed GISAAH defaults on existing global row (only fills nulls / empty branding)
UPDATE "SystemSetting"
SET
  "siteName" = COALESCE(NULLIF("siteName", ''), 'GISAAH | قصة'),
  "siteShortName" = COALESCE(NULLIF("siteShortName", ''), 'GISAAH'),
  "appName" = COALESCE(NULLIF("appName", ''), 'GISAAH | قصة'),
  "tagline" = COALESCE(NULLIF("tagline", ''), 'في زمن الكوبي خليك مع قصة'),
  "seoTitle" = COALESCE("seoTitle", 'GISAAH | قصة'),
  "seoDescription" = COALESCE("seoDescription", 'في زمن الكوبي خليك مع قصة — متجر العطور الفاخرة الأصلية'),
  "copyrightText" = COALESCE("copyrightText", '© GISAAH قصة. جميع الحقوق محفوظة.'),
  "themeConfig" = COALESCE("themeConfig", '{"primary":"#DAA520","secondary":"#B8860B","accent":"#DAA520","background":"#F8F6EF","surface":"#FFFFFF","text":"#232323","textMuted":"#64748b","border":"#F0E2C5","success":"#22c55e","warning":"#f59e0b","error":"#ef4444"}'::jsonb),
  "homepageConfig" = COALESCE("homepageConfig", '{"offerBeltVisible":true,"sections":{"bestSellers":{"title":"الأكثر مبيعاً","subtitle":"","visible":true},"newArrivals":{"title":"وصل حديثاً","subtitle":"","visible":true},"featured":{"title":"منتجات مميزة","subtitle":"مختارات من أفضل المنتجات","visible":true},"categories":{"title":"الفئات","subtitle":"","visible":true}}}'::jsonb)
WHERE "id" = 'global';
