-- Separate mobile branding assets from website assets
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "logoMobileDarkUrl" TEXT;

-- Seed mobile dark logo from existing mobile light or dark web logo when unset
UPDATE "SystemSetting"
SET "logoMobileDarkUrl" = COALESCE(
  NULLIF(BTRIM("logoMobileDarkUrl"), ''),
  NULLIF(BTRIM("logoDarkUrl"), ''),
  '/Logo_dark_192.png'
)
WHERE "id" = 'global';

-- Ensure mobile light logo has its own default (no longer inherits web at DB level)
UPDATE "SystemSetting"
SET "logoMobileUrl" = COALESCE(
  NULLIF(BTRIM("logoMobileUrl"), ''),
  '/Logo_light_192.png'
)
WHERE "id" = 'global';
