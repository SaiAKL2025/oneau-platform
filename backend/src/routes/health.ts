import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import os from 'os';
import { logInfo, logError } from '../utils/logger';
import { successResponse, errorResponse } from '../middleware/errorHandler';

const router = express.Router();

// Basic health check
router.get('/', (req: Request, res: Response) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.version,
    environment: process.env.NODE_ENV || 'development',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024)
    },
    cpu: os.loadavg()
  };

  logInfo('Health check requested', healthData);
  successResponse(res, 'Service is healthy', healthData);
});

// Detailed health check with database connectivity
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();

    // Check database connectivity
    const dbState = mongoose.connection.readyState;
    const dbHealth = dbState === 1 ? 'healthy' : dbState === 2 ? 'connecting' : 'unhealthy';

    // Perform a simple database query
    let dbResponseTime = null;
    try {
      const dbStart = Date.now();
      if (mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
        dbResponseTime = Date.now() - dbStart;
      }
    } catch (dbError) {
      logError('Database health check failed', dbError);
    }

    const detailedHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.version,
      environment: process.env.NODE_ENV || 'development',

      system: {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024), // GB
        freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024), // GB
        loadAverage: os.loadavg(),
        uptime: os.uptime()
      },

      process: {
        pid: process.pid,
        memory: {
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024)
        },
        cpuUsage: process.cpuUsage()
      },

      database: {
        status: dbHealth,
        name: mongoose.connection.name,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        responseTime: dbResponseTime
      },

      responseTime: Date.now() - startTime
    };

    const overallStatus = (dbHealth === 'healthy') ? 'healthy' : 'degraded';

    logInfo('Detailed health check completed', { status: overallStatus, responseTime: detailedHealth.responseTime });
    successResponse(res, `Service is ${overallStatus}`, detailedHealth);

  } catch (error) {
    logError('Detailed health check failed', error);
    errorResponse(res, 'Health check failed', 503, 'HEALTH_CHECK_FAILED', error);
  }
});

// Readiness probe for Kubernetes/Docker
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check if database is connected
    const dbState = mongoose.connection.readyState;
    if (dbState !== 1) {
      return errorResponse(res, 'Database not ready', 503, 'DATABASE_NOT_READY');
    }

    // Check if required environment variables are set
    const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      return errorResponse(res, `Missing required environment variables: ${missingVars.join(', ')}`, 503, 'ENV_VARS_MISSING');
    }

    successResponse(res, 'Service is ready', {
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'connected',
        environment: 'configured'
      }
    });

  } catch (error) {
    logError('Readiness check failed', error);
    errorResponse(res, 'Service not ready', 503, 'READINESS_CHECK_FAILED');
  }
});

// Liveness probe for Kubernetes/Docker
router.get('/live', (req: Request, res: Response) => {
  // Simple liveness check - if the server is responding, it's alive
  successResponse(res, 'Service is alive', {
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Metrics endpoint for monitoring
router.get('/metrics', (req: Request, res: Response) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      usagePercent: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
    },
    cpu: {
      loadAverage: os.loadavg(),
      cpus: os.cpus().length
    },
    database: {
      connections: mongoose.connections.length,
      readyState: mongoose.connection.readyState
    },
    process: {
      pid: process.pid,
      version: process.version,
      platform: process.platform
    }
  };

  // Set content type for Prometheus metrics format
  if (req.headers.accept?.includes('application/openmetrics-text')) {
    res.set('Content-Type', 'application/openmetrics-text; version=1.0.0; charset=utf-8');
    const prometheusMetrics = `
# HELP oneau_memory_used_bytes Memory used by the application
# TYPE oneau_memory_used_bytes gauge
oneau_memory_used_bytes ${metrics.memory.used * 1024 * 1024}

# HELP oneau_memory_total_bytes Total memory allocated
# TYPE oneau_memory_total_bytes gauge
oneau_memory_total_bytes ${metrics.memory.total * 1024 * 1024}

# HELP oneau_uptime_seconds Application uptime
# TYPE oneau_uptime_seconds counter
oneau_uptime_seconds ${metrics.uptime}

# HELP oneau_cpu_load_average_1m 1 minute load average
# TYPE oneau_cpu_load_average_1m gauge
oneau_cpu_load_average_1m ${metrics.cpu.loadAverage[0]}

# HELP oneau_database_connections Number of database connections
# TYPE oneau_database_connections gauge
oneau_database_connections ${metrics.database.connections}
`;
    res.send(prometheusMetrics);
  } else {
    res.json(metrics);
  }
});

// System information endpoint
router.get('/system', (req: Request, res: Response) => {
  const systemInfo = {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
    uptime: os.uptime(),
    cpus: os.cpus().length,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    loadAverage: os.loadavg(),
    networkInterfaces: os.networkInterfaces(),
    process: {
      pid: process.pid,
      uid: process.getuid?.(),
      gid: process.getgid?.(),
      cwd: process.cwd(),
      execPath: process.execPath,
      version: process.version,
      versions: process.versions,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        TZ: process.env.TZ
      }
    }
  };

  successResponse(res, 'System information retrieved', systemInfo);
});

// Environment variables (filtered for security)
router.get('/env', (req: Request, res: Response) => {
  const safeEnvVars = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    FRONTEND_URL: process.env.FRONTEND_URL,
    RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW,
    RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
    LOG_LEVEL: process.env.LOG_LEVEL,
    TZ: process.env.TZ
  };

  successResponse(res, 'Environment variables retrieved', safeEnvVars);
});

export default router;