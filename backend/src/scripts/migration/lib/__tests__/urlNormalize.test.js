const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  isCloudinaryUrl,
  stripCloudinaryTransforms,
  extractPublicId,
  extractResourceType,
  makeAssetId,
  buildMigratedR2Key,
  buildBackupRelativePath,
} = require('../urlNormalize');

const RAW =
  'https://res.cloudinary.com/demo/image/upload/v1710000000/products/abc.jpg';
const TRANSFORMED =
  'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto:good,w_400,c_limit/v1710000000/products/abc.jpg';

describe('urlNormalize', () => {
  it('detects Cloudinary URLs', () => {
    assert.equal(isCloudinaryUrl(RAW), true);
    assert.equal(isCloudinaryUrl('https://media.example.com/uploads/x.webp'), false);
    assert.equal(isCloudinaryUrl('/Logo_light_192.png'), false);
  });

  it('strips delivery transforms', () => {
    assert.equal(stripCloudinaryTransforms(TRANSFORMED), RAW);
    assert.equal(stripCloudinaryTransforms(RAW), RAW);
  });

  it('extracts public_id and resource type', () => {
    assert.equal(extractPublicId(RAW), 'products/abc');
    assert.equal(extractPublicId(TRANSFORMED), 'products/abc');
    assert.equal(extractResourceType(RAW), 'image');
  });

  it('builds collision-safe asset id and R2 key', () => {
    assert.equal(
      makeAssetId({ resourceType: 'image', deliveryType: 'upload', publicId: 'products/abc' }),
      'image:upload:products/abc',
    );
    assert.equal(
      buildMigratedR2Key({
        resourceType: 'image',
        deliveryType: 'upload',
        publicId: 'products/abc',
        format: 'jpg',
      }),
      'migrated/cloudinary/image/upload/products/abc.jpg',
    );
    assert.equal(
      buildBackupRelativePath({
        resourceType: 'image',
        deliveryType: 'upload',
        publicId: 'brands/logo',
        format: 'png',
      }),
      'files/image/upload/brands/logo.png',
    );
  });
});
