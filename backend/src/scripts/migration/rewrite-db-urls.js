#!/usr/bin/env node
/**
 * Phase D: Rewrite DB image URLs from Cloudinary → verified R2 URLs.
 *
 * Usage:
 *   node src/scripts/migration/rewrite-db-urls.js --dry-run
 *   MIGRATION_CONFIRM=YES node src/scripts/migration/rewrite-db-urls.js --execute
 *   MIGRATION_CONFIRM=YES node src/scripts/migration/rewrite-db-urls.js --rollback
 *
 * Requires a prior migrate-to-r2 run (url-map.json) and a DB backup.
 */

require('dotenv').config();
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { IMAGE_FIELDS } = require('./lib/dbImageRefs');
const { isCloudinaryUrl, stripCloudinaryTransforms, extractPublicId } = require('./lib/urlNormalize');
const {
  getBackupRoot,
  getManifestDir,
  getStateDir,
  ensureBackupLayout,
  readJson,
  writeJson,
} = require('./lib/paths');

const mode = process.argv.includes('--rollback')
  ? 'rollback'
  : process.argv.includes('--execute')
    ? 'execute'
    : 'dry-run';

const BATCH = parseInt(process.env.MIGRATION_DB_BATCH, 10) || 50;

function resolveMappedUrl(url, urlMap, inventoryByPublicId) {
  if (!url || typeof url !== 'string') return null;
  if (urlMap[url]) return urlMap[url];
  const stripped = stripCloudinaryTransforms(url);
  if (urlMap[stripped]) return urlMap[stripped];
  const publicId = extractPublicId(url);
  if (publicId && inventoryByPublicId.get(publicId)?.r2Url) {
    return inventoryByPublicId.get(publicId).r2Url;
  }
  return null;
}

async function main() {
  const root = await ensureBackupLayout();
  const manifests = getManifestDir(root);
  const stateDir = getStateDir(root);

  const urlMap = (await readJson(path.join(manifests, 'url-map.json'), {})) || {};
  const inventory = (await readJson(path.join(manifests, 'inventory.json'), [])) || [];
  const inventoryByPublicId = new Map(inventory.filter((a) => a.publicId).map((a) => [a.publicId, a]));

  const snapshotPath = path.join(manifests, 'db-url-snapshot.json');
  const dryRunPath = path.join(manifests, 'db-rewrite-dry-run.json');
  const rollbackPath = path.join(manifests, 'rollback-map.json');
  const statePath = path.join(stateDir, 'db-rewrite-state.json');

  if (mode === 'rollback') {
    if (process.env.MIGRATION_CONFIRM !== 'YES') {
      console.error('Rollback requires MIGRATION_CONFIRM=YES');
      process.exit(1);
    }
    const rollbackMap = await readJson(rollbackPath);
    if (!rollbackMap || !Array.isArray(rollbackMap.changes)) {
      console.error('Missing rollback-map.json');
      process.exit(1);
    }
    const prisma = new PrismaClient();
    let restored = 0;
    try {
      for (const change of rollbackMap.changes) {
        const spec = IMAGE_FIELDS.find((s) => s.table === change.table);
        if (!spec) continue;
        await prisma[spec.model].update({
          where: { [spec.idField]: change.id },
          data: { [change.field]: change.oldUrl },
        });
        restored += 1;
      }
    } finally {
      await prisma.$disconnect();
    }
    console.log(`[rewrite-db] rollback restored ${restored} fields`);
    return;
  }

  console.log(`[rewrite-db] mode=${mode}`);
  console.log(`[rewrite-db] url-map entries=${Object.keys(urlMap).length}`);

  const prisma = new PrismaClient();
  /** @type {Array<object>} */
  const planned = [];
  /** @type {Array<object>} */
  const conflicts = [];
  /** @type {Array<object>} */
  const unmatched = [];

  // Optional snapshot of expected old values (from inventory pass)
  const snapshot = (await readJson(snapshotPath, null)) || null;

  try {
    for (const spec of IMAGE_FIELDS) {
      const select = { [spec.idField]: true };
      for (const f of spec.fields) select[f] = true;
      const rows = await prisma[spec.model].findMany({ select });

      for (const row of rows) {
        for (const field of spec.fields) {
          const current = row[field];
          if (!current || typeof current !== 'string') continue;
          if (!isCloudinaryUrl(current)) continue;

          const mapped = resolveMappedUrl(current, urlMap, inventoryByPublicId);
          if (!mapped) {
            unmatched.push({ table: spec.table, id: row[spec.idField], field, url: current });
            continue;
          }

          if (snapshot) {
            const snapKey = `${spec.table}:${row[spec.idField]}:${field}`;
            const expected = snapshot[snapKey];
            if (expected && expected !== current) {
              conflicts.push({
                table: spec.table,
                id: row[spec.idField],
                field,
                current,
                expected,
                mapped,
              });
              continue;
            }
          }

          if (current === mapped) continue;

          planned.push({
            table: spec.table,
            model: spec.model,
            idField: spec.idField,
            id: row[spec.idField],
            field,
            oldUrl: current,
            newUrl: mapped,
          });
        }
      }
    }
  } finally {
    if (mode === 'dry-run') await prisma.$disconnect();
  }

  await writeJson(dryRunPath, {
    generatedAt: new Date().toISOString(),
    mode,
    plannedCount: planned.length,
    conflictCount: conflicts.length,
    unmatchedCount: unmatched.length,
    planned,
    conflicts,
    unmatched,
  });

  console.log(`[rewrite-db] planned=${planned.length} conflicts=${conflicts.length} unmatched=${unmatched.length}`);
  console.log(`[rewrite-db] dry-run written: ${dryRunPath}`);

  if (mode === 'dry-run') {
    console.log('Re-run with --execute and MIGRATION_CONFIRM=YES after reviewing the dry-run and taking a DB backup.');
    return;
  }

  if (process.env.MIGRATION_CONFIRM !== 'YES') {
    console.error('Execute requires MIGRATION_CONFIRM=YES');
    await prisma.$disconnect();
    process.exit(1);
  }

  const changes = [];
  let applied = 0;
  let errors = 0;

  try {
    for (let i = 0; i < planned.length; i += BATCH) {
      const batch = planned.slice(i, i + BATCH);
      await prisma.$transaction(
        batch.map((change) =>
          prisma[change.model].update({
            where: { [change.idField]: change.id },
            data: { [change.field]: change.newUrl },
          }),
        ),
      );
      for (const change of batch) {
        changes.push({
          table: change.table,
          id: change.id,
          field: change.field,
          oldUrl: change.oldUrl,
          newUrl: change.newUrl,
        });
        applied += 1;
      }
      await writeJson(statePath, { applied, at: new Date().toISOString() });
      console.log(`[rewrite-db] applied ${applied}/${planned.length}`);
    }
  } catch (err) {
    errors += 1;
    console.error('[rewrite-db] batch failed:', err.message);
    throw err;
  } finally {
    await prisma.$disconnect();
  }

  await writeJson(rollbackPath, {
    createdAt: new Date().toISOString(),
    changes,
  });

  console.log(`[rewrite-db] execute complete applied=${applied} errors=${errors}`);
  console.log(`[rewrite-db] rollback map: ${rollbackPath}`);
}

main().catch((err) => {
  console.error('[rewrite-db] failed:', err);
  process.exit(1);
});
