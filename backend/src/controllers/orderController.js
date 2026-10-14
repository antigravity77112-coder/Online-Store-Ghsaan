const prisma = require('../prismaClient');
const { ValidationError, UnauthorizedError } = require('../middleware/errorMiddleware');
const notificationService = require('../services/notificationService');
const couponService = require('../services/couponService');

// Map old numeric statuses used by the frontend to Prisma enum strings
const STATUS_MAP = {
  'Pending': 'Pending',
  'Confirmed': 'Confirmed',
  'Processing': 'Processing',
  'Shipped': 'Shipped',
  'Delivered': 'Delivered',
  'Cancelled': 'Cancelled',
  1: 'Pending',
  2: 'Confirmed',
  3: 'Processing',
  4: 'Shipped',
  5: 'Delivered',
  6: 'Cancelled'
};

// Statuses where stock has been decremented
const STOCK_DECREMENTED_STATUSES = ['Confirmed', 'Processing', 'Shipped', 'Delivered'];

const ORDER_CREATE_INCLUDE = {
  orderItems: {
    include: {
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
          currency: true,
          status: true,
          images: { where: { isPrimary: true }, take: 1 },
        },
      },
    },
  },
  buyer: { select: { id: true, fullName: true, phoneNumber: true } },
};

function resolveIdempotencyKey(req) {
  const fromHeader = req.get?.('Idempotency-Key') || req.headers?.['idempotency-key'];
  const fromBody = req.body?.idempotencyKey;
  const raw = String(fromHeader || fromBody || '').trim();
  return raw || null;
}

class OrderController {
  /**
   * Create a new order
   * POST /api/orders
   * Stock is validated but NOT decremented — admin must approve first.
   */
  async createOrder(req, res) {
    try {
      const requiredFields = ['shippingAddress', 'items'];
      for (const field of requiredFields) {
        if (!req.body[field]) {
          throw new ValidationError(`${field} is required`);
        }
      }

      const buyerId = req.user?.id;
      if (!buyerId) throw new UnauthorizedError('Unauthorized');

      const { shippingAddress, paymentMethod = 'COD', items, couponCode } = req.body;
      const idempotencyKey = resolveIdempotencyKey(req);
      const normalizedCoupon = couponService.normalizeCode(couponCode);

      if (idempotencyKey) {
        const existing = await prisma.order.findFirst({
          where: { buyerId, idempotencyKey },
          include: ORDER_CREATE_INCLUDE,
        });
        if (existing) {
          return res.status(200).json(existing);
        }
      }

      if (!Array.isArray(items) || items.length === 0) {
        throw new ValidationError('Order must contain at least one item');
      }

      let subtotal = 0;
      let orderCurrency = null;
      const resolvedItems = [];

      for (const item of items) {
        if (!item.productId || !item.quantity) {
          throw new ValidationError('Each item must have productId and quantity');
        }

        const product = await prisma.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new ValidationError(`Product not found: ${item.productId}`);
        if (product.status !== 'Active') throw new ValidationError(`Product is not available: ${product.title}`);
        if (product.stockQuantity < item.quantity) {
          throw new ValidationError(`الكمية المطلوبة من "${product.title}" (${item.quantity}) تتجاوز المخزون المتاح (${product.stockQuantity})`);
        }
        if (!orderCurrency) {
          orderCurrency = product.currency;
        } else if (orderCurrency !== product.currency) {
          throw new ValidationError('لا يمكن إتمام طلب واحد بعملات مختلفة. الرجاء إتمام كل عملة في طلب منفصل.');
        }

        // Use discountPrice if available (Mode A — no variants)
        const unitPrice = Number(product.discountPrice ?? product.price);
        subtotal += unitPrice * item.quantity;

        // Fetch primary image for snapshot (new architecture as source of truth)
        const primaryImage = await prisma.productImage.findFirst({
          where: { productId: product.id, isPrimary: true },
          select: { url: true },
        });

        resolvedItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice,
          // Populate snapshot fields at order creation time (immutable after this)
          productTitle: product.title,
          productImageUrl: primaryImage?.url ?? null,
          productSku: product.sku ?? null,
        });
      }

      let order;
      try {
        order = await prisma.$transaction(async (tx) => {
          let totalAmount = couponService.roundMoney(subtotal);
          let couponFields = {};

          if (normalizedCoupon) {
            const redeemed = await couponService.redeemInTransaction(tx, {
              code: normalizedCoupon,
              subtotal,
            });
            totalAmount = redeemed.totalAmount;
            couponFields = {
              couponId: redeemed.couponId,
              couponCode: redeemed.couponCode,
              discountType: redeemed.discountType,
              discountPercent: redeemed.discountPercent,
              discountAmount: redeemed.discountAmount,
              subtotalBeforeDiscount: redeemed.subtotalBeforeDiscount,
            };
          }

          const created = await tx.order.create({
            data: {
              buyerId,
              totalAmount,
              currency: orderCurrency || 'YER_Sanaa',
              shippingAddress,
              paymentMethod: paymentMethod || 'COD',
              status: 'Pending',
              ...(idempotencyKey ? { idempotencyKey } : {}),
              ...couponFields,
              orderItems: {
                create: resolvedItems.map((item) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  productTitle: item.productTitle,
                  productImageUrl: item.productImageUrl,
                  productSku: item.productSku,
                })),
              },
            },
            include: ORDER_CREATE_INCLUDE,
          });

          if (couponFields.couponId) {
            await tx.couponRedemption.create({
              data: {
                couponId: couponFields.couponId,
                orderId: created.id,
                discountAmount: couponFields.discountAmount,
              },
            });
          }

          return created;
        });
      } catch (err) {
        // Concurrent duplicate submit with same key — do not double-redeem
        if (err.code === 'P2002' && idempotencyKey) {
          const existing = await prisma.order.findFirst({
            where: { buyerId, idempotencyKey },
            include: ORDER_CREATE_INCLUDE,
          });
          if (existing) {
            return res.status(200).json(existing);
          }
        }
        throw err;
      }

      // Await push on Vercel — fire-and-forget is killed after the response
      try {
        await notificationService.notifyOrderPlaced(order);
      } catch (err) {
        console.error('[orders] notifyOrderPlaced:', err.message);
      }

      res.status(201).json(order);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user's orders
   * GET /api/orders/my-orders
   */
  async getMyOrders(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError('Unauthorized');

      const orders = await prisma.order.findMany({
        where: { buyerId: userId },
        select: {
          id: true,
          totalAmount: true,
          currency: true,
          status: true,
          shippingAddress: true,
          paymentMethod: true,
          orderDate: true,
          updatedAt: true,
          orderItems: {
            select: {
              id: true,
              quantity: true,
              unitPrice: true,
              productId: true,
              productTitle: true,
              productImageUrl: true,
              productSku: true,
              product: { select: { id: true, slug: true } },
            },
          },
        },
        orderBy: { orderDate: 'desc' },
      });

      res.json(orders);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Track a single order by code for current user
   * GET /api/orders/track/:code
   */
  async trackMyOrder(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedError('Unauthorized');

      const rawCode = String(req.params.code || '').trim();
      const normalizedCode = rawCode.replace(/^#/, '').toLowerCase();
      if (!normalizedCode) {
        throw new ValidationError('Order code is required');
      }

      const where = {
        buyerId: userId,
        id: normalizedCode.length < 36
          ? { startsWith: normalizedCode, mode: 'insensitive' }
          : normalizedCode
      };

      const order = await prisma.order.findFirst({
        where,
        include: {
          orderItems: {
            include: {
              product: {
                select: { id: true, title: true, slug: true, currency: true, condition: true, status: true,
                  images: { where: { isPrimary: true }, take: 1 } }
              }
            }
          },
          buyer: { select: { id: true, fullName: true, phoneNumber: true } }
        },
        orderBy: { orderDate: 'desc' }
      });

      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      res.json(order);
    } catch (error) {
      throw error;
    }
  }



  /**
   * Get all orders (Admin only)
   * GET /api/admin/orders?status=Pending&search=...
   */
  async getAllOrders(req, res) {
    try {
      const { status, search } = req.query;

      const where = {};

      // Filter by status
      if (status && status !== 'All') {
        const mappedStatus = STATUS_MAP[status];
        if (mappedStatus) {
          where.status = mappedStatus;
        }
      }

      // Search by buyer name or order ID
      if (search && search.trim()) {
        where.OR = [
          { buyer: { fullName: { contains: search, mode: 'insensitive' } } },
          { id: { contains: search, mode: 'insensitive' } }
        ];
      }

      const orders = await prisma.order.findMany({
        where,
        include: {
          buyer: { select: { id: true, fullName: true, phoneNumber: true, email: true } },
          orderItems: {
            include: {
              product: {
                select: { id: true, title: true, slug: true, currency: true, status: true, stockQuantity: true,
                  images: { where: { isPrimary: true }, take: 1 } }
              }
            }
          }
        },
        orderBy: { orderDate: 'desc' }
      });

      res.json(orders);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update order status (Admin)
   * PATCH /api/admin/orders/:id/status
   *
   * When approving (→ Confirmed): validates + decrements stock
   * When cancelling a confirmed order: restores stock
   */
  async updateOrderStatus(req, res) {
    try {
      const rawStatus = req.body.status;
      const mappedStatus = STATUS_MAP[rawStatus];
      if (!mappedStatus) {
        throw new ValidationError('Invalid order status. Valid values: Pending, Confirmed, Processing, Shipped, Delivered, Cancelled');
      }

      const order = await prisma.order.findUnique({
        where: { id: req.params.id },
        include: {
          orderItems: {
            include: {
              product: { select: { id: true, title: true, stockQuantity: true } }
            }
          }
        }
      });

      if (!order) {
        throw new ValidationError('Order not found');
      }

      const oldStatus = order.status;
      const newStatus = mappedStatus;

      // Prevent no-op
      if (oldStatus === newStatus) {
        return res.status(200).json({ message: 'Status unchanged' });
      }

      // ── APPROVING: Decrement stock ──
      // Moving from a non-decremented status to a decremented status
      const wasDecremented = STOCK_DECREMENTED_STATUSES.includes(oldStatus);
      const willDecrement = STOCK_DECREMENTED_STATUSES.includes(newStatus);

      if (!wasDecremented && willDecrement) {
        // Validate stock availability before approving
        for (const item of order.orderItems) {
          if (item.product.stockQuantity < item.quantity) {
            throw new ValidationError(
              `المخزون غير كافي للمنتج "${item.product.title}". المطلوب: ${item.quantity}, المتاح: ${item.product.stockQuantity}`
            );
          }
        }

        // Decrement stock in a batch transaction (avoids interactive transaction timeout)
        await prisma.$transaction([
          prisma.order.update({
            where: { id: req.params.id },
            data: { status: newStatus }
          }),
          ...order.orderItems.map(item =>
            prisma.product.update({
              where: { id: item.productId },
              data: { stockQuantity: { decrement: item.quantity } }
            })
          )
        ]);
      }
      // ── CANCELLING: Restore stock if it was previously decremented ──
      else if (wasDecremented && newStatus === 'Cancelled') {
  await prisma.$transaction([
          prisma.order.update({
            where: { id: req.params.id },
            data: { status: newStatus }
          }),
          ...order.orderItems.map(item =>
            prisma.product.update({
              where: { id: item.productId },
              data: { stockQuantity: { increment: item.quantity } }
            })
          )
        ]);
      }
      // ── SIMPLE STATUS CHANGE (no stock impact) ──
      else {
        await prisma.order.update({
          where: { id: req.params.id },
          data: { status: newStatus }
        });
      }

      try {
        await notificationService.notifyOrderStatusChanged(
          { id: order.id, buyerId: order.buyerId },
          newStatus,
        );
      } catch (err) {
        console.error('[orders] notifyOrderStatusChanged:', err.message);
      }

      // Low-stock alerts when confirming (stock decremented)
      if (!wasDecremented && willDecrement) {
        try {
          await Promise.all(
            order.orderItems.map(async (item) => {
              const prev = Number(item.product?.stockQuantity);
              const next = prev - Number(item.quantity || 0);
              await notificationService.notifyAdminsLowStock(
                { id: item.productId, title: item.product?.title, stockQuantity: next },
                prev,
              );
            }),
          );
        } catch (err) {
          console.error('[orders] low stock notify:', err.message);
        }
      }

      res.status(200).json({ message: 'تم تحديث حالة الطلب بنجاح', status: newStatus });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Re-send current status push to the buyer
   * POST /api/admin/orders/:id/notify
   */
  async resendOrderNotification(req, res) {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      select: { id: true, buyerId: true, status: true },
    });
    if (!order) {
      throw new ValidationError('Order not found');
    }
    const notification = await notificationService.notifyOrderStatusResend(order);
    res.json({ ok: true, sent: Boolean(notification), status: order.status });
  }
}

module.exports = new OrderController();