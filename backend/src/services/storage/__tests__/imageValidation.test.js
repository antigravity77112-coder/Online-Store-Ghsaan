const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  detectImageFormat,
  isAnimatedGif,
  validateImageBuffer,
} = require('../imageValidation');

function jpegStub(size = 64) {
  const buf = Buffer.alloc(size, 0);
  buf[0] = 0xff;
  buf[1] = 0xd8;
  buf[2] = 0xff;
  buf[3] = 0xe0;
  return buf;
}

function pngStub(size = 64) {
  const buf = Buffer.alloc(size, 0);
  buf[0] = 0x89;
  buf[1] = 0x50;
  buf[2] = 0x4e;
  buf[3] = 0x47;
  buf[4] = 0x0d;
  buf[5] = 0x0a;
  buf[6] = 0x1a;
  buf[7] = 0x0a;
  return buf;
}

function gifStub(animated = false) {
  const header = Buffer.from('GIF89a');
  if (!animated) return Buffer.concat([header, Buffer.alloc(32, 0)]);
  // Two image separators (0x00 0x2c) to trip the frame counter
  const body = Buffer.alloc(64, 0);
  body[10] = 0x00;
  body[11] = 0x2c;
  body[30] = 0x00;
  body[31] = 0x2c;
  return Buffer.concat([header, body]);
}

function webpStub() {
  const buf = Buffer.alloc(16, 0);
  buf.write('RIFF', 0);
  buf.write('WEBP', 8);
  return buf;
}

describe('detectImageFormat', () => {
  it('detects JPEG/PNG/GIF/WebP', () => {
    assert.equal(detectImageFormat(jpegStub()).format, 'jpeg');
    assert.equal(detectImageFormat(pngStub()).format, 'png');
    assert.equal(detectImageFormat(gifStub()).format, 'gif');
    assert.equal(detectImageFormat(webpStub()).format, 'webp');
  });

  it('returns null for garbage', () => {
    assert.equal(detectImageFormat(Buffer.from('not-an-image')), null);
  });

  it('rejects SVG', () => {
    assert.throws(() => detectImageFormat(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), /SVG/);
  });
});

describe('isAnimatedGif', () => {
  it('detects multi-frame GIF', () => {
    assert.equal(isAnimatedGif(gifStub(false)), false);
    assert.equal(isAnimatedGif(gifStub(true)), true);
  });
});

describe('validateImageBuffer', () => {
  it('accepts valid JPEG', () => {
    const meta = validateImageBuffer(jpegStub(128));
    assert.equal(meta.format, 'jpeg');
    assert.equal(meta.mime, 'image/jpeg');
    assert.equal(meta.bytes, 128);
  });

  it('rejects empty buffer', () => {
    assert.throws(() => validateImageBuffer(Buffer.alloc(0)), /Empty/);
  });

  it('rejects oversized buffer', () => {
    assert.throws(
      () => validateImageBuffer(jpegStub(200), { maxBytes: 100 }),
      /maximum size/,
    );
  });

  it('rejects MIME mismatch when declared is non-image', () => {
    assert.throws(
      () => validateImageBuffer(jpegStub(), { declaredMime: 'text/plain' }),
      /MIME/,
    );
  });
});
