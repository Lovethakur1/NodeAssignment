import { Request, Response } from 'express';
import User from '../models/User.model';
import { generateToken, blacklistToken, extractTokenFromHeader } from '../utils/tokenManager';
import { canAssignRole } from '../utils/permissions';

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: johndoe
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: StrongPass123!
 *               role:
 *                 type: string
 *                 enum: [admin, manager, user]
 *                 example: user
 *               team:
 *                 type: string
 *                 example: Engineering
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or user already exists
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password, role, team } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        error: {
          message: 'User with this email or username already exists',
          code: 'USER_EXISTS',
        },
      });
      return;
    }

    // Prevent non-authenticated registration of admin/manager (only 'user' role allowed for public registration)
    // Admins can create other admins via dedicated endpoint
    const assignedRole = role && ['admin', 'manager'].includes(role) ? 'user' : (role || 'user');

    // Create new user
    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password,
      role: assignedRole,
      team,
    });

    // Generate token
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      success: true,
      data: {
        message: 'User registered successfully',
        token,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          team: user.team,
          isEmailVerified: user.isEmailVerified,
        },
      },
    });
  } catch (error: any) {
    // Handle mongoose validation errors
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
        message: 'Registration failed',
        code: 'REGISTRATION_ERROR',
      },
    });
  }
};

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - password
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Username or email
 *                 example: johndoe
 *               password:
 *                 type: string
 *                 example: StrongPass123!
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier, password } = req.body;

    // Find user by email or username
    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { username: identifier }],
    }).select('+password');

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
        },
      });
      return;
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
        },
      });
      return;
    }

    // Generate token
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    res.status(200).json({
      success: true,
      data: {
        message: 'Login successful',
        token,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          team: user.team,
          isEmailVerified: user.isEmailVerified,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Login failed',
        code: 'LOGIN_ERROR',
      },
    });
  }
};

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Not authenticated
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          message: 'No token provided',
          code: 'NO_TOKEN',
        },
      });
      return;
    }

    // Add token to blacklist
    await blacklistToken(token);

    res.status(200).json({
      success: true,
      data: {
        message: 'Logout successful',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Logout failed',
        code: 'LOGOUT_ERROR',
      },
    });
  }
};

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       401:
 *         description: Not authenticated
 */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Not authenticated',
          code: 'NOT_AUTHENTICATED',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: req.user._id,
          username: req.user.username,
          email: req.user.email,
          role: req.user.role,
          team: req.user.team,
          isEmailVerified: req.user.isEmailVerified,
          createdAt: req.user.createdAt,
          updatedAt: req.user.updatedAt,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve profile',
        code: 'PROFILE_ERROR',
      },
    });
  }
};

/**
 * @swagger
 * /api/auth/users:
 *   get:
 *     summary: List all users (Admin/Manager only)
 *     tags: [User Management]
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
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, manager, user]
 *       - in: query
 *         name: team
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       403:
 *         description: Insufficient permissions
 */
export const listUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { role, team } = req.query;

    const query: any = {};
    
    // Managers can only see users in their team
    if (req.user?.role === 'manager' && req.user.team) {
      query.team = req.user.team;
    }

    // Apply filters
    if (role) query.role = role;
    if (team && req.user?.role === 'admin') query.team = team;

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -emailVerificationToken')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        users,
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
        message: 'Failed to retrieve users',
        code: 'LIST_USERS_ERROR',
      },
    });
  }
};

/**
 * @swagger
 * /api/auth/users/{userId}/role:
 *   put:
 *     summary: Update user role (Admin only)
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, manager, user]
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 */
export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Not authenticated',
          code: 'NOT_AUTHENTICATED',
        },
      });
      return;
    }

    // Check if user can assign this role
    if (!canAssignRole(req.user, role)) {
      res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions to assign this role',
          code: 'FORBIDDEN',
        },
      });
      return;
    }

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        },
      });
      return;
    }

    // Prevent users from changing their own role
    if (user._id.toString() === req.user._id) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Cannot change your own role',
          code: 'SELF_ROLE_CHANGE',
        },
      });
      return;
    }

    user.role = role;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        message: 'User role updated successfully',
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          team: user.team,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update user role',
        code: 'UPDATE_ROLE_ERROR',
      },
    });
  }
};

/**
 * @swagger
 * /api/auth/users/{userId}:
 *   delete:
 *     summary: Delete user (Admin only)
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Not authenticated',
          code: 'NOT_AUTHENTICATED',
        },
      });
      return;
    }

    // Prevent users from deleting themselves
    if (userId === req.user._id) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Cannot delete your own account',
          code: 'SELF_DELETE',
        },
      });
      return;
    }

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        message: 'User deleted successfully',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete user',
        code: 'DELETE_USER_ERROR',
      },
    });
  }
};
