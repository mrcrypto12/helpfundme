import { body, param, query } from 'express-validator';

export const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('acceptedTerms').equals('true').withMessage('Terms and Privacy Notice must be accepted'),
];

export const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
];

export const createPostValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),

  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ max: 5000 }).withMessage('Description cannot exceed 5000 characters'),

  body('purpose')
    .trim()
    .notEmpty().withMessage('Purpose is required')
    .isLength({ max: 2000 }).withMessage('Purpose cannot exceed 2000 characters'),

  body('targetAmount')
    .notEmpty().withMessage('Target amount is required')
    .isFloat({ min: 1 })
    .withMessage('Target amount must be at least 1'),

  body('severity')
    .notEmpty().withMessage('Severity is required')
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid severity level'),

  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(['medical', 'education', 'housing', 'emergency', 'funeral', 'business', 'other'])
    .withMessage('Invalid category'),

  // location arrives as JSON text because the request is multipart/form-data
  body('location')
    .notEmpty()
    .withMessage('Location is required')
    .custom((value) => {
      let location;

      try {
        location = typeof value === 'string'
          ? JSON.parse(value)
          : value;
      } catch {
        throw new Error('Invalid location format');
      }

      if (!location?.city?.trim()) {
        throw new Error('City is required');
      }

      if (!location?.region) {
        throw new Error('Region is required');
      }

      return true;
    }),

  body('isSurgery')
    .optional()
    .isBoolean()
    .withMessage('isSurgery must be a boolean'),
];

export const commentValidation = [
  body('content')
    .trim()
    .notEmpty().withMessage('Comment content is required')
    .isLength({ max: 1000 }).withMessage('Comment cannot exceed 1000 characters'),
];

export const donationValidation = [
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 0.5 }).withMessage('Minimum donation is GHS 0.50'),
  body('type')
    .isIn(['post', 'platform']).withMessage('Invalid donation type'),
  body('postId')
    .optional()
    .isUUID().withMessage('Invalid post ID'),
  body('message')
    .optional()
    .isLength({ max: 500 }).withMessage('Message cannot exceed 500 characters'),
  body('isAnonymous')
    .optional()
    .isBoolean().withMessage('isAnonymous must be a boolean'),
];

export const mongoIdValidation = [
  param('id').isUUID().withMessage('Invalid ID format'),
];

export const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
];

export const allocateFundsValidation = [
  body('postId')
    .notEmpty().withMessage('Post ID is required')
    .isUUID().withMessage('Invalid post ID'),
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 1 }).withMessage('Amount must be at least 1'),
  body('reason')
    .trim()
    .notEmpty().withMessage('Reason is required')
    .isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters'),
];
