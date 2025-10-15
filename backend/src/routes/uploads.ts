import express, { Request, Response } from 'express';
import multer from 'multer';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import upload, { handleUploadError } from '../config/upload';
import { cloudinaryUpload, cloudinaryUploadMultiple, cloudinaryUploadOrgVerification, getCloudinaryFileInfo, deleteCloudinaryFile } from '../config/cloudinary';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Apply multer error handler to all routes
router.use(handleUploadError);

// Upload single file to Cloudinary
router.post('/single', authenticateToken as any, cloudinaryUpload.single('file'), async (req: any, res: Response) => {
  try {
    console.log('🔍 Upload request received:', {
      hasFile: !!req.file,
      body: req.body,
      headers: req.headers
    });

    if (!req.file) {
      console.log('❌ No file in request');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    console.log('📁 File details:', {
      originalname: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });

    const fileInfo = getCloudinaryFileInfo(req.file, 'profile');
    console.log('📁 Generated file info:', fileInfo);

    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: fileInfo
    });
  } catch (error) {
    console.error('❌ Error uploading file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Upload multiple files
router.post('/multiple', authenticateToken as any, cloudinaryUploadMultiple.array('files', 5), async (req: any, res: Response) => {
  try {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const files = (req.files as Express.Multer.File[]).map(file => getCloudinaryFileInfo(file));

    res.json({
      success: true,
      message: `${files.length} files uploaded successfully`,
      files: files
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload files'
    });
  }
});

// Upload organization verification documents
router.post('/organization-verification/:orgId', authenticateToken as any, cloudinaryUploadOrgVerification, async (req: any, res: Response) => {
  try {
    const { orgId } = req.params;

    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No verification documents uploaded'
      });
    }

    const uploadedFiles: any = {};

    // Process uploaded files
    Object.keys(req.files).forEach(fieldName => {
      const files = (req.files as { [fieldname: string]: Express.Multer.File[] })[fieldName];
      if (files && files.length > 0) {
        uploadedFiles[fieldName] = files.map(file => getCloudinaryFileInfo(file, 'verification'));
      }
    });

    res.json({
      success: true,
      message: 'Organization verification documents uploaded successfully',
      orgId: orgId,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Error uploading organization verification documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload verification documents'
    });
  }
});

// Get uploaded files for an organization
router.get('/organization/:orgId', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const { orgId } = req.params;
    const orgDir = path.join(__dirname, '../../uploads/organizations', orgId);

    if (!fs.existsSync(orgDir)) {
      return res.json({
        success: true,
        files: []
      });
    }

    const files = fs.readdirSync(orgDir).map(filename => {
      const filePath = path.join(orgDir, filename);
      const stats = fs.statSync(filePath);

      return {
        filename: filename,
        path: filePath,
        url: `/uploads/organizations/${orgId}/${filename}`,
        size: stats.size,
        uploadedAt: stats.mtime
      };
    });

    res.json({
      success: true,
      files: files
    });
  } catch (error) {
    console.error('Error getting organization files:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get organization files'
    });
  }
});

// Delete a specific file
router.delete('/:filename', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const { filename } = req.params;
    const { orgId } = req.query;

    let filePath: string;

    if (orgId) {
      filePath = path.join(__dirname, '../../uploads/organizations', orgId as string, filename);
    } else {
      filePath = path.join(__dirname, '../../uploads/temp', filename);
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Delete file from filesystem if it exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file'
    });
  }
});

// Serve organization verification files from Cloudinary
router.get('/organization-verification/:filename', async (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;
    
    // Check if this is a Cloudinary URL (contains cloudinary.com)
    if (filename.includes('cloudinary.com') || filename.startsWith('http')) {
      // For Cloudinary URLs, proxy the content instead of redirecting
      try {
        const response = await fetch(filename);
        if (response.ok) {
          const fileBuffer = await response.arrayBuffer();
          
          // Determine content type based on file extension
          const fileBasename = path.basename(filename);
          const ext = path.extname(fileBasename).toLowerCase();
          let contentType = 'application/octet-stream';
          
          switch (ext) {
            case '.pdf':
              contentType = 'application/pdf';
              break;
            case '.jpg':
            case '.jpeg':
              contentType = 'image/jpeg';
              break;
            case '.png':
              contentType = 'image/png';
              break;
            case '.gif':
              contentType = 'image/gif';
              break;
            case '.doc':
              contentType = 'application/msword';
              break;
            case '.docx':
              contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
              break;
            default:
              // If no extension or unknown, try to use Cloudinary's content type
              contentType = response.headers.get('content-type') || 'application/pdf';
          }
          
          // Set appropriate headers
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Disposition', `inline; filename="${fileBasename}"`);
          res.setHeader('Cache-Control', 'public, max-age=31536000');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
          
          console.log('🔍 Organization verification route sending file with headers:', {
            'Content-Type': contentType,
            'Content-Disposition': `inline; filename="${fileBasename}"`,
            'fileSize': fileBuffer.byteLength,
            'originalCloudinaryType': response.headers.get('content-type')
          });
          
          // Send the file content
          return res.send(Buffer.from(fileBuffer));
        } else {
          return res.status(404).json({
            success: false,
            message: 'File not found on Cloudinary'
          });
        }
      } catch (cloudinaryError) {
        console.error('Error fetching from Cloudinary:', cloudinaryError);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch file from Cloudinary'
        });
      }
    }
    
    // For local files, check if file exists
    const filePath = path.join(__dirname, '../../uploads/temp', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    // Set appropriate headers for PDF files
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Send the file
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving organization verification file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to serve file'
    });
  }
});

// Serve verification files (handles both local and Cloudinary URLs)
router.get('/verification/*', async (req: Request, res: Response) => {
  try {
    const filename = req.params[0];
    
    // Check if this is a Cloudinary URL
    if (filename.includes('cloudinary.com') || filename.startsWith('http')) {
      // For Cloudinary URLs, proxy the content instead of redirecting
      try {
        const response = await fetch(filename);
        if (response.ok) {
          const fileBuffer = await response.arrayBuffer();
          
          // Determine content type based on file extension
          const fileBasename = path.basename(filename);
          const ext = path.extname(fileBasename).toLowerCase();
          let contentType = 'application/octet-stream';
          
          switch (ext) {
            case '.pdf':
              contentType = 'application/pdf';
              break;
            case '.jpg':
            case '.jpeg':
              contentType = 'image/jpeg';
              break;
            case '.png':
              contentType = 'image/png';
              break;
            case '.gif':
              contentType = 'image/gif';
              break;
            case '.doc':
              contentType = 'application/msword';
              break;
            case '.docx':
              contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
              break;
            default:
              // If no extension or unknown, try to use Cloudinary's content type
              contentType = response.headers.get('content-type') || 'application/pdf';
          }
          
          // Set appropriate headers
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Disposition', `inline; filename="${fileBasename}"`);
          res.setHeader('Cache-Control', 'public, max-age=31536000');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
          
          console.log('🔍 Verification route sending file with headers:', {
            'Content-Type': contentType,
            'Content-Disposition': `inline; filename="${fileBasename}"`,
            'fileSize': fileBuffer.byteLength,
            'originalCloudinaryType': response.headers.get('content-type')
          });
          
          // Send the file content
          return res.send(Buffer.from(fileBuffer));
        } else {
          return res.status(404).json({
            success: false,
            message: 'File not found on Cloudinary'
          });
        }
      } catch (cloudinaryError) {
        console.error('Error fetching from Cloudinary:', cloudinaryError);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch file from Cloudinary'
        });
      }
    }
    
    // For local files, check if file exists
    const filePath = path.join(__dirname, '../../uploads/temp', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.doc':
        contentType = 'application/msword';
        break;
      case '.docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Send the file
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving verification file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to serve file'
    });
  }
});

// Serve Cloudinary files through our API (proxy)
router.get('/cloudinary/*', async (req: Request, res: Response) => {
  try {
    const cloudinaryPath = req.params[0];
    
    console.log('🔍 CLOUDINARY ROUTE CALLED!');
    console.log('🔍 Received cloudinary path:', cloudinaryPath);
    console.log('🔍 Full URL:', req.url);
    console.log('🔍 Headers:', req.headers);
    console.log('🔍 User-Agent:', req.headers['user-agent']);
    
    // First, check if this might be a local file (from old uploads)
    // The path structure suggests it might be a Cloudinary URL but the file is actually local
    const filename = path.basename(cloudinaryPath);
    
    // Try multiple possible locations for the file
    const possiblePaths = [
      path.join(__dirname, '../../uploads/temp', filename),
      path.join(__dirname, '../../uploads/organizations', filename),
      path.join(__dirname, '../../uploads', filename)
    ];
    
    // Also try to find files with similar names (in case of filename mismatch)
    const tempDir = path.join(__dirname, '../../uploads/temp');
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      const similarFiles = files.filter(file => 
        file.toLowerCase().includes('porposal') || 
        file.toLowerCase().includes('proposal') ||
        file.toLowerCase().includes('form')
      );
      similarFiles.forEach(file => {
        possiblePaths.push(path.join(tempDir, file));
      });
    }
    
    console.log('🔍 Checking for local file in multiple locations:', possiblePaths);
    
    let localFilePath = null;
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        localFilePath = filePath;
        console.log('✅ Found local file:', filePath);
        break;
      }
    }
    
    if (localFilePath) {
      console.log('✅ Serving file from local storage:', localFilePath);
      
      // Determine content type based on file extension
      const ext = path.extname(localFilePath).toLowerCase();
      let contentType = 'application/octet-stream';
      
      switch (ext) {
        case '.pdf':
          contentType = 'application/pdf';
          break;
        case '.jpg':
        case '.jpeg':
          contentType = 'image/jpeg';
          break;
        case '.png':
          contentType = 'image/png';
          break;
        case '.gif':
          contentType = 'image/gif';
          break;
        case '.doc':
          contentType = 'application/msword';
          break;
        case '.docx':
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          break;
      }
      
      // Set appropriate headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${path.basename(localFilePath)}"`);
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      
      console.log('🔍 Sending local file with headers:', {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${path.basename(localFilePath)}"`,
        'filePath': localFilePath
      });
      
      // Send the local file
      return res.sendFile(localFilePath);
    }
    
    // If not found locally, try Cloudinary URLs
    console.log('🔍 Local file not found, trying Cloudinary URLs');
    
    // Try multiple URL formats to find the file
    const urlsToTry = [];
    
    // Parse the path components
    const parts = cloudinaryPath.split('/');
    const cloudName = parts[0];
    const currentResourceType = parts[1];
    const uploadSegment = parts[2];
    const versionAndPublicId = parts.slice(3).join('/');
    
    // Check if this is a PDF file
    const fileExtension = path.extname(cloudinaryPath).toLowerCase();
    
    if (fileExtension === '.pdf') {
      console.log('🔍 PDF file detected, trying multiple URL formats');
      
      // Try different combinations for PDF files
      urlsToTry.push(`https://res.cloudinary.com/${cloudName}/raw/upload/${versionAndPublicId}`); // raw without version
      urlsToTry.push(`https://res.cloudinary.com/${cloudName}/raw/upload/v1760360090/${versionAndPublicId}`); // raw with version
      urlsToTry.push(`https://res.cloudinary.com/${cloudName}/image/upload/${versionAndPublicId}`); // image without version
      urlsToTry.push(`https://res.cloudinary.com/${cloudName}/image/upload/v1760360090/${versionAndPublicId}`); // image with version
      urlsToTry.push(`https://res.cloudinary.com/${cloudName}/auto/upload/${versionAndPublicId}`); // auto without version
      urlsToTry.push(`https://res.cloudinary.com/${cloudName}/auto/upload/v1760360090/${versionAndPublicId}`); // auto with version
    } else {
      // For non-PDF files, try the original format
      urlsToTry.push(`https://res.cloudinary.com/${cloudName}/${currentResourceType}/${uploadSegment}/${versionAndPublicId}`);
    }
    
    let response = null;
    let successfulUrl = '';
    
    // Try each URL until one works
    for (const url of urlsToTry) {
      console.log('🔍 Trying Cloudinary URL:', url);
      response = await fetch(url);
      
      if (response.ok) {
        successfulUrl = url;
        console.log('✅ Successfully fetched from:', url);
        break;
      } else {
        console.log(`❌ Failed with status ${response.status}:`, url);
      }
    }
    
    if (!response || !response.ok) {
      console.error('❌ All Cloudinary URLs failed');
      console.error('❌ Tried URLs:', urlsToTry);
      return res.status(404).json({
        success: false,
        message: 'File not found on Cloudinary or local storage'
      });
    }
    
    // Get the file content
    const fileBuffer = await response.arrayBuffer();
    
    // Determine content type based on file extension and content analysis
    const fileBasename = path.basename(cloudinaryPath);
    const ext = path.extname(fileBasename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    // First try to detect from file extension
    if (ext) {
      switch (ext) {
        case '.pdf':
          contentType = 'application/pdf';
          break;
        case '.jpg':
        case '.jpeg':
          contentType = 'image/jpeg';
          break;
        case '.png':
          contentType = 'image/png';
          break;
        case '.gif':
          contentType = 'image/gif';
          break;
        case '.doc':
          contentType = 'application/msword';
          break;
        case '.docx':
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          break;
        default:
          contentType = 'application/octet-stream';
      }
    } else {
      // No extension, try to detect from filename patterns
      const filename = fileBasename.toLowerCase();
      if (filename.includes('report') || filename.includes('document') || filename.includes('proposal') || filename.includes('form')) {
        contentType = 'application/pdf';
      } else if (filename.includes('image') || filename.includes('photo') || filename.includes('picture')) {
        contentType = 'image/jpeg';
      } else {
        // Try to use Cloudinary's content type, but default to PDF for documents
        const cloudinaryType = response.headers.get('content-type');
        if (cloudinaryType && cloudinaryType !== 'application/octet-stream') {
          contentType = cloudinaryType;
        } else {
          contentType = 'application/pdf'; // Default to PDF for document-like files
        }
      }
    }
    
    // Create a proper filename with extension for Content-Disposition
    let displayFilename = fileBasename;
    if (!ext && contentType === 'application/pdf') {
      displayFilename = fileBasename + '.pdf';
    } else if (!ext && contentType.startsWith('image/')) {
      displayFilename = fileBasename + '.jpg';
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${displayFilename}"`);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    console.log('🔍 Sending file with headers:', {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${displayFilename}"`,
      'fileSize': fileBuffer.byteLength,
      'originalCloudinaryType': response.headers.get('content-type'),
      'filenameDetection': {
        'originalFilename': fileBasename,
        'hasExtension': !!ext,
        'extension': ext,
        'detectedFromPattern': !ext && (fileBasename.toLowerCase().includes('report') || fileBasename.toLowerCase().includes('document') || fileBasename.toLowerCase().includes('proposal') || fileBasename.toLowerCase().includes('form'))
      }
    });
    
    // Send the file content
    res.send(Buffer.from(fileBuffer));
    
  } catch (error) {
    console.error('Error proxying Cloudinary file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to serve file from Cloudinary'
    });
  }
});

// Serve uploaded files statically
router.use('/files', express.static(path.join(__dirname, '../../uploads')));

export default router;