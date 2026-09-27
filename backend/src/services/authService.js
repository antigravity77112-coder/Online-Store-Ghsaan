const crypto = require('crypto');
const prisma = require('../prismaClient');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { UnauthorizedError, BadRequestError } = require('../middleware/errorMiddleware');

class AuthService {
  constructor() {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    this.jwtSecret = process.env.JWT_SECRET;
    this.accessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '15m';
    this.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
    this.accessExpiresMs = this.parseDuration(this.accessExpiresIn);
    this.refreshExpiresMs = this.parseDuration(this.refreshExpiresIn);
  }

  parseDuration(duration) {
    const match = String(duration).trim().match(/^(\d+)([smhd])$/i);
    if (!match) {
      return 3600000;
    }
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return value * multipliers[unit];
  }

  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  generateRefreshTokenValue() {
    return crypto.randomBytes(64).toString('hex');
  }

  buildAuthResponse(user, tokenPair) {
    return {
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      city: user.city,
      address: user.address,
      locationUrl: user.locationUrl,
      preferredLanguage: user.preferredLanguage,
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn
    };
  }

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @param {Object} metadata - Request metadata for refresh token storage
   * @returns {Promise<Object>} Auth response with user info and tokens
   */
  async register(userData, metadata = {}) {
    const { fullName, phoneNumber, password, city, address, locationUrl, preferredLanguage } = userData;
    const email = `${phoneNumber}@gisaah.com`;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { phoneNumber }
        ]
      }
    });
    if (existingUser) {
      throw new BadRequestError('رقم الهاتف مسجل بالفعل');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        fullName,
        phoneNumber,
        email,
        passwordHash,
        city,
        address,
        locationUrl: locationUrl || null,
        preferredLanguage: preferredLanguage === 'en' ? 'en' : 'ar',
        role: 'Buyer'
      }
    });

    const tokenPair = await this.createTokenPair(user, metadata);
    return this.buildAuthResponse(user, tokenPair);
  }

  /**
   * Login user
   * @param {Object} loginData - Login credentials
   * @param {Object} metadata - Request metadata for refresh token storage
   * @returns {Promise<Object>} Auth response with user info and tokens
   */
  async login(loginData, metadata = {}) {
    const { phoneNumber, password } = loginData;

    const user = await prisma.user.findFirst({ where: { phoneNumber } });
    if (!user) {
      throw new UnauthorizedError('رقم الهاتف أو كلمة المرور غير صحيحة');
    }

    if (user.isBlocked) {
      throw new UnauthorizedError('تم حظر حسابك. يرجى التواصل مع الدعم.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    const tokenPair = await this.createTokenPair(user, metadata);
    return this.buildAuthResponse(user, tokenPair);
  }

  /**
   * Issue a new access/refresh token pair using a valid refresh token
   * @param {string} refreshToken - Raw refresh token
   * @param {Object} metadata - Request metadata for the rotated refresh token
   * @returns {Promise<Object>} Auth response with new tokens
   */
  async refreshAccessToken(refreshToken, metadata = {}) {
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token required');
    }

    const tokenHash = this.hashToken(refreshToken);
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    if (stored.user.isBlocked) {
      await this.revokeAllUserTokens(stored.userId);
      throw new UnauthorizedError('تم حظر حسابك. يرجى التواصل مع الدعم.');
    }

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() }
    });

    const tokenPair = await this.createTokenPair(stored.user, metadata);
    return this.buildAuthResponse(stored.user, tokenPair);
  }

  /**
   * Revoke a single refresh token
   * @param {string} refreshToken - Raw refresh token
   */
  async revokeRefreshToken(refreshToken) {
    if (!refreshToken) {
      return;
    }

    const tokenHash = this.hashToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }

  /**
   * Revoke all active refresh tokens for a user
   * @param {string} userId - User ID
   */
  async revokeAllUserTokens(userId) {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }

  /**
   * Get user profile
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User profile data
   */
  async getProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        email: true,
        role: true,
        city: true,
        address: true,
        locationUrl: true,
        preferredLanguage: true,
        isVerified: true,
        isBlocked: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated user
   */
  async updateProfile(userId, updateData) {
    const { id: _, userId: ____, passwordHash: __, role: ___, ...dataToUpdate } = updateData;

    const user = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        email: true,
        role: true,
        city: true,
        address: true,
        locationUrl: true,
        preferredLanguage: true,
        isVerified: true,
        isBlocked: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  /**
   * Generate short-lived JWT access token for user
   * @param {Object} user - User object
   * @returns {string} JWT token
   */
  generateAccessToken(user) {
    const payload = {
      userId: user.id,
      role: user.role
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.accessExpiresIn });
  }

  /**
   * Persist a refresh token and return a new access/refresh pair
   * @param {Object} user - User object
   * @param {Object} metadata - Request metadata
   * @returns {Promise<Object>} Token pair
   */
  async createTokenPair(user, metadata = {}) {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshTokenValue();
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + this.refreshExpiresMs);

    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
        userAgent: metadata.userAgent,
        ipAddress: metadata.ipAddress
      }
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: Math.floor(this.accessExpiresMs / 1000)
    };
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} Success indicator
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('كلمة المرور الحالية غير صحيحة');
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash }
    });

    await this.revokeAllUserTokens(userId);

    return true;
  }

  /**
   * Permanently delete the authenticated account (Buyer or Admin).
   * Removes orders (and line items) first because Order.buyerId has no onDelete cascade.
   * Blocks deleting the last remaining Admin so the store is not locked out.
   */
  async deleteAccount(userId, password) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestError('المستخدم غير موجود');
    }

    if (user.role === 'Admin') {
      const adminCount = await prisma.user.count({ where: { role: 'Admin' } });
      if (adminCount <= 1) {
        throw new BadRequestError(
          'لا يمكن حذف حساب المسؤول الوحيد. أنشئ مسؤولاً آخر أولاً ثم أعد المحاولة.',
        );
      }
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('كلمة المرور غير صحيحة');
    }

    await prisma.$transaction(async (tx) => {
      const orders = await tx.order.findMany({
        where: { buyerId: userId },
        select: { id: true },
      });
      const orderIds = orders.map((o) => o.id);
      if (orderIds.length > 0) {
        await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.order.deleteMany({ where: { buyerId: userId } });
      }

      await tx.auditLog.updateMany({
        where: { userId },
        data: { userId: null },
      });

      await tx.user.delete({ where: { id: userId } });
    });

    return true;
  }

  getAccessCookieMaxAge() {
    return this.accessExpiresMs;
  }

  getRefreshCookieMaxAge() {
    return this.refreshExpiresMs;
  }
}

module.exports = AuthService;
