#!/usr/bin/env node
/**
 * Apply recompress URL changes (old R2 URL → new R2 URL after format change).
 *
 * Usage:
 *   node src/scripts/migration/rewrite-recompress-urls.js --dry-run
 *   MIGRATION_CONFIRM=YES node src/scripts/migration/rewrite-recompress-urls.js --execute
 *   MIGRATION_CONFIRM=YES node src/scripts/migration/rewrite-recompress-urls.js --rollback
 */

require('dotenv').config();
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { IMAGE_FIELDS } = require('./lib/dbImageRefs');
const {
  ensureBackupLayout,
  getManifestDir,
  getStateDir,
  readJson,
  writeJson,
} = require('./lib/paths');

const mode = process.argv.includes('--rollback')
  ? 'rollback'
  : process.argv.includes('--execute')
    ? 'execute'
    : 'dry-run';

const BATCH = parseInt(process.env.MIGRATION_DB_BATCH, 10) || 50;

async function main() {
  const root = await ensureBackupLayout();
  const manifests = getManifestDir(root);
  const urlMap = (await readJson(path.join(manifests, 'recompress-url-map.json'), {})) || {};
  const rollbackPath = path.join(manifests, 'rollback-map-recompress.json');
  const dryRunPath = path.join(manifests, 'recompress-db-dry-run.json');

  if (mode === 'rollback') {
    if (process.env.MIGRATION_CONFIRM !== 'YES') {
      console.error('Rollback requires MIGRATION_CONFIRM=YES');
      process.exit(1);
    }
    const rollbackMap = await readJson(rollbackPath);
    if (!rollbackMap?.changes?.length) {
      console.error('Missing rollback-map-recompress.json');
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
    console.log(`[recompress-db] rollback restored ${restored}`);
    return;
  }

  const entries = Object.entries(urlMap);
  console.log(`[recompress-db] mode=${mode} mapEntries=${entries.length}`);

  if (!entries.length) {
    console.log('[recompress-db] nothing to rewrite (no extension/URL changes)');
    await writeJson(dryRunPath, { planned: [], plannedCount: 0 });
    return;
  }

  const prisma = new PrismaClient();
  const planned = [];

  try {
    for (const spec of IMAGE_FIELDS) {
      const select = { [spec.idField]: true };
      for (const f of spec.fields) select[f] = true;
      const rows = await prisma[spec.model].findMany({ select });
      for (const row of rows) {
        for (const field of spec.fields) {
          const current = row[field];
          if (!current || typeof current !== 'string') continue;
          const mapped = urlMap[current];
          if (!mapped || mapped === current) continue;
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
    planned,
  });
  console.log(`[recompress-db] planned=${planned.length}`);

  if (mode === 'dry-run') {
    console.log(`[recompress-db] dry-run: ${dryRunPath}`);
    return;
  }

  if (process.env.MIGRATION_CONFIRM !== 'YES') {
    console.error('Execute requires MIGRATION_CONFIRM=YES');
    await prisma.$disconnect();
    process.exit(1);
  }

  const changes = [];
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
      }
      console.log(`[recompress-db] applied ${Math.min(i + BATCH, planned.length)}/${planned.length}`);
    }
  } finally {
    await prisma.$disconnect();
  }

  await writeJson(rollbackPath, { createdAt: new Date().toISOString(), changes });
  await writeJson(path.join(getStateDir(root), 'recompress-db-state.json'), {
    applied: changes.length,
    at: new Date().toISOString(),
  });
  console.log(`[recompress-db] execute complete applied=${changes.length}`);
}

main().catch((err) => {
  console.error('[recompress-db] failed:', err);
  process.exit(1);
});
