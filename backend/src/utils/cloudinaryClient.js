const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file buffer to Cloudinary.
 * @param {Buffer} buffer
 * @param {string|object} folderOrOptions - folder name or { folder, format, preserveFormat }
 * @returns {Promise<string>} secure URL
 */
function uploadBuffer(buffer, folderOrOptions = 'uploads') {
  const options = typeof folderOrOptions === 'string'
    ? { folder: folderOrOptions }
    : { folder: 'uploads', ...folderOrOptions };

  const uploadOptions = {
    folder: options.folder,
    resource_type: 'image',
    quality: 'auto',
  };

  if (options.preserveFormat || options.format === 'png') {
    uploadOptions.format = 'png';
  } else if (options.format) {
    uploadOptions.format = options.format;
  } else {
    uploadOptions.format = 'jpg';
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
}

/**
 * Upload a local file path to Cloudinary (preserves PNG transparency).
 * @param {string} filePath
 * @param {{ folder?: string, publicId?: string }} options
 */
function uploadFile(filePath, options = {}) {
  const { folder = 'site-assets', publicId } = options;
  return cloudinary.uploader.upload(filePath, {
    folder,
    public_id: publicId,
    resource_type: 'image',
    format: 'png',
    overwrite: true,
  });
}

/**
 * Extract Cloudinary public_id from a secure URL.
 * Handles URLs with or without transformation strings.
 * e.g. https://res.cloudinary.com/demo/image/upload/v1234/products/abc.jpg → products/abc
 *      https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1234/products/abc.jpg → products/abc
 */
function extractPublicId(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    // Match: /upload/ then skip optional transforms, then v\d+/, then capture until last dot
    const match = url.match(/\/upload\/(?:[^/]+\/)*v\d+\/(.+?)(?:\.[^.]+)?$/);
    if (match) return match[1];
    // Fallback for URLs without version token
    const fallback = url.match(/\/upload\/(.+?)(?:\.[^.]+)?$/);
    if (fallback) return fallback[1];
  } catch (_) { /* ignore */ }
  return null;
}

/**
 * Delete an image from Cloudinary by its full URL.
 * Silently resolves (does not throw) if the URL is not a Cloudinary URL or deletion fails.
 * @param {string} url - The Cloudinary secure_url of the image to delete
 * @returns {Promise<object>} Cloudinary destroy result
 */
async function deleteByUrl(url) {
  const publicId = extractPublicId(url);
  if (!publicId) return { result: 'not_cloudinary_url' };
  try {
    return await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (err) {
    console.error(`[Cloudinary] deleteByUrl failed for publicId="${publicId}":`, err.message);
    return { result: 'error', message: err.message };
  }
}

module.exports = { uploadBuffer, uploadFile, deleteByUrl };
