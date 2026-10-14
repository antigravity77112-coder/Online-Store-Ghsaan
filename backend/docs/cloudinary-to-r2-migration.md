# Cloudinary → Cloudflare R2 Migration Runbook

## Architecture (revised)

| Concern | Behavior |
|--------|----------|
| **Existing images** | Inventory → independent offline backup → byte-identical copy to R2 → DB URL rewrite |
| **New uploads** | Validate → **Cloudinary compress** → store optimized bytes on **R2** → **keep Cloudinary copy** (option B) |
| **Default until cutover** | `STORAGE_PROVIDER=cloudinary` (unchanged delivery) |
| **Never** | Delete Cloudinary assets as part of this migration |

R2 is **not** the backup. Backup lives in `MIGRATION_BACKUP_DIR`.

## Prerequisites

1. Cloudinary credentials (`CLOUDINARY_*`) matching production.
2. Cloudflare R2 bucket + API token (`R2_*`) — supply before Phase C / cutover.
3. Disk space ≥ Phase A `summary.json` → `estimatedBackupMiB`.
4. Postgres dump via `DIRECT_URL` before any `--execute` DB rewrite.

See [`.env.example`](../.env.example) for all variables.

## Phase checklist

### A — Inventory

```bash
cd backend
npm run migrate:inventory
```

Outputs under `MIGRATION_BACKUP_DIR` (default `../SmartShoper backup`):

- `manifests/inventory.json`, `inventory.csv`
- `manifests/db-refs.json`, `unmatched-db-urls.json`, `orphan-cloudinary.json`
- `summary.json` (bytes / counts)

### B — Independent backup

```bash
npm run migrate:backup
# optional: include Cloudinary assets not referenced in DB
node src/scripts/migration/backup-cloudinary.js --include-orphans
```

Creates `files/…`, `checksums.sha256`, `state/backup-state.json`, `backup-summary.json`.  
Re-run to retry failures; verified files are skipped.

### C — Copy to R2 (byte-identical)

**Requires R2 credentials.** Do not run until you provide them.

```bash
npm run migrate:r2
```

Writes `state/r2-migration-state.json`, updates inventory `r2Url` / `verified`, builds `manifests/url-map.json`.

### D — Database rewrite

1. Take a Postgres backup (`npm run backup:pg-dump` or `pg_dump`).
2. Dry-run:

```bash
npm run migrate:db-dry-run
```

Review `manifests/db-rewrite-dry-run.json`.

3. Execute (explicit confirm):

```bash
# Windows PowerShell
$env:MIGRATION_CONFIRM="YES"; npm run migrate:db-execute
```

4. Rollback if needed:

```bash
$env:MIGRATION_CONFIRM="YES"; npm run migrate:db-rollback
```

`STORAGE_PROVIDER=cloudinary` alone does **not** undo URL rewrites — use rollback-map.

### E / F — Dual delivery + new-upload cutover

1. Storefront already passes through non-Cloudinary URLs (FE + Mobile + spa-meta).
2. Smoke-test in staging: set R2 env + `STORAGE_PROVIDER=r2`, upload a product image, confirm:
   - Response URL is R2 public URL
   - Asset also exists on Cloudinary (kept)
   - Image displays on PDP / admin
3. Production: set `STORAGE_PROVIDER=r2` only after Phases A–D verification.
4. Fail-closed: R2 upload errors are returned to the client (no silent Cloudinary-only fallback when provider is `r2`).

## Fields rewritten

- `ProductImage.url`
- `ProductVariant.imageUrl`
- `Category.imageUrl`, `Category.iconUrl`
- `Brand.logoUrl`
- `Scent.imageUrl`
- `Banner.imageUrl`, `Banner.mobileImageUrl`
- `SystemSetting` logo / favicon / og fields (Cloudinary URLs only; relative `/Logo_*.png` skipped)
- `OrderItem.productImageUrl` (exact mapped URLs only)

## Rollback summary

| Problem | Action |
|--------|--------|
| Bad DB URLs | `migrate:db-rollback` with `MIGRATION_CONFIRM=YES` |
| New uploads to R2 failing | Set `STORAGE_PROVIDER=cloudinary` |
| Need original files | Restore from `MIGRATION_BACKUP_DIR/files` |
| Cloudinary | Untouched — still available |

## Tests

```bash
npm run test:storage
```

## Acceptance (do not claim complete until)

- [ ] Inventory reconciled vs Cloudinary account
- [ ] Backup files + SHA-256 verified
- [ ] R2 objects HeadObject-verified
- [ ] Every rewritten DB URL maps to a verified R2 object
- [ ] Spot-check PDP, categories, brands, scents, banners, logos, OG
- [ ] Cloudinary URLs still work for unmigrated / kept copies
- [ ] New upload with `STORAGE_PROVIDER=r2` works
- [ ] No Cloudinary deletions performed

---

## Permanent live path (no local disk)

Every **new** admin upload with `STORAGE_PROVIDER=r2`:

1. Backend receives file
2. Cloudinary compresses (WebP / preserve PNG for logos)
3. Backend retrieves optimized bytes
4. Optimized file is stored on **Cloudflare R2**
5. DB stores the **R2 public URL**
6. Visitors load images via Cloudflare bandwidth

Local `SmartShoper backup` is archival only — not used for day-to-day uploads.

## One-time recompress of migrated (fat) R2 originals

Byte-identical migration left large files on R2. Recompress them with the same Cloudinary engine:

```bash
# Pilot
node src/scripts/migration/recompress-r2-library.js --folder=brands
node src/scripts/migration/recompress-r2-library.js --folder=products --limit=10

# Full library
npm run migrate:recompress

# If extensions changed (e.g. jpg→webp), update DB
npm run migrate:recompress-db-dry
$env:MIGRATION_CONFIRM="YES"; npm run migrate:recompress-db-execute
```

Rollback DB after recompress: `npm run migrate:recompress-db-rollback` with `MIGRATION_CONFIRM=YES`.