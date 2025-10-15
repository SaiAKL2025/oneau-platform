import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// Handle validation errors
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: (error as any).path || (error as any).param || 'unknown',
        message: error.msg,
        value: (error as any).value
      }))
    });
  }
  next();
};

// User validation rules
export const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  body('role')
    .isIn(['student', 'organization'])
    .withMessage('Role must be either student or organization'),
  body('faculty')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Faculty must be between 2 and 100 characters'),
  body('studentId')
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Student ID must be between 1 and 20 characters')
];

export const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

export const validateOrganizationRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Organization name must be between 2 and 100 characters'),
  body('orgType')
    .isIn(['Student Government', 'Medical Society', 'International Exchange', 'Community Service', 'Sports & Recreation', 'Arts & Culture', 'Academic', 'Religious', 'Environmental', 'Other'])
    .withMessage('Please select a valid organization type'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('president')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('President name must be between 2 and 100 characters'),
  body('founded')
    .isISO8601()
    .withMessage('Please provide a valid founding date'),
  body('website')
    .optional()
    .isURL()
    .withMessage('Please provide a valid website URL'),
  body('members')
    .isInt({ min: 1, max: 10000 })
    .withMessage('Number of members must be between 1 and 10000'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('socialMedia.facebook')
    .optional()
    .isURL()
    .withMessage('Please provide a valid Facebook URL'),
  body('socialMedia.instagram')
    .optional()
    .matches(/^@[a-zA-Z0-9._]+$/)
    .withMessage('Instagram handle must start with @ and contain only letters, numbers, dots, and underscores'),
  body('socialMedia.twitter')
    .optional()
    .matches(/^@[a-zA-Z0-9_]+$/)
    .withMessage('Twitter handle must start with @ and contain only letters, numbers, and underscores')
];

export const validateEventCreation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Event title must be between 3 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Event description must be between 10 and 2000 characters'),
  body('date')
    .isISO8601()
    .withMessage('Please provide a valid event date')
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error('Event date cannot be in the past');
      }
      return true;
    }),
  body('startTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Please provide a valid start time in HH:MM format'),
  body('endTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Please provide a valid end time in HH:MM format')
    .custom((value, { req }) => {
      const startTime = req.body.startTime;
      if (startTime && value <= startTime) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  body('location')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Location must be between 3 and 200 characters'),
  body('venue')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Venue must be between 3 and 200 characters'),
  body('type')
    .isIn(['Workshop', 'Seminar', 'Conference', 'Competition', 'Social Event', 'Volunteer', 'Sports', 'Cultural', 'Academic', 'Other'])
    .withMessage('Please select a valid event type'),
  body('capacity')
    .isInt({ min: 1, max: 10000 })
    .withMessage('Capacity must be between 1 and 10000'),
  body('responsiblePerson')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Responsible person name must be between 2 and 100 characters'),
  body('responsibleEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address for the responsible person'),
  body('responsiblePhone')
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number')
];

export const validateEventUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Event title must be between 3 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Event description must be between 10 and 2000 characters'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid event date'),
  body('startTime')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Please provide a valid start time in HH:MM format'),
  body('endTime')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Please provide a valid end time in HH:MM format'),
  body('location')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Location must be between 3 and 200 characters'),
  body('venue')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Venue must be between 3 and 200 characters'),
  body('type')
    .optional()
    .isIn(['Workshop', 'Seminar', 'Conference', 'Competition', 'Social Event', 'Volunteer', 'Sports', 'Cultural', 'Academic', 'Other'])
    .withMessage('Please select a valid event type'),
  body('capacity')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Capacity must be between 1 and 10000'),
  body('responsiblePerson')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Responsible person name must be between 2 and 100 characters'),
  body('responsibleEmail')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address for the responsible person'),
  body('responsiblePhone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number')
];

export const validateNotificationCreation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Notification title must be between 3 and 200 characters'),
  body('message')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Notification message must be between 10 and 1000 characters'),
  body('type')
    .isIn(['announcement', 'event', 'follow', 'confirmation', 'update', 'reminder', 'cancellation', 'rejection'])
    .withMessage('Please select a valid notification type'),
  body('userId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer'),
  body('relatedId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Related ID must be a positive integer')
];

export const validateRejectionDetails = [
  body('rejectionReason')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Rejection reason must be between 10 and 1000 characters'),
  body('allowResubmission')
    .optional()
    .isBoolean()
    .withMessage('Allow resubmission must be a boolean value'),
  body('resubmissionDeadline')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid resubmission deadline')
    .custom((value) => {
      if (value && new Date(value) <= new Date()) {
        throw new Error('Resubmission deadline cannot be in the past');
      }
      return true;
    })
];

// Parameter validation
export const validateIdParam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer')
];

export const validateOrgIdParam = [
  param('orgId')
    .isInt({ min: 1 })
    .withMessage('Organization ID must be a positive integer')
];

export const validateUserIdParam = [
  param('userId')
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer')
];

export const validateEventIdParam = [
  param('eventId')
    .isInt({ min: 1 })
    .withMessage('Event ID must be a positive integer')
];

// Query parameter validation
export const validatePaginationQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters'),
  query('sortBy')
    .optional()
    .isIn(['name', 'date', 'created', 'followers', 'members'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

export const validateStatusQuery = [
  query('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected', 'active', 'inactive', 'suspended'])
    .withMessage('Invalid status value')
];

export const validateRoleQuery = [
  query('role')
    .optional()
    .isIn(['student', 'organization', 'admin'])
    .withMessage('Invalid role value')
];

export const validateTypeQuery = [
  query('type')
    .optional()
    .isIn(['Student Government', 'Medical Society', 'International Exchange', 'Community Service', 'Sports & Recreation', 'Arts & Culture', 'Academic', 'Religious', 'Environmental', 'Workshop', 'Seminar', 'Conference', 'Competition', 'Social Event', 'Volunteer', 'Sports', 'Cultural', 'Academic', 'Other'])
    .withMessage('Invalid type value')
];

// Custom sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize string fields
  const sanitizeString = (str: string) => {
    if (typeof str !== 'string') return str;
    return str
      .trim()
      .replace(/[<>]/g, '') // Remove potential XSS characters
      .substring(0, 10000); // Limit length
  };

  // Recursively sanitize object properties
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    return obj;
  };

  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  next();
};

// Rate limiting for specific endpoints
export const createRateLimit = (windowMs: number, maxRequests: number, message?: string) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: message || 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
};

export default {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validateOrganizationRegistration,
  validateEventCreation,
  validateEventUpdate,
  validateNotificationCreation,
  validateRejectionDetails,
  validateIdParam,
  validateOrgIdParam,
  validateUserIdParam,
  validateEventIdParam,
  validatePaginationQuery,
  validateStatusQuery,
  validateRoleQuery,
  validateTypeQuery,
  sanitizeInput,
  createRateLimit
};