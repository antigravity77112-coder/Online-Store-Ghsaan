/**
 * Cloudflare R2 client (S3-compatible).
 * Credentials stay server-side only.
 */

const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} = require('@aws-sdk/client-s3');
const crypto = require('crypto');

let cachedClient = null;

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const endpoint =
    process.env.R2_ENDPOINT ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : null);
  const publicBaseUrl = (process.env.R2_PUBLIC_BASE_URL || '').replace(/\/$/, '');

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    endpoint,
    publicBaseUrl,
  };
}

function assertR2Configured() {
  const cfg = getR2Config();
  const missing = [];
  if (!cfg.accessKeyId) missing.push('R2_ACCESS_KEY_ID');
  if (!cfg.secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');
  if (!cfg.bucket) missing.push('R2_BUCKET');
  if (!cfg.endpoint) missing.push('R2_ENDPOINT or R2_ACCOUNT_ID');
  if (!cfg.publicBaseUrl) missing.push('R2_PUBLIC_BASE_URL');
  if (missing.length) {
    const err = new Error(`R2 is not configured. Missing: ${missing.join(', ')}`);
    err.statusCode = 503;
    err.code = 'R2_NOT_CONFIGURED';
    throw err;
  }
  return cfg;
}

function getR2Client() {
  const cfg = assertR2Configured();
  if (cachedClient) return { client: cachedClient, cfg };

  cachedClient = new S3Client({
    region: 'auto',
    endpoint: cfg.endpoint,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });

  return { client: cachedClient, cfg };
}

/**
 * Build a collision-resistant object key for a new upload.
 * @param {string} folder
 * @param {string} ext
 */
function buildUploadKey(folder, ext) {
  const safeFolder = String(folder || 'uploads')
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\.\./g, '');
  const id = crypto.randomUUID();
  const safeExt = String(ext || 'bin').replace(/^\./, '').toLowerCase();
  return `uploads/${safeFolder}/${id}.${safeExt}`;
}

/**
 * Build R2 key for a migrated Cloudinary asset.
 * @param {{ resourceType: string, deliveryType: string, publicId: string, format: string }} asset
 */
function buildMigratedKey(asset) {
  const resourceType = asset.resourceType || 'image';
  const deliveryType = asset.deliveryType || asset.type || 'upload';
  const publicId = String(asset.publicId || '').replace(/^\/+/, '');
  const format = String(asset.format || 'bin').replace(/^\./, '');
  return `migrated/cloudinary/${resourceType}/${deliveryType}/${publicId}.${format}`;
}

function publicUrlForKey(key, publicBaseUrl) {
  const base = (publicBaseUrl || getR2Config().publicBaseUrl || '').replace(/\/$/, '');
  const path = String(key || '').replace(/^\/+/, '');
  return `${base}/${path}`;
}

/**
 * @param {Buffer} body
 * @param {{ key: string, contentType: string, cacheControl?: string }} options
 */
async function putObject(body, options) {
  const { client, cfg } = getR2Client();
  const key = options.key;
  await client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: body,
      ContentType: options.contentType || 'application/octet-stream',
      CacheControl: options.cacheControl || 'public, max-age=31536000, immutable',
    }),
  );
  return {
    key,
    url: publicUrlForKey(key, cfg.publicBaseUrl),
    bucket: cfg.bucket,
    bytes: Buffer.isBuffer(body) ? body.length : undefined,
  };
}

async function headObject(key) {
  const { client, cfg } = getR2Client();
  const result = await client.send(
    new HeadObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
    }),
  );
  return {
    key,
    contentLength: result.ContentLength,
    contentType: result.ContentType,
    etag: result.ETag,
  };
}

/**
 * Download object body from R2 into a Buffer.
 * @param {string} key
 * @returns {Promise<{ key: string, body: Buffer, contentType?: string, contentLength?: number }>}
 */
async function getObject(key) {
  const { client, cfg } = getR2Client();
  const result = await client.send(
    new GetObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
    }),
  );
  const chunks = [];
  for await (const chunk of result.Body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const body = Buffer.concat(chunks);
  return {
    key,
    body,
    contentType: result.ContentType,
    contentLength: result.ContentLength != null ? result.ContentLength : body.length,
  };
}

async function deleteObject(key) {
  const { client, cfg } = getR2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
    }),
  );
  return { key, bucket: cfg.bucket };
}

/**
 * Extract R2 object key from a public URL when it matches R2_PUBLIC_BASE_URL.
 * @param {string} url
 */
function extractR2KeyFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const base = (process.env.R2_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  if (!base) return null;
  if (!url.startsWith(base + '/') && url !== base) return null;
  return url.slice(base.length).replace(/^\//, '') || null;
}

function isR2PublicUrl(url) {
  return Boolean(extractR2KeyFromUrl(url));
}

function resetR2ClientForTests() {
  cachedClient = null;
}

module.exports = {
  getR2Config,
  assertR2Configured,
  getR2Client,
  buildUploadKey,
  buildMigratedKey,
  publicUrlForKey,
  putObject,
  headObject,
  getObject,
  deleteObject,
  extractR2KeyFromUrl,
  isR2PublicUrl,
  resetR2ClientForTests,
};
