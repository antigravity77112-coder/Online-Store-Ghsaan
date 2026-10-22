const prisma = require('../prismaClient');
const { ValidationError } = require('../middleware/errorMiddleware');
const { uploadBuffer } = require('../services/storage');
const crypto = require('crypto');

function mapScentResponse(scent, productsCount) {
  return {
    id: scent.id,
    name: scent.name,
    slug: scent.slug,
    imageUrl: scent.imageUrl,
    description: scent.description,
    isActive: scent.isActive,
    sortOrder: scent.sortOrder,
    createdAt: scent.createdAt,
    updatedAt: scent.updatedAt,
    productsCount: productsCount ?? scent._count?.products ?? 0,
  };
}

class ScentController {
  /**
   * GET /api/scents
   * Public: active scents only. Admin: all scents.
   */
  async getScents(req, res) {
    const isAdmin = req.user?.role === 'Admin';
    const activeOnly = req.query.activeOnly === 'true' || (!isAdmin && req.query.includeInactive !== 'true');
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;

    const scents = await prisma.scent.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      take: limit && limit > 0 ? limit : undefined,
      include: {
        _count: { select: { products: true } },
      },
    });

    res.json(scents.map((s) => mapScentResponse(s)));
  }

  /**
   * GET /api/scents/slug/:slug
   */
  async getScentBySlug(req, res) {
    const slug = decodeURIComponent(req.params.slug || '').trim();
    const isAdmin = req.user?.role === 'Admin';

    const scent = await prisma.scent.findFirst({
      where: {
        slug,
        ...(isAdmin ? {} : { isActive: true }),
      },
      include: {
        _count: { select: { products: true } },
      },
    });

    if (!scent) {
      res.status(404);
      throw new Error('الرائحة غير موجودة (Scent not found)');
    }

    res.json(mapScentResponse(scent));
  }

  /**
   * GET /api/scents/:id
   */
  async getScentById(req, res) {
    const scent = await prisma.scent.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { products: true } },
      },
    });

    if (!scent) {
      res.status(404);
      throw new Error('الرائحة غير موجودة (Scent not found)');
    }

    if (!scent.isActive && req.user?.role !== 'Admin') {
      res.status(404);
      throw new Error('الرائحة غير موجودة (Scent not found)');
    }

    res.json(mapScentResponse(scent));
  }

  /**
   * GET /api/scents/:id/products
   */
  async getProductsByScent(req, res) {
    const scentId = req.params.id;
    const isAdmin = req.user?.role === 'Admin';

    const scent = await prisma.scent.findUnique({ where: { id: scentId } });
    if (!scent || (!scent.isActive && !isAdmin)) {
      res.status(404);
      throw new Error('الرائحة غير موجودة (Scent not found)');
    }

    const products = await prisma.product.findMany({
      where: {
        status: 'Active',
        scents: { some: { scentId } },
      },
      include: {
        images: { orderBy: { sortOrder: 'asc' }, take: 5 },
        brand: { select: { name: true, slug: true, logoUrl: true } },
        category: { select: { name: true, slug: true } },
        scents: {
          include: {
            scent: { select: { id: true, name: true, slug: true, imageUrl: true } },
          },
        },
        variants: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            imageUrl: true,
            stockQuantity: true,
            sortOrder: true,
            price: true,
            discountPrice: true,
            attributes: {
              select: {
                value: true,
                categoryAttribute: { select: { id: true, name: true, slug: true } },
              },
            },
          },
        },
      },
    });

    const mapped = products.map((p) => ({
      ...p,
      imageUrl: p.images?.[0]?.url ?? null,
      scents: (p.scents || []).map((ps) => ps.scent),
    }));

    res.json(mapped);
  }

  /**
   * POST /api/scents/upload-image
   */
  async uploadImage(req, res) {
    if (!req.file) {
      res.status(400);
      throw new Error('No file uploaded');
    }

    const url = await uploadBuffer(req.file.buffer, 'scents');
    res.json({ url });
  }

  /**
   * POST /api/scents
   */
  async createScent(req, res) {
    const { name, imageUrl, description, isActive, sortOrder } = req.body;
    if (!name) throw new ValidationError('Scent name is required');

    const id = crypto.randomUUID();
    let slug = req.body.slug;
    if (!slug) {
      const slugBase = name
        .toLowerCase()
        .replace(/[^a-z0-9\u0600-\u06ff]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-');
      slug = `${slugBase}-${id.replace(/-/g, '').slice(0, 8)}`;
    }

    try {
      const scent = await prisma.scent.create({
        data: {
          id,
          name,
          slug,
          imageUrl: imageUrl || null,
          description: description || null,
          isActive: isActive !== undefined ? isActive : true,
          sortOrder: sortOrder ?? 0,
        },
      });

      res.status(201).json(mapScentResponse(scent, 0));
    } catch (error) {
      if (error.code === 'P2002' && error.meta?.target?.includes('slug')) {
        res.status(400);
        throw new Error('يوجد رائحة بنفس الرابط (Slug is already in use)');
      }
      throw error;
    }
  }

  /**
   * PUT /api/scents/:id
   */
  async updateScent(req, res) {
    const existing = await prisma.scent.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404);
      throw new Error('الرائحة غير موجودة (Scent not found)');
    }

    let slug = req.body.slug !== undefined ? req.body.slug : existing.slug;

    if (req.body.name && req.body.name !== existing.name && req.body.slug === undefined) {
      const slugBase = req.body.name
        .toLowerCase()
        .replace(/[^a-z0-9\u0600-\u06ff]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-');
      slug = `${slugBase}-${req.params.id.replace(/-/g, '').slice(0, 8)}`;
    }

    try {
      const updated = await prisma.scent.update({
        where: { id: req.params.id },
        data: {
          name: req.body.name ?? existing.name,
          slug,
          imageUrl: req.body.imageUrl !== undefined ? (req.body.imageUrl || null) : existing.imageUrl,
          description: req.body.description !== undefined ? (req.body.description || null) : existing.description,
          isActive: req.body.isActive !== undefined ? req.body.isActive : existing.isActive,
          sortOrder: req.body.sortOrder !== undefined ? req.body.sortOrder : existing.sortOrder,
        },
        include: {
          _count: { select: { products: true } },
        },
      });

      res.status(200).json(mapScentResponse(updated));
    } catch (error) {
      if (error.code === 'P2002' && error.meta?.target?.includes('slug')) {
        res.status(400);
        throw new Error('يوجد رائحة بنفس الرابط (Slug is already in use)');
      }
      throw error;
    }
  }

  /**
   * PATCH /api/scents/:id/toggle-active
   */
  async toggleActive(req, res) {
    const existing = await prisma.scent.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404);
      throw new Error('الرائحة غير موجودة (Scent not found)');
    }

    const updated = await prisma.scent.update({
      where: { id: req.params.id },
      data: { isActive: !existing.isActive },
      include: {
        _count: { select: { products: true } },
      },
    });

    res.json(mapScentResponse(updated));
  }

  /**
   * DELETE /api/scents/:id
   * Blocked when products are linked — prefer deactivation.
   */
  async deleteScent(req, res) {
    const existing = await prisma.scent.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { products: true } },
      },
    });

    if (!existing) {
      res.status(404);
      throw new Error('الرائحة غير موجودة (Scent not found)');
    }

    if (existing._count.products > 0) {
      res.status(400);
      throw new Error('لا يمكن حذف رائحة مرتبطة بمنتجات. قم بتعطيلها بدلاً من ذلك.');
    }

    await prisma.scent.delete({ where: { id: req.params.id } });
    res.status(200).json({ message: 'تم حذف الرائحة بنجاح' });
  }
}

module.exports = new ScentController();
