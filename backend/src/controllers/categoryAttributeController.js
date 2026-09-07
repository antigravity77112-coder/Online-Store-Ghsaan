const categoryAttributeService = require('../services/categoryAttributeService');

class CategoryAttributeController {

  /**
   * GET /api/categories/:id/attributes
   * Public — needed for seller product form.
   * Optional query param: ?scope=PRODUCT,BOTH
   */
  async getAttributes(req, res) {
    try {
      const attrs = await categoryAttributeService.getByCategory(
        req.params.id,
        { scopeFilter: req.query.scope }
      );
      res.json(attrs);
    } catch (error) {
      throw error;
    }
  }

  /**
   * POST /api/categories/:id/attributes
   * Admin only.
   */
  async createAttribute(req, res) {
    try {
      const attr = await categoryAttributeService.create(req.params.id, req.body);
      res.status(201).json(attr);
    } catch (error) {
      throw error;
    }
  }

  /**
   * PUT /api/categories/:id/attributes/:attrId
   * Admin only.
   */
  async updateAttribute(req, res) {
    try {
      const attr = await categoryAttributeService.update(
        req.params.id,
        req.params.attrId,
        req.body
      );
      res.json(attr);
    } catch (error) {
      throw error;
    }
  }

  /**
   * DELETE /api/categories/:id/attributes/:attrId
   * Admin only.
   * Returns { deleted, attrId, affectedProducts } so admin can be informed.
   */
  async deleteAttribute(req, res) {
    try {
      const result = await categoryAttributeService.delete(
        req.params.id,
        req.params.attrId
      );
      res.json(result);
    } catch (error) {
      throw error;
    }
  }

  /**
   * PUT /api/categories/:id/attributes/reorder
   * Admin only.
   * Body: { orderedIds: ["uuid1", "uuid2", ...] }
   */
  async reorderAttributes(req, res) {
    try {
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds)) {
        res.status(400);
        throw new Error('orderedIds must be an array of attribute IDs');
      }
      const attrs = await categoryAttributeService.reorder(req.params.id, orderedIds);
      res.json(attrs);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new CategoryAttributeController();
