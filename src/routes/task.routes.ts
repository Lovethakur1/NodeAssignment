import { Router } from 'express';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  assignTask,
  getMyAssignedTasks,
  bulkAssignTasks,
  searchTasks,
} from '../controllers/task.controller';
import { validateTaskCreation, validateTaskUpdate } from '../utils/validators';
import { handleValidationErrors } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { requireManager } from '../middleware/rbac.middleware';

const router = Router();

// All task routes require authentication
router.use(authenticate);

// Phase 5: Enhanced assignment endpoints (must be before /:id)
router.get('/assigned-to-me', getMyAssignedTasks);
router.post('/bulk-assign', requireManager(), bulkAssignTasks);

// Phase 6: Advanced search endpoint (must be before /:id)
router.get('/search', searchTasks);

// Task CRUD operations
router.post('/', validateTaskCreation, handleValidationErrors, createTask);
router.get('/', getTasks);
router.get('/:id', getTaskById);
router.put('/:id', validateTaskUpdate, handleValidationErrors, updateTask);
router.delete('/:id', deleteTask);

// Task assignment (Manager/Admin only)
router.put('/:id/assign', requireManager(), assignTask);

export default router;
