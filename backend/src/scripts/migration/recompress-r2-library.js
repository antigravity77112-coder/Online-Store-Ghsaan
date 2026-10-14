#!/usr/bin/env node
/**
 * One-time: recompress existing R2 library via Cloudinary delivery transforms,
 * then PutObject optimized bytes back to R2.
 *
 * Usage:
 *   node src/scripts/migration/recompress-r2-library.js --dry-run
 *   node src/scripts/migration/recompress-r2-library.js --folder=brands
 *   node src/scripts/migration/recompress-r2-library.js --folder=products --limit=10
 *   node src/scripts/migration/recompress-r2-library.js
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
const r2 = require('../../services/storage/r2Client');
const { policyForFolder } = require('../../services/storage');
const {
  buildOptimizedDeliveryUrl,
  downloadUrl,
  compressWithCloudinary,
} = require('../../services/storage/cloudinaryOptimize');
const { isAnimatedGif, detectImageFormat } = require('../../services/storage/imageValidation');
const {
  ensureBackupLayout,
  getManifestDir,
  getStateDir,
  readJson,
  writeJson,
} = require('./lib/paths');

const dryRun = process.argv.includes('--dry-run');
const folderArg = (process.argv.find((a) => a.startsWith('--folder=')) || '').slice('--folder='.length);
const limitArg = parseInt((process.argv.find((a) => a.startsWith('--limit=')) || '').slice('--limit='.length), 10);
const CONCURRENCY = parseInt(process.env.MIGRATION_CONCURRENCY, 10) || 2;

const MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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

function folderOf(asset) {
  const pid = String(asset.publicId || '');
  if (pid.includes('/')) return pid.split('/')[0];
  return asset.folder || 'products';
}

function shouldPreserveFormat(folder) {
  const f = String(folder || '').toLowerCase();
  return f.includes('brand') || f.includes('categor') || f.includes('site-asset') || f.includes('scent');
}

function oldKeyFor(asset) {
  return (
    asset.r2Key ||
    `migrated/cloudinary/${asset.resourceType || 'image'}/${asset.deliveryType || 'upload'}/${asset.publicId}.${asset.format || 'bin'}`
  );
}

function newKeyFor(asset, ext) {
  return `migrated/cloudinary/${asset.resourceType || 'image'}/${asset.deliveryType || 'upload'}/${asset.publicId}.${ext}`;
}

async function loadOriginalBuffer(root, asset) {
  const localPath = path.join(root, asset.backupPath || '');
  if (asset.backupPath && fs.existsSync(localPath)) {
    return fsp.readFile(localPath);
  }
  const key = oldKeyFor(asset);
  const obj = await r2.getObject(key);
  return obj.body;
}

async function optimizeFromCloudinaryPublicId(asset, options) {
  const optimizedUrl = buildOptimizedDeliveryUrl(
    {
      public_id: asset.publicId,
      resource_type: asset.resourceType || 'image',
      type: asset.deliveryType || 'upload',
    },
    options,
  );
  const buffer = await downloadUrl(optimizedUrl);
  const ext = options.preserveFormat || options.animated
    ? (asset.format || 'png')
    : 'webp';
  const contentType = MIME[ext] || (ext === 'jpg' ? 'image/jpeg' : `image/${ext}`);
  return { buffer, ext, contentType, deliveryUrl: optimizedUrl, via: 'cloudinary_transform' };
}

async function optimizeWithUploadFallback(buffer, asset, options) {
  try {
    return await optimizeFromCloudinaryPublicId(asset, options);
  } catch (err) {
    console.warn(`[recompress] transform failed for ${asset.publicId}: ${err.message}; uploading buffer`);
    const result = await compressWithCloudinary(buffer, {
      folder: `recompress/${folderOf(asset)}`,
      preserveFormat: options.preserveFormat,
      animated: options.animated,
      maxEdge: options.maxEdge,
    });
    return {
      buffer: result.optimized.buffer,
      ext: result.optimized.ext,
      contentType: result.optimized.contentType,
      deliveryUrl: result.optimized.deliveryUrl,
      via: 'cloudinary_upload',
    };
  }
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
        console.warn(`[recompress] put retry ${i}: ${err.message}; wait ${wait}ms`);
        await sleep(wait);
      }
    }
  }
  throw lastErr;
}

async function main() {
  r2.assertR2Configured();
  const cfg = r2.getR2Config();
  const root = await ensureBackupLayout();
  const manifests = getManifestDir(root);
  const inventoryPath = path.join(manifests, 'inventory.json');
  const inventory = await readJson(inventoryPath, []);
  if (!inventory.length) {
    console.error('Missing inventory.json — run migrate:inventory first');
    process.exit(1);
  }

  const statePath = path.join(getStateDir(root), 'recompress-state.json');
  const state = (await readJson(statePath, { done: {}, failed: {}, urlChanges: [] })) || {
    done: {},
    failed: {},
    urlChanges: [],
  };

  let targets = inventory.filter((a) => a.inDatabase !== false);
  if (folderArg) {
    targets = targets.filter((a) => folderOf(a) === folderArg);
  }
  if (Number.isFinite(limitArg) && limitArg > 0) {
    targets = targets.slice(0, limitArg);
  }

  console.log(`[recompress] dryRun=${dryRun} folder=${folderArg || '*'} targets=${targets.length} concurrency=${CONCURRENCY}`);

  let ok = 0;
  let skipped = 0;
  let failed = 0;
  let bytesIn = 0;
  let bytesOut = 0;

  await mapPool(targets, CONCURRENCY, async (asset) => {
    const id = asset.assetId;
    if (state.done[id]?.newUrl) {
      skipped += 1;
      return;
    }

    const folder = folderOf(asset);
    const policy = policyForFolder(folder);
    const preserveFormat = shouldPreserveFormat(folder);
    const oldKey = oldKeyFor(asset);
    const oldUrl = asset.r2Url || r2.publicUrlForKey(oldKey, cfg.publicBaseUrl);

    try {
      const original = await loadOriginalBuffer(root, asset);
      const originalBytes = original.length;
      const detected = detectImageFormat(original);
      const animated = detected?.format === 'gif' ? isAnimatedGif(original) : false;

      const optimized = await optimizeWithUploadFallback(original, asset, {
        preserveFormat: preserveFormat || animated,
        animated,
        maxEdge: policy.maxEdge,
      });

      // Keep original if not meaningfully smaller
      if (optimized.buffer.length >= originalBytes * 0.98) {
        state.done[id] = {
          skippedReason: 'not_smaller',
          originalBytes,
          optimizedBytes: optimized.buffer.length,
          oldKey,
          newKey: oldKey,
          oldUrl,
          newUrl: oldUrl,
          at: new Date().toISOString(),
        };
        delete state.failed[id];
        skipped += 1;
        console.log(`[recompress] skip ${asset.publicId} (not smaller: ${originalBytes} → ${optimized.buffer.length})`);
        return;
      }

      const newKey = newKeyFor(asset, optimized.ext);
      const newUrl = r2.publicUrlForKey(newKey, cfg.publicBaseUrl);

      if (!dryRun) {
        await putWithRetry(optimized.buffer, {
          key: newKey,
          contentType: optimized.contentType,
        });
        const head = await r2.headObject(newKey);
        if (head.contentLength != null && head.contentLength !== optimized.buffer.length) {
          throw new Error(`size mismatch after put: ${optimized.buffer.length} vs ${head.contentLength}`);
        }
      }

      const entry = {
        originalBytes,
        optimizedBytes: optimized.buffer.length,
        ratioPct: Number((((originalBytes - optimized.buffer.length) / originalBytes) * 100).toFixed(1)),
        oldKey,
        newKey,
        oldUrl,
        newUrl,
        contentType: optimized.contentType,
        via: optimized.via,
        dryRun,
        at: new Date().toISOString(),
      };
      state.done[id] = entry;
      delete state.failed[id];

      if (oldUrl !== newUrl) {
        const existing = state.urlChanges.find((c) => c.oldUrl === oldUrl);
        if (!existing) state.urlChanges.push({ oldUrl, newUrl, assetId: id, publicId: asset.publicId });
      }

      asset.r2Key = newKey;
      asset.r2Url = newUrl;
      asset.format = optimized.ext;
      asset.bytes = optimized.buffer.length;
      asset.status = dryRun ? 'recompress_dry' : 'recompressed';

      ok += 1;
      bytesIn += originalBytes;
      bytesOut += optimized.buffer.length;
      console.log(
        `[recompress] ${dryRun ? 'DRY ' : ''}OK ${asset.publicId} ${originalBytes} → ${optimized.buffer.length} (${entry.ratioPct}%)`,
      );

      if ((ok + skipped) % 10 === 0) {
        await writeJson(statePath, state);
      }
    } catch (err) {
      failed += 1;
      state.failed[id] = { error: err.message, at: new Date().toISOString() };
      console.error(`[recompress] FAIL ${asset.publicId}: ${err.message}`);
    }
  });

  await writeJson(statePath, state);
  if (!dryRun) await writeJson(inventoryPath, inventory);

  // Persist URL change map for DB rewrite
  const urlMap = {};
  for (const c of state.urlChanges || []) {
    urlMap[c.oldUrl] = c.newUrl;
  }
  await writeJson(path.join(manifests, 'recompress-url-map.json'), urlMap);

  const summary = {
    phase: 'recompress-r2',
    finishedAt: new Date().toISOString(),
    dryRun,
    folder: folderArg || null,
    ok,
    skipped,
    failed,
    bytesIn,
    bytesOut,
    savedBytes: bytesIn - bytesOut,
    savedMiB: Number(((bytesIn - bytesOut) / (1024 * 1024)).toFixed(2)),
    urlChanges: (state.urlChanges || []).length,
  };
  await writeJson(path.join(root, 'recompress-summary.json'), summary);
  console.log('[recompress] done', summary);
  if (failed > 0) process.exit(2);
}

main().catch((err) => {
  console.error('[recompress] failed:', err);
  process.exit(1);
});
