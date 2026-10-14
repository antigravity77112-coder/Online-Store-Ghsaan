/**
 * Storage facade for GISAah image uploads.
 *
 * STORAGE_PROVIDER:
 *   - cloudinary (default): upload + deliver from Cloudinary (current behavior + validation)
 *   - r2: compress via Cloudinary, store optimized bytes on R2, KEEP Cloudinary copy (option B)
 *
 * Fail-closed: when provider is r2, R2 failures are returned to the client (no silent Cloudinary-only fallback).
 */

const { validateImageBuffer } = require('./imageValidation');
const { compressWithCloudinary, uploadToCloudinary } = require('./cloudinaryOptimize');
const r2 = require('./r2Client');
const cloudinaryClient = require('../../utils/cloudinaryClient');

function getStorageProvider() {
  const raw = (process.env.STORAGE_PROVIDER || 'cloudinary').toLowerCase().trim();
  if (raw === 'r2' || raw === 'cloudflare' || raw === 'cloudflare-r2') return 'r2';
  return 'cloudinary';
}

/**
 * Dimension / quality policy by asset category (folder).
 * @param {string} folder
 */
function policyForFolder(folder) {
  const f = String(folder || 'uploads').toLowerCase();
  if (f.includes('banner')) {
    return { maxEdge: parseInt(process.env.BANNER_IMAGE_MAX_EDGE, 10) || 2400, preserveHint: false };
  }
  if (f.includes('brand') || f.includes('categor') || f.includes('site-asset') || f.includes('scent')) {
    return { maxEdge: parseInt(process.env.LOGO_IMAGE_MAX_EDGE, 10) || 1200, preserveHint: true };
  }
  return { maxEdge: parseInt(process.env.PRODUCT_IMAGE_MAX_EDGE, 10) || 2000, preserveHint: false };
}

/**
 * Process and upload an image buffer.
 * Returns a delivery URL string for backward compatibility with existing controllers.
 *
 * @param {Buffer} buffer
 * @param {string|object} folderOrOptions
 * @returns {Promise<string>} Public delivery URL (R2 when provider=r2, else Cloudinary)
 */
async function processAndUpload(buffer, folderOrOptions = 'uploads') {
  const options = typeof folderOrOptions === 'string'
    ? { folder: folderOrOptions }
    : { folder: 'uploads', ...folderOrOptions };

  const folder = options.folder || 'uploads';
  const policy = policyForFolder(folder);
  const preserveFormat = Boolean(options.preserveFormat || options.format === 'png');

  const meta = validateImageBuffer(buffer, {
    declaredMime: options.declaredMime,
  });

  const provider = getStorageProvider();

  if (provider === 'cloudinary') {
    // Existing path: store on Cloudinary; storefront applies f_auto/q_auto on delivery.
    const result = await uploadToCloudinary(buffer, {
      folder,
      preserveFormat,
      format: options.format,
      publicId: options.publicId,
      overwrite: options.overwrite,
    });
    return result.secure_url;
  }

  // provider === 'r2': Cloudinary compress + keep copy, then PutObject to R2
  r2.assertR2Configured();

  const compressed = await compressWithCloudinary(buffer, {
    folder,
    preserveFormat: preserveFormat || meta.animated,
    format: options.format,
    animated: meta.animated,
    maxEdge: options.maxEdge || policy.maxEdge,
  });

  const key = r2.buildUploadKey(folder, compressed.optimized.ext);
  let putResult;
  try {
    putResult = await r2.putObject(compressed.optimized.buffer, {
      key,
      contentType: compressed.optimized.contentType,
    });
  } catch (err) {
    const wrapped = new Error(`R2 upload failed: ${err.message}`);
    wrapped.statusCode = 502;
    wrapped.code = 'R2_UPLOAD_FAILED';
    wrapped.cause = err;
    // Cloudinary copy already exists (kept by design). Surface R2 failure — fail closed.
    throw wrapped;
  }

  // Verify object exists
  try {
    const head = await r2.headObject(key);
    if (head.contentLength != null && head.contentLength !== compressed.optimized.bytes) {
      console.warn(
        `[storage] R2 size mismatch for ${key}: expected ${compressed.optimized.bytes}, got ${head.contentLength}`,
      );
    }
  } catch (err) {
    const wrapped = new Error(`R2 verification failed after upload: ${err.message}`);
    wrapped.statusCode = 502;
    wrapped.code = 'R2_VERIFY_FAILED';
    throw wrapped;
  }

  if (process.env.STORAGE_LOG_UPLOADS === '1') {
    console.info('[storage] upload ok', {
      provider: 'r2',
      folder,
      r2Url: putResult.url,
      cloudinaryUrl: compressed.cloudinary.secureUrl,
      originalBytes: buffer.length,
      optimizedBytes: compressed.optimized.bytes,
      ratio: buffer.length
        ? (((buffer.length - compressed.optimized.bytes) / buffer.length) * 100).toFixed(1) + '%'
        : 'n/a',
    });
  }

  return putResult.url;
}

/**
 * Provider-aware delete. Never deletes Cloudinary assets that are still needed for
 * migration/rollback unless the URL is clearly a Cloudinary delivery URL and caller
 * requests deletion (existing product gallery cleanup).
 *
 * @param {string} url
 */
async function deleteByUrl(url) {
  if (!url || typeof url !== 'string') {
    return { result: 'noop' };
  }

  if (r2.isR2PublicUrl(url)) {
    const key = r2.extractR2KeyFromUrl(url);
    if (!key) return { result: 'not_r2_url' };
    try {
      await r2.deleteObject(key);
      return { result: 'ok', provider: 'r2', key };
    } catch (err) {
      console.error(`[storage] R2 delete failed for key="${key}":`, err.message);
      return { result: 'error', provider: 'r2', message: err.message };
    }
  }

  // Cloudinary (and non-matching URLs)
  return cloudinaryClient.deleteByUrl(url);
}

/** Thin aliases matching legacy cloudinaryClient surface */
const uploadBuffer = processAndUpload;

module.exports = {
  processAndUpload,
  uploadBuffer,
  deleteByUrl,
  getStorageProvider,
  policyForFolder,
  validateImageBuffer,
};
