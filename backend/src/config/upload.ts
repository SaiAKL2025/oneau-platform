import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';

// Check if we're in a serverless environment - more robust detection
const isServerless = process.env.VERCEL === '1' || 
                     process.env.NODE_ENV === 'production' || 
                     process.env.AWS_LAMBDA_FUNCTION_NAME || 
                     process.env.VERCEL_ENV === 'production' ||
                     process.env.FUNCTION_NAME; // Google Cloud Functions

// If in a serverless environment, use memory storage
// Otherwise, use disk storage (for local development)
const storage = isServerless
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadsDir = path.join(__dirname, '../../uploads');
        const organizationsDir = path.join(uploadsDir, 'organizations');
        const tempDir = path.join(uploadsDir, 'temp');
        const profilesDir = path.join(uploadsDir, 'profiles');

        // Ensure directories exist for local development
        [uploadsDir, organizationsDir, tempDir, profilesDir].forEach(dir => {
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
        });

        let dest = tempDir; // Default to temp
        if (file.fieldname === 'organizationLogo') {
          dest = organizationsDir;
        } else if (file.fieldname === 'profilePicture') {
          dest = profilesDir;
        }
        cb(null, dest);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      },
    });

// File filter function
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  try {
    // Allowed file types
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/pjpeg', // Progressive JPEG
      'image/jpeg', // Standard JPEG
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/flv',
      'video/webm',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/mpeg',
      'audio/aac',
      'audio/flac'
    ];

    // Check if file type is allowed
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`));
    }
  } catch (error) {
    cb(new Error('Error processing file: ' + (error as Error).message));
  }
};

// Create multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5, // Maximum 5 files
  },
});

// Middleware for handling upload errors
export const handleUploadError = (error: any, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.',
        code: 'FILE_TOO_LARGE'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 5 files.',
        code: 'TOO_MANY_FILES'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name. Please check the field name.',
        code: 'UNEXPECTED_FIELD'
      });
    }
  }
  
  if (error.message.includes('File type')) {
    return res.status(400).json({
      success: false,
      message: error.message,
      code: 'INVALID_FILE_TYPE'
    });
  }

  // Generic error handler
  console.error('Upload error:', error);
  return res.status(500).json({
    success: false,
    message: 'File upload failed',
    code: 'UPLOAD_ERROR'
  });
};

// Export the upload middleware
export default upload;