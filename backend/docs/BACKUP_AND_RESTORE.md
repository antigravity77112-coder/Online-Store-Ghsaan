# GISAah Backup & Restore (Supabase Free)

## Acceptance criterion

If the database is **deleted or emptied**, you can restore the store from backups created by this plan.

## Hard rule

**Never wipe or restore against the live production database for drills.**  
Use a throwaway Supabase project / empty Postgres. Live DB is only used for **export** (download / `pg_dump` / `export-app-backup`).

## Why Free tier needs this

Supabase Free has **no automatic daily backups** and **no PITR**. Projects can **pause after ~7 days of inactivity**. You must keep your own offsite copies.

## Two layers

| Layer | What | When to use |
|-------|------|-------------|
| **1 – `pg_dump`** | Full Postgres logical dump (schema + data) via `DIRECT_URL` | True disaster recovery (DB deleted, new project, migration) |
| **2 – Admin JSON v2.2** | App `.json.gz` from Admin UI or `export-app-backup.js` | Convenient store snapshot (catalog, orders, users, rates, push notifications, coupons) |

Image URLs in the DB may point at Cloudinary and/or Cloudflare R2 — binary assets are not inside the JSON. Exchange rates are included in Layer 2 and also live in `backend/data/exchange-rates.json`.

**v2.1 adds:** `deviceTokens`, `notificationPreferences`, `notifications`, `notificationCampaigns`, `notificationDeliveries`.  
**v2.2 adds:** `coupons`, `couponRedemptions` (percent **and** fixed-amount discounts), plus Order coupon snapshot fields (`couponCode`, `discountType`, `discountAmount`, …). Older **v2.0 / v2.1** files still restore (missing coupon tables become empty).

---

## Immediate: take a backup now (safe)

### A) Admin UI (Layer 2)

1. Open Admin → Backup / النسخ الاحتياطي  
2. Download `.json.gz`  
3. Save **two copies** (laptop + Google Drive / OneDrive)

### B) App export script (Layer 2)

```bash
cd backend
node scripts/export-app-backup.js
```

Writes to `backend/backups/gisaah_backup_YYYY-MM-DD_HHmmss.json.gz`  
(also copies `exchange-rates.json` beside it)

### C) Postgres dump (Layer 1) — preferred for “DB deleted”

Requires [PostgreSQL client tools](https://www.postgresql.org/download/) (`pg_dump`) and `DIRECT_URL` in `backend/.env` (session pooler port **5432**, not transaction pooler 6543).

```powershell
cd backend
.\scripts\pg-dump-backup.ps1
```

Or:

```bash
cd backend
node scripts/pg-dump-backup.js
```

Output: `backend/backups/gisaah_pg_YYYY-MM-DD_HHmmss.sql.gz`

Copy that file off the machine.

---

## Restore after DB deleted (Layer 1)

1. Create a **new** Supabase project (or empty DB).  
2. Set `DATABASE_URL` / `DIRECT_URL` to the **new** project.  
3. Restore:

```powershell
# PowerShell example — use the NEW project's DIRECT_URL only
$env:PGPASSWORD = "..." # if needed
gunzip -c .\backups\gisaah_pg_DATE.sql.gz | psql $env:DIRECT_URL
```

On Windows without `gunzip`, use the Node helper:

```bash
node scripts/pg-restore-throwaway.js --file backups/gisaah_pg_DATE.sql.gz
```

That script **refuses** to run unless `CONFIRM_RESTORE=YES` and `ALLOW_PRODUCTION_RESTORE=YES` are set, and by default expects `RESTORE_DATABASE_URL` (throwaway), **not** your normal `DIRECT_URL`.

4. `npx prisma migrate deploy` (if schema history needs aligning)  
5. Smoke-test API, admin login, one product with variants, checkout  
6. Point production env to the new DB only after verification  

### Layer 2 restore (admin JSON)

Use Admin → Restore **only** when you intend to replace store data.  
Requires backup **version 2.0, 2.1, or 2.2**. Old v1.0 files are rejected (incomplete catalog). New exports are **v2.2**.

**Before restore on a new Supabase project**, run all migrations so the schema matches the app:

```bash
cd backend
npx prisma migrate deploy
```

If `migrate deploy` is unavailable, run `scripts/manual-apply-pending-migrations.sql` in the Supabase SQL editor.

If restore fails with `CategoryAttribute.options does not exist`, apply the missing column:

```sql
ALTER TABLE "CategoryAttribute" ADD COLUMN IF NOT EXISTS "options" TEXT;
```

Then retry restore.

If restore fails with `Null constraint violation on the fields: (sellerId)`, drop the legacy column:

```sql
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_sellerId_fkey";
DROP INDEX IF EXISTS "Product_sellerId_createdAt_idx";
DROP INDEX IF EXISTS "Product_sellerId_idx";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "sellerId";
```

Or run `npx prisma migrate deploy` to apply migration `20260903220000_drop_product_seller_id`.

---

## Keep Free project from pausing

```bash
# Set HEALTH_URL to your deployed API, e.g. https://api.example.com/api/health
node scripts/keep-alive.js
```

Schedule daily (Task Scheduler / cron / UptimeRobot hitting `GET /api/health`).

---

## Cadence

| When | Action |
|------|--------|
| Daily | `pg-dump` or app export → offsite; health ping |
| Weekly | Admin download to laptop |
| Monthly | Restore drill on **throwaway** DB only |
| Before big catalog changes | Extra dump |

**RPO on Free:** ≤ 24h if you run nightly dumps.

---

## Upgrade to Supabase Pro when

- Real customer orders you cannot lose  
- DB near 500 MB Free cap  
- You need dashboard daily backups / no pause  

Pro still does not replace keeping your own offsite `pg_dump` before risky operations.
