const prisma = require('../prismaClient');
const { ValidationError } = require('../middleware/errorMiddleware');
const { uploadBuffer } = require('../utils/cloudinaryClient');
const { generateUniqueCategorySlug, categorySlugFromName } = require('../utils/slugify');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isLatinSeoSlug(value) {
  const s = String(value || '').trim();
  return s.length > 0 && !UUID_REGEX.test(s) && !/[\u0600-\u06FF]/.test(s);
}

class CategoryController {
  /**
   * Get all categories
   * GET /api/categories
   */
  async getCategories(req, res) {
    try {
      const pageNumber = parseInt(req.query.pageNumber);
      const pageSize = parseInt(req.query.pageSize);
      
      let queryArgs = {
        include: {
          products: { select: { id: true } },
          children: true
        },
        orderBy: { sortOrder: 'asc' }
      };

      if (pageNumber && pageSize) {
        queryArgs.skip = (pageNumber - 1) * pageSize;
        queryArgs.take = pageSize;
      }

      const categories = await prisma.category.findMany(queryArgs);
      
      // Map to include productsCount for the admin dashboard
      const mapped = categories.map(cat => ({
        ...cat,
        productsCount: cat.products?.length || 0,
        products: undefined // Don't send the full array
      }));

      res.json(mapped);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get category by ID
   * GET /api/categories/:id
   */
  async getCategoryById(req, res) {
    try {
      const category = await prisma.category.findUnique({
        where: { id: req.params.id },
        include: {
          children: true,
          parent: true
        }
      });
      if (!category) {
        res.status(404);
        throw new Error('Category not found');
      }
      res.json(category);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get category by slug
   * GET /api/categories/slug/:slug
   */
  async getCategoryBySlug(req, res) {
    try {
      const slug = decodeURIComponent(req.params.slug || '').trim();
      const category = await prisma.category.findFirst({
        where: {
          OR: [{ slug }, { name: slug }],
        },
        include: {
          children: true,
          parent: true
        }
      });
      if (!category) {
        res.status(404);
        throw new Error('Category not found');
      }
      res.json(category);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get products by category
   * GET /api/categories/:id/products
   */
  async getProductsByCategory(req, res) {
    try {
      const categoryId = req.params.id;

      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) {
        res.status(404);
        throw new Error('Category not found');
      }

      const products = await prisma.product.findMany({
        where: { categoryId, status: 'Active' },
        include: {

          images: { orderBy: { sortOrder: 'asc' }, take: 5 },
          brand: { select: { name: true } },
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
   * Upload category icon image to Cloudinary
   * POST /api/categories/upload-icon
   */
  async uploadIcon(req, res) {
    try {
      if (!req.file) {
        res.status(400);
        throw new Error('No file uploaded');
      }

      const url = await uploadBuffer(req.file.buffer, 'categories');
      res.json({ url });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new category
   * POST /api/categories
   */
  async createCategory(req, res) {
    try {
      const { name, iconUrl, imageUrl, description, parentId, isActive, sortOrder, metaTitle, metaDescription } = req.body;
      if (!name) throw new ValidationError('Category name is required');

      // Latin SEO slug (Arabic names transliterated), same strategy as products.
      let slug = req.body.slug;
      if (!slug || !isLatinSeoSlug(slug)) {
        slug = await generateUniqueCategorySlug(name, prisma);
      } else {
        slug = categorySlugFromName(slug) || await generateUniqueCategorySlug(name, prisma);
      }

      const category = await prisma.category.create({
        data: {
          id: require('crypto').randomUUID(),
          name,
          slug,
          iconUrl: iconUrl || null,
          imageUrl: imageUrl || null,
          description: description || null,
          parentId: parentId || null,
          isActive: isActive !== undefined ? isActive : true,
          sortOrder: sortOrder ?? 0,
          metaTitle: metaTitle || null,
          metaDescription: metaDescription || null,
        },
      });

      res.status(201).json(category);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update category
   * PUT /api/categories/:id
   */
  async updateCategory(req, res) {
    try {
      // Accept if body has no id (mobile client), or if it matches the param
      if (req.body.id && req.params.id !== req.body.id) {
        res.status(400);
        throw new Error('ID mismatch');
      }

      const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
      if (!existing) {
        res.status(404);
        throw new Error('Category not found');
      }

      // Hierarchy cycle detection
      if (req.body.parentId && req.body.parentId !== existing.parentId) {
        if (req.body.parentId === req.params.id) {
          res.status(400);
          throw new Error('لا يمكن أن يكون القسم أباً لنفسه');
        }
        
        let currentParentId = req.body.parentId;
        while (currentParentId) {
          if (currentParentId === req.params.id) {
            res.status(400);
            throw new Error('لا يمكن وضع القسم تحت أحد أقسامه الفرعية');
          }
          const parent = await prisma.category.findUnique({ where: { id: currentParentId }, select: { parentId: true } });
          currentParentId = parent?.parentId;
        }
      }

      let slug = req.body.slug !== undefined ? req.body.slug : existing.slug;
      const nextName = req.body.name ?? existing.name;
      if (req.body.slug !== undefined && isLatinSeoSlug(req.body.slug)) {
        slug = categorySlugFromName(req.body.slug) || await generateUniqueCategorySlug(nextName, prisma, req.params.id);
      } else if (
        (req.body.name && req.body.name !== existing.name && req.body.slug === undefined)
        || !isLatinSeoSlug(slug)
      ) {
        // Name changed, or legacy Arabic/UUID slug — regenerate Latin slug
        slug = await generateUniqueCategorySlug(nextName, prisma, req.params.id);
      }

      const updated = await prisma.category.update({
        where: { id: req.params.id },
        data: {
          name: req.body.name ?? existing.name,
          slug,
          iconUrl: req.body.iconUrl !== undefined ? (req.body.iconUrl || null) : existing.iconUrl,
          imageUrl: req.body.imageUrl !== undefined ? (req.body.imageUrl || null) : existing.imageUrl,
          description: req.body.description !== undefined ? (req.body.description || null) : existing.description,
          parentId: req.body.parentId !== undefined ? (req.body.parentId || null) : existing.parentId,
          isActive: req.body.isActive !== undefined ? req.body.isActive : existing.isActive,
          sortOrder: req.body.sortOrder !== undefined ? req.body.sortOrder : existing.sortOrder,
          metaTitle: req.body.metaTitle !== undefined ? (req.body.metaTitle || null) : existing.metaTitle,
          metaDescription: req.body.metaDescription !== undefined ? (req.body.metaDescription || null) : existing.metaDescription,
        },
      });

      res.status(200).json(updated);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete category
   * DELETE /api/categories/:id
   */
  async deleteCategory(req, res) {
    try {
      const existing = await prisma.category.findUnique({
        where: { id: req.params.id },
        include: { 
          products: { select: { id: true } },
          children: { select: { id: true } }
        }
      });
      if (!existing) {
        res.status(404);
        throw new Error('Category not found');
      }

      if (existing.children && existing.children.length > 0) {
        res.status(400);
        throw new Error('لا يمكن حذف هذا القسم لأنه يحتوي على أقسام فرعية. يرجى حذف أو نقل الأقسام الفرعية أولاً.');
      }

      const productIds = existing.products.map(p => p.id);

      // Simplified cascade:
      // - OrderItem.productId → SET NULL automatically (DB-level FK)
      // - CartItem, Favorite, ProductImage, etc. → CASCADE from product delete
      // We only need to delete products first (Category FK is RESTRICT by default)
      await prisma.$transaction([
        prisma.product.deleteMany({ where: { categoryId: req.params.id } }),
        prisma.category.delete({ where: { id: req.params.id } }),
      ]);

      res.status(200).json({ message: 'تم حذف القسم وجميع منتجاته بنجاح', deletedProducts: productIds.length });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new CategoryController();