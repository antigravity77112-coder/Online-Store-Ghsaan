-- Hero banner peek product cards (admin-picked, max 2 per banner)
ALTER TABLE "Banner" ADD COLUMN "peekProductIds" JSONB;
