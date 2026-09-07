const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');
const { UnauthorizedError, ForbiddenError } = require('./errorMiddleware');

const loadUserFromToken = async (token) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isVerified: true,
      isBlocked: true
    }
  });

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  if (user.isBlocked) {
    throw new UnauthorizedError('تم حظر حسابك. يرجى التواصل مع الدعم.');
  }

  return user;
};

const extractToken = (req) => {
  if (req.cookies?.auth_token) {
    return req.cookies.auth_token;
  }

  if (req.headers.authorization?.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }

  return null;
};

const protect = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new UnauthorizedError('Not authorized, no token');
    }

    try {
      req.user = await loadUserFromToken(token);
      return next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Token expired');
      }
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      console.error(error);
      throw new UnauthorizedError('Not authorized, token failed');
    }
  } catch (error) {
    next(error);
  }
};

const optionalProtect = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return next();
    }

    try {
      req.user = await loadUserFromToken(token);
    } catch (error) {
      if (error.name !== 'TokenExpiredError' && !(error instanceof UnauthorizedError)) {
        console.error(error);
      }
    }

    return next();
  } catch (error) {
    next(error);
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Not authorized'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('You do not have permission to access this resource'));
    }
    next();
  };
};

module.exports = { protect, optionalProtect, authorize };
