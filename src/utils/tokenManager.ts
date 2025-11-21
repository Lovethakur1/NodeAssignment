import jwt from 'jsonwebtoken';
import { config } from '../config';
import TokenBlacklist from '../models/TokenBlacklist.model';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Generate a JWT token for a user
 */
export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
};

/**
 * Verify a JWT token
 */
export const verifyToken = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Decode a JWT token without verification
 */
export const decodeToken = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.decode(token) as JwtPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Add token to blacklist
 */
export const blacklistToken = async (token: string): Promise<void> => {
  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.exp) {
      throw new Error('Invalid token');
    }

    const expiresAt = new Date(decoded.exp * 1000);

    await TokenBlacklist.create({
      token,
      expiresAt,
    });
  } catch (error) {
    throw new Error('Failed to blacklist token');
  }
};

/**
 * Check if token is blacklisted
 */
export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  try {
    const blacklistedToken = await TokenBlacklist.findOne({ token });
    return !!blacklistedToken;
  } catch (error) {
    return false;
  }
};

/**
 * Extract token from Authorization header
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7);
};
