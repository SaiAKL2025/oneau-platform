import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// File filter function for Cloudinary
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  try {
    // Allowed file types
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/pjpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/tiff',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    console.log('🔍 Cloudinary file upload check:', {
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      allowed: allowedTypes.includes(file.mimetype)
    });

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
    }
  } catch (error) {
    console.log('❌ Cloudinary file filter error:', error);
    cb(error as Error);
  }
};

// Cloudinary storage configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: (req: any, file: Express.Multer.File) => {
      // Determine folder based on upload type
      if (req.body.type === 'profile') {
        return 'oneau/profiles';
      } else if (req.body.type === 'organization') {
        return 'oneau/organizations';
      } else if (req.body.type === 'event') {
        return 'oneau/events';
      } else if (req.body.type === 'verification') {
        return 'oneau/verification';
      } else {
        return 'oneau/general';
      }
    },
    public_id: (req: any, file: Express.Multer.File) => {
      // Generate unique public_id
      const timestamp = Date.now();
      const random = Math.round(Math.random() * 1E9);
      const basename = file.originalname.split('.')[0].replace(/[^a-zA-Z0-9]/g, '-');
      return `${basename}-${timestamp}-${random}`;
    },
    resource_type: (req: any, file: Express.Multer.File) => {
      // Set resource type based on file type
      if (file.mimetype.startsWith('image/')) {
        return 'image';
      } else if (file.mimetype.startsWith('video/')) {
        return 'video';
      } else {
        return 'raw'; // For PDFs and other documents
      }
    },
    access_mode: 'public', // Ensure files are publicly accessible
    transformation: (req: any, file: Express.Multer.File) => {
      // Apply transformations based on file type
      if (file.mimetype.startsWith('image/')) {
        return {
          quality: 'auto',
          fetch_format: 'auto',
          width: 1200,
          height: 1200,
          crop: 'limit'
        };
      }
      return {};
    }
  } as any,
});

// Multer configuration for Cloudinary
export const cloudinaryUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for Cloudinary
    files: 1
  }
});

// Multiple files upload for Cloudinary
export const cloudinaryUploadMultiple = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files
  }
});

// Organization verification files upload for Cloudinary
export const cloudinaryUploadOrgVerification = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 6 // Maximum 6 files for verification
  }
}).fields([
  { name: 'registrationCertificate', maxCount: 1 },
  { name: 'constitution', maxCount: 1 },
  { name: 'presidentId', maxCount: 1 },
  { name: 'otherDocuments', maxCount: 3 }
]);

// Helper function to delete file from Cloudinary
export const deleteCloudinaryFile = async (publicId: string): Promise<void> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('✅ Cloudinary file deleted:', result);
  } catch (error) {
    console.error('❌ Error deleting Cloudinary file:', error);
    throw error;
  }
};

// Helper function to get file info from Cloudinary
export const getCloudinaryFileInfo = (file: Express.Multer.File, type: 'event' | 'profile' | 'organization' | 'verification' = 'event') => {
  // Use the file.path directly as it's the actual URL returned by Cloudinary
  // This is more reliable than generating a new URL with cloudinary.url()
  const publicUrl = file.path;
  
  return {
    filename: file.filename,
    originalName: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path,
    url: publicUrl, // Use the actual Cloudinary URL from file.path
    publicId: file.filename // Cloudinary public_id
  };
};

// Helper function to get optimized image URL
export const getOptimizedImageUrl = (publicId: string, options: any = {}) => {
  return cloudinary.url(publicId, {
    quality: 'auto',
    fetch_format: 'auto',
    ...options
  });
};

export default cloudinary;

