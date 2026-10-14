#!/usr/bin/env node
/**
 * Rebuild backup-state.json from files already on disk + inventory.
 */
require('dotenv').config();
const path = require('path');
const fsp = require('fs').promises;
const fs = require('fs');
const { sha256File } = require('./lib/checksum');
const {
  ensureBackupLayout,
  getManifestDir,
  getStateDir,
  readJson,
  writeJson,
} = require('./lib/paths');

async function main() {
  const root = await ensureBackupLayout();
  const inventory = await readJson(path.join(getManifestDir(root), 'inventory.json'), []);
  const statePath = path.join(getStateDir(root), 'backup-state.json');
  const prev = (await readJson(statePath, { verified: {}, failed: {} })) || { verified: {}, failed: {} };

  const verified = { ...(prev.verified || {}) };
  let recovered = 0;
  let missing = 0;

  for (const asset of inventory) {
    const id = asset.assetId;
    const abs = path.join(root, asset.backupPath);
    if (!fs.existsSync(abs)) {
      missing += 1;
      continue;
    }
    if (verified[id]?.sha256) continue;
    try {
      const hash = await sha256File(abs);
      const st = fs.statSync(abs);
      verified[id] = {
        sha256: hash,
        bytes: st.size,
        path: asset.backupPath,
        at: new Date().toISOString(),
        recovered: true,
      };
      recovered += 1;
    } catch (err) {
      console.warn(`[repair] skip ${id}: ${err.message}`);
    }
  }

  // Drop failed entries that now have verified files
  const failed = { ...(prev.failed || {}) };
  for (const id of Object.keys(verified)) delete failed[id];

  const next = { verified, failed };
  await writeJson(statePath, next);
  // atomic-ish backup of state
  await writeJson(statePath + '.repaired.json', {
    at: new Date().toISOString(),
    verifiedCount: Object.keys(verified).length,
    failedCount: Object.keys(failed).length,
    recovered,
    missingOnDisk: missing,
  });

  console.log(
    JSON.stringify(
      {
        verified: Object.keys(verified).length,
        failed: Object.keys(failed).length,
        recovered,
        missingOnDisk: missing,
        inventory: inventory.length,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
