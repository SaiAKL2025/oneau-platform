import express, { Request, Response } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import Organization from '../models/Organization';
import Student from '../models/Student';
import User from '../models/User';
import PendingApproval from '../models/PendingApproval';
import { FirebaseNotificationService } from '../services/firebaseNotificationService';
import mongoose from 'mongoose';

const router = express.Router();

// Check if database is connected
const isDatabaseConnected = () => {
  return mongoose.connection.readyState === 1;
};

// Get all organizations
router.get('/', async (req: any, res: Response) => {
  try {
    // Check if database is connected
    if (!isDatabaseConnected()) {
      console.log('Database not connected, returning mock data for organizations');
      // Return mock data when database is not connected
      const mockOrganizations = [
        {
          _id: '1',
          name: 'AUSO (Assumption University Student Organization)',
          type: 'Student Government',
          description: 'The main student government organization representing all students at Assumption University.',
          status: 'active',
          followers: 1500,
          profileImage: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          _id: '2',
          name: 'Computer Science Club',
          type: 'Academic',
          description: 'A community for computer science students to share knowledge and collaborate on projects.',
          status: 'active',
          followers: 800,
          profileImage: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      return res.json({
        success: true,
        data: mockOrganizations,
        message: 'Using mock data - database not connected'
      });
    }

    const organizations = await Organization.find({});
    
    // Organizations now have their own profile images
    const organizationsWithProfileImages = organizations.map(org => ({
      ...org.toObject(),
      profileImage: org.profileImage || null
    }));
    
    res.json({
      success: true,
      data: organizationsWithProfileImages
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch organizations'
    });
  }
});

// Get organization by ID
router.get('/:id', async (req: any, res: Response) => {
  try {
    const organization = await Organization.findOne({
      id: parseInt(req.params.id)
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Organizations now have their own profile images
    const organizationWithProfileImage = {
      ...organization.toObject(),
      profileImage: organization.profileImage || null
    };

    res.json({
      success: true,
      organization: organizationWithProfileImage
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch organization'
    });
  }
});

// Get organization's own application status (for organization users)
router.get('/my-application/status', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const user = (req as any).user;
    console.log('🔍 Organization status request from user:', user.email, 'role:', user.role);
    
    if (user.role !== 'organization') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This endpoint is for organization users only.'
      });
    }

    // First, try to find in PendingApproval collection
    const pendingApproval = await PendingApproval.findOne({ 'registrationData.email': user.email });
    
    if (pendingApproval) {
      console.log('✅ Found pending approval for organization:', pendingApproval.id);
      return res.json({
        success: true,
        approval: pendingApproval
      });
    }

    // If not found in PendingApproval, check if organization exists in Organization collection
    const organization = await Organization.findOne({ email: user.email });
    
    if (organization) {
      console.log('✅ Found organization record:', organization.id, 'status:', organization.status);
      
      // Convert organization to approval format for consistency
      const approvalFormat = {
        _id: organization._id,
        id: organization.id,
        type: 'organization',
        name: organization.name,
        applicant: organization.email,
        date: organization.created ? new Date(organization.created).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        status: organization.status === 'active' ? 'approved' : organization.status,
        registrationData: {
          name: organization.name,
          email: organization.email,
          orgType: organization.type,
          description: organization.description,
          president: organization.president,
          founded: organization.founded,
          members: organization.members,
          website: organization.website
        },
        verificationFile: organization.verificationFile ? {
          url: organization.verificationFile,
          originalName: 'verification_document.pdf',
          mimetype: 'application/pdf',
          size: 0
        } : null,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt
      };
      
      return res.json({
        success: true,
        approval: approvalFormat
      });
    }

    // If not found in either collection
    console.log('❌ No application found for organization email:', user.email);
    return res.status(404).json({
      success: false,
      message: 'No application found for this organization'
    });
    
  } catch (error) {
    console.error('Error fetching organization application status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch application status'
    });
  }
});

// Follow organization
router.post('/:id/follow', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const user = (req as any).user;
    const orgId = parseInt(req.params.id);

    // Check if user is a student (from students collection) or regular user
    const isStudent = user.role === 'student';

    if (isStudent) {
      // Update student in students collection
      await Student.findByIdAndUpdate(
        user._id,
        {
          $addToSet: { followedOrgs: orgId }, // Use $addToSet to avoid duplicates
          updatedAt: new Date()
        }
      );
    } else {
      // Update regular user in users collection
      await User.findByIdAndUpdate(
        user._id,
        {
          $addToSet: { followedOrgs: orgId }, // Use $addToSet to avoid duplicates
          updatedAt: new Date()
        }
      );
    }

    // Increment organization followers
    await Organization.findOneAndUpdate(
      { id: orgId },
      { $inc: { followers: 1 } }
    );

    // Send notification to organization owner
    try {
      const organization = await Organization.findOne({ id: orgId });
      if (organization) {
        await FirebaseNotificationService.sendToUser(organization.id.toString(), {
          title: 'New Follower',
          body: `${user.name} started following your organization`,
          type: 'organization',
          data: { 
            studentId: user.id,
            studentName: user.name,
            organizationId: orgId,
            organizationName: organization.name
          }
        });
        console.log(`✅ Follow notification sent to organization ${orgId}`);
      }
    } catch (notificationError) {
      console.error('Error sending follow notification:', notificationError);
      // Don't fail the follow if notifications fail
    }

    res.json({
      success: true,
      message: 'Successfully followed organization'
    });
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to follow organization'
    });
  }
});

// Unfollow organization
router.delete('/:id/follow', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const user = (req as any).user;
    const orgId = parseInt(req.params.id);

    // Check if user is a student (from students collection) or regular user
    const isStudent = user.role === 'student';

    if (isStudent) {
      // Update student in students collection
      await Student.findByIdAndUpdate(
        user._id,
        {
          $pull: { followedOrgs: orgId }, // Use $pull to remove the orgId
          updatedAt: new Date()
        }
      );
    } else {
      // Update regular user in users collection
      await User.findByIdAndUpdate(
        user._id,
        {
          $pull: { followedOrgs: orgId }, // Use $pull to remove the orgId
          updatedAt: new Date()
        }
      );
    }

    // Decrement organization followers
    await Organization.findOneAndUpdate(
      { id: orgId },
      { $inc: { followers: -1 } }
    );

    // Send notification to organization owner
    try {
      const organization = await Organization.findOne({ id: orgId });
      if (organization) {
        await FirebaseNotificationService.sendToUser(organization.id.toString(), {
          title: 'Lost Follower',
          body: `${user.name} unfollowed your organization`,
          type: 'organization',
          data: { 
            studentId: user.id,
            studentName: user.name,
            organizationId: orgId,
            organizationName: organization.name
          }
        });
        console.log(`✅ Unfollow notification sent to organization ${orgId}`);
      }
    } catch (notificationError) {
      console.error('Error sending unfollow notification:', notificationError);
      // Don't fail the unfollow if notifications fail
    }

    res.json({
      success: true,
      message: 'Successfully unfollowed organization'
    });
  } catch (error) {
    console.error('Unfollow error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unfollow organization'
    });
  }
});

// Update organization profile (for organization owners and admins)
router.put('/:id', authenticateToken as any, authorizeRoles('organization', 'admin') as any, async (req: any, res: Response) => {
  try {
    const user = (req as any).user;
    const orgId = parseInt(req.params.id);

    console.log('🔍 Organization update authorization check:', {
      userRole: user.role,
      userId: user.id,
      orgId: orgId,
      userEmail: user.email
    });

    // For organization users, verify they own this organization
    // For admin users, allow them to update any organization
    if (user.role === 'organization' && user.id !== orgId) {
      console.log('❌ Authorization failed: User ID does not match organization ID');
      return res.status(403).json({
        success: false,
        message: 'You can only update your own organization'
      });
    }

    const updateData = req.body;

    // Update the organization
    const updatedOrganization = await Organization.findOneAndUpdate(
      { id: orgId },
      {
        ...updateData,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!updatedOrganization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Send notifications to organization followers
    try {
      // Get students who follow this organization
      const followers = await Student.find({ 
        followedOrgs: { $in: [orgId] },
        status: 'active'
      }).select('id');
      
      const followerIds = followers.map(follower => follower.id);
      
      if (followerIds.length > 0) {
        await FirebaseNotificationService.sendToUsers(followerIds, {
          title: 'Organization Profile Updated',
          body: `${updatedOrganization.name} updated their profile`,
          type: 'organization',
          data: { 
            organizationId: orgId,
            organizationName: updatedOrganization.name
          }
        });
        console.log(`✅ Organization update notifications sent to ${followerIds.length} followers`);
      }
    } catch (notificationError) {
      console.error('Error sending organization update notifications:', notificationError);
      // Don't fail the update if notifications fail
    }

    // Organizations now have their own profile images
    const organizationWithProfileImage = {
      ...updatedOrganization.toObject(),
      profileImage: updatedOrganization.profileImage || null
    };

    res.json({
      success: true,
      message: 'Organization updated successfully',
      organization: organizationWithProfileImage
    });
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update organization'
    });
  }
});

export default router;