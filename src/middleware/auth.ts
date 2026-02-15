import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { verifyAccessToken } from '../utils/jwt';
import { AuthenticationError } from '../utils/errors';
import { isTokenBlacklisted } from '../config/redis';
import User from '../models/User';
import logger from '../utils/logger';

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Check if token is blacklisted (logged out)
    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new AuthenticationError('Token has been revoked');
    }

    // Verify token
    const decoded = verifyAccessToken(token);

    // Fetch user from database
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // Check if user is active
    if (user.status !== 'active') {
      throw new AuthenticationError('User account is not active');
    }

    // Attach user and token to request
    req.user = user;
    req.userId = user.id;
    req.token = token;
    (req as any).sessionId = decoded.sessionId; // Attach session ID for tracking

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      logger.warn(`Authentication failed: ${error.message}`);
      res.status(401).json({
        success: false,
        message: error.message,
        statusCode: 401,
      });
    } else {
      logger.error('Authentication error:', error);
      res.status(401).json({
        success: false,
        message: 'Authentication failed',
        statusCode: 401,
      });
    }
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
      return next();
    }

    const decoded = verifyAccessToken(token);

    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] },
    });

    if (user && user.status === 'active') {
      req.user = user;
      req.userId = user.id;
      req.token = token;
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};
