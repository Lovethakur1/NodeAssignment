import { generateToken, verifyToken, extractTokenFromHeader } from '../../../src/utils/tokenManager';
import { config } from '../../../src/config';
import jwt from 'jsonwebtoken';

describe('Token Manager', () => {
  const testPayload = {
    userId: '60d5ecb8b392f045c8d67392',
    email: 'test@example.com',
    role: 'user',
  };

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(testPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include payload data in token', () => {
      const token = generateToken(testPayload);
      const decoded = jwt.verify(token, config.jwt.secret) as any;

      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
    });

    it('should set expiration time', () => {
      const token = generateToken(testPayload);
      const decoded = jwt.verify(token, config.jwt.secret) as any;

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = generateToken(testPayload);
      const decoded = verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(testPayload.userId);
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyToken('invalid.token.here')).toThrow();
    });

    it('should throw error for expired token', () => {
      const expiredToken = jwt.sign(testPayload, config.jwt.secret, { expiresIn: '0s' });

      // Wait a moment to ensure token is expired
      setTimeout(() => {
        expect(() => verifyToken(expiredToken)).toThrow();
      }, 100);
    });

    it('should throw error for token with wrong secret', () => {
      const wrongToken = jwt.sign(testPayload, 'wrong-secret');

      expect(() => verifyToken(wrongToken)).toThrow();
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Bearer header', () => {
      const token = 'test-token-123';
      const header = `Bearer ${token}`;

      const extracted = extractTokenFromHeader(header);

      expect(extracted).toBe(token);
    });

    it('should return null for missing header', () => {
      const extracted = extractTokenFromHeader(undefined);

      expect(extracted).toBeNull();
    });

    it('should return null for invalid format', () => {
      const extracted = extractTokenFromHeader('InvalidFormat token');

      expect(extracted).toBeNull();
    });

    it('should return null for Bearer without token', () => {
      const extracted = extractTokenFromHeader('Bearer ');

      expect(extracted).toBeNull();
    });
  });
});
