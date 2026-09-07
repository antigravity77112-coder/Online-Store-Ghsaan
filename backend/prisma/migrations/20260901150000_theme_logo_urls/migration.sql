-- Theme-aware logo defaults: light + dark variants (GISAAH)
-- Only replaces null values or legacy /Logo_192.png paths — keeps custom Cloudinary uploads.

UPDATE "SystemSetting"
SET
  "logoUrl" = CASE
    WHEN "logoUrl" IS NULL OR BTRIM("logoUrl") = '' OR "logoUrl" IN ('/Logo_192.png', '/Logo.png')
      THEN '/Logo_light_192.png'
    ELSE "logoUrl"
  END,
  "logoDarkUrl" = CASE
    WHEN "logoDarkUrl" IS NULL OR BTRIM("logoDarkUrl") = '' OR "logoDarkUrl" IN ('/Logo_192.png', '/Logo.png', '/Logo_light_192.png')
      THEN '/Logo_dark_192.png'
    ELSE "logoDarkUrl"
  END,
  "logoMobileUrl" = CASE
    WHEN "logoMobileUrl" IS NULL OR BTRIM("logoMobileUrl") = '' OR "logoMobileUrl" IN ('/Logo_192.png', '/Logo.png')
      THEN '/Logo_light_192.png'
    ELSE "logoMobileUrl"
  END
WHERE "id" = 'global';
