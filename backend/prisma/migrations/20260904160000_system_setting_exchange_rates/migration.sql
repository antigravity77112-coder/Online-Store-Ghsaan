-- Persist shopper display exchange rates on SystemSetting (was sidecar JSON file).
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "exchangeRates" JSONB;
