-- Add Telegram, LinkedIn, Threads social URL fields
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "telegramUrl" TEXT;
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "linkedinUrl" TEXT;
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "threadsUrl" TEXT;
