#!/usr/bin/env node
/**
 * After manual R2 upload, mark inventory verified and build url-map.json.
 * Optionally --verify to HeadObject every key.
 */
require('dotenv').config();
const path = require('path');
const r2 = require('../../services/storage/r2Client');
const {
  ensureBackupLayout,
  getManifestDir,
  getStateDir,
  readJson,
  writeJson,
} = require('./lib/paths');

const doVerify = process.argv.includes('--verify');

async function main() {
  r2.assertR2Configured();
  const cfg = r2.getR2Config();
  const root = await ensureBackupLayout();
  const manifests = getManifestDir(root);
  const inventoryPath = path.join(manifests, 'inventory.json');
  const inventory = await readJson(inventoryPath, []);
  const r2StatePath = path.join(getStateDir(root), 'r2-migration-state.json');
  const r2State = (await readJson(r2StatePath, { verified: {}, failed: {} })) || {
    verified: {},
    failed: {},
  };

  const urlMap = {};
  let ok = 0;
  let failed = 0;

  for (const asset of inventory) {
    const key =
      asset.r2Key ||
      `migrated/cloudinary/${asset.resourceType || 'image'}/${asset.deliveryType || 'upload'}/${asset.publicId}.${asset.format || 'bin'}`;
    const r2Url = r2.publicUrlForKey(key, cfg.publicBaseUrl);

    if (doVerify) {
      try {
        const head = await r2.headObject(key);
        if (asset.bytes && head.contentLength && Math.abs(head.contentLength - asset.bytes) > 1024) {
          console.warn(`[map] size warn ${key}: local meta ${asset.bytes} r2 ${head.contentLength}`);
        }
      } catch (err) {
        failed += 1;
        r2State.failed[asset.assetId] = { error: err.message, at: new Date().toISOString() };
        console.error(`[map] MISS ${key}: ${err.message}`);
        continue;
      }
    }

    asset.r2Key = key;
    asset.r2Url = r2Url;
    asset.copiedToR2 = true;
    asset.verified = true;
    asset.status = 'verified';
    r2State.verified[asset.assetId] = {
      key,
      r2Url,
      bytes: asset.bytes || null,
      at: new Date().toISOString(),
      manualUpload: true,
    };
    delete r2State.failed[asset.assetId];

    if (asset.secureUrl) urlMap[asset.secureUrl] = r2Url;
    for (const ref of asset.dbRefs || []) {
      if (ref.url) urlMap[ref.url] = r2Url;
    }
    ok += 1;
  }

  await writeJson(inventoryPath, inventory);
  await writeJson(path.join(manifests, 'url-map.json'), urlMap);
  await writeJson(r2StatePath, r2State);
  await writeJson(path.join(root, 'r2-migration-summary.json'), {
    phase: 'migrate-r2-manual',
    finishedAt: new Date().toISOString(),
    ok,
    failed,
    urlMapEntries: Object.keys(urlMap).length,
    verified: doVerify,
    bucket: cfg.bucket,
    publicBaseUrl: cfg.publicBaseUrl,
  });

  console.log(JSON.stringify({ ok, failed, urlMapEntries: Object.keys(urlMap).length, verified: doVerify }, null, 2));
  if (failed > 0) process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
