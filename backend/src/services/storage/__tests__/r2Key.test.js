const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildUploadKey, buildMigratedKey, publicUrlForKey } = require('../r2Client');

describe('r2Client key helpers', () => {
  it('builds upload keys under uploads/folder/uuid.ext', () => {
    const key = buildUploadKey('products', 'webp');
    assert.match(key, /^uploads\/products\/[0-9a-f-]+\.webp$/i);
  });

  it('sanitizes path traversal in folder', () => {
    const key = buildUploadKey('../evil', 'jpg');
    assert.ok(!key.includes('..'));
    assert.match(key, /^uploads\//);
  });

  it('builds migrated keys with resource + delivery type', () => {
    assert.equal(
      buildMigratedKey({
        resourceType: 'image',
        deliveryType: 'upload',
        publicId: 'site-assets/logo',
        format: 'png',
      }),
      'migrated/cloudinary/image/upload/site-assets/logo.png',
    );
  });

  it('joins public base URL', () => {
    assert.equal(
      publicUrlForKey('uploads/a.webp', 'https://media.example.com'),
      'https://media.example.com/uploads/a.webp',
    );
  });
});
