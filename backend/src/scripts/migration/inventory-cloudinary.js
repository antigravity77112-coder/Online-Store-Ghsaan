#!/usr/bin/env node
/**
 * Phase A: Build Cloudinary inventory.
 *
 * Default: DB-only — only assets referenced in Postgres image fields.
 * Optional: --all-cloudinary to enumerate the entire Cloudinary account.
 *
 * Usage:
 *   node src/scripts/migration/inventory-cloudinary.js
 *   node src/scripts/migration/inventory-cloudinary.js --all-cloudinary
 *
 * Requires CLOUDINARY_* and DATABASE_URL. Writes to MIGRATION_BACKUP_DIR.
 */

require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fsp = require('fs').promises;
const { collectDbImageRefs } = require('./lib/dbImageRefs');
const {
  makeAssetId,
  buildMigratedR2Key,
  buildBackupRelativePath,
  extractPublicId,
  extractResourceType,
  isCloudinaryUrl,
} = require('./lib/urlNormalize');
const {
  getBackupRoot,
  getManifestDir,
  ensureBackupLayout,
  writeJson,
  toCsv,
} = require('./lib/paths');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const RESOURCE_TYPES = ['image', 'raw', 'video'];
const MAX_RESULTS = 500;
const allCloudinary = process.argv.includes('--all-cloudinary');
const CONCURRENCY = parseInt(process.env.MIGRATION_CONCURRENCY, 10) || 4;

function assertCloudinaryEnv() {
  const missing = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'].filter(
    (k) => !process.env[k],
  );
  if (missing.length) {
    console.error(`Missing env: ${missing.join(', ')}`);
    process.exit(1);
  }
  console.log(`[inventory] Cloudinary cloud: ${process.env.CLOUDINARY_CLOUD_NAME}`);
  console.log(`[inventory] mode: ${allCloudinary ? 'all-cloudinary' : 'db-only'}`);
}

async function listAllResources(resourceType) {
  const assets = [];
  let nextCursor;
  let page = 0;
  do {
    page += 1;
    const params = {
      resource_type: resourceType,
      type: 'upload',
      max_results: MAX_RESULTS,
      direction: 'asc',
    };
    if (nextCursor) params.next_cursor = nextCursor;

    let result;
    try {
      result = await cloudinary.api.resources(params);
    } catch (err) {
      if (String(err.message || err).includes('Rate Limit')) {
        console.warn(`[inventory] rate limited on ${resourceType} page ${page}; waiting 60s…`);
        await new Promise((r) => setTimeout(r, 60000));
        result = await cloudinary.api.resources(params);
      } else {
        console.warn(`[inventory] ${resourceType} list failed: ${err.message}`);
        break;
      }
    }

    const batch = result.resources || [];
    assets.push(...batch);
    nextCursor = result.next_cursor;
    console.log(`[inventory] ${resourceType}: page ${page}, +${batch.length} (total ${assets.length})`);
  } while (nextCursor);

  return assets;
}

function toManifestAsset(resource, extra = {}) {
  const resourceType = resource.resource_type || extra.resourceType || 'image';
  const deliveryType = resource.type || 'upload';
  const publicId = resource.public_id;
  const format = resource.format || extra.format || 'bin';
  return {
    assetId: makeAssetId({ resourceType, deliveryType, publicId }),
    publicId,
    resourceType,
    deliveryType,
    format,
    bytes: resource.bytes || 0,
    width: resource.width || null,
    height: resource.height || null,
    version: resource.version || null,
    folder: resource.folder || (publicId.includes('/') ? publicId.split('/').slice(0, -1).join('/') : ''),
    createdAt: resource.created_at || null,
    secureUrl: resource.secure_url || extra.secureUrl || null,
    inDatabase: Boolean(extra.inDatabase),
    dbRefs: extra.dbRefs || [],
    backedUp: false,
    copiedToR2: false,
    r2Key: buildMigratedR2Key({ resourceType, deliveryType, publicId, format }),
    r2Url: null,
    backupPath: buildBackupRelativePath({ resourceType, deliveryType, publicId, format }),
    verified: false,
    error: null,
    status: 'inventoried',
  };
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

/**
 * DB-first inventory: unique Cloudinary public_ids from Postgres, then fetch each resource.
 */
async function inventoryFromDatabase() {
  console.log('[inventory] collecting DB image references…');
  const dbRefs = await collectDbImageRefs();
  const cloudinaryRefs = dbRefs.filter((r) => r.isCloudinary && r.publicId);

  /** @type {Map<string, { publicId: string, resourceType: string, refs: object[], sampleUrl: string }>} */
  const byKey = new Map();
  for (const ref of cloudinaryRefs) {
    const resourceType = ref.resourceType || 'image';
    const key = `${resourceType}:${ref.publicId}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        publicId: ref.publicId,
        resourceType,
        refs: [],
        sampleUrl: ref.url,
      });
    }
    byKey.get(key).refs.push({
      table: ref.table,
      id: ref.id,
      field: ref.field,
      url: ref.url,
    });
  }

  console.log(
    `[inventory] DB refs: ${dbRefs.length} total, ${cloudinaryRefs.length} Cloudinary, ${byKey.size} unique assets`,
  );

  const unique = [...byKey.values()];
  const inventory = [];
  const unmatchedDb = [];
  let fetched = 0;
  let missing = 0;

  await mapPool(unique, CONCURRENCY, async (entry) => {
    try {
      let resource;
      try {
        resource = await cloudinary.api.resource(entry.publicId, {
          resource_type: entry.resourceType,
          type: 'upload',
        });
      } catch (err) {
        // Retry once as image if resource type guess was wrong
        if (entry.resourceType !== 'image') {
          resource = await cloudinary.api.resource(entry.publicId, {
            resource_type: 'image',
            type: 'upload',
          });
        } else {
          throw err;
        }
      }
      const asset = toManifestAsset(resource, {
        inDatabase: true,
        dbRefs: entry.refs,
      });
      inventory.push(asset);
      fetched += 1;
      if (fetched % 25 === 0) {
        console.log(`[inventory] fetched ${fetched}/${unique.length}`);
      }
    } catch (err) {
      missing += 1;
      for (const ref of entry.refs) {
        unmatchedDb.push({
          ...ref,
          publicId: entry.publicId,
          error: err.message,
        });
      }
      console.warn(`[inventory] missing in Cloudinary: ${entry.publicId} (${err.message})`);
    }
  });

  const nonCloudinaryDb = dbRefs.filter((r) => !r.isCloudinary);

  return {
    inventory,
    dbRefs,
    unmatchedDb,
    orphans: [],
    nonCloudinaryDb,
    stats: { fetched, missing, unique: unique.length },
  };
}

async function inventoryFullAccountThenReconcile() {
  const allResources = [];
  for (const rt of RESOURCE_TYPES) {
    const list = await listAllResources(rt);
    allResources.push(...list);
  }

  const inventory = allResources.map((r) => toManifestAsset(r));
  const byPublicId = new Map();
  for (const asset of inventory) {
    byPublicId.set(`${asset.resourceType}:${asset.publicId}`, asset);
    byPublicId.set(asset.publicId, asset);
  }

  console.log('[inventory] collecting DB image references…');
  const dbRefs = await collectDbImageRefs();
  const unmatchedDb = [];

  for (const ref of dbRefs) {
    if (!ref.isCloudinary) continue;
    const key = ref.publicId;
    let asset = byPublicId.get(`image:${key}`) || byPublicId.get(key);
    if (!asset && key) asset = inventory.find((a) => a.publicId === key);
    if (asset) {
      asset.inDatabase = true;
      asset.dbRefs.push({
        table: ref.table,
        id: ref.id,
        field: ref.field,
        url: ref.url,
      });
    } else {
      unmatchedDb.push(ref);
    }
  }

  return {
    inventory,
    dbRefs,
    unmatchedDb,
    orphans: inventory.filter((a) => !a.inDatabase),
    nonCloudinaryDb: dbRefs.filter((r) => !r.isCloudinary),
    stats: {},
  };
}

async function main() {
  assertCloudinaryEnv();
  const root = await ensureBackupLayout();
  const manifests = getManifestDir(root);
  console.log(`[inventory] backup root: ${root}`);

  const result = allCloudinary
    ? await inventoryFullAccountThenReconcile()
    : await inventoryFromDatabase();

  const { inventory, dbRefs, unmatchedDb, orphans, nonCloudinaryDb } = result;
  const totalBytes = inventory.reduce((s, a) => s + (a.bytes || 0), 0);

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: allCloudinary ? 'all-cloudinary' : 'db-only',
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    assetCount: inventory.length,
    totalBytes,
    totalBytesMiB: Number((totalBytes / (1024 * 1024)).toFixed(2)),
    estimatedBackupMiB: Number(((totalBytes * 1.1) / (1024 * 1024)).toFixed(2)),
    inDatabaseCount: inventory.filter((a) => a.inDatabase).length,
    orphanCloudinaryCount: orphans.length,
    dbRefCount: dbRefs.length,
    cloudinaryDbRefCount: dbRefs.filter((r) => r.isCloudinary).length,
    unmatchedDbUrlCount: unmatchedDb.length,
    nonCloudinaryDbRefCount: nonCloudinaryDb.length,
    resourceTypeCounts: RESOURCE_TYPES.reduce((acc, rt) => {
      acc[rt] = inventory.filter((a) => a.resourceType === rt).length;
      return acc;
    }, {}),
  };

  await writeJson(path.join(manifests, 'inventory.json'), inventory);
  await fsp.writeFile(
    path.join(manifests, 'inventory.csv'),
    toCsv(inventory, [
      'assetId',
      'publicId',
      'resourceType',
      'deliveryType',
      'format',
      'bytes',
      'width',
      'height',
      'version',
      'folder',
      'secureUrl',
      'inDatabase',
      'r2Key',
      'backupPath',
      'status',
    ]),
    'utf8',
  );
  await writeJson(path.join(manifests, 'db-refs.json'), dbRefs);
  await writeJson(path.join(manifests, 'unmatched-db-urls.json'), unmatchedDb);
  await writeJson(path.join(manifests, 'non-cloudinary-db-urls.json'), nonCloudinaryDb);
  await writeJson(path.join(manifests, 'orphan-cloudinary.json'), orphans);
  await writeJson(path.join(root, 'summary.json'), summary);

  console.log('[inventory] done');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nNext: npm run migrate:backup  (~${summary.estimatedBackupMiB} MiB)`);
}

main().catch((err) => {
  console.error('[inventory] failed:', err);
  process.exit(1);
});
