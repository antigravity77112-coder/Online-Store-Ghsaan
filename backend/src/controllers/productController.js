const ProductService = require('../services/productService');
const { ValidationError } = require('../middleware/errorMiddleware');

class ProductController {
  constructor() {
    this.productService = new ProductService();
  }

  /**
   * Get products with filtering and pagination
   * GET /api/products
   */
  async getProducts(req, res) {
    try {
      const filters = {
        city: req.query.city,
        maxPriceUsd: req.query.maxPriceUsd ? parseFloat(req.query.maxPriceUsd) : undefined,
        condition: req.query.condition ? parseInt(req.query.condition) : undefined,
        specialOffers: req.query.specialOffers === 'true',
        trending: req.query.trending === 'true',
        search: req.query.search,
        categoryName: req.query.categoryName,
        categoryId: req.query.categoryId,
        brandId: req.query.brandId,
        scentId: req.query.scentId,
        scentSlug: req.query.scentSlug,
        // Attribute filters: ?attr[slug]=value  (e.g. ?attr[gender]=Men)
        attributes: req.query.attr || undefined,
      };
      
      const pagination = {
        pageNumber: parseInt(req.query.pageNumber) || 1,
        pageSize: parseInt(req.query.pageSize) || 10
      };

      const result = await this.productService.getProducts(filters, pagination);
      res.json(result);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get product by ID
   * GET /api/products/:id
   */
  async getProductById(req, res) {
    try {
      const product = await this.productService.getProductById(req.params.id);
      if (!product) {
        res.status(404);
        throw new Error('Product not found');
      }

      if (product.status !== 'Active') {
        const isAdmin = req.user?.role === 'Admin';
        if (!isAdmin) {
          res.status(404);
          throw new Error('Product not found');
        }
      }

      res.json(product);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get product by slug (SEO-friendly URL)
   * GET /api/products/by-slug/:slug
   */
  async getProductBySlug(req, res) {
    try {
      const product = await this.productService.getProductBySlug(req.params.slug);
      if (!product) {
        res.status(404);
        throw new Error('Product not found');
      }

      if (product.status !== 'Active') {
        const isAdmin = req.user?.role === 'Admin';
        if (!isAdmin) {
          res.status(404);
          throw new Error('Product not found');
        }
      }

      res.json(product);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new product
   * POST /api/products
   */
  async createProduct(req, res) {
    try {
      // Joi middleware already validates required fields; this guard only catches
      // truly absent values (0 is valid for stockQuantity).
      const requiredFields = ['title', 'description', 'price', 'currency', 'condition', 'stockQuantity', 'categoryId'];
      for (const field of requiredFields) {
        const value = req.body[field];
        if (value === undefined || value === null || value === '') {
          throw new ValidationError(`${field} is required`);
        }
      }

      const product = await this.productService.createProduct(req.body);
      res.status(201).json(product);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update product
   * PUT /api/products/:id
   */
  async updateProduct(req, res) {
    try {
      // Accept if body has no id (mobile client), or if it matches the param
      if (req.body.id && req.params.id !== req.body.id) {
        res.status(400);
        throw new Error('ID mismatch');
      }

      // Verify ownership
      if (req.user?.role !== 'Admin') {
        res.status(403);
        throw new Error('Forbidden: Admin only');
      }

      const updated = await this.productService.updateProduct(req.params.id, req.body);
      res.status(200).json(updated);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete product
   * DELETE /api/products/:id
   */
  async deleteProduct(req, res) {
    try {
      // Verify ownership
      if (req.user?.role !== 'Admin') {
        res.status(403);
        throw new Error('Forbidden: Admin only');
      }

      await this.productService.deleteProduct(req.params.id);
      res.status(204).send();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Toggle product visibility
   * PATCH /api/products/:id/toggle-visibility
   */
  async toggleVisibility(req, res) {
    try {
      // Verify ownership
      if (req.user?.role !== 'Admin') {
        res.status(403);
        throw new Error('Forbidden: Admin only');
      }

      await this.productService.toggleVisibility(req.params.id);
      res.status(204).send();
    } catch (error) {
      throw error;
    }
  }



  /**
   * Upload product image
   * POST /api/products/upload-image
   */
  async uploadImage(req, res) {
    try {
      if (!req.file) {
        res.status(400);
        throw new Error('No file uploaded');
      }

      // Convert multer file object to match our service expectation
      const file = {
        buffer: req.file.buffer,
        originalname: req.file.originalname
      };

      const url = await this.productService.uploadImage(file);
      res.json({ secure_url: url, url });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add an image to a product's gallery
   * POST /api/products/:id/images
   */
  async addProductImage(req, res) {
    try {
      const { url, altText, isPrimary, sortOrder } = req.body;
      if (!url) {
        res.status(400);
        throw new Error('Image URL is required');
      }
      // Verify ownership
      if (req.user?.role !== 'Admin') {
        res.status(403);
        throw new Error('Forbidden');
      }
      const image = await this.productService.addProductImage(req.params.id, {
        url, altText, isPrimary: isPrimary === true, sortOrder: sortOrder ?? 0,
      });
      res.status(201).json(image);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all images for a product
   * GET /api/products/:id/images
   */
  async getProductImages(req, res) {
    try {
      const images = await this.productService.getProductImages(req.params.id);
      res.json(images);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a product image
   * DELETE /api/products/:id/images/:imageId
   */
  async deleteProductImage(req, res) {
    try {
      if (req.user?.role !== 'Admin') {
        res.status(403);
        throw new Error('Forbidden');
      }
      await this.productService.deleteProductImage(req.params.id, req.params.imageId);
      res.status(204).send();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Set a specific image as the primary image for a product
   * PATCH /api/products/:id/images/:imageId/primary
   */
  async setImagePrimary(req, res) {
    try {
      if (req.user?.role !== 'Admin') {
        res.status(403);
        throw new Error('Forbidden');
      }
      const updated = await this.productService.setImagePrimary(req.params.id, req.params.imageId);
      res.json(updated);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reorder images for a product
   * PUT /api/products/:id/images/reorder
   * Body: { orderedIds: ["uuid1", "uuid2", ...] }
   */
  async reorderImages(req, res) {
    try {
      if (req.user?.role !== 'Admin') {
        res.status(403);
        throw new Error('Forbidden');
      }
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds)) {
        res.status(400);
        throw new Error('orderedIds must be an array of image IDs');
      }
      const images = await this.productService.reorderImages(req.params.id, orderedIds);
      res.json(images);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new ProductController();