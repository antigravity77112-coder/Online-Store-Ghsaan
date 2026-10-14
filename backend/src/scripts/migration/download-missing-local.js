#!/usr/bin/env node
/**
 * Finish LOCAL backup only — download any inventory assets missing on disk.
 * No R2 upload.
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
const axios = require('axios');
const cloudinary = require('cloudinary').v2;
const { sha256Buffer, writeChecksumLine } = require('./lib/checksum');
const {
  ensureBackupLayout,
  getManifestDir,
  getStateDir,
  readJson,
  writeJson,
} = require('./lib/paths');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function downloadAsset(asset) {
  const urls = [];
  try {
    urls.push(
      cloudinary.utils.private_download_url(asset.publicId, asset.format || 'png', {
        resource_type: asset.resourceType || 'image',
        type: asset.deliveryType || 'upload',
        attachment: false,
      }),
    );
  } catch (_) {
    /* ignore */
  }
  if (asset.secureUrl) urls.push(asset.secureUrl);

  let lastErr;
  for (let attempt = 1; attempt <= 8; attempt++) {
    const url = urls[(attempt - 1) % Math.max(urls.length, 1)];
    try {
      const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 240000,
        maxRedirects: 5,
        validateStatus: (s) => s === 200,
        headers: { 'User-Agent': 'GISAah-local-backup/1.0', Accept: 'image/*,*/*' },
      });
      return Buffer.from(res.data);
    } catch (err) {
      lastErr = err;
      const wait = Math.min(60000, 2000 * 2 ** (attempt - 1));
      console.warn(`[local] ${asset.publicId} retry ${attempt}/8: ${err.message}; wait ${wait}ms`);
      await sleep(wait);
    }
  }
  throw lastErr || new Error('download failed');
}

async function main() {
  const root = await ensureBackupLayout();
  const inventoryPath = path.join(getManifestDir(root), 'inventory.json');
  const inventory = await readJson(inventoryPath, []);
  const statePath = path.join(getStateDir(root), 'backup-state.json');
  const state = (await readJson(statePath, { verified: {}, failed: {} })) || { verified: {}, failed: {} };

  const missing = inventory.filter((a) => !fs.existsSync(path.join(root, a.backupPath)));
  console.log(`[local] missing ${missing.length} / ${inventory.length}`);
  console.log(missing.map((a) => a.publicId).join('\n'));

  let ok = 0;
  let failed = 0;

  for (const asset of missing) {
    const abs = path.join(root, asset.backupPath);
    try {
      const buf = await downloadAsset(asset);
      await fsp.mkdir(path.dirname(abs), { recursive: true });
      await fsp.writeFile(abs, buf);
      const hash = sha256Buffer(buf);
      state.verified[asset.assetId] = {
        sha256: hash,
        bytes: buf.length,
        path: asset.backupPath,
        at: new Date().toISOString(),
      };
      delete state.failed[asset.assetId];
      await writeChecksumLine(path.join(root, 'checksums.sha256'), asset.backupPath, hash);
      asset.backedUp = true;
      asset.sha256 = hash;
      ok += 1;
      console.log(`[local] OK ${asset.publicId} (${buf.length} bytes) -> ${asset.backupPath}`);
      await writeJson(statePath, state);
    } catch (err) {
      failed += 1;
      state.failed[asset.assetId] = { error: err.message, at: new Date().toISOString() };
      console.error(`[local] FAIL ${asset.publicId}: ${err.message}`);
    }
  }

  await writeJson(statePath, state);
  await writeJson(inventoryPath, inventory);

  // Final folder counts for manual copy
  const uploadRoot = path.join(root, 'files', 'image', 'upload');
  const folders = fs.existsSync(uploadRoot) ? fs.readdirSync(uploadRoot) : [];
  const folderCounts = {};
  for (const f of folders) {
    const dir = path.join(uploadRoot, f);
    if (!fs.statSync(dir).isDirectory()) continue;
    folderCounts[f] = fs.readdirSync(dir).filter((n) => fs.statSync(path.join(dir, n)).isFile()).length;
  }

  const stillMissing = inventory.filter((a) => !fs.existsSync(path.join(root, a.backupPath)));
  const summary = {
    phase: 'local-backup-complete',
    finishedAt: new Date().toISOString(),
    downloadedThisRun: ok,
    failedThisRun: failed,
    present: inventory.length - stillMissing.length,
    stillMissing: stillMissing.map((a) => a.publicId),
    folderCounts,
    backupRoot: root,
    manualCopyHint: 'Copy folders under files/image/upload/* into your R2 bucket (keep folder names). Mapping later.',
  };
  await writeJson(path.join(root, 'local-backup-summary.json'), summary);
  console.log('[local] done');
  console.log(JSON.stringify(summary, null, 2));
  if (failed > 0 || stillMissing.length) process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
