import express, { Request, Response } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import PendingApproval from '../models/PendingApproval';
import Organization from '../models/Organization';
import User from '../models/User';
import { generateToken } from '../middleware/auth';
import { uploadSingle, getFileInfo, upload } from '../config/upload';
import { cloudinaryUpload, getCloudinaryFileInfo } from '../config/cloudinary';
import { ActivityService } from '../services/activityService';
import { FirebaseNotificationService } from '../services/firebaseNotificationService';
import Student from '../models/Student';

interface AuthRequest extends Request {
  user?: any;
}

const router = express.Router();

// Separate function to handle the update logic
async function handleUpdatePendingFile(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log('🔍 File update request for ID:', id);
    console.log('📝 Raw update data:', updateData);
    console.log('📝 Update data keys:', Object.keys(updateData));
    console.log('📎 Uploaded files:', req.files);
    console.log('👤 Request user:', req.user);
    console.log('🔍 Request headers:', req.headers);
    console.log('🔍 Content-Type:', req.headers['content-type']);

    // Log all FormData fields
    console.log('📋 All FormData fields:');
    for (const [key, value] of Object.entries(updateData)) {
      console.log(`  ${key}: ${typeof value === 'string' ? value.substring(0, 100) + '...' : value}`);
    }

    // Log uploaded files
    if (req.files && typeof req.files === 'object') {
      console.log('📎 Files uploaded:');
      for (const [fieldName, files] of Object.entries(req.files)) {
        if (Array.isArray(files)) {
          console.log(`  ${fieldName}: ${files.length} file(s)`);
          files.forEach((file, index) => {
            console.log(`    [${index}]: ${file.originalname} (${file.size} bytes)`);
          });
        }
      }
    }

    // Check if registrationData is a JSON string that needs parsing
    if (updateData.registrationData && typeof updateData.registrationData === 'string') {
      try {
        const parsedData = JSON.parse(updateData.registrationData);
        console.log('✅ Parsed registrationData from JSON string:', parsedData);
        updateData.registrationData = parsedData;
      } catch (parseError) {
        console.log('❌ Failed to parse registrationData JSON:', parseError);
      }
    }

    // Get the approval first to check if it exists
    const existingApproval = await PendingApproval.findById(id);
    if (!existingApproval) {
      console.log('❌ Approval not found for ID:', id);
      return res.status(404).json({
        success: false,
        message: 'Pending approval not found'
      });
    }

    // For organizations updating their own applications, verify ownership
    // Use email from form data or authenticated user's email
    const requestEmail = updateData.email || req.user?.email;
    if (!requestEmail) {
      console.log('❌ No email found in request data or authenticated user');
      return res.status(400).json({
        success: false,
        message: 'Email is required for verification'
      });
    }

    // Verify the user can only update their own application
    if (requestEmail !== existingApproval.registrationData.email) {
      console.log('❌ Unauthorized: Email mismatch', {
        requestEmail: requestEmail,
        approvalEmail: existingApproval.registrationData.email
      });
      return res.status(403).json({
        success: false,
        message: 'You can only update your own application'
      });
    }

    // Prepare update data - merge with existing registrationData to preserve required fields
    const updateFields: any = {
      ...updateData,
      status: 'pending', // Reset to pending for re-review
      updatedAt: new Date()
    };

    // If registrationData is being updated, merge with existing data to preserve required fields
    if (updateData.registrationData) {
      updateFields.registrationData = {
        ...existingApproval.registrationData, // Preserve existing data
        ...updateData.registrationData // Override with new data
      };
      console.log('✅ Merged registrationData:', updateFields.registrationData);
    }

    // If a new file was uploaded, update the verification file
    if (req.files && typeof req.files === 'object' && !Array.isArray(req.files)) {
      console.log('🔍 Checking for uploaded files...');

      // Check for file in different possible formats
      let uploadedFile = null;

      if ((req.files as any).file) {
        if (Array.isArray((req.files as any).file)) {
          uploadedFile = (req.files as any).file[0];
          console.log('✅ Found file in req.files.file array');
        } else {
          uploadedFile = (req.files as any).file;
          console.log('✅ Found file in req.files.file object');
        }
      } else if ((req.files as any)['file']) {
        if (Array.isArray((req.files as any)['file'])) {
          uploadedFile = (req.files as any)['file'][0];
          console.log('✅ Found file in req.files["file"] array');
        } else {
          uploadedFile = (req.files as any)['file'];
          console.log('✅ Found file in req.files["file"] object');
        }
      }

      if (uploadedFile) {
        console.log('📎 Processing uploaded file:', uploadedFile.originalname);
        const fileInfo = getFileInfo(uploadedFile);
        updateFields.verificationFile = fileInfo;
        console.log('✅ New verification file processed:', fileInfo);
      } else {
        console.log('⚠️ No file found in upload - keeping existing file');
      }
    } else {
      console.log('⚠️ No files object in request');
    }

    const approval = await PendingApproval.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    );

    console.log('✅ Updated approval with file:', approval);

    res.json({
      success: true,
      message: 'Application updated successfully',
      approval
    });
  } catch (error) {
    console.error('❌ Error updating pending approval with file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update application: ' + (error instanceof Error ? error.message : 'Unknown error')
    });
  }
}

// Get all pending approvals (including suspended organizations)
router.get('/pending-approvals', authenticateToken as any, authorizeRoles('admin') as any, async (req: any, res: Response) => {
  try {
    console.log('🔍 Admin requesting pending approvals from:', req.ip);
    
    // Get regular pending approvals
    const pendingApprovals = await PendingApproval.find({ status: 'pending' });
    console.log(`✅ Found ${pendingApprovals.length} pending approvals`);

    // Get suspended organizations and convert them to approval format
    const suspendedOrganizations = await Organization.find({ status: 'suspended' });
    console.log(`✅ Found ${suspendedOrganizations.length} suspended organizations`);

    // Convert suspended organizations to approval format
    const suspendedAsApprovals = suspendedOrganizations.map(org => ({
      _id: `suspended_${org._id}`, // Unique ID for suspended orgs
      id: org.id,
      type: 'organization',
      name: org.name,
      applicant: org.email,
      date: org.created ? new Date(org.created).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: 'pending', // Show as pending in approvals page
      registrationData: {
        name: org.name,
        email: org.email,
        orgType: org.type,
        description: org.description,
        president: org.president,
        founded: org.founded,
        members: org.members,
        website: org.website
      },
      isSuspended: true, // Flag to identify suspended organizations
      orgId: org.id,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt
    }));

    // Combine regular pending approvals with suspended organizations
    const allPendingApprovals = [...pendingApprovals, ...suspendedAsApprovals];
    console.log(`✅ Total pending items: ${allPendingApprovals.length} (${pendingApprovals.length} regular + ${suspendedOrganizations.length} suspended)`);

    // Also get approved and rejected counts for dashboard
    const approvedCount = await PendingApproval.countDocuments({ status: 'approved' });
    const rejectedCount = await PendingApproval.countDocuments({ status: 'rejected' });

    res.json({
      success: true,
      pendingApprovals: allPendingApprovals,
      stats: {
        pending: allPendingApprovals.length,
        approved: approvedCount,
        rejected: rejectedCount
      }
    });
  } catch (error) {
    console.error('❌ Error fetching pending approvals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending approvals'
    });
  }
});

// Get organization status by email (for organization status page)
router.get('/organization-status/:email', async (req: any, res: Response) => {
  try {
    const email = req.params.email;
    const approval = await PendingApproval.findOne({ 'registrationData.email': email });

    if (!approval) {
      return res.status(404).json({
        success: false,
        message: 'No application found for this email'
      });
    }

    console.log('🔍 Admin organization-status response - verificationFile:', approval.verificationFile);
    console.log('🔍 Admin organization-status response - verificationFile type:', typeof approval.verificationFile);
    console.log('🔍 Admin organization-status response - verificationFile.url:', approval.verificationFile?.url);
    console.log('🔍 Admin organization-status response - verificationFile.url starts with http:', approval.verificationFile?.url?.startsWith?.('http'));
    console.log('🔍 Admin organization-status response - verificationFile.url includes cloudinary:', approval.verificationFile?.url?.includes?.('res.cloudinary.com'));
    
    res.json({
      success: true,
      approval
    });
  } catch (error) {
    console.error('Error fetching organization status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch organization status'
    });
  }
});

// Get organization status by approval ID (for Google OAuth flow)
router.get('/organization-status-by-id/:id', async (req: any, res: Response) => {
  try {
    const approvalId = req.params.id;
    console.log('🔍 Fetching organization status by ID:', approvalId);
    
    const approval = await PendingApproval.findById(approvalId);

    if (!approval) {
      console.log('❌ No approval found for ID:', approvalId);
      return res.status(404).json({
        success: false,
        message: 'No application found for this approval ID'
      });
    }

    console.log('✅ Found approval:', approval.id, approval.type, approval.name);
    res.json({
      success: true,
      approval
    });
  } catch (error) {
    console.error('Error fetching organization status by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch organization status'
    });
  }
});

// Update pending approval (for organization resubmission)
router.put('/update-pending/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log('Update request for ID:', id);
    console.log('Update data:', updateData);

    const approval = await PendingApproval.findByIdAndUpdate(
      id,
      {
        ...updateData,
        status: 'pending', // Reset to pending for re-review
        updatedAt: new Date()
      },
      { new: true }
    );

    console.log('Updated approval:', approval);

    if (!approval) {
      console.log('Approval not found for ID:', id);
      return res.status(404).json({
        success: false,
        message: 'Pending approval not found'
      });
    }

    res.json({
      success: true,
      message: 'Application updated successfully',
      approval
    });
  } catch (error) {
    console.error('Error updating pending approval:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update application: ' + (error instanceof Error ? error.message : 'Unknown error')
    });
  }
});

// Update pending approval with file upload (for organization resubmission)
// Allow both authenticated and unauthenticated access for organization resubmissions
router.put('/update-pending-file/:id', async (req: any, res: Response) => {
  // Handle multipart form data manually to avoid routing conflicts
  const multerParser = cloudinaryUpload.fields([
    { name: 'registrationData', maxCount: 1 },
    { name: 'email', maxCount: 1 },
    { name: 'file', maxCount: 1 }
  ]);

  return new Promise((resolve, reject) => {
    multerParser(req, res, (err: any) => {
      if (err) {
        console.error('❌ Multer error:', err);
        return res.status(400).json({
          success: false,
          message: 'File upload error: ' + err.message
        });
      }
      resolve(true);
    });
  }).then(() => {
    // Continue with the rest of the logic after multer processing
    return handleUpdatePendingFile(req, res);
  }).catch((error) => {
    console.error('❌ Promise error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  });
});

// Approve organization (handles both pending approvals and suspended organizations)
router.post('/approve/:id', authenticateToken as any, authorizeRoles('admin') as any, async (req: any, res: Response) => {
  try {
    const approvalId = parseInt(req.params.id);
    console.log('🔍 Approving organization with ID:', approvalId);

    // First, try to find as a regular pending approval
    let approval = await PendingApproval.findOne({ id: approvalId });
    let isSuspendedOrg = false;
    let suspendedOrgData: any = null;

    if (!approval) {
      // If not found in pending approvals, check if it's a suspended organization
      const suspendedOrg = await Organization.findOne({ id: approvalId, status: 'suspended' });
      if (suspendedOrg) {
        console.log('🔍 Found suspended organization:', suspendedOrg.name);
        isSuspendedOrg = true;
        
        // Store suspended org data for processing
        suspendedOrgData = {
          registrationData: {
            name: suspendedOrg.name,
            email: suspendedOrg.email,
            orgType: suspendedOrg.type,
            description: suspendedOrg.description,
            president: suspendedOrg.president,
            founded: suspendedOrg.founded,
            members: suspendedOrg.members,
            website: suspendedOrg.website,
            socialMedia: suspendedOrg.socialMedia || { facebook: '', instagram: '', twitter: '' }
          },
          verificationFile: suspendedOrg.verificationFile ? { 
            filename: 'verification',
            originalName: 'verification',
            mimetype: 'application/pdf',
            size: 0,
            path: suspendedOrg.verificationFile,
            url: suspendedOrg.verificationFile 
          } : undefined
        };
      }
    }

    if (!approval && !suspendedOrgData) {
      console.log('❌ Approval not found for ID:', approvalId);
      return res.status(404).json({
        success: false,
        message: 'Approval not found'
      });
    }

    // Update the existing organization record
    const orgData = approval ? approval.registrationData : suspendedOrgData.registrationData;

    // Find the existing organization by email
    const existingOrganization = await Organization.findOne({ email: orgData.email });
    
    if (!existingOrganization) {
      console.log('❌ Existing organization not found for email:', orgData.email);
      return res.status(404).json({
        success: false,
        message: 'Organization not found for approval'
      });
    }

    // Update the existing organization to active status
    existingOrganization.status = 'active';
    existingOrganization.name = orgData.name;
    existingOrganization.type = orgData.orgType;
    existingOrganization.description = orgData.description;
    existingOrganization.president = orgData.president;
    existingOrganization.founded = orgData.founded;
    existingOrganization.members = orgData.members;
    existingOrganization.website = orgData.website;
    const verificationFile = approval ? approval.verificationFile : suspendedOrgData.verificationFile;
    if (verificationFile?.url) {
      existingOrganization.verificationFile = verificationFile.url;
    }

    await existingOrganization.save();
    console.log('✅ Updated existing organization to active status');

    // Update approval status (only if it's a real pending approval, not a suspended org)
    if (!isSuspendedOrg && approval && approval._id) {
      approval.status = 'approved';
      approval.orgId = existingOrganization.id;
      await approval.save();
    }

    // Create activity for organization approval
    try {
      await ActivityService.createActivity({
        type: 'organization_approved',
        title: 'Organization approved',
        description: `Organization "${existingOrganization.name}" has been approved by admin`,
        organizationId: existingOrganization.id,
        organizationName: existingOrganization.name,
        userEmail: existingOrganization.email,
        metadata: {
          orgType: existingOrganization.type,
          president: existingOrganization.president,
          founded: existingOrganization.founded,
          members: existingOrganization.members
        }
      });
    } catch (activityError) {
      console.error('Error creating organization approval activity:', activityError);
      // Don't fail the approval if activity creation fails
    }

    // Send notification to organization owner
    try {
      await FirebaseNotificationService.sendToUser(existingOrganization.id, {
        title: 'Organization Approved',
        body: `Your organization "${existingOrganization.name}" has been approved!`,
        type: 'approval',
        data: { 
          organizationId: existingOrganization.id,
          organizationName: existingOrganization.name
        }
      });
      console.log(`✅ Approval notification sent to organization owner`);
    } catch (notificationError) {
      console.error('Error sending approval notification:', notificationError);
      // Don't fail the approval if notifications fail
    }

    res.json({
      success: true,
      message: 'Organization approved successfully',
      organization: {
        id: existingOrganization.id,
        name: existingOrganization.name,
        email: existingOrganization.email
      }
    });
  } catch (error) {
    console.error('Error approving organization:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve organization'
    });
  }
});

// Reject organization with detailed feedback (handles both pending approvals and suspended organizations)
router.post('/reject/:id', authenticateToken as any, authorizeRoles('admin') as any, async (req: AuthRequest, res: Response) => {
  try {
    const approvalId = parseInt(req.params.id);
    const { rejectionReason, allowResubmission, resubmissionDeadline } = req.body;

    console.log('🔍 Rejecting organization with ID:', approvalId);
    console.log('Reject request:', { approvalId, rejectionReason, allowResubmission, resubmissionDeadline });

    // Validate required fields
    if (!rejectionReason || rejectionReason.trim() === '') {
      console.log('Validation failed: rejection reason is empty');
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    // First, try to find as a regular pending approval
    let approval = await PendingApproval.findOne({ id: approvalId });
    let isSuspendedOrg = false;

    if (!approval) {
      // If not found in pending approvals, check if it's a suspended organization
      const suspendedOrg = await Organization.findOne({ id: approvalId, status: 'suspended' });
      if (suspendedOrg) {
        console.log('🔍 Found suspended organization for rejection:', suspendedOrg.name);
        isSuspendedOrg = true;
        
        // For suspended organizations, just set status to inactive
        suspendedOrg.status = 'inactive';
        await suspendedOrg.save();
        
        return res.json({
          success: true,
          message: 'Suspended organization rejected and deactivated',
          organization: {
            id: suspendedOrg.id,
            name: suspendedOrg.name,
            email: suspendedOrg.email
          }
        });
      }
    }

    if (!approval) {
      console.log('Validation failed: approval not found');
      return res.status(404).json({
        success: false,
        message: 'Approval not found'
      });
    }

    // Validate resubmission deadline if provided
    if (allowResubmission && resubmissionDeadline) {
      console.log('Validating resubmission deadline:', resubmissionDeadline);
      const deadline = new Date(resubmissionDeadline);
      const now = new Date();
      console.log('Deadline parsed:', deadline, 'Now:', now, 'Is valid:', deadline > now);

      if (deadline <= now) {
        console.log('Validation failed: deadline is in the past');
        return res.status(400).json({
          success: false,
          message: 'Resubmission deadline cannot be in the past'
        });
      }
    }

    // Update approval status and rejection details
    console.log('Updating approval status to rejected');

    // Preserve existing registrationData to avoid validation errors
    const existingRegistrationData = approval.registrationData;
    console.log('🔍 Current registrationData:', existingRegistrationData);
    console.log('🔍 Required fields check:');
    console.log('  - password:', !!existingRegistrationData?.password);
    console.log('  - orgType:', !!existingRegistrationData?.orgType);
    console.log('  - founded:', !!existingRegistrationData?.founded);
    console.log('  - members:', !!existingRegistrationData?.members);

    // If required fields are missing, try to restore them from the original data
    // This can happen if the organization resubmission process didn't preserve all fields
    if (!existingRegistrationData?.password || !existingRegistrationData?.orgType ||
        !existingRegistrationData?.founded || !existingRegistrationData?.members) {
      console.log('⚠️ Required fields missing, attempting to restore from original data');

      // For now, provide default values to allow the rejection to proceed
      // In a production environment, you might want to fetch the original registration data
      // Get plain object values, not Mongoose documents
      const socialMedia = existingRegistrationData?.socialMedia || {};
      approval.registrationData = {
        name: existingRegistrationData?.name || 'Unknown',
        email: existingRegistrationData?.email || 'unknown@example.com',
        password: existingRegistrationData?.password || 'placeholder_password',
        orgType: existingRegistrationData?.orgType || 'Unknown',
        description: existingRegistrationData?.description || 'No description',
        president: existingRegistrationData?.president || 'Unknown',
        founded: existingRegistrationData?.founded || 'Unknown',
        website: existingRegistrationData?.website,
        members: existingRegistrationData?.members || 1,
        socialMedia: { facebook: '', instagram: '', twitter: '' } // Use a fresh plain object
      };
      console.log('🔍 Final socialMedia value:', socialMedia);
      console.log('🔍 Final registrationData.socialMedia:', approval.registrationData.socialMedia);

      console.log('✅ Restored registrationData:', approval.registrationData);
    }

    approval.status = 'rejected';
    approval.rejectionDetails = {
      reason: rejectionReason.trim(),
      allowResubmission: allowResubmission !== false, // Default to true
      resubmissionDeadline: allowResubmission && resubmissionDeadline ? new Date(resubmissionDeadline) : undefined,
      rejectedAt: new Date(),
      rejectedBy: req.user?.email || 'Admin'
    };

    // Ensure registrationData is preserved (important for validation)
    if (!approval.registrationData || Object.keys(approval.registrationData).length === 0) {
      console.log('⚠️ Warning: registrationData is empty, this may cause validation errors');
    }

    console.log('Rejection details:', approval.rejectionDetails);
    console.log('Registration data preserved:', !!existingRegistrationData);

    try {
      await approval.save();
      console.log('Approval saved successfully');

      res.json({
        success: true,
        message: 'Organization rejected with feedback provided',
        rejectionDetails: approval.rejectionDetails
      });
    } catch (saveError) {
      console.error('Error saving approval:', saveError);
      return res.status(500).json({
        success: false,
        message: 'Failed to save rejection details'
      });
    }
  } catch (error) {
    console.error('Error rejecting organization:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject organization'
    });
  }
});

// Get approved applications
router.get('/approved-approvals', authenticateToken as any, authorizeRoles('admin') as any, async (req: any, res: Response) => {
  try {
    console.log('🔍 Admin requesting approved approvals');
    const approvedApprovals = await PendingApproval.find({ status: 'approved' }).sort({ updatedAt: -1 });
    console.log(`✅ Found ${approvedApprovals.length} approved approvals`);
    res.json({
      success: true,
      approvedApprovals
    });
  } catch (error) {
    console.error('❌ Error fetching approved approvals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch approved approvals'
    });
  }
});

// Get rejected applications
router.get('/rejected-approvals', authenticateToken as any, authorizeRoles('admin') as any, async (req: any, res: Response) => {
  try {
    console.log('🔍 Admin requesting rejected approvals');
    const rejectedApprovals = await PendingApproval.find({ status: 'rejected' }).sort({ updatedAt: -1 });
    console.log(`✅ Found ${rejectedApprovals.length} rejected approvals`);
    res.json({
      success: true,
      rejectedApprovals
    });
  } catch (error) {
    console.error('❌ Error fetching rejected approvals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rejected approvals'
    });
  }
});

// Suspend organization
router.post('/suspend-organization/:id', authenticateToken as any, authorizeRoles('admin') as any, async (req: any, res: Response) => {
  try {
    const orgId = parseInt(req.params.id);
    const { reason } = req.body;

    const organization = await Organization.findOne({ id: orgId });
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Update organization status to suspended
    organization.status = 'suspended';
    await organization.save();

    // Send notification to organization owner
    try {
      await FirebaseNotificationService.sendToUser(organization.id.toString(), {
        title: 'Organization Suspended',
        body: `Your organization "${organization.name}" has been suspended. Reason: ${reason || 'No reason provided'}`,
        type: 'system',
        data: { 
          organizationId: organization.id,
          organizationName: organization.name,
          reason: reason || 'No reason provided'
        }
      });
      console.log(`✅ Suspension notification sent to organization ${orgId}`);
    } catch (notificationError) {
      console.error('Error sending suspension notification:', notificationError);
    }

    // Send notification to organization followers
    try {
      const followers = await Student.find({ 
        followedOrgs: { $in: [orgId] },
        status: 'active'
      }).select('id');
      
      const followerIds = followers.map(follower => follower.id);
      
      if (followerIds.length > 0) {
        await FirebaseNotificationService.sendToUsers(followerIds, {
          title: 'Organization Suspended',
          body: `"${organization.name}" has been suspended`,
          type: 'system',
          data: { 
            organizationId: organization.id,
            organizationName: organization.name,
            reason: reason || 'No reason provided'
          }
        });
        console.log(`✅ Suspension notifications sent to ${followerIds.length} followers`);
      }
    } catch (notificationError) {
      console.error('Error sending suspension notifications to followers:', notificationError);
    }

    res.json({
      success: true,
      message: 'Organization suspended successfully',
      organization: {
        id: organization.id,
        name: organization.name,
        status: organization.status
      }
    });
  } catch (error) {
    console.error('Error suspending organization:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to suspend organization'
    });
  }
});

// Suspend student
router.post('/suspend-student/:id', authenticateToken as any, authorizeRoles('admin') as any, async (req: any, res: Response) => {
  try {
    const studentId = parseInt(req.params.id);
    const { reason } = req.body;

    const student = await Student.findOne({ id: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Update student status to suspended
    student.status = 'suspended';
    await student.save();

    // Send notification to student
    try {
      await FirebaseNotificationService.sendToUser(student.id.toString(), {
        title: 'Account Suspended',
        body: `Your account has been suspended. Reason: ${reason || 'No reason provided'}`,
        type: 'system',
        data: { 
          studentId: student.id,
          studentName: student.name,
          reason: reason || 'No reason provided'
        }
      });
      console.log(`✅ Suspension notification sent to student ${studentId}`);
    } catch (notificationError) {
      console.error('Error sending suspension notification:', notificationError);
    }

    // Send notification to organizations the student follows
    try {
      const followedOrgs = student.followedOrgs || [];
      if (followedOrgs.length > 0) {
        await FirebaseNotificationService.sendToUsers(followedOrgs.map(id => id.toString()), {
          title: 'Follower Suspended',
          body: `${student.name} has been suspended`,
          type: 'system',
          data: { 
            studentId: student.id,
            studentName: student.name,
            reason: reason || 'No reason provided'
          }
        });
        console.log(`✅ Suspension notifications sent to ${followedOrgs.length} organizations`);
      }
    } catch (notificationError) {
      console.error('Error sending suspension notifications to organizations:', notificationError);
    }

    res.json({
      success: true,
      message: 'Student suspended successfully',
      student: {
        id: student.id,
        name: student.name,
        status: student.status
      }
    });
  } catch (error) {
    console.error('Error suspending student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to suspend student'
    });
  }
});

export default router;