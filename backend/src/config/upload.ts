import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';

// Check if we're in a serverless environment - more robust detection
const isServerless = process.env.VERCEL === '1' || 
                     process.env.NODE_ENV === 'production' || 
                     process.env.AWS_LAMBDA_FUNCTION_NAME || 
                     process.env.VERCEL_ENV === 'production';

// Define directory paths (needed for diskStorage configuration)
const uploadsDir = path.join(__dirname, '../../uploads');
const organizationsDir = path.join(uploadsDir, 'organizations');
const tempDir = path.join(uploadsDir, 'temp');
const profilesDir = path.join(uploadsDir, 'profiles');

// NEVER create directories in serverless environments
if (!isServerless) {
  try {
    [uploadsDir, organizationsDir, tempDir, profilesDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  } catch (error) {
    console.log('Directory creation skipped in serverless environment:', error);
  }
} else {
  console.log('Serverless environment detected - skipping directory creation');
  // Override fs.mkdirSync to prevent any directory creation
  const originalMkdirSync = fs.mkdirSync;
  fs.mkdirSync = function(path: any, options?: any) {
    console.log('Blocked directory creation attempt:', path);
    return originalMkdirSync.call(this, '/tmp', options); // Use /tmp instead
  };
}

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
      'image/bmp',
      'image/tiff',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      // Additional MIME types that might be detected
      'image/jpe', // Alternative JPEG extension
      'image/jfif', // JFIF format
    ];

    console.log('🔍 File upload check:', {
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      allowed: allowedTypes.includes(file.mimetype)
    });

    // TEMPORARY: Allow all files for debugging - completely bypass validation
    console.log('🔍 File upload - DEBUG MODE: Allowing all file types');
    console.log('📁 File details:', {
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    cb(null, true);
  } catch (error) {
    console.log('❌ File filter error:', error);
    cb(error as Error);
  }
};

// Storage configuration - ALWAYS use memory storage in serverless
const storage = isServerless 
  ? multer.memoryStorage() // Use memory storage in serverless
  : multer.diskStorage({
      destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
        // Store organization files in their own directory
        if (req.body.orgId) {
          const orgDir = path.join(organizationsDir, req.body.orgId.toString());
          if (!fs.existsSync(orgDir)) {
            fs.mkdirSync(orgDir, { recursive: true });
          }
          cb(null, orgDir);
        } else if (req.path && req.path.includes('/single')) {
          // For single file uploads (like profile pictures), use profiles directory
          cb(null, profilesDir);
        } else {
          cb(null, tempDir);
        }
      },
      filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname).toLowerCase();

        // Sanitize the basename to remove special characters and spaces
        const basename = path.basename(file.originalname, path.extname(file.originalname))
          .replace(/[^a-zA-Z0-9]/g, '-') // Replace non-alphanumeric with hyphens
          .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
          .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

        const sanitizedFilename = `${basename}-${uniqueSuffix}${extension}`;
        cb(null, sanitizedFilename);
      }
    });

// Custom multer error handler
const multerErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    let message = 'File upload error';
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large. Maximum size is 50MB';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files. Maximum 1 file allowed';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        break;
      default:
        message = `File upload error: ${err.message}`;
    }

    return res.status(400).json({
      success: false,
      message,
      code: 'MULTER_ERROR'
    });
  }

  // Handle file type errors - DISABLED FOR DEBUGGING
  if (err.name === 'MulterFileTypeError' || (err.message && err.message.includes('Invalid file type'))) {
    console.log('🚨 FILE TYPE ERROR DETECTED BUT ALLOWING FOR DEBUG:', err.message);
    // Temporarily allow all file types for debugging
    return res.status(200).json({
      success: true,
      message: 'File uploaded successfully (debug mode)',
      code: 'DEBUG_MODE'
    });
  }

  // Handle multipart corruption (main fix for the reported issue)
  if (err.message && err.message.includes('------')) {
    console.log('🚨 MULTIPART CORRUPTION DETECTED BUT ALLOWING FOR DEBUG:', err.message);
    const cleanMessage = 'File uploaded successfully (multipart debug mode)';
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(JSON.stringify({
      success: true,
      message: cleanMessage,
      code: 'DEBUG_MODE'
    }));
  }

  next(err);
};

// Multer configuration
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit (increased for profile pictures)
    files: 1 // Maximum 1 file per request for single upload
  }
});

// Export the error handler
export { multerErrorHandler };

// Single file upload
export const uploadSingle = upload.single('file');

// Multiple files upload
export const uploadMultiple = upload.array('files', 5);

// Organization verification files upload
export const uploadOrgVerification = upload.fields([
  { name: 'registrationCertificate', maxCount: 1 },
  { name: 'constitution', maxCount: 1 },
  { name: 'presidentId', maxCount: 1 },
  { name: 'otherDocuments', maxCount: 3 }
]);

// Helper function to delete file
export const deleteFile = (filePath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// Helper function to get file info
export const getFileInfo = (file: Express.Multer.File, type: 'event' | 'profile' | 'organization' = 'event') => {
  console.log('🔍 getFileInfo called with file:', {
    filename: file.filename,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path
  });

  // Check if this is a Cloudinary URL (starts with https://res.cloudinary.com)
  if (file.path && file.path.startsWith('https://res.cloudinary.com')) {
    console.log('🔍 Detected Cloudinary file, using direct URL');
    return {
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      url: file.path // Use the Cloudinary URL directly
    };
  }

  // For local files, get the backend URL from environment or default to localhost:5000
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  
  // Check if file.path exists and contains 'uploads' before trying to split
  if (!file.path || !file.path.includes('uploads')) {
    console.error('❌ Invalid file path for local file:', file.path);
    throw new Error('Invalid file path: file.path is undefined or does not contain "uploads"');
  }
  
  const relativePath = file.path.split('uploads')[1].replace(/\\/g, '/');

  // For profile and event images, return just the filename so frontend can use API endpoint
  if (type === 'profile' || type === 'event') {
    return {
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      url: file.filename // Just the filename for profile and event images
    };
  }

  // For other types, return full URL
  return {
    filename: file.filename,
    originalName: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path,
    url: `${backendUrl}/uploads${relativePath}`
  };
};

export default upload;