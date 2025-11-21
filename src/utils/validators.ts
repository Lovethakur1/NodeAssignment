import { body, ValidationChain } from 'express-validator';

/**
 * Password validation rules:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export const passwordStrengthRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const validateRegistration: ValidationChain[] = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(passwordStrengthRegex)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),

  body('role')
    .optional()
    .isIn(['admin', 'manager', 'user'])
    .withMessage('Invalid role'),

  body('team').optional().trim().isLength({ max: 100 }).withMessage('Team name is too long'),
];

export const validateLogin: ValidationChain[] = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Username or email is required'),

  body('password').notEmpty().withMessage('Password is required'),
];

export const validateTaskCreation: ValidationChain[] = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description is too long'),

  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error('Due date cannot be in the past');
      }
      return true;
    }),

  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),

  body('status')
    .optional()
    .isIn(['todo', 'in-progress', 'completed', 'overdue'])
    .withMessage('Invalid status'),

  body('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID'),

  body('team').optional().trim().isLength({ max: 100 }).withMessage('Team name is too long'),
];

export const validateTaskUpdate: ValidationChain[] = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description is too long'),

  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),

  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),

  body('status')
    .optional()
    .isIn(['todo', 'in-progress', 'completed', 'overdue'])
    .withMessage('Invalid status'),

  body('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID'),
];
