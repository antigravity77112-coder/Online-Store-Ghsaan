/**
 * Magic-byte image validation and upload policy helpers.
 * Validates actual file contents, not just declared MIME / extension.
 */

const MAX_DECODED_PIXELS = parseInt(process.env.MAX_IMAGE_PIXELS, 10) || 40_000_000;
const MAX_EDGE = parseInt(process.env.MAX_IMAGE_EDGE, 10) || 8000;

/** @type {Record<string, { mime: string, ext: string }>} */
const SIGNATURES = {
  jpeg: { mime: 'image/jpeg', ext: 'jpg' },
  png: { mime: 'image/png', ext: 'png' },
  webp: { mime: 'image/webp', ext: 'webp' },
  gif: { mime: 'image/gif', ext: 'gif' },
};

/**
 * Detect image format from buffer magic bytes.
 * @param {Buffer} buffer
 * @returns {{ format: string, mime: string, ext: string } | null}
 */
function detectImageFormat(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;

  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { format: 'jpeg', ...SIGNATURES.jpeg };
  }

  // PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { format: 'png', ...SIGNATURES.png };
  }

  // GIF87a / GIF89a
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return { format: 'gif', ...SIGNATURES.gif };
  }

  // WebP: RIFF....WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { format: 'webp', ...SIGNATURES.webp };
  }

  // SVG is text-based — reject from raster pipeline
  const head = buffer.slice(0, 256).toString('utf8').trimStart().toLowerCase();
  if (head.startsWith('<?xml') || head.startsWith('<svg')) {
    const err = new Error('SVG uploads are not supported through the image upload pipeline');
    err.statusCode = 400;
    err.code = 'UNSUPPORTED_SVG';
    throw err;
  }

  return null;
}

/**
 * Detect animated GIF (multiple image frames).
 * @param {Buffer} buffer
 */
function isAnimatedGif(buffer) {
  if (!buffer || buffer.length < 6) return false;
  if (buffer[0] !== 0x47 || buffer[1] !== 0x49 || buffer[2] !== 0x46) return false;
  // Count graphic control extensions / image separators roughly
  let frames = 0;
  for (let i = 0; i < buffer.length - 1; i++) {
    if (buffer[i] === 0x00 && buffer[i + 1] === 0x2c) frames++;
    if (frames > 1) return true;
  }
  return false;
}

/**
 * Validate upload buffer before processing.
 * @param {Buffer} buffer
 * @param {{ declaredMime?: string, maxBytes?: number }} [options]
 */
function validateImageBuffer(buffer, options = {}) {
  const maxBytes = options.maxBytes || parseInt(process.env.MAX_FILE_SIZE, 10) || 15 * 1024 * 1024;

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    const err = new Error('Empty or invalid image file');
    err.statusCode = 400;
    throw err;
  }

  if (buffer.length > maxBytes) {
    const err = new Error(`Image exceeds maximum size of ${Math.round(maxBytes / (1024 * 1024))}MB`);
    err.statusCode = 400;
    err.code = 'FILE_TOO_LARGE';
    throw err;
  }

  const detected = detectImageFormat(buffer);
  if (!detected) {
    const err = new Error('Unsupported or malformed image. Allowed: JPEG, PNG, GIF, WebP.');
    err.statusCode = 400;
    err.code = 'INVALID_IMAGE';
    throw err;
  }

  if (options.declaredMime && options.declaredMime !== detected.mime) {
    // Soft warning path: trust magic bytes, reject only if declared is wildly wrong and not generic
    const declared = String(options.declaredMime).toLowerCase();
    if (
      declared &&
      declared !== 'application/octet-stream' &&
      !declared.startsWith('image/')
    ) {
      const err = new Error(`Declared MIME type (${declared}) does not match image contents (${detected.mime})`);
      err.statusCode = 400;
      err.code = 'MIME_MISMATCH';
      throw err;
    }
  }

  return {
    ...detected,
    bytes: buffer.length,
    animated: detected.format === 'gif' ? isAnimatedGif(buffer) : false,
    maxDecodedPixels: MAX_DECODED_PIXELS,
    maxEdge: MAX_EDGE,
  };
}

module.exports = {
  detectImageFormat,
  isAnimatedGif,
  validateImageBuffer,
  MAX_DECODED_PIXELS,
  MAX_EDGE,
};
