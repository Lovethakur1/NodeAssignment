import { Router } from 'express';
import {
  getOverview,
  getTasksByStatus,
  getTeamStats,
  getUserStats,
} from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All analytics routes require authentication
router.use(authenticate);

// Analytics endpoints
router.get('/overview', getOverview);
router.get('/tasks-by-status', getTasksByStatus);
router.get('/team/:teamName', getTeamStats);
router.get('/user/:userId', getUserStats);

export default router;
