/**
 * Cloudinary-based compression for new uploads.
 * Uploads to Cloudinary (kept permanently — option B), then downloads an
 * optimized derivative for storage on R2 when STORAGE_PROVIDER=r2.
 */

const cloudinary = require('cloudinary').v2;
const https = require('https');
const http = require('http');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const DEFAULT_MAX_EDGE = parseInt(process.env.PRODUCT_IMAGE_MAX_EDGE, 10) || 2000;
const QUALITY = process.env.CLOUDINARY_UPLOAD_QUALITY || 'auto:good';

/**
 * @param {Buffer} buffer
 * @param {object} options
 * @returns {Promise<object>} Full Cloudinary upload result
 */
function uploadToCloudinary(buffer, options = {}) {
  const folder = options.folder || 'uploads';
  const uploadOptions = {
    folder,
    resource_type: 'image',
  };

  if (options.preserveFormat || options.format === 'png') {
    uploadOptions.format = options.format && options.format !== 'png' ? options.format : 'png';
  } else if (options.format) {
    uploadOptions.format = options.format;
  }

  if (options.publicId) {
    uploadOptions.public_id = options.publicId;
    uploadOptions.overwrite = options.overwrite !== false;
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
}

/**
 * Build a delivery URL for an optimized derivative without mutating the stored original.
 * @param {object} uploadResult - Cloudinary upload response
 * @param {{ preserveFormat?: boolean, animated?: boolean, maxEdge?: number, policy?: string }} options
 */
function buildOptimizedDeliveryUrl(uploadResult, options = {}) {
  const publicId = uploadResult.public_id;
  const resourceType = uploadResult.resource_type || 'image';
  const maxEdge = options.maxEdge || DEFAULT_MAX_EDGE;

  /** @type {Record<string, unknown>[]} */
  const transformation = [];

  if (options.animated) {
    // Keep animation; mild quality only
    transformation.push({ quality: QUALITY });
  } else if (options.preserveFormat) {
    transformation.push({
      width: maxEdge,
      height: maxEdge,
      crop: 'limit',
      quality: QUALITY,
    });
  } else {
    transformation.push({
      width: maxEdge,
      height: maxEdge,
      crop: 'limit',
      fetch_format: 'webp',
      quality: QUALITY,
    });
  }

  return cloudinary.url(publicId, {
    secure: true,
    resource_type: resourceType,
    type: uploadResult.type || 'upload',
    transformation,
  });
}

/**
 * Download bytes from an HTTPS/HTTP URL into a Buffer.
 * @param {string} url
 * @param {number} [redirectsLeft]
 * @returns {Promise<Buffer>}
 */
function downloadUrl(url, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 60000 }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (redirectsLeft <= 0) {
          reject(new Error('Too many redirects downloading optimized image'));
          return;
        }
        res.resume();
        downloadUrl(res.headers.location, redirectsLeft - 1).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`Failed to download optimized image: HTTP ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout downloading optimized image from Cloudinary'));
    });
  });
}

/**
 * Compress via Cloudinary and return original Cloudinary result + optimized buffer for R2.
 * Cloudinary asset is ALWAYS kept (option B).
 *
 * @param {Buffer} buffer
 * @param {{ folder?: string, preserveFormat?: boolean, format?: string, animated?: boolean, maxEdge?: number, policy?: string }} options
 */
async function compressWithCloudinary(buffer, options = {}) {
  const uploadResult = await uploadToCloudinary(buffer, options);
  const optimizedUrl = buildOptimizedDeliveryUrl(uploadResult, options);
  const optimizedBuffer = await downloadUrl(optimizedUrl);

  // If derivative is larger than original upload bytes, prefer original bytes for R2
  const useOptimized = optimizedBuffer.length > 0 && optimizedBuffer.length <= buffer.length * 1.05
    ? optimizedBuffer
    : await downloadUrl(uploadResult.secure_url);

  const contentType = options.preserveFormat || options.animated
    ? (uploadResult.format === 'png'
      ? 'image/png'
      : uploadResult.format === 'gif'
        ? 'image/gif'
        : uploadResult.format === 'webp'
          ? 'image/webp'
          : 'image/jpeg')
    : (useOptimized === optimizedBuffer ? 'image/webp' : `image/${uploadResult.format || 'jpeg'}`);

  const ext = options.preserveFormat || options.animated
    ? (uploadResult.format || 'png')
    : (useOptimized === optimizedBuffer ? 'webp' : (uploadResult.format || 'jpg'));

  return {
    cloudinary: {
      publicId: uploadResult.public_id,
      secureUrl: uploadResult.secure_url,
      format: uploadResult.format,
      bytes: uploadResult.bytes,
      width: uploadResult.width,
      height: uploadResult.height,
      resourceType: uploadResult.resource_type,
      version: uploadResult.version,
    },
    optimized: {
      buffer: useOptimized,
      contentType,
      ext,
      bytes: useOptimized.length,
      deliveryUrl: optimizedUrl,
    },
  };
}

module.exports = {
  uploadToCloudinary,
  buildOptimizedDeliveryUrl,
  downloadUrl,
  compressWithCloudinary,
  DEFAULT_MAX_EDGE,
};
