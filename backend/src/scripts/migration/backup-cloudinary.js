#!/usr/bin/env node
/**
 * Phase B: Download original Cloudinary assets to an independent backup directory.
 * Verifies SHA-256; resumable via state/backup-state.json.
 *
 * Usage:
 *   node src/scripts/migration/backup-cloudinary.js
 *   node src/scripts/migration/backup-cloudinary.js --include-orphans
 */

require('dotenv').config();
const path = require('path');
const fsp = require('fs').promises;
const axios = require('axios');
const cloudinary = require('cloudinary').v2;
const { sha256Buffer, writeChecksumLine } = require('./lib/checksum');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const {
  getBackupRoot,
  getManifestDir,
  getStateDir,
  ensureBackupLayout,
  readJson,
  writeJson,
} = require('./lib/paths');

const CONCURRENCY = parseInt(process.env.MIGRATION_CONCURRENCY, 10) || 2;
const MAX_ATTEMPTS = parseInt(process.env.MIGRATION_DOWNLOAD_RETRIES, 10) || 5;
const includeOrphans = process.argv.includes('--include-orphans');

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function buildDownloadCandidates(asset) {
  const urls = [];
  // Authenticated download (often more reliable than public CDN under flaky networks)
  try {
    if (asset.publicId && asset.format) {
      urls.push(
        cloudinary.utils.private_download_url(asset.publicId, asset.format, {
          resource_type: asset.resourceType || 'image',
          type: asset.deliveryType || 'upload',
          attachment: false,
        }),
      );
    }
  } catch (_) {
    /* ignore */
  }
  if (asset.secureUrl) urls.push(asset.secureUrl);
  return urls;
}

async function downloadUrlOnce(url) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 180000,
    maxRedirects: 5,
    validateStatus: (s) => s === 200,
    headers: {
      'User-Agent': 'GISAah-migration-backup/1.0',
      Accept: 'image/*,*/*',
    },
  });
  return Buffer.from(res.data);
}

async function downloadAsset(asset) {
  const urls = buildDownloadCandidates(asset);
  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const url = urls[(attempt - 1) % urls.length];
    try {
      return await downloadUrlOnce(url);
    } catch (err) {
      lastErr = err;
      const status = err.response?.status;
      const msg = status ? `HTTP ${status}` : err.message;
      if (attempt < MAX_ATTEMPTS) {
        const wait = Math.min(45000, 2000 * 2 ** (attempt - 1));
        console.warn(`[backup] retry ${attempt}/${MAX_ATTEMPTS} after ${msg}; wait ${wait}ms`);
        await sleep(wait);
      }
    }
  }
  throw lastErr || new Error(`Failed downloading ${asset.publicId}`);
}

async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length || 1) }, () => worker()));
  return results;
}

async function main() {
  const root = await ensureBackupLayout();
  const manifests = getManifestDir(root);
  const stateDir = getStateDir(root);
  const inventoryPath = path.join(manifests, 'inventory.json');
  const inventory = await readJson(inventoryPath);
  if (!inventory || !Array.isArray(inventory)) {
    console.error('Run inventory-cloudinary.js first (missing manifests/inventory.json)');
    process.exit(1);
  }

  const statePath = path.join(stateDir, 'backup-state.json');
  const state = (await readJson(statePath, { verified: {}, failed: {} })) || { verified: {}, failed: {} };
  const checksumsPath = path.join(root, 'checksums.sha256');

  let targets = inventory;
  if (!includeOrphans) {
    targets = inventory.filter((a) => a.inDatabase);
    console.log(`[backup] DB-referenced assets only (${targets.length}).`);
  } else {
    console.log(`[backup] including orphans (${targets.length} total)`);
  }

  const already = Object.keys(state.verified || {}).length;
  console.log(`[backup] root: ${root}`);
  console.log(`[backup] concurrency: ${CONCURRENCY}, retries: ${MAX_ATTEMPTS}`);
  console.log(`[backup] already verified: ${already}`);

  let ok = 0;
  let skipped = 0;
  let failed = 0;
  let bytes = 0;

  await mapPool(targets, CONCURRENCY, async (asset) => {
    const id = asset.assetId;
    if (state.verified[id]?.sha256) {
      skipped += 1;
      return;
    }

    const rel = asset.backupPath;
    const abs = path.join(root, rel);
    try {
      await fsp.mkdir(path.dirname(abs), { recursive: true });
      const buf = await downloadAsset(asset);
      if (asset.bytes && Math.abs(buf.length - asset.bytes) > 64 && buf.length < asset.bytes * 0.5) {
        throw new Error(`Downloaded size ${buf.length} far below expected ${asset.bytes}`);
      }
      const hash = sha256Buffer(buf);
      await fsp.writeFile(abs, buf);
      state.verified[id] = {
        sha256: hash,
        bytes: buf.length,
        path: rel,
        at: new Date().toISOString(),
      };
      delete state.failed[id];
      await writeChecksumLine(checksumsPath, rel, hash);
      asset.backedUp = true;
      asset.sha256 = hash;
      ok += 1;
      bytes += buf.length;
      if ((ok + skipped) % 10 === 0) {
        await writeJson(statePath, state);
        console.log(`[backup] progress ok=${ok} skipped=${skipped} failed=${failed} totalVerified=${already + ok}`);
      }
    } catch (err) {
      failed += 1;
      state.failed[id] = { error: err.message, at: new Date().toISOString() };
      asset.error = err.message;
      console.error(`[backup] FAIL ${id}: ${err.message}`);
    }
  });

  await writeJson(statePath, state);
  await writeJson(inventoryPath, inventory);

  const summary = {
    phase: 'backup',
    finishedAt: new Date().toISOString(),
    ok,
    skipped,
    failed,
    totalVerified: Object.keys(state.verified).length,
    bytesDownloaded: bytes,
    bytesMiB: Number((bytes / (1024 * 1024)).toFixed(2)),
    includeOrphans,
    backupRoot: root,
  };
  await writeJson(path.join(root, 'backup-summary.json'), summary);
  console.log('[backup] done', summary);

  if (failed > 0) {
    console.error(`[backup] ${failed} failures — re-run to retry; verified files are skipped.`);
    process.exit(2);
  }
}

main().catch((err) => {
  console.error('[backup] failed:', err);
  process.exit(1);
});
