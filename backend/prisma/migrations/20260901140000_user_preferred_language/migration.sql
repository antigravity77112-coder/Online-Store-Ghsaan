-- Add user-level language preference (Arabic default)
CREATE TYPE "PreferredLanguage" AS ENUM ('ar', 'en');

ALTER TABLE "User" ADD COLUMN "preferredLanguage" "PreferredLanguage" NOT NULL DEFAULT 'ar';
