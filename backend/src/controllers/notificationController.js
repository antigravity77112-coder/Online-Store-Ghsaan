const notificationService = require('../services/notificationService');

class NotificationController {
  /**
   * GET /api/notifications
   */
  async list(req, res) {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const result = await notificationService.listUserNotifications(req.user.id, { page, pageSize });
    res.json(result);
  }

  /**
   * GET /api/notifications/unread-count
   */
  async unreadCount(req, res) {
    const result = await notificationService.getUnreadCount(req.user.id);
    res.json(result);
  }

  /**
   * PATCH /api/notifications/:id/read
   */
  async markRead(req, res) {
    const result = await notificationService.markNotificationRead(req.user.id, req.params.id);
    if (!result.updated) {
      res.status(404);
      throw new Error('Notification not found');
    }
    res.json({ ok: true });
  }

  /**
   * POST /api/notifications/read-all
   */
  async markAllRead(req, res) {
    const result = await notificationService.markAllNotificationsRead(req.user.id);
    res.json(result);
  }

  /**
   * POST /api/notifications/clear
   */
  async clearAll(req, res) {
    const result = await notificationService.clearAllNotifications(req.user.id);
    res.json(result);
  }

  /**
   * GET /api/notifications/preferences
   */
  async getPreferences(req, res) {
    const prefs = await notificationService.getPreferences(req.user.id);
    res.json({
      ordersEnabled: prefs.ordersEnabled,
      engagementEnabled: prefs.engagementEnabled,
      marketingEnabled: prefs.marketingEnabled,
    });
  }

  /**
   * PATCH /api/notifications/preferences
   */
  async updatePreferences(req, res) {
    const prefs = await notificationService.updatePreferences(req.user.id, req.body || {});
    res.json({
      ordersEnabled: prefs.ordersEnabled,
      engagementEnabled: prefs.engagementEnabled,
      marketingEnabled: prefs.marketingEnabled,
    });
  }

  /**
   * GET /api/admin/notifications
   */
  async adminList(req, res) {
    const result = await notificationService.listAdminNotifications({
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 30,
      channel: req.query.channel,
      type: req.query.type,
      userId: req.query.userId,
    });
    res.json(result);
  }

  /**
   * GET /api/admin/notifications/campaigns
   */
  async adminCampaigns(req, res) {
    const result = await notificationService.listCampaigns({
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 20,
    });
    res.json(result);
  }

  /**
   * POST /api/admin/notifications/broadcast
   */
  async adminBroadcast(req, res) {
    const { title, body, channel, audience, data } = req.body || {};
    const campaign = await notificationService.notifyBroadcast({
      title,
      body,
      channel: channel || 'marketing',
      audience: audience || 'all_customers',
      data: data || {},
      createdById: req.user.id,
    });
    res.status(201).json(campaign);
  }
}

module.exports = new NotificationController();
