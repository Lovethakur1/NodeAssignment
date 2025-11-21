import { Request, Response } from 'express';
import Task from '../models/Task.model';
import User from '../models/User.model';
import { canAccessTask, canAssignTask } from '../utils/permissions';
import * as cacheService from '../services/cacheService';

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
*                 example: Implement user authentication
 *               description:
 *                 type: string
 *                 example: Add JWT-based authentication system
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2024-12-31T23:59:59Z
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 example: high
 *               assignedTo:
 *                 type: string
 *                 description: User ID to assign task (Manager/Admin only)
 *     responses:
 *       201:
 *         description: Task created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Cannot assign tasks (insufficient permissions)
 */
export const createTask = async (req: Request, res: Response): Promise<void> => {
  try {
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

    const { title, description, dueDate, priority, assignedTo } = req.body;

    // Check if user can assign tasks
    if (assignedTo && assignedTo !== req.user._id) {
      if (!canAssignTask(req.user)) {
        res.status(403).json({
          success: false,
          error: {
            message: 'You do not have permission to assign tasks to others',
            code: 'FORBIDDEN',
          },
        });
        return;
      }
    }

    // Create task
    const task = await Task.create({
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      priority: priority || 'medium',
      createdBy: req.user._id,
      assignedTo: assignedTo || req.user._id, // Default to creator
      team: req.user.team,
    });

    // Populate user references
    await task.populate('createdBy assignedTo', 'username email role');

    // Send email notification if assigned to someone else
    if (assignedTo && assignedTo !== req.user._id) {
      try {
        const { sendTaskAssignmentEmail } = await import('../services/emailService');
        const assigneeDoc = task.assignedTo as any;
        
        if (assigneeDoc && assigneeDoc.email) {
          await sendTaskAssignmentEmail(
            assigneeDoc,
            task as any,
            req.user
          );
        }
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
      }
    }

    // Real-time notification
    try {
      const { notifyTaskCreated } = await import('../services/socketService');
      await task.populate('createdBy assignedTo', 'username email role');
      notifyTaskCreated(task);
    } catch (wsError) {
      console.error('WebSocket notification failed:', wsError);
    }

    // Invalidate caches
    await cacheService.invalidateTaskCaches();

    res.status(201).json({
      success: true,
      data: {
        message: 'Task created successfully',
        task,
      },
    });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: Object.values(error.errors).map((err: any) => err.message),
        },
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to create task',
        code: 'CREATE_TASK_ERROR',
      },
    });
  }
};

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Get all tasks (role-based filtering)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [todo, in-progress, completed, overdue]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, dueDate, priority]
 *           default: createdAt
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Tasks retrieved successfully
 */
export const getTasks = async (req: Request, res: Response): Promise<void> => {
  try {
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

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const { status, priority, sortBy = 'createdAt', order = 'desc' } = req.query;

    // Build query based on user role
    const query: any = {};

    if (req.user.role === 'user') {
      // Users can only see tasks created by or assigned to them
      query.$or = [
        { createdBy: req.user._id },
        { assignedTo: req.user._id },
      ];
    } else if (req.user.role === 'manager' && req.user.team) {
      // Managers can see all tasks in their team
      query.team = req.user.team;
    }
    // Admins can see all tasks (no filter)

    // Apply filters
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const skip = (page - 1) * limit;
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortField: any = {};
    sortField[sortBy as string] = sortOrder;

    const [tasks, total] = await Promise.all([
      Task.find(query)
        .populate('createdBy assignedTo', 'username email role')
        .skip(skip)
        .limit(limit)
        .sort(sortField),
      Task.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        tasks,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve tasks',
        code: 'GET_TASKS_ERROR',
      },
    });
  }
};

/**
 * @swagger
 * /api/tasks/assigned-to-me:
 *   get:
 *     summary: Get tasks assigned to the current user
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [todo, in-progress, completed, overdue]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *     responses:
 *       200:
 *         description: Assigned tasks retrieved successfully
 */
export const getMyAssignedTasks = async (req: Request, res: Response): Promise<void> => {
  try {
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

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const { status, priority } = req.query;

    const query: any = {
      assignedTo: req.user._id,
    };

    // Apply filters
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      Task.find(query)
        .populate('createdBy assignedTo', 'username email role')
        .skip(skip)
        .limit(limit)
        .sort({ dueDate: 1, createdAt: -1 }), // Sort by due date (urgent first), then newest
      Task.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        tasks,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve assigned tasks',
        code: 'GET_ASSIGNED_TASKS_ERROR',
      },
    });
  }
};

/**
 * @swagger
 * /api/tasks/bulk-assign:
 *   post:
 *     summary: Bulk assign tasks (Manager/Admin only)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
*     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskIds
 *               - assignedTo
 *             properties:
 *               taskIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["id1", "id2", "id3"]
 *               assignedTo:
 *                 type: string
 *                 description: User ID to assign tasks to
 *     responses:
 *       200:
 *         description: Tasks assigned successfully
 *       403:
 *         description: Insufficient permissions
 */
export const bulkAssignTasks = async (req: Request, res: Response): Promise<void> => {
  try {
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

    if (!canAssignTask(req.user)) {
      res.status(403).json({
        success: false,
        error: {
          message: 'You do not have permission to assign tasks',
          code: 'FORBIDDEN',
        },
      });
      return;
    }

    const { taskIds, assignedTo } = req.body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      res.status(400).json({
        success: false,
        error: {
          message: 'taskIds must be a non-empty array',
          code: 'INVALID_INPUT',
        },
      });
      return;
    }

    // Verify assignee exists
    const assignee = await User.findById(assignedTo);
    if (!assignee) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Assignee user not found',
          code: 'USER_NOT_FOUND',
        },
      });
      return;
    }

    // Update all tasks
    const result = await Task.updateMany(
      { _id: { $in: taskIds } },
      { $set: { assignedTo } }
    );

    // Send notification emails
    try {
      const { sendTaskAssignmentEmail } = await import('../services/emailService');
      const tasks = await Task.find({ _id: { $in: taskIds } }).limit(10); // Send emails for first 10

      for (const task of tasks) {
        try {
          await sendTaskAssignmentEmail(assignee as any, task as any, req.user);
        } catch (emailError) {
          console.error('Failed to send email for task:', task._id);
        }
      }
    } catch (emailError) {
      console.error('Bulk email notification failed:', emailError);
    }

    res.status(200).json({
      success: true,
      data: {
        message: `Successfully assigned ${result.modifiedCount} task(s)`,
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to bulk assign tasks',
        code: 'BULK_ASSIGN_ERROR',
      },
    });
  }
};
/**
 * Append missing CRUD functions for Phase 4/5
 */

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: Get a single task by ID
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task retrieved successfully
 *       404:
 *         description: Task not found
 */
export const getTaskById = async (req: Request, res: Response): Promise<void> => {
  try {
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

    const { id } = req.params;
    const task = await Task.findById(id).populate('createdBy assignedTo', 'username email role');

    if (!task) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Task not found',
          code: 'NOT_FOUND',
        },
      });
      return;
    }

    // Check access permission
    if (!canAccessTask(req.user, task as any)) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Task not found',
          code: 'NOT_FOUND',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { task },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve task',
        code: 'GET_TASK_ERROR',
      },
    });
  }
};

/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     summary: Update a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *               status:
 *                 type: string
 *                 enum: [todo, in-progress, completed, overdue]
 *     responses:
 *       200:
 *         description: Task updated successfully
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Task not found
 */
export const updateTask = async (req: Request, res: Response): Promise<void> => {
  try {
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

    const { id } = req.params;
    const { title, description, dueDate, priority, status } = req.body;

    const task = await Task.findById(id);

    if (!task) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Task not found',
          code: 'NOT_FOUND',
        },
      });
      return;
    }

    // Check access permission
    if (!canAccessTask(req.user, task as any)) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Task not found',
          code: 'NOT_FOUND',
        },
      });
      return;
    }

    // Update fields
    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : undefined;
    if (priority) task.priority = priority;
    if (status) task.status = status;

    await task.save();
    await task.populate('createdBy assignedTo', 'username email role');

    // Invalidate caches
    await cacheService.invalidateTaskCaches();

    res.status(200).json({
      success: true,
      data: {
        message: 'Task updated successfully',
        task,
      },
    });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: Object.values(error.errors).map((err: any) => err.message),
        },
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update task',
        code: 'UPDATE_TASK_ERROR',
      },
    });
  }
};

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Task not found
 */
export const deleteTask = async (req: Request, res: Response): Promise<void> => {
  try {
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

    const { id } = req.params;
    const task = await Task.findById(id);

    if (!task) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Task not found',
          code: 'NOT_FOUND',
        },
      });
      return;
    }

    // Check access permission
    if (!canAccessTask(req.user, task as any)) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Task not found',
          code: 'NOT_FOUND',
        },
      });
      return;
    }

    await task.deleteOne();

    // Invalidate caches
    await cacheService.invalidateTaskCaches();

    res.status(200).json({
      success: true,
      data: {
        message: 'Task deleted successfully',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete task',
        code: 'DELETE_TASK_ERROR',
      },
    });
  }
};

/**
 * @swagger
 * /api/tasks/{id}/assign:
 *   put:
 *     summary: Assign a task to a user (Manager/Admin only)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assignedTo
 *             properties:
 *               assignedTo:
 *                 type: string
 *                 description: User ID to assign task to
 *     responses:
 *       200:
 *         description: Task assigned successfully
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Task not found
 */
export const assignTask = async (req: Request, res: Response): Promise<void> => {
  try {
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

    // Check if user can assign tasks
    if (!canAssignTask(req.user)) {
      res.status(403).json({
        success: false,
        error: {
          message: 'You do not have permission to assign tasks',
          code: 'FORBIDDEN',
        },
      });
      return;
    }

    const { id } = req.params;
    const { assignedTo } = req.body;

    const task = await Task.findById(id);

    if (!task) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Task not found',
          code: 'NOT_FOUND',
        },
      });
      return;
    }

    // Check access permission
    if (!canAccessTask(req.user, task as any)) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Task not found',
          code: 'NOT_FOUND',
        },
      });
      return;
    }

    // Store previous assignee for notification
    const previousAssignedTo = task.assignedTo;
    const isReassignment = previousAssignedTo && previousAssignedTo.toString() !== assignedTo;

    task.assignedTo = assignedTo;
    await task.save();
    await task.populate('createdBy assignedTo', 'username email role');

    // Send email notification
    try {
      const { sendTaskAssignmentEmail, sendTaskReassignmentEmail } = await import('../services/emailService');
      const assigneeDoc = task.assignedTo as any;
      
      if (assigneeDoc && assigneeDoc.email) {
        if (isReassignment) {
          await sendTaskReassignmentEmail(
            assigneeDoc,
            task as any,
            req.user
          );
        } else {
          await sendTaskAssignmentEmail(
            assigneeDoc,
            task as any,
            req.user
          );
        }
      }
    } catch (emailError) {
      console.error('Email notification failed:', emailError);
      // Continue even if email fails
    }

    // Invalidate caches
    await cacheService.invalidateTaskCaches();

    res.status(200).json({
      success: true,
      data: {
        message: 'Task assigned successfully',
        task,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to assign task',
        code: 'ASSIGN_TASK_ERROR',
      },
    });
  }
};
/**
 * @swagger
 * /api/tasks/search:
 *   get:
 *     summary: Advanced search for tasks
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query for title/description
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Comma-separated statuses (e.g., "todo,in-progress")
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *         description: Comma-separated priorities (e.g., "high,medium")
 *       - in: query
 *         name: assignee
 *         schema:
 *           type: string
 *         description: User ID of assignee
 *       - in: query
 *         name: creator
 *         schema:
 *           type: string
 *         description: User ID of creator
 *       - in: query
 *         name: team
 *         schema:
 *           type: string
 *         description: Team name
 *       - in: query
 *         name: dueBefore
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: dueAfter
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 */
export const searchTasks = async (req: Request, res: Response): Promise<void> => {
  try {
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

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const {
      q,
      status,
      priority,
      assignee,
      creator,
      team,
      dueBefore,
      dueAfter,
    } = req.query;

    // Build base query with role-based filtering
    const query: any = {};

    if (req.user.role === 'user') {
      query.$or = [
        { createdBy: req.user._id },
        { assignedTo: req.user._id },
      ];
    } else if (req.user.role === 'manager' && req.user.team) {
      query.team = req.user.team;
    }
    // Admins see all (no base filter)

    // Full-text search in title and description
    if (q) {
      const searchRegex = new RegExp(q as string, 'i');
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
        ],
      });
    }

    // Status filter (multiple values)
    if (status) {
      const statuses = (status as string).split(',');
      query.status = { $in: statuses };
    }

    // Priority filter (multiple values)
    if (priority) {
      const priorities = (priority as string).split(',');
      query.priority = { $in: priorities };
    }

    // Assignee filter
    if (assignee) {
      query.assignedTo = assignee;
    }

    // Creator filter
    if (creator) {
      query.createdBy = creator;
    }

    // Team filter
    if (team) {
      query.team = team;
    }

    // Due date range filters
    if (dueBefore || dueAfter) {
      query.dueDate = {};
      if (dueBefore) {
        query.dueDate.$lte = new Date(dueBefore as string);
      }
      if (dueAfter) {
        query.dueDate.$gte = new Date(dueAfter as string);
      }
    }

    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      Task.find(query)
        .populate('createdBy assignedTo', 'username email role')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }), // Default sort by newest
      Task.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        tasks,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        query: {
          searchTerm: q || null,
          filters: {
            status: status || null,
            priority: priority || null,
            assignee: assignee || null,
            creator: creator || null,
            team: team || null,
            dueBefore: dueBefore || null,
            dueAfter: dueAfter || null,
          },
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to search tasks',
        code: 'SEARCH_ERROR',
      },
    });
  }
};
