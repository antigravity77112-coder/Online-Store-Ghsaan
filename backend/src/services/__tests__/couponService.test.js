const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeCode,
  generateCouponCode,
  getEffectiveStatus,
  computeDiscount,
  activationPatch,
  addDays,
} = require('../couponService');

describe('couponService', () => {
  it('normalizes codes to uppercase without spaces', () => {
    assert.equal(normalizeCode('  save10 '), 'SAVE10');
  });

  it('generates alphanumeric codes of requested length', () => {
    const code = generateCouponCode(10);
    assert.equal(code.length, 10);
    assert.match(code, /^[A-Z0-9]+$/);
  });

  it('computes percent discount on the server', () => {
    const pricing = computeDiscount(1000, 10);
    assert.equal(pricing.subtotal, 1000);
    assert.equal(pricing.discountAmount, 100);
    assert.equal(pricing.totalAfter, 900);
    assert.equal(pricing.discountType, 'Percent');
  });

  it('computes fixed-amount discount capped at subtotal', () => {
    const pricing = computeDiscount(1000, {
      discountType: 'Amount',
      discountFixedAmount: 250,
    });
    assert.equal(pricing.discountType, 'Amount');
    assert.equal(pricing.discountAmount, 250);
    assert.equal(pricing.totalAfter, 750);
    assert.equal(pricing.discountPercent, null);

    const capped = computeDiscount(100, {
      discountType: 'Amount',
      discountFixedAmount: 250,
    });
    assert.equal(capped.discountAmount, 100);
    assert.equal(capped.totalAfter, 0);
  });

  it('maps effective statuses with correct priority', () => {
    const now = new Date('2026-10-14T12:00:00.000Z');
    assert.equal(getEffectiveStatus({ adminStatus: 'Disabled', usageCount: 0, usageLimit: 1 }, now), 'Disabled');
    assert.equal(getEffectiveStatus({ adminStatus: 'Draft', usageCount: 0, usageLimit: 1 }, now), 'Draft');
    assert.equal(
      getEffectiveStatus({
        adminStatus: 'Active',
        usageCount: 0,
        usageLimit: 1,
        expiresAt: new Date('2026-10-01T00:00:00.000Z'),
      }, now),
      'Expired',
    );
    assert.equal(
      getEffectiveStatus({
        adminStatus: 'Active',
        usageCount: 1,
        usageLimit: 1,
        expiresAt: new Date('2026-11-01T00:00:00.000Z'),
      }, now),
      'Used',
    );
    assert.equal(
      getEffectiveStatus({
        adminStatus: 'Active',
        usageCount: 0,
        usageLimit: 5,
        expiresAt: new Date('2026-11-01T00:00:00.000Z'),
      }, now),
      'Active',
    );
  });

  it('starts validity clock only on first Active transition', () => {
    const draft = { validityDays: 14, activatedAt: null };
    const patch = activationPatch(draft, 'Active');
    assert.ok(patch.activatedAt instanceof Date);
    assert.ok(patch.expiresAt instanceof Date);
    assert.equal(
      patch.expiresAt.toISOString(),
      addDays(patch.activatedAt, 14).toISOString(),
    );

    const already = {
      validityDays: 14,
      activatedAt: new Date('2026-10-01T00:00:00.000Z'),
      expiresAt: new Date('2026-10-15T00:00:00.000Z'),
    };
    assert.deepEqual(activationPatch(already, 'Active'), {});
  });
});
