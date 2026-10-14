const prisma = require('../prismaClient');
const { ValidationError } = require('../middleware/errorMiddleware');
const couponService = require('../services/couponService');

class CouponController {
  /** POST /api/coupons/validate — public (always 200; use `ok` in body) */
  async validate(req, res) {
    const { code, cartSubtotal } = req.body || {};
    const result = await couponService.validateForCheckout(code, cartSubtotal);
    res.status(200).json(result);
  }

  /** GET /api/coupons — Admin */
  async list(req, res) {
    const q = String(req.query.q || '').trim().toLowerCase();
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });
    let rows = coupons.map((c) => couponService.serializeCoupon(c, { includeInternal: true }));
    if (q) {
      rows = rows.filter(
        (c) =>
          c.name.toLowerCase().includes(q)
          || c.code.toLowerCase().includes(q)
          || (c.internalNotes || '').toLowerCase().includes(q),
      );
    }
    res.json(rows);
  }

  /** GET /api/coupons/:id — Admin */
  async getOne(req, res) {
    const coupon = await prisma.coupon.findUnique({ where: { id: req.params.id } });
    if (!coupon) {
      res.status(404);
      throw new Error('الكوبون غير موجود');
    }
    res.json(couponService.serializeCoupon(coupon, { includeInternal: true }));
  }

  /** POST /api/coupons — Admin */
  async create(req, res) {
    const {
      name,
      code,
      validityDays,
      usageLimit = 1,
      adminStatus = 'Draft',
      internalNotes,
    } = req.body;

    let finalCode = couponService.normalizeCode(code);
    if (!finalCode) {
      finalCode = await couponService.generateUniqueCouponCode();
    } else {
      const clash = await prisma.coupon.findUnique({ where: { code: finalCode } });
      if (clash) throw new ValidationError('كود الكوبون مستخدم مسبقًا');
    }

    const discountFields = couponService.buildDiscountFields(req.body);

    const data = {
      name: String(name).trim(),
      code: finalCode,
      ...discountFields,
      validityDays: Number(validityDays),
      usageLimit: Number(usageLimit) || 1,
      usageCount: 0,
      adminStatus: adminStatus === 'Active' ? 'Active' : 'Draft',
      internalNotes: internalNotes ? String(internalNotes).trim() : null,
    };

    if (data.adminStatus === 'Active') {
      Object.assign(data, couponService.activationPatch(data, 'Active'));
    }

    const created = await prisma.coupon.create({ data });
    res.status(201).json(couponService.serializeCoupon(created, { includeInternal: true }));
  }

  /** PUT /api/coupons/:id — Admin */
  async update(req, res) {
    const existing = await prisma.coupon.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404);
      throw new Error('الكوبون غير موجود');
    }

    const patch = {};
    const body = req.body || {};

    if (body.name !== undefined) patch.name = String(body.name).trim();
    if (
      body.discountType !== undefined
      || body.discountPercent !== undefined
      || body.discountFixedAmount !== undefined
    ) {
      Object.assign(patch, couponService.buildDiscountFields(body, { existing }));
    }
    if (body.validityDays !== undefined) patch.validityDays = Number(body.validityDays);
    if (body.usageLimit !== undefined) {
      const limit = Number(body.usageLimit);
      if (limit < existing.usageCount) {
        throw new ValidationError('حد الاستخدام لا يمكن أن يكون أقل من عدد مرات الاستخدام الحالية');
      }
      patch.usageLimit = limit;
    }
    if (body.internalNotes !== undefined) {
      patch.internalNotes = body.internalNotes ? String(body.internalNotes).trim() : null;
    }

    if (body.code !== undefined) {
      const nextCode = couponService.normalizeCode(body.code);
      if (!nextCode) throw new ValidationError('كود الكوبون غير صالح');
      if (nextCode !== existing.code) {
        const clash = await prisma.coupon.findUnique({ where: { code: nextCode } });
        if (clash) throw new ValidationError('كود الكوبون مستخدم مسبقًا');
        patch.code = nextCode;
      }
    }

    if (body.adminStatus !== undefined) {
      const nextStatus = body.adminStatus;
      if (!['Draft', 'Active', 'Disabled'].includes(nextStatus)) {
        throw new ValidationError('حالة الكوبون غير صالحة');
      }
      patch.adminStatus = nextStatus;
      Object.assign(patch, couponService.activationPatch(
        { ...existing, validityDays: patch.validityDays ?? existing.validityDays },
        nextStatus,
      ));
    }

    // If still Draft and validityDays changed before first activation — nothing to do for expiresAt.
    // If Active and never activated somehow — activationPatch covers first Active.

    const updated = await prisma.coupon.update({
      where: { id: existing.id },
      data: patch,
    });
    res.json(couponService.serializeCoupon(updated, { includeInternal: true }));
  }

  /** POST /api/coupons/:id/disable — Admin */
  async disable(req, res) {
    const existing = await prisma.coupon.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404);
      throw new Error('الكوبون غير موجود');
    }
    const updated = await prisma.coupon.update({
      where: { id: existing.id },
      data: { adminStatus: 'Disabled' },
    });
    res.json(couponService.serializeCoupon(updated, { includeInternal: true }));
  }

  /** GET /api/coupons/meta/generate-code — Admin helper */
  async generateCode(req, res) {
    const code = await couponService.generateUniqueCouponCode();
    res.json({ code });
  }
}

module.exports = new CouponController();
