const prisma = require('../prismaClient');
const AuthService = require('../services/authService');
const backupService = require('../services/backupService');
const { ValidationError, BadRequestError } = require('../middleware/errorMiddleware');

class AdminController {
  /**
   * Get dashboard statistics
   * GET /api/admin/dashboard
   */
  async getDashboardStats(req, res) {
    try {
      const [
        totalUsers,
        totalProducts,
        totalOrders,
        pendingOrders
      ] = await Promise.all([
        prisma.user.count(),
        prisma.product.count({ where: { status: 'Active' } }),
        prisma.order.count(),
        prisma.order.count({ where: { status: 'Pending' } })
      ]);

      res.json({
        totalUsers,
        totalSellers: 0,
        totalProducts,
        totalOrders,
        pendingOrders
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all users
   * GET /api/admin/users
   */
  async getAllUsers(req, res) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          fullName: true,
          phoneNumber: true,
          email: true,
          role: true,
          city: true,
          address: true,
          isVerified: true,
          isBlocked: true,
          createdAt: true,
          updatedAt: true
        }
      });
      res.json(users);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Block/unblock user
   * PATCH /api/admin/users/:id/block
   */
  async blockUser(req, res) {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.params.id } });
      if (!user) {
        res.status(404);
        throw new Error('User not found');
      }

      const newBlockedState = !user.isBlocked;

      await prisma.user.update({
        where: { id: req.params.id },
        data: { isBlocked: newBlockedState }
      });

      if (newBlockedState) {
        await new AuthService().revokeAllUserTokens(req.params.id);
      }

      res.status(204).send();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Change user role
   * PATCH /api/admin/users/:id/role
   */
  async changeUserRole(req, res) {
    try {
      const { newRole } = req.body;

      const validRoles = ['Admin', 'Buyer'];
      if (!newRole || !validRoles.includes(newRole)) {
        throw new BadRequestError('Invalid role');
      }

      const user = await prisma.user.findUnique({ where: { id: req.params.id } });
      if (!user) {
        res.status(404);
        throw new Error('User not found');
      }

      await prisma.user.update({
        where: { id: req.params.id },
        data: { role: newRole }
      });

      res.status(204).send();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete user
   * DELETE /api/admin/users/:id
   */
  async deleteUser(req, res) {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.params.id } });
      if (!user) {
        res.status(404);
        throw new Error('User not found');
      }

      await prisma.user.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Product inventory counts for admin products screen
   * GET /api/admin/products/stats
   */
  async getProductStats(req, res) {
    try {
      const [total, active, hidden, outOfStock, trending] = await Promise.all([
        prisma.product.count(),
        prisma.product.count({ where: { status: 'Active', stockQuantity: { gt: 0 } } }),
        prisma.product.count({ where: { status: 'Archived' } }),
        prisma.product.count({ where: { stockQuantity: 0 } }),
        prisma.product.count({ where: { isTrending: true } }),
      ]);

      res.json({ total, active, hidden, outOfStock, trending });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all products (for admin)
   * GET /api/admin/products
   */
  async getAllProducts(req, res) {
    try {
      const pageNumber = parseInt(req.query.pageNumber) || 1;
      const pageSize = parseInt(req.query.pageSize) || 15;
      const search = req.query.search || '';
      const status = req.query.status || 'all'; // all, active, hidden, outofstock
      
      let whereClause = {};

      if (search) {
        whereClause.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          // Prisma doesn't easily substring match UUIDs in postgres without raw query, so we do exact match if length is 36, or startsWith if supported.
          // Wait, 'contains' on String works on UUID fields if casted? No, in Prisma Postgres, String operations on UUID require specific syntax.
          // Let's search title and category name.
          { category: { name: { contains: search, mode: 'insensitive' } } }
        ];
        
        // If search looks like a partial UUID (at least 4 chars)
        if (search.length >= 4) {
          // We can't safely 'contains' a UUID field in standard prisma without throwing error if it's not a valid UUID string format.
          // We will skip UUID searching in DB unless it's exactly 36 chars.
          if (search.length === 36) {
            whereClause.OR.push({ id: search });
          }
        }
      }

      if (status === 'active') {
        whereClause.status = 'Active';
        whereClause.stockQuantity = { gt: 0 };
      } else if (status === 'hidden') {
        whereClause.status = 'Archived';
      } else if (status === 'outofstock') {
        whereClause.stockQuantity = 0;
      } else if (status === 'trending') {
        whereClause.isTrending = true;
      }

      let queryArgs = {
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true } },

          images: { orderBy: { sortOrder: 'asc' }, take: 1 }
        }
      };

      if (pageNumber && pageSize) {
        queryArgs.skip = (pageNumber - 1) * pageSize;
        queryArgs.take = pageSize;
      }

      const products = await prisma.product.findMany(queryArgs);
      // Add flat fields for frontend compatibility
      const mapped = products.map(p => ({
        ...p,
        categoryName: p.category?.name || null,
        sellerName: null,
        imageUrl: p.images?.[0]?.url ?? null
      }));
      res.json(mapped);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete product (for admin)
   * DELETE /api/admin/products/:id
   */
  async deleteProduct(req, res) {
    try {
      const product = await prisma.product.findUnique({ where: { id: req.params.id } });
      if (!product) {
        res.status(404);
        throw new Error('Product not found');
      }

      // orderItems: productId SET NULL automatically (DB-level FK)
      // cartItems, favorites, images: CASCADE from product delete
      await prisma.product.delete({ where: { id: req.params.id } });
      
      res.status(204).send();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Bulk update product status (isHidden)
   * PATCH /api/admin/products/bulk-status
   */
  async bulkUpdateProductStatus(req, res) {
    try {
      const { ids, isHidden } = req.body;
      const newStatus = isHidden ? 'Archived' : 'Active';
      await prisma.product.updateMany({
        where: { id: { in: ids } },
        data: { status: newStatus },
      });

      res.status(200).json({ message: 'Products status updated successfully' });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Bulk update product category
   * PATCH /api/admin/products/bulk-category
   */
  async bulkUpdateProductCategory(req, res) {
    try {
      const { ids, categoryId } = req.body;
      if (!Array.isArray(ids) || ids.length === 0 || !categoryId) {
        throw new BadRequestError('Product IDs and categoryId are required');
      }

      await prisma.product.updateMany({
        where: { id: { in: ids } },
        data: { categoryId }
      });

      res.status(200).json({ message: 'Products category updated successfully' });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Bulk delete products
   * DELETE /api/admin/products/bulk-delete
   */
  async bulkDeleteProducts(req, res) {
    try {
      const { ids } = req.body; // usually in query or body (if frontend sends body with DELETE)
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new BadRequestError('Product IDs are required');
      }

      // orderItems: productId SET NULL automatically (DB-level FK)
      // cartItems, favorites: CASCADE from product delete
      await prisma.product.deleteMany({ where: { id: { in: ids } } });
      
      res.status(200).json({ message: 'Products deleted successfully' });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Download a full store backup as .json.gz (v2 — catalog + commerce + rates).
   * GET /api/admin/backup
   * File is compressed only (not encrypted) and includes password hashes — treat as secret.
   */
  async downloadBackup(req, res) {
    try {
      const backupData = await backupService.buildBackupPayload(req.user?.id || 'Unknown Admin');

      if (req.user && req.user.id) {
        await prisma.auditLog.create({
          data: {
            action: 'BACKUP_DOWNLOADED',
            userId: req.user.id,
            details: 'Admin downloaded full store backup (v2.0)',
            ipAddress: req.ip || req.connection?.remoteAddress || null,
          },
        });
      }

      const gzipBuffer = backupService.gzipJson(backupData);
      const dateStr = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Disposition', `attachment; filename="gisaah_backup_${dateStr}.json.gz"`);
      res.setHeader('Content-Type', 'application/gzip');
      res.setHeader('Content-Length', gzipBuffer.length);
      res.end(gzipBuffer);
    } catch (error) {
      console.error('Backup generation failed:', error);
      throw error;
    }
  }

  /**
   * Restore database from a .json.gz backup file (v2 only).
   * POST /api/admin/restore
   * DESTRUCTIVE — replaces store tables. Prefer pg_dump for disaster recovery.
   */
  async restoreBackup(req, res) {
    if (!req.file) {
      throw new BadRequestError('لم يتم رفع أي ملف');
    }

    try {
      let backupPayload;
      try {
        backupPayload = backupService.parseBackupBuffer(req.file.buffer);
      } catch {
        throw new BadRequestError('الملف لا يحتوي على بيانات JSON صالحة. يرجى التأكد من رفع ملف النسخة الاحتياطية الصحيح.');
      }

      try {
        backupService.validateBackupPayload(backupPayload);
      } catch (err) {
        throw new BadRequestError(err.message || 'ملف النسخ الاحتياطي غير صالح');
      }

      await backupService.restoreFromPayload(backupPayload, {
        adminUserId: req.user?.id || null,
        ipAddress: req.ip || req.connection?.remoteAddress || null,
      });

      res.status(200).json({ message: 'تم استعادة قاعدة البيانات بنجاح' });
    } catch (error) {
      console.error('Restore failed:', error);
      if (error instanceof BadRequestError) {
        throw error;
      }
      if (error.statusCode === 400) {
        throw new BadRequestError(error.message);
      }
      throw new Error(error.message || 'فشل أثناء استعادة قاعدة البيانات');
    }
  }
}

module.exports = new AdminController();
