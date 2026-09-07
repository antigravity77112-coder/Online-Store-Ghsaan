const prisma = require('../prismaClient');
const axios = require('axios');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_TOKEN_RE = /^ExponentPushToken\[.+\]$/;
const LOW_STOCK_THRESHOLD = 5;
const FANOUT_CHUNK = 80;

const ORDER_STATUS_COPY = {
  Pending: {
    type: 'order_placed',
    title: 'تم استلام طلبك',
    body: 'استلمنا طلبك وسنراجعه قريباً.',
  },
  Confirmed: {
    type: 'order_status',
    title: 'تم تأكيد طلبك',
    body: 'طلبك مؤكد وجاري تجهيزه.',
  },
  Processing: {
    type: 'order_status',
    title: 'جاري تجهيز طلبك',
    body: 'فريقنا يعمل على تجهيز طلبك الآن.',
  },
  Shipped: {
    type: 'order_status',
    title: 'تم شحن طلبك',
    body: 'طلبك في الطريق إليك.',
  },
  Delivered: {
    type: 'order_status',
    title: 'تم توصيل طلبك',
    body: 'نتمنى أن تنال عطورك إعجابك.',
  },
  Cancelled: {
    type: 'order_status',
    title: 'تم إلغاء طلبك',
    body: 'تم إلغاء الطلب. تواصل معنا إن احتجت مساعدة.',
  },
};

function isExpoPushToken(token) {
  return typeof token === 'string' && EXPO_TOKEN_RE.test(token.trim());
}

function normalizePlatform(platform) {
  const p = String(platform || '').toLowerCase();
  if (p === 'ios' || p === 'android') return p;
  return 'unknown';
}

function normalizeChannel(channel) {
  const c = String(channel || 'orders');
  if (c === 'engagement' || c === 'marketing' || c === 'system' || c === 'orders') return c;
  return 'orders';
}

function isChannelAllowed(prefs, channel) {
  const ch = normalizeChannel(channel);
  if (ch === 'system') return true;
  if (ch === 'orders') return prefs.ordersEnabled !== false;
  if (ch === 'engagement') return prefs.engagementEnabled !== false;
  if (ch === 'marketing') return prefs.marketingEnabled !== false;
  return true;
}

async function ensurePreferences(userId) {
  return prisma.notificationPreference.upsert({
    where: { userId },
    create: {
      userId,
      ordersEnabled: true,
      engagementEnabled: true,
      marketingEnabled: true,
    },
    update: {},
  });
}

async function getPreferences(userId) {
  return ensurePreferences(userId);
}

async function updatePreferences(userId, patch = {}) {
  const data = {};
  if (typeof patch.ordersEnabled === 'boolean') data.ordersEnabled = patch.ordersEnabled;
  if (typeof patch.engagementEnabled === 'boolean') data.engagementEnabled = patch.engagementEnabled;
  if (typeof patch.marketingEnabled === 'boolean') data.marketingEnabled = patch.marketingEnabled;
  return prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

/**
 * Register or refresh a device push token for the authenticated user.
 * If the token was previously tied to another user, it is reassigned.
 */
async function registerDeviceToken(userId, { token, platform, appVersion } = {}) {
  const trimmed = String(token || '').trim();
  if (!isExpoPushToken(trimmed)) {
    const err = new Error('Invalid Expo push token');
    err.statusCode = 400;
    throw err;
  }

  await ensurePreferences(userId);

  return prisma.deviceToken.upsert({
    where: { token: trimmed },
    create: {
      userId,
      token: trimmed,
      platform: normalizePlatform(platform),
      appVersion: appVersion ? String(appVersion).slice(0, 40) : null,
      lastSeenAt: new Date(),
    },
    update: {
      userId,
      platform: normalizePlatform(platform),
      appVersion: appVersion ? String(appVersion).slice(0, 40) : null,
      lastSeenAt: new Date(),
    },
  });
}

async function unregisterDeviceToken(userId, token) {
  const trimmed = String(token || '').trim();
  if (!trimmed) return { deleted: 0 };

  const result = await prisma.deviceToken.deleteMany({
    where: { userId, token: trimmed },
  });
  return { deleted: result.count };
}

async function unregisterAllDeviceTokens(userId) {
  const result = await prisma.deviceToken.deleteMany({ where: { userId } });
  return { deleted: result.count };
}

async function sendExpoPush(messages) {
  if (!messages.length) return [];

  const headers = {
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate',
    'Content-Type': 'application/json',
  };
  if (process.env.EXPO_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  }

  const allTickets = [];
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const res = await axios.post(EXPO_PUSH_URL, chunk, {
        headers,
        timeout: 12000,
        validateStatus: () => true,
      });
      if (res.status < 200 || res.status >= 300) {
        console.error('[notifications] Expo push HTTP error', res.status, res.data);
        allTickets.push(...chunk.map(() => null));
        continue;
      }
      const data = res.data?.data;
      if (Array.isArray(data)) allTickets.push(...data);
      else allTickets.push(...chunk.map(() => null));
    } catch (err) {
      console.error('[notifications] Expo push request failed:', err.message);
      allTickets.push(...chunk.map(() => null));
    }
  }
  return allTickets;
}

/**
 * Create a deduped notification and fan-out push to the user's devices.
 * Never throws to callers — business flows must not fail because of push.
 */
async function notifyUser({
  userId,
  type,
  title,
  body,
  data = {},
  dedupeKey,
  channel = 'orders',
  /** @deprecated use channel — kept for order helpers */
  requireOrdersEnabled,
}) {
  try {
    if (!userId || !dedupeKey || !title || !body) return null;

    const ch = normalizeChannel(channel);
    // Legacy: requireOrdersEnabled:false meant "always send" (system-like). Prefer channel:'system'.
    const effectiveChannel = requireOrdersEnabled === false && ch === 'orders' ? 'system' : ch;

    const prefs = await ensurePreferences(userId);
    if (!isChannelAllowed(prefs, effectiveChannel)) return null;

    let notification;
    try {
      notification = await prisma.notification.create({
        data: {
          userId,
          type,
          title,
          body,
          channel: effectiveChannel,
          data,
          dedupeKey,
        },
      });
    } catch (err) {
      if (err.code === 'P2002') return null;
      throw err;
    }

    const devices = await prisma.deviceToken.findMany({ where: { userId } });
    if (!devices.length) {
      console.warn(`[notifications] No device tokens for user ${userId} (type=${type})`);
      return notification;
    }

    const deliveries = await Promise.all(
      devices.map((device) => prisma.notificationDelivery.create({
        data: {
          notificationId: notification.id,
          deviceTokenId: device.id,
          status: 'pending',
          attempts: 1,
        },
      })),
    );

    const messages = devices.map((device) => ({
      to: device.token,
      sound: 'default',
      title,
      body,
      data: {
        type,
        ...(data.orderId ? { orderId: String(data.orderId) } : {}),
        ...(data.entityId ? { entityId: String(data.entityId) } : {}),
        ...(data.productId ? { productId: String(data.productId) } : {}),
      },
      channelId: effectiveChannel,
      priority: 'high',
    }));

    const tickets = await sendExpoPush(messages);

    await Promise.all(devices.map(async (device, index) => {
      const ticket = tickets[index];
      const delivery = deliveries[index];
      if (!delivery) return;

      if (!ticket) {
        await prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: { status: 'failed', providerResponse: 'no_ticket', attempts: 1 },
        });
        return;
      }

      if (ticket.status === 'ok') {
        await prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: 'sent',
            providerResponse: ticket.id ? String(ticket.id) : 'ok',
          },
        });
        return;
      }

      const errMsg = ticket.message || ticket.details?.error || 'push_error';
      const isInvalid = /DeviceNotRegistered|InvalidCredentials|not a registered/i.test(String(errMsg))
        || ticket.details?.error === 'DeviceNotRegistered';

      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: isInvalid ? 'invalid_token' : 'failed',
          providerResponse: String(errMsg).slice(0, 500),
        },
      });

      if (isInvalid) {
        await prisma.deviceToken.deleteMany({ where: { id: device.id } });
      }
    }));

    return notification;
  } catch (err) {
    console.error('[notifications] notifyUser failed:', err.message);
    return null;
  }
}

async function mapInChunks(items, chunkSize, mapper) {
  const results = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    // eslint-disable-next-line no-await-in-loop
    const part = await Promise.all(chunk.map(mapper));
    results.push(...part);
  }
  return results;
}

async function notifyOrderPlaced(order) {
  if (!order?.id || !order?.buyerId) return;
  const shortId = String(order.id).slice(0, 8).toUpperCase();
  const copy = ORDER_STATUS_COPY.Pending;

  await notifyUser({
    userId: order.buyerId,
    type: copy.type,
    title: copy.title,
    body: `${copy.body} (#${shortId})`,
    data: { orderId: order.id, entityId: order.id },
    dedupeKey: `${order.buyerId}:order_placed:${order.id}`,
    channel: 'orders',
  });

  const admins = await prisma.user.findMany({
    where: { role: 'Admin', isBlocked: false },
    select: { id: true },
  });

  await Promise.all(admins.map((admin) => notifyUser({
    userId: admin.id,
    type: 'admin_new_order',
    title: 'طلب جديد',
    body: `وصل طلب جديد #${shortId}`,
    data: { orderId: order.id, entityId: order.id },
    dedupeKey: `${admin.id}:admin_new_order:${order.id}`,
    channel: 'orders',
  })));
}

async function notifyOrderStatusChanged(order, newStatus) {
  if (!order?.id || !order?.buyerId || !newStatus) return;
  if (newStatus === 'Pending') return;

  const copy = ORDER_STATUS_COPY[newStatus];
  if (!copy) return;

  const shortId = String(order.id).slice(0, 8).toUpperCase();
  await notifyUser({
    userId: order.buyerId,
    type: copy.type,
    title: copy.title,
    body: `${copy.body} (#${shortId})`,
    data: { orderId: order.id, entityId: order.id, status: newStatus },
    dedupeKey: `${order.buyerId}:order_status:${order.id}:${newStatus}`,
    channel: 'orders',
  });
}

/** Re-send current status push (new dedupe suffix so it can fire again). */
async function notifyOrderStatusResend(order) {
  if (!order?.id || !order?.buyerId || !order?.status) return null;
  const status = order.status;
  const copy = ORDER_STATUS_COPY[status];
  if (!copy) return null;

  const shortId = String(order.id).slice(0, 8).toUpperCase();
  const stamp = Date.now();
  return notifyUser({
    userId: order.buyerId,
    type: copy.type,
    title: copy.title,
    body: `${copy.body} (#${shortId})`,
    data: { orderId: order.id, entityId: order.id, status },
    dedupeKey: `${order.buyerId}:order_status_resend:${order.id}:${status}:${stamp}`,
    channel: 'orders',
  });
}

async function notifyAdminsLowStock(product, previousStock) {
  try {
    if (!product?.id) return;
    const stock = Number(product.stockQuantity);
    const prev = previousStock == null ? null : Number(previousStock);
    if (!Number.isFinite(stock)) return;
    if (stock > LOW_STOCK_THRESHOLD) return;
    if (prev != null && Number.isFinite(prev) && prev <= LOW_STOCK_THRESHOLD) return;

    const day = new Date().toISOString().slice(0, 10);
    const title = 'تنبيه مخزون منخفض';
    const body = `"${product.title || 'منتج'}" وصل إلى ${stock} قطعة`;

    const admins = await prisma.user.findMany({
      where: { role: 'Admin', isBlocked: false },
      select: { id: true },
    });

    await mapInChunks(admins, FANOUT_CHUNK, (admin) => notifyUser({
      userId: admin.id,
      type: 'low_stock',
      title,
      body,
      data: { productId: product.id, entityId: product.id },
      dedupeKey: `${admin.id}:low_stock:${product.id}:${day}`,
      channel: 'system',
    }));
  } catch (err) {
    console.error('[notifications] notifyAdminsLowStock failed:', err.message);
  }
}

async function notifyEngagementNewProduct(product) {
  try {
    if (!product?.id || product.status !== 'Active') return;

    const tokenRows = await prisma.deviceToken.findMany({
      distinct: ['userId'],
      select: { userId: true },
    });
    if (!tokenRows.length) return;

    const buyers = await prisma.user.findMany({
      where: {
        id: { in: tokenRows.map((r) => r.userId) },
        role: 'Buyer',
        isBlocked: false,
      },
      select: { id: true },
    });

    const title = 'منتج جديد';
    const body = product.title
      ? `تصفّح ${product.title} الآن في المتجر`
      : 'أضفنا منتجاً جديداً إلى المتجر';

    await mapInChunks(buyers, FANOUT_CHUNK, (user) => notifyUser({
      userId: user.id,
      type: 'new_product',
      title,
      body,
      data: { productId: product.id, entityId: product.id },
      dedupeKey: `${user.id}:new_product:${product.id}`,
      channel: 'engagement',
    }));
  } catch (err) {
    console.error('[notifications] notifyEngagementNewProduct failed:', err.message);
  }
}

async function notifyBroadcast({
  title,
  body,
  channel = 'marketing',
  audience = 'all_customers',
  data = {},
  createdById,
}) {
  const ch = normalizeChannel(channel);
  if (ch !== 'marketing' && ch !== 'engagement') {
    const err = new Error('Broadcast channel must be marketing or engagement');
    err.statusCode = 400;
    throw err;
  }
  if (audience !== 'all_customers' && audience !== 'admins') {
    const err = new Error('Invalid audience');
    err.statusCode = 400;
    throw err;
  }
  if (!title?.trim() || !body?.trim()) {
    const err = new Error('Title and body are required');
    err.statusCode = 400;
    throw err;
  }

  const campaign = await prisma.notificationCampaign.create({
    data: {
      title: title.trim().slice(0, 120),
      body: body.trim().slice(0, 500),
      data: data || {},
      channel: ch,
      audience,
      createdById,
      sentCount: 0,
    },
  });

  let recipients = [];
  if (audience === 'admins') {
    recipients = await prisma.user.findMany({
      where: { role: 'Admin', isBlocked: false },
      select: { id: true },
    });
  } else {
    const tokenRows = await prisma.deviceToken.findMany({
      distinct: ['userId'],
      select: { userId: true },
    });
    recipients = await prisma.user.findMany({
      where: {
        id: { in: tokenRows.map((r) => r.userId) },
        isBlocked: false,
        role: { in: ['Buyer', 'Admin'] },
      },
      select: { id: true },
    });
  }

  const stamp = campaign.id;
  const results = await mapInChunks(recipients, FANOUT_CHUNK, (user) => notifyUser({
    userId: user.id,
    type: 'admin_broadcast',
    title: campaign.title,
    body: campaign.body,
    data: {
      ...(campaign.data && typeof campaign.data === 'object' ? campaign.data : {}),
      campaignId: campaign.id,
      productId: data?.productId,
      entityId: data?.productId || data?.entityId,
    },
    dedupeKey: `${user.id}:admin_broadcast:${stamp}`,
    channel: ch,
  }));

  const sentCount = results.filter(Boolean).length;
  await prisma.notificationCampaign.update({
    where: { id: campaign.id },
    data: { sentCount },
  });

  return { ...campaign, sentCount };
}

async function listUserNotifications(userId, { page = 1, pageSize = 20 } = {}) {
  const take = Math.min(50, Math.max(1, Number(pageSize) || 20));
  const skip = (Math.max(1, Number(page) || 1) - 1) * take;

  // Single query — skip total/unread counts (client doesn't need them on list).
  const items = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    skip,
    take,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      channel: true,
      data: true,
      readAt: true,
      createdAt: true,
    },
  });

  return {
    items,
    page: Math.max(1, Number(page) || 1),
    pageSize: take,
    hasMore: items.length === take,
  };
}

async function markNotificationRead(userId, notificationId) {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { readAt: new Date() },
  });
  return { updated: result.count };
}

async function markAllNotificationsRead(userId) {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: result.count };
}

async function clearAllNotifications(userId) {
  const result = await prisma.notification.deleteMany({ where: { userId } });
  return { deleted: result.count };
}

async function getUnreadCount(userId) {
  const unreadCount = await prisma.notification.count({
    where: { userId, readAt: null },
  });
  return { unreadCount };
}

async function listAdminNotifications({ page = 1, pageSize = 30, channel, type, userId } = {}) {
  const take = Math.min(100, Math.max(1, Number(pageSize) || 30));
  const skip = (Math.max(1, Number(page) || 1) - 1) * take;
  const where = {};
  if (channel) where.channel = normalizeChannel(channel);
  if (type) where.type = String(type);
  if (userId) where.userId = String(userId);

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true } },
      },
    }),
    prisma.notification.count({ where }),
  ]);

  return { items, page: Math.max(1, Number(page) || 1), pageSize: take, total };
}

async function listCampaigns({ page = 1, pageSize = 20 } = {}) {
  const take = Math.min(50, Math.max(1, Number(pageSize) || 20));
  const skip = (Math.max(1, Number(page) || 1) - 1) * take;
  const [items, total] = await Promise.all([
    prisma.notificationCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    }),
    prisma.notificationCampaign.count(),
  ]);
  return { items, page: Math.max(1, Number(page) || 1), pageSize: take, total };
}

module.exports = {
  isExpoPushToken,
  registerDeviceToken,
  unregisterDeviceToken,
  unregisterAllDeviceTokens,
  ensurePreferences,
  getPreferences,
  updatePreferences,
  notifyUser,
  notifyOrderPlaced,
  notifyOrderStatusChanged,
  notifyOrderStatusResend,
  notifyAdminsLowStock,
  notifyEngagementNewProduct,
  notifyBroadcast,
  listUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearAllNotifications,
  getUnreadCount,
  listAdminNotifications,
  listCampaigns,
  LOW_STOCK_THRESHOLD,
  ORDER_STATUS_COPY,
};
