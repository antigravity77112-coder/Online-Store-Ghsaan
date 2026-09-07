-- Add CategoryAttribute.options for SELECT / MULTI_SELECT attribute definitions.
-- Prisma schema had this field but no migration was committed earlier.

ALTER TABLE "CategoryAttribute" ADD COLUMN IF NOT EXISTS "options" TEXT;
