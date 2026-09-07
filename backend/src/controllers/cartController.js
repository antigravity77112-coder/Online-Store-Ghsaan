const prisma = require('../prismaClient');

class CartController {
  /**
   * GET /api/cart
   * Get all cart items for the authenticated user
   */
  async getCart(req, res) {
    const userId = req.user.id;

    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            category: true,
            images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map to a shape the mobile app expects
    const items = cartItems.map((ci) => ({
      id: ci.product.id,
      title: ci.product.title,
      price: Number(ci.product.discountPrice || ci.product.price),
      originalPrice: Number(ci.product.price),
      currency: ci.product.currency,
      imageUrl: ci.product.images?.[0]?.url ?? null,
      slug: ci.product.slug,
      status: ci.product.status,
      categoryName: ci.product.category?.name || null,
      quantity: ci.quantity,
      stockQuantity: ci.product.stockQuantity != null ? Number(ci.product.stockQuantity) : 0,
    }));

    res.status(200).json({ cartItems: items });
  }

  /**
   * POST /api/cart
   * Add or increment a product in the cart
   * Body: { productId, quantity? }
   */
  async addToCart(req, res) {
    const userId = req.user.id;
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'productId is required' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, stockQuantity: true, status: true },
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const stockCap = Math.max(0, Number(product.stockQuantity) || 0);
    if (stockCap <= 0) {
      return res.status(400).json({ message: 'Product is out of stock', stockQuantity: 0 });
    }

    const existing = await prisma.cartItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    const currentQty = existing?.quantity || 0;
    const requested = Math.max(1, Number(quantity) || 1);
    const nextQty = Math.min(currentQty + requested, stockCap);

    if (nextQty <= currentQty) {
      return res.status(400).json({
        message: 'Cannot exceed available stock',
        stockQuantity: stockCap,
        quantity: currentQty,
      });
    }

    const cartItem = await prisma.cartItem.upsert({
      where: {
        userId_productId: { userId, productId },
      },
      update: {
        quantity: nextQty,
      },
      create: { userId, productId, quantity: nextQty },
    });

    res.status(201).json({
      message: 'Added to cart',
      id: cartItem.id,
      quantity: cartItem.quantity,
      stockQuantity: stockCap,
    });
  }

  /**
   * PUT /api/cart/:productId
   * Set the quantity for a cart item
   * Body: { quantity }
   */
  async updateCartItem(req, res) {
    const userId = req.user.id;
    const { productId } = req.params;
    const { quantity } = req.body;

    if (quantity == null || quantity < 1) {
      return res.status(400).json({ message: 'quantity must be >= 1' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { stockQuantity: true },
    });
    const stockCap = product ? Math.max(0, Number(product.stockQuantity) || 0) : null;
    const nextQty = stockCap != null ? Math.min(Number(quantity), stockCap) : Number(quantity);

    if (stockCap != null && stockCap <= 0) {
      return res.status(400).json({ message: 'Product is out of stock', stockQuantity: 0 });
    }

    if (stockCap != null && Number(quantity) > stockCap) {
      await prisma.cartItem.updateMany({
        where: { userId, productId },
        data: { quantity: nextQty },
      });
      return res.status(200).json({
        message: 'Cart updated to max stock',
        quantity: nextQty,
        stockQuantity: stockCap,
        capped: true,
      });
    }

    await prisma.cartItem.updateMany({
      where: { userId, productId },
      data: { quantity: nextQty },
    });

    res.status(200).json({ message: 'Cart updated', quantity: nextQty });
  }

  /**
   * DELETE /api/cart/:productId
   * Remove a product from the cart
   */
  async removeFromCart(req, res) {
    const userId = req.user.id;
    const { productId } = req.params;

    await prisma.cartItem.deleteMany({
      where: { userId, productId },
    });

    res.status(200).json({ message: 'Removed from cart' });
  }

  /**
   * POST /api/cart/sync
   * Bulk sync the entire cart from the mobile app.
   * Body: { items: [{ productId, quantity }] }
   * This replaces ALL server-side cart items with the provided list.
   */
  async syncCart(req, res) {
    const userId = req.user.id;
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ message: 'items must be an array' });
    }

    const productIds = [...new Set(items.map((i) => i.productId).filter(Boolean))];
    const products = productIds.length
      ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, stockQuantity: true },
      })
      : [];
    const stockById = new Map(
      products.map((p) => [p.id, Math.max(0, Number(p.stockQuantity) || 0)]),
    );

    const clamped = [];
    for (const item of items) {
      if (!item?.productId) continue;
      const stockCap = stockById.has(item.productId)
        ? stockById.get(item.productId)
        : null;
      let qty = Math.max(1, Number(item.quantity) || 1);
      if (stockCap != null) {
        if (stockCap <= 0) continue;
        qty = Math.min(qty, stockCap);
      }
      clamped.push({ userId, productId: item.productId, quantity: qty });
    }

    await prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({ where: { userId } });

      if (clamped.length > 0) {
        await tx.cartItem.createMany({
          data: clamped,
          skipDuplicates: true,
        });
      }
    });

    res.status(200).json({ message: 'Cart synced', count: clamped.length });
  }

  /**
   * DELETE /api/cart
   * Clear the entire cart
   */
  async clearCart(req, res) {
    const userId = req.user.id;
    await prisma.cartItem.deleteMany({ where: { userId } });
    res.status(200).json({ message: 'Cart cleared' });
  }
}

module.exports = new CartController();
