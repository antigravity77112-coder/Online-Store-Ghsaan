const prisma = require('../prismaClient');
const { ValidationError } = require('../middleware/errorMiddleware');
const { uploadBuffer } = require('../services/storage');
const crypto = require('crypto');

class BrandController {
  /**
   * Get all brands
   * GET /api/brands
   */
  async getBrands(req, res) {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const brands = await prisma.brand.findMany({
        where: includeInactive ? undefined : { isActive: true },
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { products: true }
          }
        }
      });
      
      const mapped = brands.map(brand => ({
        ...brand,
        productsCount: brand._count.products,
        _count: undefined
      }));

      res.json(mapped);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get brand by ID
   * GET /api/brands/:id
   */
  async getBrandById(req, res) {
    try {
      const brand = await prisma.brand.findUnique({
        where: { id: req.params.id }
      });
      if (!brand) {
        res.status(404);
        throw new Error('العلامة التجارية غير موجودة (Brand not found)');
      }
      res.json(brand);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get brand by slug
   * GET /api/brands/slug/:slug
   */
  async getBrandBySlug(req, res) {
    try {
      const brand = await prisma.brand.findUnique({
        where: { slug: req.params.slug },
        include: { _count: { select: { products: true } } },
      });
      if (!brand || brand.isActive === false) {
        res.status(404);
        throw new Error('العلامة التجارية غير موجودة (Brand not found)');
      }
      res.json({
        ...brand,
        productsCount: brand._count.products,
        _count: undefined,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get products by brand (Server-side filtering for Brand Page)
   * GET /api/brands/:id/products
   */
  async getProductsByBrand(req, res) {
    try {
      const brandId = req.params.id;

      const brand = await prisma.brand.findUnique({ where: { id: brandId } });
      if (!brand || brand.isActive === false) {
        res.status(404);
        throw new Error('العلامة التجارية غير موجودة (Brand not found)');
      }

      const products = await prisma.product.findMany({
        where: { brandId, status: 'Active' },
        include: {

          images: { orderBy: { sortOrder: 'asc' }, take: 5 },
          brand: { select: { name: true, slug: true, logoUrl: true } },
          category: { select: { name: true, slug: true } }
        },
      });

      // Add imageUrl shim for backward compat
      const mapped = products.map(p => ({
        ...p,
        imageUrl: p.images?.[0]?.url ?? null,
      }));

      res.json(mapped);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Upload brand logo to Cloudinary
   * POST /api/brands/upload-logo
   */
  async uploadLogo(req, res) {
    try {
      if (!req.file) {
        res.status(400);
        throw new Error('No file uploaded');
      }

      const url = await uploadBuffer(req.file.buffer, {
        folder: 'brands',
        // Keep PNG/WebP alpha — default jpg flatten fills transparent pixels with white.
        preserveFormat: true,
      });
      res.json({ url });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new brand
   * POST /api/brands
   */
  async createBrand(req, res) {
    try {
      const { name, logoUrl, description } = req.body;
      if (!name) throw new ValidationError('Brand name is required');

      // Generate deterministic slug: normalized-name + 8-char id suffix
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

      const brand = await prisma.brand.create({
        data: {
          id,
          name,
          slug,
          logoUrl: logoUrl || null,
          description: description || null,
          isActive: req.body.isActive !== false,
        },
      });

      res.status(201).json(brand);
    } catch (error) {
      // Prisma Unique Constraint check for slug collision
      if (error.code === 'P2002' && error.meta?.target?.includes('slug')) {
        res.status(400);
        throw new Error('يوجد علامة تجارية بنفس الرابط (Slug is already in use)');
      }
      throw error;
    }
  }

  /**
   * Update brand
   * PUT /api/brands/:id
   */
  async updateBrand(req, res) {
    try {
      const existing = await prisma.brand.findUnique({ where: { id: req.params.id } });
      if (!existing) {
        res.status(404);
        throw new Error('العلامة التجارية غير موجودة (Brand not found)');
      }

      let slug = req.body.slug !== undefined ? req.body.slug : existing.slug;
      
      // Re-generate slug if name changed and no explicit slug provided
      if (req.body.name && req.body.name !== existing.name && req.body.slug === undefined) {
        const slugBase = req.body.name
          .toLowerCase()
          .replace(/[^a-z0-9\u0600-\u06ff]+/gi, '-')
          .replace(/^-+|-+$/g, '')
          .replace(/-{2,}/g, '-');
        slug = `${slugBase}-${req.params.id.replace(/-/g, '').slice(0, 8)}`;
      }

      const updated = await prisma.brand.update({
        where: { id: req.params.id },
        data: {
          name: req.body.name ?? existing.name,
          slug,
          logoUrl: req.body.logoUrl !== undefined ? (req.body.logoUrl || null) : existing.logoUrl,
          description: req.body.description !== undefined ? (req.body.description || null) : existing.description,
          isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : existing.isActive,
        },
      });

      res.status(200).json(updated);
    } catch (error) {
      if (error.code === 'P2002' && error.meta?.target?.includes('slug')) {
        res.status(400);
        throw new Error('يوجد علامة تجارية بنفس الرابط (Slug is already in use)');
      }
      throw error;
    }
  }

  /**
   * Delete brand
   * DELETE /api/brands/:id
   */
  async deleteBrand(req, res) {
    try {
      const existing = await prisma.brand.findUnique({
        where: { id: req.params.id },
      });
      if (!existing) {
        res.status(404);
        throw new Error('العلامة التجارية غير موجودة (Brand not found)');
      }

      // Deleting the Brand will NOT delete products.
      // Product.brandId uses 'onDelete: SetNull' at the DB level,
      // so all related products will have their brandId set to null automatically.
      await prisma.brand.delete({
        where: { id: req.params.id }
      });

      res.status(200).json({ message: 'تم حذف العلامة التجارية بنجاح' });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new BrandController();
