import jwt from 'jsonwebtoken';
import { config } from '../../src/config';

/**
 * Generate a test JWT token
 */
export const generateTestToken = (payload: {
  userId: string;
  email: string;
  role: string;
}): string => {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: '1h' });
};

/**
 * Create mock user object
 */
export const mockUser = (overrides: any = {}) => ({
  _id: '60d5ecb8b392f045c8d67392',
  username: 'testuser',
  email: 'test@example.com',
  role: 'user',
  team: 'Engineering',
  isEmailVerified: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create mock task object
 */
export const mockTask = (overrides: any = {}) => ({
  _id: '60d5ecb8b392f045c8d67393',
  title: 'Test Task',
  description: 'Test task description',
  status: 'todo',
  priority: 'medium',
  createdBy: '60d5ecb8b392f045c8d67392',
  assignedTo: null,
  team: 'Engineering',
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create mock admin user
 */
export const mockAdminUser = () =>
  mockUser({
    _id: '60d5ecb8b392f045c8d67391',
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin',
  });

/**
 * Create mock manager user
 */
export const mockManagerUser = () =>
  mockUser({
    _id: '60d5ecb8b392f045c8d67390',
    username: 'manager',
    email: 'manager@example.com',
    role: 'manager',
  });

/**
 * Mock Redis client
 */
export const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  quit: jest.fn(),
  on: jest.fn(),
};

/**
 * Mock Socket.io instance
 */
export const mockSocketIO = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
  on: jest.fn(),
};

/**
 * Mock Email transporter
 */
export const mockEmailTransporter = {
  sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
};
