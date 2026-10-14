const crypto = require('crypto');
const prisma = require('../prismaClient');
const { ValidationError } = require('../middleware/errorMiddleware');

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function normalizeCode(code) {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

function generateCouponCode(length = 8) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

async function generateUniqueCouponCode(tx = prisma) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = generateCouponCode(8);
    const existing = await tx.coupon.findUnique({ where: { code }, select: { id: true } });
    if (!existing) return code;
  }
  throw new ValidationError('تعذر توليد كود فريد، حاول مرة أخرى');
}

function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + Number(days));
  return d;
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function normalizeDiscountType(value) {
  return value === 'Amount' ? 'Amount' : 'Percent';
}

/**
 * Effective display/status for admin + validate responses.
 * Priority: Disabled → Draft → Expired → Used → Active
 */
function getEffectiveStatus(coupon, now = new Date()) {
  if (!coupon) return 'NotFound';
  if (coupon.adminStatus === 'Disabled') return 'Disabled';
  if (coupon.adminStatus === 'Draft') return 'Draft';
  if (coupon.expiresAt && new Date(coupon.expiresAt) <= now) return 'Expired';
  if (Number(coupon.usageCount) >= Number(coupon.usageLimit)) return 'Used';
  if (coupon.adminStatus === 'Active') return 'Active';
  return 'Disabled';
}

function remainingMs(coupon, now = new Date()) {
  if (!coupon?.expiresAt) return null;
  return Math.max(0, new Date(coupon.expiresAt).getTime() - now.getTime());
}

function serializeCoupon(coupon, { includeInternal = false } = {}) {
  const now = new Date();
  const effectiveStatus = getEffectiveStatus(coupon, now);
  const rem = remainingMs(coupon, now);
  const discountType = normalizeDiscountType(coupon.discountType);
  const fixedRaw = coupon.discountFixedAmount;
  const base = {
    id: coupon.id,
    name: coupon.name,
    code: coupon.code,
    discountType,
    discountPercent: coupon.discountPercent == null ? null : Number(coupon.discountPercent),
    discountFixedAmount: fixedRaw == null ? null : Number(fixedRaw),
    validityDays: coupon.validityDays,
    usageLimit: coupon.usageLimit,
    usageCount: coupon.usageCount,
    adminStatus: coupon.adminStatus,
    activatedAt: coupon.activatedAt,
    expiresAt: coupon.expiresAt,
    effectiveStatus,
    remainingMs: rem,
    createdAt: coupon.createdAt,
    updatedAt: coupon.updatedAt,
  };
  if (includeInternal) {
    base.internalNotes = coupon.internalNotes ?? null;
  }
  return base;
}

/**
 * Server-side discount math.
 * Accepts either a coupon-like object or legacy (subtotal, percentNumber).
 */
function computeDiscount(subtotal, couponOrPercent) {
  const sub = roundMoney(subtotal);
  let discountType = 'Percent';
  let discountPercent = null;
  let discountFixedAmount = null;

  if (couponOrPercent != null && typeof couponOrPercent === 'object') {
    discountType = normalizeDiscountType(couponOrPercent.discountType);
    discountPercent = couponOrPercent.discountPercent == null
      ? null
      : Number(couponOrPercent.discountPercent);
    discountFixedAmount = couponOrPercent.discountFixedAmount == null
      ? null
      : Number(couponOrPercent.discountFixedAmount);
  } else {
    discountPercent = Number(couponOrPercent);
  }

  let discountAmount = 0;
  if (discountType === 'Amount') {
    const fixed = roundMoney(Math.max(0, Number(discountFixedAmount) || 0));
    discountAmount = roundMoney(Math.min(sub, fixed));
  } else {
    const pct = Number(discountPercent) || 0;
    discountAmount = roundMoney((sub * pct) / 100);
    discountPercent = pct;
  }

  const totalAfter = roundMoney(Math.max(0, sub - discountAmount));
  return {
    subtotal: sub,
    discountAmount,
    totalAfter,
    discountType,
    discountPercent: discountType === 'Percent' ? discountPercent : null,
    discountFixedAmount: discountType === 'Amount' ? roundMoney(Number(discountFixedAmount) || 0) : null,
  };
}

function publicCouponSnippet(coupon) {
  const discountType = normalizeDiscountType(coupon.discountType);
  return {
    code: coupon.code,
    name: coupon.name,
    discountType,
    discountPercent: discountType === 'Percent' ? Number(coupon.discountPercent) : null,
    discountFixedAmount: discountType === 'Amount' && coupon.discountFixedAmount != null
      ? Number(coupon.discountFixedAmount)
      : null,
    expiresAt: coupon.expiresAt,
    usageLimit: coupon.usageLimit,
    usageCount: coupon.usageCount,
  };
}

/**
 * Read-only validation for storefront / check page.
 * Does NOT increment usageCount.
 */
async function validateForCheckout(code, cartSubtotal = null) {
  const normalized = normalizeCode(code);
  if (!normalized) {
    return { ok: false, reason: 'not_found', message: 'كود الكوبون غير موجود' };
  }

  const coupon = await prisma.coupon.findUnique({ where: { code: normalized } });
  if (!coupon) {
    return { ok: false, reason: 'not_found', message: 'كود الكوبون غير موجود' };
  }

  const status = getEffectiveStatus(coupon);
  if (status === 'Draft' || status === 'Disabled') {
    return { ok: false, reason: 'inactive', message: 'هذا الكوبون غير مفعّل أو معطّل' };
  }
  if (status === 'Expired') {
    return { ok: false, reason: 'expired', message: 'انتهت صلاحية هذا الكوبون' };
  }
  if (status === 'Used') {
    return { ok: false, reason: 'used', message: 'تم استخدام هذا الكوبون بالكامل' };
  }

  const result = {
    ok: true,
    reason: 'valid',
    message: 'الكوبون صالح للاستخدام',
    coupon: publicCouponSnippet(coupon),
  };

  if (cartSubtotal != null && Number.isFinite(Number(cartSubtotal))) {
    result.pricing = computeDiscount(cartSubtotal, coupon);
  }

  return result;
}

/**
 * Apply activation clock on first transition to Active (server time).
 */
function activationPatch(existing, nextAdminStatus) {
  if (nextAdminStatus !== 'Active') return {};
  if (existing?.activatedAt) return {};
  const activatedAt = new Date();
  const days = existing?.validityDays ?? null;
  if (days == null) return { activatedAt };
  return {
    activatedAt,
    expiresAt: addDays(activatedAt, days),
  };
}

/**
 * Build Prisma create/update fields for discount type + value.
 */
function buildDiscountFields(body, { existing = null } = {}) {
  const nextType = body.discountType !== undefined
    ? normalizeDiscountType(body.discountType)
    : normalizeDiscountType(existing?.discountType);

  if (nextType === 'Amount') {
    const raw = body.discountFixedAmount !== undefined
      ? body.discountFixedAmount
      : existing?.discountFixedAmount;
    const amount = roundMoney(Number(raw));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ValidationError('مبلغ الخصم يجب أن يكون أكبر من صفر');
    }
    return {
      discountType: 'Amount',
      discountFixedAmount: amount,
      discountPercent: null,
    };
  }

  const rawPct = body.discountPercent !== undefined
    ? body.discountPercent
    : existing?.discountPercent;
  const pct = Number(rawPct);
  if (!Number.isInteger(pct) || pct < 1 || pct > 100) {
    throw new ValidationError('نسبة الخصم يجب أن تكون بين 1 و 100');
  }
  return {
    discountType: 'Percent',
    discountPercent: pct,
    discountFixedAmount: null,
  };
}

/**
 * Atomic redeem inside an existing Prisma interactive transaction.
 * Returns discount snapshot fields for the Order row.
 */
async function redeemInTransaction(tx, { code, subtotal }) {
  const normalized = normalizeCode(code);
  if (!normalized) throw new ValidationError('كود الكوبون غير صالح');

  const now = new Date();
  const coupon = await tx.coupon.findUnique({ where: { code: normalized } });
  if (!coupon) throw new ValidationError('كود الكوبون غير موجود');

  const status = getEffectiveStatus(coupon, now);
  if (status === 'Draft' || status === 'Disabled') {
    throw new ValidationError('هذا الكوبون غير مفعّل أو معطّل');
  }
  if (status === 'Expired') throw new ValidationError('انتهت صلاحية هذا الكوبون');
  if (status === 'Used') throw new ValidationError('تم استخدام هذا الكوبون بالكامل');

  const updated = await tx.coupon.updateMany({
    where: {
      id: coupon.id,
      adminStatus: 'Active',
      usageCount: { lt: coupon.usageLimit },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    data: { usageCount: { increment: 1 } },
  });

  if (updated.count !== 1) {
    throw new ValidationError('تعذر استخدام الكوبون (انتهت صلاحيته أو استُنفد)');
  }

  const pricing = computeDiscount(subtotal, coupon);
  return {
    couponId: coupon.id,
    couponCode: coupon.code,
    discountType: pricing.discountType,
    discountPercent: pricing.discountPercent,
    discountAmount: pricing.discountAmount,
    subtotalBeforeDiscount: pricing.subtotal,
    totalAmount: pricing.totalAfter,
  };
}

module.exports = {
  normalizeCode,
  generateCouponCode,
  generateUniqueCouponCode,
  addDays,
  roundMoney,
  normalizeDiscountType,
  getEffectiveStatus,
  remainingMs,
  serializeCoupon,
  computeDiscount,
  validateForCheckout,
  activationPatch,
  buildDiscountFields,
  redeemInTransaction,
};
