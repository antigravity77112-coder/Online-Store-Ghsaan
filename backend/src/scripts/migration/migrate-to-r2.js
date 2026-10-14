#!/usr/bin/env node
/**
 * Phase C: Byte-identical copy of backed-up (or Cloudinary) assets to R2.
 * No recompression. Resumable. Requires R2_* env vars.
 *
 * Usage:
 *   node src/scripts/migration/migrate-to-r2.js
 *   node src/scripts/migration/migrate-to-r2.js --include-orphans
 *
 * Do NOT run until you have provided R2 API credentials.
 */

require('dotenv').config();
const path = require('path');
const fsp = require('fs').promises;
const https = require('https');
const http = require('http');
const r2 = require('../../services/storage/r2Client');

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function putWithRetry(body, options, attempts = 5) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await r2.putObject(body, options);
    } catch (err) {
      lastErr = err;
      if (i < attempts) {
        const wait = Math.min(30000, 1000 * 2 ** (i - 1));
        console.warn(`[migrate-r2] put retry ${i}/${attempts}: ${err.message}; wait ${wait}ms`);
        await sleep(wait);
      }
    }
  }
  throw lastErr;
}
const {
  getBackupRoot,
  getManifestDir,
  getStateDir,
  ensureBackupLayout,
  readJson,
  writeJson,
} = require('./lib/paths');

const CONCURRENCY = parseInt(process.env.MIGRATION_CONCURRENCY, 10) || 3;
const includeOrphans = process.argv.includes('--include-orphans');
const localOnly = process.argv.includes('--local-only');

const MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  bin: 'application/octet-stream',
};

function contentTypeFor(format) {
  return MIME[String(format || 'bin').toLowerCase()] || 'application/octet-stream';
}

function downloadUrl(url, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 120000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (redirectsLeft <= 0) return reject(new Error('Too many redirects'));
        res.resume();
        return downloadUrl(res.headers.location, redirectsLeft - 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('download timeout'));
    });
  });
}

async function mapPool(items, limit, fn) {
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length || 1) }, () => worker()));
}

async function main() {
  try {
    r2.assertR2Configured();
  } catch (err) {
    console.error(err.message);
    console.error('Provide R2_* credentials before running this migration step.');
    process.exit(1);
  }

  const cfg = r2.getR2Config();
  console.log(`[migrate-r2] bucket=${cfg.bucket}`);
  console.log(`[migrate-r2] endpoint=${cfg.endpoint}`);
  console.log(`[migrate-r2] publicBase=${cfg.publicBaseUrl}`);

  const root = await ensureBackupLayout();
  const manifests = getManifestDir(root);
  const stateDir = getStateDir(root);
  const inventoryPath = path.join(manifests, 'inventory.json');
  const inventory = await readJson(inventoryPath);
  if (!inventory) {
    console.error('Run inventory-cloudinary.js first');
    process.exit(1);
  }

  const statePath = path.join(stateDir, 'r2-migration-state.json');
  const state = (await readJson(statePath, { verified: {}, failed: {} })) || { verified: {}, failed: {} };

  let targets = includeOrphans ? inventory : inventory.filter((a) => a.inDatabase);
  if (localOnly) {
    const withLocal = [];
    for (const asset of targets) {
      try {
        await fsp.access(path.join(root, asset.backupPath));
        withLocal.push(asset);
      } catch {
        /* skip — no local backup yet */
      }
    }
    console.log(`[migrate-r2] --local-only: ${withLocal.length}/${targets.length} have local files`);
    targets = withLocal;
  }
  console.log(`[migrate-r2] assets: ${targets.length} (orphans=${includeOrphans}, localOnly=${localOnly})`);

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  await mapPool(targets, CONCURRENCY, async (asset) => {
    const id = asset.assetId;
    if (state.verified[id]?.r2Url) {
      skipped += 1;
      return;
    }

    const key = asset.r2Key || r2.buildMigratedKey(asset);
    try {
      let body;
      const localPath = path.join(root, asset.backupPath);
      try {
        body = await fsp.readFile(localPath);
      } catch {
        if (localOnly) throw new Error('local file missing');
        body = await downloadUrl(asset.secureUrl);
      }

      await putWithRetry(body, {
        key,
        contentType: contentTypeFor(asset.format),
      });

      const head = await r2.headObject(key);
      if (head.contentLength != null && head.contentLength !== body.length) {
        throw new Error(`size mismatch: uploaded ${body.length}, head ${head.contentLength}`);
      }

      const r2Url = r2.publicUrlForKey(key, cfg.publicBaseUrl);
      state.verified[id] = {
        key,
        r2Url,
        bytes: body.length,
        at: new Date().toISOString(),
      };
      delete state.failed[id];

      asset.copiedToR2 = true;
      asset.verified = true;
      asset.r2Key = key;
      asset.r2Url = r2Url;
      asset.status = 'verified';
      ok += 1;

      if ((ok + skipped) % 25 === 0) {
        await writeJson(statePath, state);
        console.log(`[migrate-r2] progress ok=${ok} skipped=${skipped} failed=${failed}`);
      }
    } catch (err) {
      failed += 1;
      state.failed[id] = { error: err.message, at: new Date().toISOString() };
      asset.error = err.message;
      asset.status = 'r2_failed';
      console.error(`[migrate-r2] FAIL ${id}: ${err.message}`);
    }
  });

  await writeJson(statePath, state);
  await writeJson(inventoryPath, inventory);

  // Build URL map for DB rewrite: Cloudinary secure_url (+ normalized) → R2
  const urlMap = {};
  for (const asset of inventory) {
    if (!asset.r2Url) continue;
    if (asset.secureUrl) urlMap[asset.secureUrl] = asset.r2Url;
    // Also map common transform-stripped form if different
    urlMap[asset.secureUrl] = asset.r2Url;
  }
  // Enrich from db refs on verified assets
  for (const asset of inventory) {
    if (!asset.r2Url || !asset.dbRefs) continue;
    for (const ref of asset.dbRefs) {
      if (ref.url) urlMap[ref.url] = asset.r2Url;
    }
  }
  await writeJson(path.join(manifests, 'url-map.json'), urlMap);

  const summary = {
    phase: 'migrate-r2',
    finishedAt: new Date().toISOString(),
    ok,
    skipped,
    failed,
    urlMapEntries: Object.keys(urlMap).length,
    bucket: cfg.bucket,
    publicBaseUrl: cfg.publicBaseUrl,
  };
  await writeJson(path.join(root, 'r2-migration-summary.json'), summary);
  console.log('[migrate-r2] done', summary);

  if (failed > 0) {
    console.error(`[migrate-r2] ${failed} failures — re-run to retry`);
    process.exit(2);
  }
}

main().catch((err) => {
  console.error('[migrate-r2] failed:', err);
  process.exit(1);
});
