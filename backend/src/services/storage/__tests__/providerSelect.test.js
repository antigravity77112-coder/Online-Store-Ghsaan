const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

describe('getStorageProvider', () => {
  const prev = process.env.STORAGE_PROVIDER;

  afterEach(() => {
    if (prev === undefined) delete process.env.STORAGE_PROVIDER;
    else process.env.STORAGE_PROVIDER = prev;
    // Clear require cache so provider reads fresh env
    delete require.cache[require.resolve('../index')];
  });

  it('defaults to cloudinary', () => {
    delete process.env.STORAGE_PROVIDER;
    delete require.cache[require.resolve('../index')];
    const { getStorageProvider } = require('../index');
    assert.equal(getStorageProvider(), 'cloudinary');
  });

  it('accepts r2 aliases', () => {
    process.env.STORAGE_PROVIDER = 'r2';
    delete require.cache[require.resolve('../index')];
    assert.equal(require('../index').getStorageProvider(), 'r2');

    process.env.STORAGE_PROVIDER = 'cloudflare-r2';
    delete require.cache[require.resolve('../index')];
    assert.equal(require('../index').getStorageProvider(), 'r2');
  });
});
