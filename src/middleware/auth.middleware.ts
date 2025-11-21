import { Request, Response, NextFunction } from 'express';
import {
  verifyToken,
  extractTokenFromHeader,
  isTokenBlacklisted,
} from '../utils/tokenManager';
import User from '../models/User.model';

/**
 * Middleware to authenticate user using JWT token
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required. Please provide a valid token',
          code: 'NO_TOKEN',
        },
      });
      return;
    }

    // Check if token is blacklisted
    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Token has been invalidated. Please login again',
          code: 'TOKEN_BLACKLISTED',
        },
      });
      return;
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Invalid or expired token',
          code: 'INVALID_TOKEN',
        },
      });
      return;
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        },
      });
      return;
    }

    // Attach user to request
    req.user = user as any;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Authentication failed',
        code: 'AUTH_ERROR',
      },
    });
  }
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return next();
    }

    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
      return next();
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return next();
    }

    const user = await User.findById(decoded.userId);
    if (user) {
      req.user = user as any;
    }

    next();
  } catch (error) {
    next();
  }
};
