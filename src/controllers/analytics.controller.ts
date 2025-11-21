import { Request, Response } from 'express';
import Task from '../models/Task.model';
import User from '../models/User.model';
import * as cacheService from '../services/cacheService';

/**
 * @swagger
 * /api/analytics/overview:
 *   get:
 *     summary: Get overall task statistics
 *     description: Returns comprehensive task statistics including counts, completion rates, status breakdown, and average completion time. Response may be served from Redis cache (10min TTL).
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics overview retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/AnalyticsOverview'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 */
export const getOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
      });
      return;
    }

    // Try cache first
    const cacheKey = cacheService.getAnalyticsKey('overview', req.user._id + ':' + req.user.role);
    const cachedData = await cacheService.get(cacheKey);
    
    if (cachedData) {
      res.status(200).json({
        success: true,
        data: cachedData,
        cached: true,
      });
      return;
    }

    // Build query based on user role
    const query: any = {};
    
    if (req.user.role === 'user') {
      // Users see only their own tasks
      query.$or = [
        { createdBy: req.user._id },
        { assignedTo: req.user._id },
      ];
    } else if (req.user.role === 'manager' && req.user.team) {
      // Managers see their team's tasks
      query.team = req.user.team;
    }
    // Admins see all tasks (no filter)

    const [totalTasks, completed, pending, overdue] = await Promise.all([
      Task.countDocuments(query),
      Task.countDocuments({ ...query, status: 'completed' }),
      Task.countDocuments({ ...query, status: { $in: ['todo', 'in-progress'] } }),
      Task.countDocuments({ ...query, status: 'overdue' }),
    ]);

    const completionRate = totalTasks > 0 ? (completed / totalTasks) * 100 : 0;

    const result = {
      totalTasks,
      completed,
      pending,
      overdue,
      completionRate: parseFloat(completionRate.toFixed(2)),
    };

    // Cache the result
    await cacheService.set(cacheKey, result, cacheService.CacheTTL.ANALYTICS);

    res.status(200).json({
      success: true,
      data: result,
      cached: false,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve analytics', code: 'ANALYTICS_ERROR' },
    });
  }
};

/**
 * @swagger
 * /api/analytics/tasks-by-status:
 *   get:
 *     summary: Get task count by status
 *     description: Returns task count breakdown by status (todo, in-progress, completed, overdue) based on user role and permissions.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Task status breakdown retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/TasksByStatus'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 */
export const getTasksByStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
      });
      return;
    }

    // Build base query
    const baseQuery: any = {};
    
    if (req.user.role === 'user') {
      baseQuery.$or = [
        { createdBy: req.user._id },
        { assignedTo: req.user._id },
      ];
    } else if (req.user.role === 'manager' && req.user.team) {
      baseQuery.team = req.user.team;
    }

    const [todo, inProgress, completed, overdue] = await Promise.all([
      Task.countDocuments({ ...baseQuery, status: 'todo' }),
      Task.countDocuments({ ...baseQuery, status: 'in-progress' }),
      Task.countDocuments({ ...baseQuery, status: 'completed' }),
      Task.countDocuments({ ...baseQuery, status: 'overdue' }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        todo,
        'in-progress': inProgress,
        completed,
        overdue,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve status breakdown', code: 'ANALYTICS_ERROR' },
    });
  }
};

/**
 * @swagger
 * /api/analytics/team/{teamName}:
 *   get:
 *     summary: Get team statistics (Manager/Admin only)
 *     description: Returns comprehensive team performance metrics including task counts, completion rates, and individual member statistics. Requires Manager or Admin role.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamName
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the team
 *         example: Engineering
 *     responses:
 *       200:
 *         description: Team statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/TeamStats'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Insufficient permissions (requires Manager or Admin)
 */
export const getTeamStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
      });
      return;
    }

    const { teamName } = req.params;

    // Access control: Managers can only see their own team, Admins can see all
    if (req.user.role === 'manager' && req.user.team !== teamName) {
      res.status(403).json({
        success: false,
        error: { message: 'You can only view your own team statistics', code: 'FORBIDDEN' },
      });
      return;
    }

    if (req.user.role === 'user') {
      res.status(403).json({
        success: false,
        error: { message: 'Insufficient permissions', code: 'FORBIDDEN' },
      });
      return;
    }

    // Get team tasks
    const [totalTasks, completed, pending, overdue] = await Promise.all([
      Task.countDocuments({ team: teamName }),
      Task.countDocuments({ team: teamName, status: 'completed' }),
      Task.countDocuments({ team: teamName, status: { $in: ['todo', 'in-progress'] } }),
      Task.countDocuments({ team: teamName, status: 'overdue' }),
    ]);

    // Get team members with their task counts
    const teamMembers = await User.find({ team: teamName }).select('_id username email');
    
    const membersWithStats = await Promise.all(
      teamMembers.map(async (member) => {
        const [tasksAssigned, tasksCompleted] = await Promise.all([
          Task.countDocuments({ assignedTo: member._id }),
          Task.countDocuments({ assignedTo: member._id, status: 'completed' }),
        ]);

        return {
          userId: member._id,
          username: member.username,
          email: member.email,
          tasksAssigned,
          tasksCompleted,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        team: teamName,
        totalTasks,
        completed,
        pending,
        overdue,
        members: membersWithStats,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve team statistics', code: 'ANALYTICS_ERROR' },
    });
  }
};

/**
 * @swagger
 * /api/analytics/user/{userId}:
 *   get:
 *     summary: Get user statistics
 *     description: Returns individual user task statistics including assigned tasks, completion rate, and average completion time. Users can only view their own stats unless they are Manager/Admin.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: 60d5ecb8b392f045c8d67392
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/UserStats'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Cannot view other users' statistics
 *       404:
 *         description: User not found
 */
export const getUserStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
      });
      return;
    }

    const { userId } = req.params;

    // Access control
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      res.status(404).json({
        success: false,
        error: { message: 'User not found', code: 'NOT_FOUND' },
      });
      return;
    }

    // Users can only see their own stats
    // Managers can see their team members' stats
    // Admins can see all users' stats
    const canAccess =
      req.user._id === userId ||
      req.user.role === 'admin' ||
      (req.user.role === 'manager' && req.user.team === targetUser.team);

    if (!canAccess) {
      res.status(403).json({
        success: false,
        error: { message: 'Insufficient permissions', code: 'FORBIDDEN' },
      });
      return;
    }

    const [totalAssigned, completed, pending, overdue, totalCreated] = await Promise.all([
      Task.countDocuments({ assignedTo: userId }),
      Task.countDocuments({ assignedTo: userId, status: 'completed' }),
      Task.countDocuments({ assignedTo: userId, status: { $in: ['todo', 'in-progress'] } }),
      Task.countDocuments({ assignedTo: userId, status: 'overdue' }),
      Task.countDocuments({ createdBy: userId }),
    ]);

    // Calculate average completion time for completed tasks
    const completedTasks = await Task.find({
      assignedTo: userId,
      status: 'completed',
      updatedAt: { $exists: true },
    }).select('createdAt updatedAt');

    let avgCompletionTime = 0;
    if (completedTasks.length > 0) {
      const totalTime = completedTasks.reduce((sum, task) => {
        const completionTime = (new Date(task.updatedAt).getTime() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24); // days
        return sum + completionTime;
      }, 0);
      avgCompletionTime = totalTime / completedTasks.length;
    }

    res.status(200).json({
      success: true,
      data: {
        userId: targetUser._id,
        username: targetUser.username,
        email: targetUser.email,
        totalAssigned,
        completed,
        pending,
        overdue,
        totalCreated,
        avgCompletionTime: parseFloat(avgCompletionTime.toFixed(2)) + ' days',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve user statistics', code: 'ANALYTICS_ERROR' },
    });
  }
};
