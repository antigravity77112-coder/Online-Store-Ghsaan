#!/usr/bin/env node
/**
 * Backup + upload a single Cloudinary folder (e.g. brands) from DB inventory to local + R2.
 *
 * Usage:
 *   node src/scripts/migration/migrate-folder.js brands
 */

require('dotenv').config();
const path = require('path');
const fsp = require('fs').promises;
const fs = require('fs');
const axios = require('axios');
const cloudinary = require('cloudinary').v2;
const r2 = require('../../services/storage/r2Client');
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

const folder = (process.argv[2] || '').replace(/^\/+|\/+$/g, '');
if (!folder) {
  console.error('Usage: node src/scripts/migration/migrate-folder.js <folder>');
  process.exit(1);
}

const MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

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
  for (let attempt = 1; attempt <= 6; attempt++) {
    const url = urls[(attempt - 1) % urls.length];
    try {
      const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 180000,
        maxRedirects: 5,
        validateStatus: (s) => s === 200,
      });
      return Buffer.from(res.data);
    } catch (err) {
      lastErr = err;
      const wait = Math.min(30000, 1500 * 2 ** (attempt - 1));
      console.warn(`[folder] download retry ${attempt}: ${err.message}; wait ${wait}ms`);
      await sleep(wait);
    }
  }
  throw lastErr;
}

async function putWithRetry(body, options, attempts = 5) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await r2.putObject(body, options);
    } catch (err) {
      lastErr = err;
      if (i < attempts) {
        await sleep(Math.min(20000, 1000 * 2 ** (i - 1)));
      }
    }
  }
  throw lastErr;
}

async function main() {
  r2.assertR2Configured();
  const root = await ensureBackupLayout();
  const manifests = getManifestDir(root);
  const inventoryPath = path.join(manifests, 'inventory.json');
  const inventory = await readJson(inventoryPath, []);
  const backupStatePath = path.join(getStateDir(root), 'backup-state.json');
  const r2StatePath = path.join(getStateDir(root), 'r2-migration-state.json');
  const backupState = (await readJson(backupStatePath, { verified: {}, failed: {} })) || {
    verified: {},
    failed: {},
  };
  const r2State = (await readJson(r2StatePath, { verified: {}, failed: {} })) || {
    verified: {},
    failed: {},
  };

  const prefix = `${folder}/`;
  const targets = inventory.filter(
    (a) =>
      a.publicId === folder ||
      String(a.publicId || '').startsWith(prefix) ||
      a.folder === folder,
  );

  console.log(`[folder] folder=${folder} targets=${targets.length}`);
  if (!targets.length) {
    console.error('No inventory assets for that folder. Re-run inventory if needed.');
    process.exit(1);
  }

  const cfg = r2.getR2Config();
  let backedUp = 0;
  let uploaded = 0;
  let failed = 0;

  for (const asset of targets) {
    const id = asset.assetId;
    const localPath = path.join(root, asset.backupPath);
    try {
      let body;
      if (fs.existsSync(localPath) && backupState.verified[id]?.sha256) {
        body = await fsp.readFile(localPath);
      } else {
        body = await downloadAsset(asset);
        await fsp.mkdir(path.dirname(localPath), { recursive: true });
        await fsp.writeFile(localPath, body);
        const hash = sha256Buffer(body);
        backupState.verified[id] = {
          sha256: hash,
          bytes: body.length,
          path: asset.backupPath,
          at: new Date().toISOString(),
        };
        delete backupState.failed[id];
        await writeChecksumLine(path.join(root, 'checksums.sha256'), asset.backupPath, hash);
        asset.backedUp = true;
        asset.sha256 = hash;
        backedUp += 1;
        console.log(`[folder] backed up ${asset.publicId} (${body.length} bytes)`);
      }

      if (r2State.verified[id]?.r2Url) {
        console.log(`[folder] already on R2 ${asset.publicId}`);
        continue;
      }

      const key = asset.r2Key || `migrated/cloudinary/image/upload/${asset.publicId}.${asset.format || 'png'}`;
      await putWithRetry(body, {
        key,
        contentType: MIME[String(asset.format || 'png').toLowerCase()] || 'application/octet-stream',
      });
      const head = await r2.headObject(key);
      if (head.contentLength != null && head.contentLength !== body.length) {
        throw new Error(`size mismatch ${body.length} vs ${head.contentLength}`);
      }
      const r2Url = r2.publicUrlForKey(key, cfg.publicBaseUrl);
      r2State.verified[id] = { key, r2Url, bytes: body.length, at: new Date().toISOString() };
      delete r2State.failed[id];
      asset.copiedToR2 = true;
      asset.verified = true;
      asset.r2Key = key;
      asset.r2Url = r2Url;
      asset.status = 'verified';
      uploaded += 1;
      console.log(`[folder] uploaded ${asset.publicId} -> ${r2Url}`);
    } catch (err) {
      failed += 1;
      backupState.failed[id] = { error: err.message, at: new Date().toISOString() };
      r2State.failed[id] = { error: err.message, at: new Date().toISOString() };
      console.error(`[folder] FAIL ${asset.publicId}: ${err.message}`);
    }
  }

  // refresh url-map for these assets
  const urlMap = (await readJson(path.join(manifests, 'url-map.json'), {})) || {};
  for (const asset of targets) {
    if (!asset.r2Url) continue;
    if (asset.secureUrl) urlMap[asset.secureUrl] = asset.r2Url;
    for (const ref of asset.dbRefs || []) {
      if (ref.url) urlMap[ref.url] = asset.r2Url;
    }
  }

  await writeJson(backupStatePath, backupState);
  await writeJson(r2StatePath, r2State);
  await writeJson(inventoryPath, inventory);
  await writeJson(path.join(manifests, 'url-map.json'), urlMap);

  // list local folder
  const localDir = path.join(root, 'files', 'image', 'upload', folder);
  const localFiles = fs.existsSync(localDir) ? fs.readdirSync(localDir) : [];

  console.log(
    JSON.stringify(
      {
        folder,
        targets: targets.length,
        newlyBackedUp: backedUp,
        newlyUploaded: uploaded,
        failed,
        localFiles: localFiles.length,
        localDir,
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
