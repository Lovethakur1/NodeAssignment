import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check if authenticated user has required role(s)
 * @param roles - One or more roles that are allowed
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          message: `Access denied. Required role(s): ${roles.join(', ')}`,
          code: 'FORBIDDEN',
        },
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to require admin role
 */
export const requireAdmin = () => requireRole('admin');

/**
 * Middleware to require manager or admin role
 */
export const requireManager = () => requireRole('admin', 'manager');

/**
 * Middleware to allow authenticated users (any role)
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required',
        code: 'UNAUTHORIZED',
      },
    });
    return;
  }
  next();
};
