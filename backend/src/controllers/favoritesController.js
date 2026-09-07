const prisma = require('../prismaClient');

class FavoritesController {
  /**
   * GET /api/favorites
   * Get all favorites for the authenticated user
   */
  async getFavorites(req, res) {
    const userId = req.user.id;

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            category: true,
            images: { orderBy: { sortOrder: 'asc' }, take: 5 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map to a flat product shape the mobile app expects
    const products = favorites.map((f) => ({
      id: f.product.id,
      title: f.product.title,
      description: f.product.description,
      price: Number(f.product.price),
      discountPrice: f.product.discountPrice ? Number(f.product.discountPrice) : null,
      currency: f.product.currency,
      imageUrl: f.product.images?.[0]?.url ?? null,
      images: (f.product.images || []).map((img) => ({
        id: img.id,
        url: img.url,
        isPrimary: img.isPrimary,
        sortOrder: img.sortOrder,
      })),
      categoryName: f.product.category?.name || null,
      isPromoted: f.product.isPromoted,
      promotionLabel: f.product.promotionLabel,
      slug: f.product.slug,
      status: f.product.status,
      favoritedAt: f.createdAt,
    }));

    res.status(200).json({ favorites: products });
  }

  /**
   * POST /api/favorites
   * Add a product to favorites
   * Body: { productId }
   */
  async addFavorite(req, res) {
    const userId = req.user.id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'productId is required' });
    }

    // Upsert to prevent duplicates
    const favorite = await prisma.favorite.upsert({
      where: {
        userId_productId: { userId, productId },
      },
      update: {}, // Already exists, do nothing
      create: { userId, productId },
    });

    res.status(201).json({ message: 'Added to favorites', id: favorite.id });
  }

  /**
   * DELETE /api/favorites/:productId
   * Remove a product from favorites
   */
  async removeFavorite(req, res) {
    const userId = req.user.id;
    const { productId } = req.params;

    await prisma.favorite.deleteMany({
      where: { userId, productId },
    });

    res.status(200).json({ message: 'Removed from favorites' });
  }

  /**
   * POST /api/favorites/sync
   * Bulk sync favorites from the mobile app.
   * Body: { productIds: string[] }
   * This replaces ALL server-side favorites with the provided list.
   */
  async syncFavorites(req, res) {
    const userId = req.user.id;
    const { productIds } = req.body;

    if (!Array.isArray(productIds)) {
      return res.status(400).json({ message: 'productIds must be an array' });
    }

    // Transaction: delete all existing, then bulk insert the new set
    await prisma.$transaction(async (tx) => {
      await tx.favorite.deleteMany({ where: { userId } });

      if (productIds.length > 0) {
        await tx.favorite.createMany({
          data: productIds.map((productId) => ({ userId, productId })),
          skipDuplicates: true,
        });
      }
    });

    res.status(200).json({ message: 'Favorites synced', count: productIds.length });
  }
}

module.exports = new FavoritesController();
