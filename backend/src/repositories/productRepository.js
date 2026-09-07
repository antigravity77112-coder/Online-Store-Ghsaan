const prisma = require('../prismaClient');

class ProductRepository {
  /**
   * Get products with details (including category and seller)
   * @returns {Promise<Array>} List of products
   */
  async getProductsWithDetails() {
    return await prisma.product.findMany({
      where: { status: 'Active' },
      include: {
        category: {
          select: { name: true }
      }
    });
  }


  /**
   * Get all products with details
   * @returns {Promise<Array>} List of all products
   */
  async getAllProductsWithDetails() {
    return await prisma.product.findMany({
      include: {
        category: {
          select: { name: true }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get product by ID (including hidden products)
   * @param {string} id - Product ID
   * @returns {Promise<Object|null>} Product or null
   */
  async getByIdIncludingHidden(id) {
    return await prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: { name: true }
      }
    });
  }

  /**
   * Create a new product
   * @param {Object} data - Product data
   * @returns {Promise<Object>} Created product
   */
  async create(data) {
    return await prisma.product.create({ data });
  }

  /**
   * Find product by ID
   * @param {string} id - Product ID
   * @returns {Promise<Object|null>} Product or null
   */
  async findById(id) {
    return await prisma.product.findUnique({ where: { id } });
  }

  /**
   * Find one product by filter
   * @param {Object} filter - Filter conditions
   * @returns {Promise<Object|null>} Product or null
   */
  async findOne(filter) {
    return await prisma.product.findFirst({ where: filter });
  }

  /**
   * Find many products with filter and options
   * @param {Object} filter - Filter conditions
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of products
   */
  async findMany(filter = {}, options = {}) {
    return await prisma.product.findMany({
      where: filter,
      ...options
    });
  }

  /**
   * Update product by ID
   * @param {string} id - Product ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated product
   */
  async updateById(id, data) {
    return await prisma.product.update({
      where: { id },
      data
    });
  }

  /**
   * Delete product by ID
   * @param {string} id - Product ID
   * @returns {Promise<Object>} Deleted product
   */
  async deleteById(id) {
    return await prisma.product.delete({ where: { id } });
  }

  /**
   * Count products with filter
   * @param {Object} filter - Filter conditions
   * @returns {Promise<number>} Count
   */
  async count(filter = {}) {
    return await prisma.product.count({ where: filter });
  }
}

module.exports = ProductRepository;