const notificationService = require('../services/notificationService');
const { ValidationError } = require('../middleware/errorMiddleware');

class DeviceController {
  /** POST /api/devices/register */
  async register(req, res) {
    const userId = req.user.id;
    const { token, platform, appVersion } = req.body || {};
    try {
      const device = await notificationService.registerDeviceToken(userId, {
        token,
        platform,
        appVersion,
      });
      res.status(200).json({
        id: device.id,
        platform: device.platform,
        lastSeenAt: device.lastSeenAt,
      });
    } catch (err) {
      if (err.statusCode === 400) {
        throw new ValidationError(err.message || 'Invalid device token');
      }
      throw err;
    }
  }

  /** DELETE /api/devices/register  body: { token } */
  async unregister(req, res) {
    const userId = req.user.id;
    const token = req.body?.token || req.query?.token;
    const result = await notificationService.unregisterDeviceToken(userId, token);
    res.status(200).json(result);
  }

  /** DELETE /api/devices — clear all tokens for this user (logout) */
  async unregisterAll(req, res) {
    const result = await notificationService.unregisterAllDeviceTokens(req.user.id);
    res.status(200).json(result);
  }
}

module.exports = new DeviceController();
