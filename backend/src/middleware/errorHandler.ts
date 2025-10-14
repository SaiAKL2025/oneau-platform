import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { logError, logWarn, logInfo } from '../utils/logger';

// Custom error class
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Database error handler
const handleDatabaseError = (error: mongoose.Error): AppError => {
  if (error.name === 'ValidationError') {
    const validationError = error as mongoose.Error.ValidationError;
    const errors = Object.values(validationError.errors).map(err => err.message);
    return new AppError(`Validation Error: ${errors.join(', ')}`, 400, 'VALIDATION_ERROR');
  }

  if (error.name === 'CastError') {
    return new AppError('Invalid data format', 400, 'CAST_ERROR');
  }

  if (error.name === 'MongoError' && (error as any).code === 11000) {
    return new AppError('Duplicate field value', 400, 'DUPLICATE_ERROR');
  }

  return new AppError('Database operation failed', 500, 'DATABASE_ERROR');
};

// JWT error handler
const handleJWTError = (error: any): AppError => {
  if (error.name === 'JsonWebTokenError') {
    return new AppError('Invalid token', 401, 'INVALID_TOKEN');
  }

  if (error.name === 'TokenExpiredError') {
    return new AppError('Token expired', 401, 'TOKEN_EXPIRED');
  }

  return new AppError('Authentication error', 401, 'AUTH_ERROR');
};

// Multer error handler
const handleMulterError = (error: any): AppError => {
  console.log('🔍 Handling multer error:', {
    name: error.name,
    message: error.message,
    code: error.code,
    field: error.field
  });

  if (error.code === 'LIMIT_FILE_SIZE') {
    return new AppError('File too large. Maximum size is 10MB', 400, 'FILE_TOO_LARGE');
  }

  if (error.code === 'LIMIT_FILE_COUNT') {
    return new AppError('Too many files. Maximum 5 files allowed', 400, 'TOO_MANY_FILES');
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError('Unexpected file field', 400, 'UNEXPECTED_FILE');
  }

  if (error.name === 'MulterFileTypeError') {
    return new AppError(error.message, 400, 'INVALID_FILE_TYPE');
  }

  // Clean up any multipart data from error message
  const cleanMessage = error.message ? error.message.replace(/[-]{2,}[A-Za-z0-9]+/g, '').trim() : 'File upload error';
  return new AppError(cleanMessage || 'File upload error', 400, 'UPLOAD_ERROR');
};

// Send error response
const sendErrorResponse = (error: AppError, res: Response) => {
  // Log error
  if (error.statusCode >= 500) {
    logError(error.message, error);
  } else if (error.statusCode >= 400) {
    logWarn(error.message, { statusCode: error.statusCode, code: error.code });
  }

  // Send response
  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    code: error.code,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      details: error
    })
  });
};

// Global error handler middleware
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let appError: AppError;

  // Log the original error
  logError('Error occurred', {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method !== 'GET' ? req.body : undefined,
    query: req.query,
    params: req.params,
  });

  // Handle different error types
  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof mongoose.Error) {
    appError = handleDatabaseError(error);
  } else if (error.name && error.name.includes('Token')) {
    appError = handleJWTError(error);
  } else if (error.code && ['LIMIT_FILE_SIZE', 'LIMIT_FILE_COUNT', 'LIMIT_UNEXPECTED_FILE'].includes(error.code)) {
    appError = handleMulterError(error);
  } else if (error.name === 'MulterError' || error.name === 'MulterFileTypeError') {
    appError = handleMulterError(error);
  } else if (error.statusCode) {
    // Express error
    appError = new AppError(error.message || 'Internal server error', error.statusCode);
  } else {
    // Unknown error
    appError = new AppError(
      process.env.NODE_ENV === 'development'
        ? error.message || 'Internal server error'
        : 'Something went wrong',
      500,
      'INTERNAL_ERROR'
    );
  }

  sendErrorResponse(appError, res);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new AppError(`Not found - ${req.originalUrl}`, 404, 'NOT_FOUND');
  next(error);
};

// Request timeout middleware
export const timeoutMiddleware = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        const error = new AppError('Request timeout', 408, 'REQUEST_TIMEOUT');
        next(error);
      }
    }, timeoutMs);

    res.on('finish', () => {
      clearTimeout(timeout);
    });

    next();
  };
};

// Rate limit error handler
export const rateLimitHandler = (req: Request, res: Response) => {
  logWarn('Rate limit exceeded', {
    ip: req.ip,
    url: req.originalUrl,
    method: req.method,
  });

  res.status(429).json({
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: res.get('Retry-After') || '60'
  });
};

// Validation error formatter
export const formatValidationErrors = (errors: any[]) => {
  return errors.map(error => ({
    field: error.path || error.param || 'unknown',
    message: error.msg,
    value: error.value,
    location: error.location || 'body'
  }));
};

// API response helpers
export const successResponse = (
  res: Response,
  message: string,
  data?: any,
  statusCode: number = 200
) => {
  const response = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };

  logInfo(`API Success: ${message}`, { statusCode });
  res.status(statusCode).json(response);
};

export const errorResponse = (
  res: Response,
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: any
) => {
  const response = {
    success: false,
    message,
    code,
    details,
    timestamp: new Date().toISOString()
  };

  if (statusCode >= 500) {
    logError(`API Error: ${message}`, { statusCode, code, details });
  } else {
    logWarn(`API Warning: ${message}`, { statusCode, code, details });
  }

  res.status(statusCode).json(response);
};

export default {
  AppError,
  errorHandler,
  asyncHandler,
  notFoundHandler,
  timeoutMiddleware,
  rateLimitHandler,
  formatValidationErrors,
  successResponse,
  errorResponse
};