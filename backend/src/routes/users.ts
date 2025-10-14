import express, { Request, Response } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

interface AuthRequest extends Request {
  user?: any;
}
import User from '../models/User';
import Student from '../models/Student';
import Organization from '../models/Organization';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken as any, authorizeRoles('admin') as any, async (req: any, res: Response) => {
  try {
    const users = await User.find({}).select('-password'); // Exclude password field
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Get user profile
router.get('/profile', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const user = (req as any).user;
    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        faculty: user.faculty,
        studentId: user.studentId,
        orgId: user.orgId,
        orgType: user.orgType,
        followedOrgs: user.followedOrgs,
        joinedEvents: user.joinedEvents,
        badges: user.badges,
        bio: user.bio,
        interests: user.interests,
        yearOfStudy: user.yearOfStudy,
        phone: user.phone,
        website: user.website,
        profileImage: user.profileImage
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const user = (req as any).user;
    const updates = req.body;

    console.log('🔍 Profile update request:', {
      userId: user._id,
      userRole: user.role,
      updates: updates
    });

    // Remove sensitive fields
    delete updates.password;
    delete updates.role;
    delete updates.email;

    let updatedUser;

    // Update based on user role/collection
    if (user.role === 'student') {
      console.log('📚 Updating student profile');
      updatedUser = await Student.findByIdAndUpdate(
        user._id,
        updates,
        { new: true, runValidators: true }
      );
    } else if (user.role === 'organization') {
      console.log('🏢 Updating organization profile');
      
      // Filter out empty values for organization updates to avoid validation errors
      const filteredUpdates = { ...updates };
      Object.keys(filteredUpdates).forEach(key => {
        if (filteredUpdates[key] === '' || filteredUpdates[key] === null || filteredUpdates[key] === undefined) {
          delete filteredUpdates[key];
        }
      });
      
      // Ensure required fields are not empty for organizations
      if (filteredUpdates.name === '' || filteredUpdates.name === null || filteredUpdates.name === undefined) {
        delete filteredUpdates.name;
      }
      if (filteredUpdates.type === '' || filteredUpdates.type === null || filteredUpdates.type === undefined) {
        delete filteredUpdates.type;
      }
      if (filteredUpdates.description === '' || filteredUpdates.description === null || filteredUpdates.description === undefined) {
        delete filteredUpdates.description;
      }
      
      console.log('🔍 Filtered updates for organization:', filteredUpdates);
      
      updatedUser = await Organization.findByIdAndUpdate(
        user._id,
        filteredUpdates,
        { new: true, runValidators: true }
      );
    } else {
      console.log('👤 Updating admin profile');
      updatedUser = await User.findByIdAndUpdate(
        user._id,
        updates,
        { new: true, runValidators: true }
      );
    }

    if (!updatedUser) {
      console.log('❌ User not found for ID:', user._id);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('✅ Profile updated successfully for user:', updatedUser._id);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: user.role,
        bio: user.role === 'organization' ? undefined : (updatedUser as any).bio,
        phone: user.role === 'organization' ? undefined : (updatedUser as any).phone,
        website: (updatedUser as any).website,
        profileImage: (updatedUser as any).profileImage,
        // Include role-specific fields
        ...(user.role === 'student' && {
          faculty: (updatedUser as any).faculty,
          studentId: (updatedUser as any).studentId,
          yearOfStudy: (updatedUser as any).yearOfStudy,
          interests: (updatedUser as any).interests
        }),
        ...(user.role === 'organization' && {
          orgName: (updatedUser as any).name,
          orgType: (updatedUser as any).type,
          description: (updatedUser as any).description,
          president: (updatedUser as any).president,
          founded: (updatedUser as any).founded,
          members: (updatedUser as any).members,
          socialMedia: (updatedUser as any).socialMedia
        })
      }
    });
  } catch (error) {
    console.error('❌ Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Serve profile images through API (to avoid CORS issues)
router.get('/images/:filename', (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;
    const imagePath = path.join(__dirname, '../../uploads/profiles', filename);
    
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({
        success: false,
        message: 'Profile image not found'
      });
    }
    
    // Get file extension to set correct Content-Type
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'image/jpeg'; // default
    
    switch (ext) {
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
      case '.bmp':
        contentType = 'image/bmp';
        break;
      case '.tiff':
        contentType = 'image/tiff';
        break;
      default:
        contentType = 'image/jpeg';
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // Override Helmet's same-origin policy
    
    // Send the file
    res.sendFile(imagePath);
  } catch (error) {
    console.error('Error serving profile image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to serve profile image'
    });
  }
});

export default router;