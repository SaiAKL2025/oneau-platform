import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import connectDB from './config/database';

// Import middleware
import { requestLogger, performanceLogger } from './utils/logger';
import { errorHandler, notFoundHandler, timeoutMiddleware } from './middleware/errorHandler';
import { sanitizeInput } from './middleware/validation';
import { handleUploadError } from './config/upload';
import passport from './config/passport';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import studentRoutes from './routes/students';
import organizationRoutes from './routes/organizations';
import eventRoutes from './routes/events';
import adminRoutes from './routes/admin';
import uploadRoutes from './routes/uploads';
import healthRoutes from './routes/health';
import emailVerificationRoutes from './routes/emailVerification';
import activityRoutes from './routes/activities';
import analyticsRoutes from './routes/analytics';
import settingsRoutes from './routes/settings';
import publicRoutes from './routes/public';
import notificationRoutes from './routes/notifications';
// import brevoEmailRoutes from './routes/brevoEmail';
// import hybridEmailRoutes from './routes/hybridEmail';

// Load environment variables
dotenv.config();

const app = express();

// Trust proxy for Vercel deployment
app.set('trust proxy', 1);

// Connect to database
connectDB();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting - More lenient for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased limit for development
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for development
  skip: (req) => {
    return process.env.NODE_ENV === 'development' && req.ip === '::1';
  }
});

app.use(limiter);

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message: string) => {
      console.log(message.trim());
    }
  }
}));

// CORS configuration - more flexible for development and production
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    console.log('🔍 CORS request from origin:', origin);
    
    // Allow requests with no origin (like mobile apps, curl requests, or server-to-server)
    if (!origin) {
      console.log('✅ CORS: Allowing request with no origin');
      return callback(null, true);
    }
    
    // Allow all Vercel domains (for development and production)
    if (origin.includes('vercel.app') || origin.includes('localhost') || origin.includes('vercel')) {
      console.log('✅ CORS: Allowing Vercel/localhost origin:', origin);
      return callback(null, true);
    }
    
    // Allow all origins that contain 'oneau-platform' (your frontend)
    if (origin.includes('oneau-platform')) {
      console.log('✅ CORS: Allowing oneau-platform origin:', origin);
      return callback(null, true);
    }
    
    // Specific allowed origins for production
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:4173',
      'https://oneau-platform.vercel.app',
      'https://oneau-platform-git-main.vercel.app',
      // Add your frontend domain here when you know it
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('✅ CORS: Allowing specific origin:', origin);
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
  maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Request timeout middleware
app.use(timeoutMiddleware(30000)); // 30 second timeout

// Input sanitization middleware
app.use(sanitizeInput);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use(requestLogger);

// Performance logging middleware
app.use(performanceLogger);

// Passport middleware
app.use(passport.initialize());

// Add this line after creating the Express app
app.set('trust proxy', 1); // Trust first proxy (Vercel)

// Root endpoint - API information
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'OneAU Backend API is running',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      users: '/api/users',
      students: '/api/students',
      organizations: '/api/organizations',
      events: '/api/events',
      admin: '/api/admin',
      uploads: '/api/uploads'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('🔍 Health check request received from:', req.ip, req.headers.origin);
  res.status(200).json({
    status: 'OK',
    message: 'OneAU Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// Favicon endpoints - return 204 No Content
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

app.get('/favicon.png', (req, res) => {
  res.status(204).end();
});


app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/email', emailVerificationRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/notifications', notificationRoutes);
// app.use('/api/brevo', brevoEmailRoutes);
// app.use('/api/email-hybrid', hybridEmailRoutes);

// Static files for uploads with CORS headers
app.use('/uploads', cors({
  origin: true, // Allow all origins for static files
  credentials: false
}), express.static('uploads'));

// Error handling middleware
app.use(handleUploadError);
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('🚀 OneAU Backend Server running on port', PORT);
  console.log('📱 Frontend URL:', process.env.FRONTEND_URL);
  console.log('🌍 Environment:', process.env.NODE_ENV);
});

export default app;
