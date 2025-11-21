import { Router } from 'express';
import { register, login, logout, getProfile, listUsers, updateUserRole, deleteUser } from '../controllers/auth.controller';
import { validateRegistration, validateLogin } from '../utils/validators';
import { handleValidationErrors } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin, requireManager } from '../middleware/rbac.middleware';
import { authLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

// Public routes with rate limiting
router.post('/register', authLimiter, validateRegistration, handleValidationErrors, register);
router.post('/login', authLimiter, validateLogin, handleValidationErrors, login);

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/profile', authenticate, getProfile);

// Admin/Manager routes - User management
router.get('/users', authenticate, requireManager(), listUsers);
router.put('/users/:userId/role', authenticate, requireAdmin(), updateUserRole);
router.delete('/users/:userId', authenticate, requireAdmin(), deleteUser);

export default router;
