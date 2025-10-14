import winston from 'winston';
import path from 'path';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston about the colors
winston.addColors(colors);

// Define the format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info: any) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define which logs to show based on environment
const showLogs = process.env.NODE_ENV === 'development' ? ['error', 'warn', 'info', 'http', 'debug'] : ['error', 'warn', 'info'];

// Check if file logging should be disabled (for serverless environments)
const disableFileLogging = process.env.DISABLE_FILE_LOGGING === 'true' || 
                          process.env.NODE_ENV === 'production' || 
                          process.env.VERCEL === '1';

// Define transports
const transports = [
  // Console transport for development
  new winston.transports.Console({
    format,
    level: process.env.LOG_LEVEL || 'debug',
  }),
];

// Only add file transports if file logging is not disabled
if (!disableFileLogging) {
  transports.push(
    // Error log file
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
    }),

    // Combined log file
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),

    // HTTP requests log file
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/http.log'),
      level: 'http',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),
  );
}

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
});

// Only create logs directory if file logging is enabled
if (!disableFileLogging) {
  import fs from 'fs';
  const logsDir = path.join(__dirname, '../../logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

// Export logger methods
export const logError = (message: string, error?: any) => {
  logger.error(message, { error: error?.stack || error });
};

export const logWarn = (message: string, meta?: any) => {
  logger.warn(message, meta);
};

export const logInfo = (message: string, meta?: any) => {
  logger.info(message, meta);
};

export const logHttp = (message: string, meta?: any) => {
  logger.http(message, meta);
};

export const logDebug = (message: string, meta?: any) => {
  logger.debug(message, meta);
};

// Request logging middleware
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();

  // Log request
  logHttp(`${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method !== 'GET' ? req.body : undefined,
    query: req.query,
    params: req.params,
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'error' : 'info';

    logger.log(level, `${req.method} ${req.originalUrl} ${res.statusCode}`, {
      duration: `${duration}ms`,
      statusCode: res.statusCode,
      contentLength: res.get('Content-Length'),
    });
  });

  next();
};

// Performance monitoring
export const performanceLogger = (req: any, res: any, next: any) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds

    if (duration > 1000) { // Log slow requests (> 1 second)
      logWarn(`Slow request: ${req.method} ${req.originalUrl}`, {
        duration: `${duration.toFixed(2)}ms`,
        ip: req.ip,
      });
    }
  });

  next();
};

// Database operation logger
export const databaseLogger = {
  query: (operation: string, collection: string, duration?: number, error?: any) => {
    if (error) {
      logError(`Database ${operation} failed on ${collection}`, {
        error: error.message,
        duration: duration ? `${duration}ms` : undefined,
      });
    } else {
      logDebug(`Database ${operation} on ${collection}`, {
        duration: duration ? `${duration}ms` : undefined,
      });
    }
  },

  connection: (status: 'connected' | 'disconnected' | 'error', details?: any) => {
    if (status === 'error') {
      logError('Database connection error', details);
    } else {
      logInfo(`Database ${status}`, details);
    }
  },
};

// Security logger
export const securityLogger = {
  authFailure: (email: string, ip: string, reason: string) => {
    logWarn('Authentication failure', {
      email,
      ip,
      reason,
      timestamp: new Date().toISOString(),
    });
  },

  rateLimitExceeded: (ip: string, endpoint: string) => {
    logWarn('Rate limit exceeded', {
      ip,
      endpoint,
      timestamp: new Date().toISOString(),
    });
  },

  suspiciousActivity: (ip: string, activity: string, details?: any) => {
    logWarn('Suspicious activity detected', {
      ip,
      activity,
      details,
      timestamp: new Date().toISOString(),
    });
  },

  fileUploadAttempt: (filename: string, mimetype: string, size: number, ip: string) => {
    logInfo('File upload attempt', {
      filename,
      mimetype,
      size,
      ip,
      timestamp: new Date().toISOString(),
    });
  },
};

export default logger;