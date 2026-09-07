/**
 * GISAAH — Phase 3: DB-Level Enforcement Constraints
 * ====================================================
 * Applies enforcement that Prisma cannot express natively:
 *
 *   1. Review rating range CHECK (1–5) — uses a standard CHECK constraint.
 *
 *   2. ProductAttribute category integrity — PostgreSQL does NOT allow
 *      subqueries in CHECK constraints. Instead, we use a BEFORE INSERT/UPDATE
 *      trigger that raises an exception if the CategoryAttribute does not
 *      belong to the Product's category. This is the correct PostgreSQL pattern.
 *
 * Run ONCE after phase2-data-migration.mjs has completed successfully.
 *
 * Usage:
 *   node prisma/scripts/phase3-constraints.mjs
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=".repeat(60));
  console.log("GISAAH — Phase 3: Applying DB Constraints");
  console.log("=".repeat(60));

  // ── Constraint 1: Review rating 1–5 ──────────────────────────────────────
  console.log("\n⭐ Applying Review rating CHECK (1–5)...");
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Review"
      ADD CONSTRAINT check_review_rating
      CHECK (rating >= 1 AND rating <= 5)
    `);
    console.log("   ✅ Review rating constraint applied.");
  } catch (err) {
    if (err.message.includes("already exists")) {
      console.log("   ℹ️  Already exists. Skipping.");
    } else throw err;
  }

  // ── Constraint 2: ProductAttribute category integrity (trigger) ───────────
  // PostgreSQL does not allow subqueries in CHECK constraints (ERROR 0A000).
  // Solution: BEFORE INSERT OR UPDATE trigger function that raises an exception
  // when the CategoryAttribute's categoryId ≠ the Product's categoryId.
  console.log("\n🔒 Applying ProductAttribute category integrity trigger...");

  // Create the trigger function
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION enforce_product_attribute_category()
    RETURNS TRIGGER AS $$
    DECLARE
      attr_category_id UUID;
      prod_category_id UUID;
    BEGIN
      SELECT ca."categoryId" INTO attr_category_id
      FROM "CategoryAttribute" ca
      WHERE ca.id = NEW."categoryAttributeId";

      SELECT p."categoryId" INTO prod_category_id
      FROM "Product" p
      WHERE p.id = NEW."productId";

      IF attr_category_id IS DISTINCT FROM prod_category_id THEN
        RAISE EXCEPTION
          'Category integrity violation: CategoryAttribute (category %) does not belong to the Product''s category (%).',
          attr_category_id, prod_category_id;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  console.log("   ✅ Trigger function created.");

  // Drop old trigger if exists (idempotent)
  await prisma.$executeRawUnsafe(`
    DROP TRIGGER IF EXISTS trg_product_attribute_category
    ON "ProductAttribute"
  `);

  // Attach trigger
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_product_attribute_category
    BEFORE INSERT OR UPDATE ON "ProductAttribute"
    FOR EACH ROW
    EXECUTE FUNCTION enforce_product_attribute_category()
  `);
  console.log("   ✅ Trigger attached to ProductAttribute.");

  // ── Verification ─────────────────────────────────────────────────────────
  console.log("\n🔍 Verifying constraints...");

  const ratingCheck = await prisma.$queryRaw`
    SELECT conname FROM pg_constraint
    WHERE conname = 'check_review_rating'
  `;

  const trigger = await prisma.$queryRaw`
    SELECT trigger_name FROM information_schema.triggers
    WHERE trigger_name = 'trg_product_attribute_category'
      AND event_object_table = 'ProductAttribute'
    LIMIT 1
  `;

  const r1 = ratingCheck.length > 0 ? "✅" : "❌";
  const r2 = trigger.length > 0 ? "✅" : "❌";

  console.log(`   ${r1} check_review_rating`);
  console.log(`   ${r2} trg_product_attribute_category`);

  if (ratingCheck.length > 0 && trigger.length > 0) {
    console.log("\n🎉 Phase 3 complete. All DB constraints in place.\n");
  } else {
    console.error("\n⚠️  Some constraints could not be verified.\n");
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error("\n❌ Phase 3 failed:", err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
