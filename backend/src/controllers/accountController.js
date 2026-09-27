const AuthService = require('../services/authService');
const { ValidationError } = require('../middleware/errorMiddleware');

class AccountController {
  constructor() {
    this.authService = new AuthService();
  }

  getBaseCookieOptions() {
    const isProd = process.env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax'
    };
  }

  wantsTokensInBody(req) {
    return req.headers['x-client-type'] === 'mobile';
  }

  toClientAuthResponse(req, result) {
    if (this.wantsTokensInBody(req)) {
      return {
        userId: result.userId,
        fullName: result.fullName,
        email: result.email,
        role: result.role,
        city: result.city,
        preferredLanguage: result.preferredLanguage || 'ar',
        expiresIn: result.expiresIn,
        token: result.accessToken,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      };
    }

    return {
      userId: result.userId,
      fullName: result.fullName,
      email: result.email,
      role: result.role,
      city: result.city,
      preferredLanguage: result.preferredLanguage || 'ar',
      expiresIn: result.expiresIn
    };
  }

  getAccessCookieOptions() {
    return {
      ...this.getBaseCookieOptions(),
      maxAge: this.authService.getAccessCookieMaxAge()
    };
  }

  getRefreshCookieOptions() {
    return {
      ...this.getBaseCookieOptions(),
      path: '/api/account',
      maxAge: this.authService.getRefreshCookieMaxAge()
    };
  }

  getRequestMetadata(req) {
    return {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    };
  }

  setAuthCookies(res, result) {
    res.cookie('auth_token', result.accessToken, this.getAccessCookieOptions());
    res.cookie('refresh_token', result.refreshToken, this.getRefreshCookieOptions());
  }

  /**
   * Register a new user
   * POST /api/account/register
   */
  async register(req, res) {
    try {
      const requiredFields = [
        { key: 'fullName', label: 'الاسم الكامل' },
        { key: 'phoneNumber', label: 'رقم الهاتف' },
        { key: 'password', label: 'كلمة المرور' }
      ];
      for (const field of requiredFields) {
        if (!req.body[field.key]) {
          throw new ValidationError(`${field.label} مطلوب`);
        }
      }

      const result = await this.authService.register(req.body, this.getRequestMetadata(req));
      this.setAuthCookies(res, result);
      res.status(200).json(this.toClientAuthResponse(req, result));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Login user
   * POST /api/account/login
   */
  async login(req, res) {
    try {
      if (!req.body.phoneNumber || !req.body.password) {
        throw new ValidationError('رقم الهاتف وكلمة المرور مطلوبة');
      }

      const result = await this.authService.login(req.body, this.getRequestMetadata(req));
      this.setAuthCookies(res, result);
      res.status(200).json(this.toClientAuthResponse(req, result));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Refresh access token
   * POST /api/account/refresh
   */
  async refresh(req, res) {
    try {
      const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
      const result = await this.authService.refreshAccessToken(
        refreshToken,
        this.getRequestMetadata(req)
      );
      this.setAuthCookies(res, result);
      res.status(200).json(this.toClientAuthResponse(req, result));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Logout user
   * POST /api/account/logout
   */
  async logout(req, res) {
    const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
    await this.authService.revokeRefreshToken(refreshToken);

    const { maxAge: _accessMaxAge, ...accessClearOptions } = this.getAccessCookieOptions();
    const { maxAge: _refreshMaxAge, ...refreshClearOptions } = this.getRefreshCookieOptions();

    res.clearCookie('auth_token', accessClearOptions);
    res.clearCookie('refresh_token', refreshClearOptions);
    res.status(200).json({ message: 'Logged out successfully' });
  }

  /**
   * Get user profile
   * GET /api/account/profile
   */
  async getProfile(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401);
        throw new Error('Unauthorized');
      }

      const profile = await this.authService.getProfile(userId);
      res.status(200).json(profile);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user profile
   * PUT /api/account/profile
   */
  async updateProfile(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401);
        throw new Error('Unauthorized');
      }

      const updateData = { ...req.body };
      delete updateData.role;
      delete updateData._id;

      if (updateData.userId && updateData.userId !== userId && updateData.userId !== '') {
        res.status(403);
        throw new Error('Forbidden');
      }

      if (!updateData.userId || updateData.userId === '') {
        updateData.userId = userId;
      }

      await this.authService.updateProfile(userId, updateData);
      res.status(204).send();
    } catch (error) {
      throw error;
    }
  }
  /**
   * Change user password
   * PUT /api/account/change-password
   */
  async changePassword(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401);
        throw new Error('Unauthorized');
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        throw new ValidationError('كلمة المرور الحالية والجديدة مطلوبة');
      }

      await this.authService.changePassword(userId, currentPassword, newPassword);

      const { maxAge: _accessMaxAge, ...accessClearOptions } = this.getAccessCookieOptions();
      const { maxAge: _refreshMaxAge, ...refreshClearOptions } = this.getRefreshCookieOptions();
      res.clearCookie('auth_token', accessClearOptions);
      res.clearCookie('refresh_token', refreshClearOptions);

      res.status(200).json({ message: 'تم تغيير كلمة المرور بنجاح' });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete own account (Buyer or Admin; last Admin is blocked)
   * DELETE /api/account/me
   */
  async deleteAccount(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401);
        throw new Error('Unauthorized');
      }

      const { password, confirmation } = req.body;
      if (!password || !confirmation) {
        throw new ValidationError('كلمة المرور وتأكيد الحذف مطلوبان');
      }

      await this.authService.deleteAccount(userId, password);

      const { maxAge: _accessMaxAge, ...accessClearOptions } = this.getAccessCookieOptions();
      const { maxAge: _refreshMaxAge, ...refreshClearOptions } = this.getRefreshCookieOptions();
      res.clearCookie('auth_token', accessClearOptions);
      res.clearCookie('refresh_token', refreshClearOptions);

      res.status(200).json({ message: 'تم حذف الحساب بنجاح' });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AccountController();
