/**
 * Normalize Cloudinary URLs for inventory matching and DB rewrite.
 */

const CLOUDINARY_HOST = /res\.cloudinary\.com/i;

function isCloudinaryUrl(url) {
  return typeof url === 'string' && CLOUDINARY_HOST.test(url) && url.includes('/upload/');
}

/**
 * Strip delivery transforms → canonical versioned path URL when possible.
 * @param {string} url
 */
function stripCloudinaryTransforms(url) {
  if (!url || typeof url !== 'string') return url;
  const match = url.match(
    /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/(?:image|video|raw)\/upload\/)(?:[^/]+\/)*(v\d+\/.+)$/i,
  );
  if (match) return `${match[1]}${match[2]}`;
  return url;
}

/**
 * Extract public_id (without extension) from a Cloudinary delivery URL.
 * @param {string} url
 * @returns {string|null}
 */
function extractPublicId(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const match = url.match(/\/upload\/(?:[^/]+\/)*v\d+\/(.+?)(?:\.[^.]+)?$/);
    if (match) return match[1];
    const fallback = url.match(/\/upload\/(.+?)(?:\.[^.]+)?$/);
    if (fallback) {
      // May include transforms — strip transform-looking segments
      const parts = fallback[1].split('/');
      while (parts.length && /^[a-z0-9_]+(?:,[a-z0-9_]+)*$/i.test(parts[0]) && !parts[0].startsWith('v')) {
        // Keep if it looks like a folder name without commas
        if (!parts[0].includes(',') && !/^[a-z]_/.test(parts[0])) break;
        parts.shift();
      }
      if (parts[0] && /^v\d+$/.test(parts[0])) parts.shift();
      return parts.join('/').replace(/\.[^.]+$/, '') || null;
    }
  } catch (_) {
    /* ignore */
  }
  return null;
}

/**
 * Extract resource_type from URL path.
 * @param {string} url
 */
function extractResourceType(url) {
  const m = String(url || '').match(/res\.cloudinary\.com\/[^/]+\/(image|video|raw)\//i);
  return m ? m[1].toLowerCase() : 'image';
}

/**
 * Stable asset id for manifests.
 */
function makeAssetId({ resourceType = 'image', deliveryType = 'upload', publicId }) {
  return `${resourceType}:${deliveryType}:${publicId}`;
}

/**
 * Build R2 object key for a migrated Cloudinary asset.
 */
function buildMigratedR2Key({ resourceType = 'image', deliveryType = 'upload', publicId, format }) {
  const fmt = String(format || 'bin').replace(/^\./, '');
  const pid = String(publicId || '').replace(/^\/+/, '');
  return `migrated/cloudinary/${resourceType}/${deliveryType}/${pid}.${fmt}`;
}

/**
 * Relative backup path under MIGRATION_BACKUP_DIR/files
 */
function buildBackupRelativePath({ resourceType = 'image', deliveryType = 'upload', publicId, format }) {
  const fmt = String(format || 'bin').replace(/^\./, '');
  const pid = String(publicId || '').replace(/^\/+/, '');
  return `files/${resourceType}/${deliveryType}/${pid}.${fmt}`;
}

module.exports = {
  isCloudinaryUrl,
  stripCloudinaryTransforms,
  extractPublicId,
  extractResourceType,
  makeAssetId,
  buildMigratedR2Key,
  buildBackupRelativePath,
};
