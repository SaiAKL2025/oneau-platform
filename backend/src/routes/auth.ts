import express, { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User';
import Student from '../models/Student';
import Organization from '../models/Organization';
import PendingApproval from '../models/PendingApproval';
import { generateToken } from '../middleware/auth';
import { uploadSingle, getFileInfo, upload } from '../config/upload';
import { cloudinaryUpload, getCloudinaryFileInfo } from '../config/cloudinary';
import multer from 'multer';
import passport from '../config/passport';
import { generateVerificationToken, sendVerificationEmail } from '../services/emailService';
import { generateVerificationCode, sendVerificationCode, verifyCode } from '../services/emailCodeService';
import EmailValidator from '../services/emailValidator';
import { ActivityService } from '../services/activityService';
import { SettingsService } from '../services/settingsService';

// Extend global interface to include tempCodes
declare global {
  var tempCodes: { [email: string]: { code: string; expiry: Date } } | undefined;
}

const router = express.Router();

// Email validation functions
const validateEmail = (email: string): boolean => {
  // Student pattern: u1234567@au.edu (must be AU email)
  const studentPattern = /^u\d{7}@au\.edu$/;
  
  // Organization pattern: any valid email domain
  const orgPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  return studentPattern.test(email) || orgPattern.test(email);
};

const getEmailPattern = (email: string): 'student' | 'organization' | 'invalid' => {
  // Check if it's a student email (AU email with u[7-digits] pattern)
  if (/^u\d{7}@au\.edu$/.test(email)) {
    return 'student';
  } 
  // Check if it's a valid email (for organizations)
  else if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
    return 'organization';
  } 
  else {
    return 'invalid';
  }
};

// Multer error handler middleware
const handleMulterError = (error: any, req: Request, res: Response, next: NextFunction) => {
  console.log('🚨 MULTER ERROR HANDLER CALLED!');
  console.log('Error type:', error.constructor.name);
  console.log('Error name:', error.name);
  console.log('Error message:', error.message);
  console.log('Error code:', error.code);

  if (error instanceof multer.MulterError) {
    console.log('🔍 Multer error caught:', {
      code: error.code,
      field: error.field,
      message: error.message
    });

    let message = 'File upload error';
    let statusCode = 400;

    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large. Maximum size is 5MB.';
        statusCode = 413;
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files. Only one file allowed.';
        statusCode = 400;
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected field name.';
        statusCode = 400;
        break;
      default:
        message = `File upload error: ${error.message}`;
    }

    return res.status(statusCode).json({
      success: false,
      message: message,
      code: error.code
    });
  }

  // Handle other types of errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error: ' + error.message
    });
  }

  // Generic error handler
  console.error('❌ Unexpected error in multer handler:', error);
  return res.status(500).json({
    success: false,
    message: 'Internal server error during file upload'
  });
};

// Apply multer error handler to all routes
router.use(handleMulterError);

// Register route with file upload
router.post('/register', cloudinaryUpload.single('verificationFile'), async (req: Request, res: Response) => {
  try {
    // Check if registration is allowed
    const isRegistrationAllowed = await SettingsService.isRegistrationAllowed();
    if (!isRegistrationAllowed) {
      return res.status(403).json({
        success: false,
        message: 'New user registration is currently disabled'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password, role, faculty, studentId, year, orgName, orgType, description, president, founded, members, website } = req.body;

    // Real email validation - check if email actually exists
    console.log('🔍 Validating email:', email);
    const emailValidation = await EmailValidator.validateEmailForRegistration(email, role as 'student' | 'organization');
    
    if (!emailValidation.valid) {
      console.log('❌ Email validation failed:', emailValidation.reason);
      return res.status(400).json({
        success: false,
        message: emailValidation.reason || 'Invalid email address'
      });
    }

    console.log('✅ Email validation passed:', {
      email,
      type: emailValidation.type,
      domain: emailValidation.domain
    });

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    const existingStudent = await Student.findOne({ email });

    if (existingUser || existingStudent) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    let verificationFile = null;
    if (req.file) {
      const fileInfo = getCloudinaryFileInfo(req.file, 'verification');
      verificationFile = fileInfo.url; // Save only the URL string, not the entire object
    }

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    if (role === 'student') {
      return res.status(400).json({
        success: false,
        message: 'Manual registration for students is not available. Please use Google OAuth to sign up.'
      });
    } else if (role === 'organization') {
      // Verify the verification code first
      const { verificationCode } = req.body;
      
      if (!verificationCode) {
        return res.status(400).json({
          success: false,
          message: 'Verification code is required'
        });
      }

      // Check if code exists and is valid
      if (!global.tempCodes || !global.tempCodes[email]) {
        return res.status(400).json({
          success: false,
          message: 'No verification code found for this email. Please request a new code.'
        });
      }

      const storedCodeData = global.tempCodes[email];
      if (storedCodeData.code !== verificationCode) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification code'
        });
      }

      if (new Date() > storedCodeData.expiry) {
        delete global.tempCodes[email];
        return res.status(400).json({
          success: false,
          message: 'Verification code has expired. Please request a new code.'
        });
      }

      // Generate unique ID for organization
      const lastOrganization = await Organization.findOne().sort({ id: -1 });
      const orgIdNum = lastOrganization ? lastOrganization.id + 1 : 1;

      // Create organization
      const organization = new Organization({
        id: orgIdNum,
        name: orgName,
        type: orgType,
        description,
        email,
        password,
        president,
        founded,
        members,
        website,
        verificationFile,
        status: 'pending',
        emailVerified: true // Email is already verified through the code
      });

      await organization.save();

      // Clean up the temporary code
      delete global.tempCodes[email];

      // Generate unique ID for pending approval
      const lastApproval = await PendingApproval.findOne().sort({ id: -1 });
      const approvalIdNum = lastApproval ? lastApproval.id + 1 : 1;

      // Create pending approval with all required fields
      const approval = new PendingApproval({
        id: approvalIdNum,
        type: 'organization',
        name: orgName,
        applicant: name,
        date: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
        status: 'pending',
        orgId: organization.id,
        registrationData: {
          name,
          email,
          password,
          orgType,
          description,
          president,
          founded,
          website,
          members: parseInt(members) || 0,
          socialMedia: {
            facebook: '',
            instagram: '',
            twitter: ''
          }
        },
        verificationFile: req.file ? {
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          path: req.file.path,
          url: verificationFile
        } : undefined
      });

      await approval.save();

      // Create activity for organization registration
      try {
        await ActivityService.createActivity({
          type: 'organization_registration',
          title: 'New organization application',
          description: `New organization "${orgName}" has submitted an application for approval`,
          organizationId: organization.id,
          organizationName: orgName,
          userEmail: email,
          metadata: {
            orgType,
            president,
            founded,
            members
          }
        });
      } catch (activityError) {
        console.error('Error creating organization registration activity:', activityError);
        // Don't fail the registration if activity creation fails
      }

      res.status(201).json({
        success: true,
        message: 'Organization registered successfully. Your application is now pending admin approval.',
        requiresApproval: true,
        approvalId: approval._id
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// Login route
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Try to find user in all collections based on role
    let user = null;
    let userType = '';

    // Check admin users first
    user = await User.findOne({ email });
    if (user) {
      userType = 'admin';
    } else {
      // Check students
      user = await Student.findOne({ email });
      if (user) {
        userType = 'student';
      } else {
        // Check organizations
        user = await Organization.findOne({ email });
        if (user) {
          userType = 'organization';
        }
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email address before logging in. Check your email for verification link.',
        requiresVerification: true
      });
    }

    // Check if user is active
    if (user.status === 'inactive') {
      return res.status(401).json({
        success: false,
        message: 'Account is inactive'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = generateToken(user._id.toString());

    console.log('🔍 Backend: User object sent after login:', {
      id: user._id,
      name: user.name,
      email: user.email,
      role: userType,
      followedOrgs: (user as any).followedOrgs
    });

    res.json({
          success: true,
          message: 'Login successful',
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: userType,
            status: user.status,
            emailVerified: user.emailVerified,
            followedOrgs: (user as any).followedOrgs || [],
            ...(userType === 'student' && {
              faculty: (user as any).faculty,
              studentId: (user as any).studentId,
              year: (user as any).yearOfStudy,
              bio: (user as any).bio,
              interests: (user as any).interests,
              phone: (user as any).phone,
              website: (user as any).website,
              profileImage: (user as any).profileImage,
              googleId: (user as any).googleId,
              provider: (user as any).provider,
              badges: (user as any).badges || [],
              joinedEvents: (user as any).joinedEvents || []
            }),
            ...(userType === 'organization' && {
              orgId: (user as any).id,
              orgName: (user as any).name,
              orgType: (user as any).type,
              description: (user as any).description,
              president: (user as any).president,
              founded: (user as any).founded,
              members: (user as any).members,
              website: (user as any).website,
              profileImage: (user as any).profileImage,
              socialMedia: (user as any).socialMedia
            })
          }
        });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Verify email code route
router.post('/verify-code', [
  body('email').isEmail().normalizeEmail(),
  body('code').isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, code } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is an organization (organizations don't have role field)
    if (!user.email || !user.name) {
      return res.status(400).json({
        success: false,
        message: 'Email verification codes are only for organizations'
      });
    }

    // Check if user is already verified
    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Verify the code
    const isCodeValid = await verifyCode(
      email,
      code,
      user.emailVerificationCode || '',
      user.emailVerificationCodeExpires || new Date()
    );

    if (!isCodeValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    // Update user as verified
    user.emailVerified = true;
    user.emailVerificationCode = undefined; // Clear the code
    user.emailVerificationCodeExpires = undefined; // Clear the expiry
    await user.save();

    // Find the pending approval
    const approval = await PendingApproval.findOne({ 'registrationData.email': email });
    
    res.json({
      success: true,
      message: 'Email verified successfully! Your organization application is now pending admin approval.',
      approvalId: approval?._id,
      requiresApproval: true
    });
  } catch (error) {
    console.error('Code verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Code verification failed'
    });
  }
});

// Profile route
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET!);
    
    // Try to find user in all collections
    let user = await User.findById(decoded.userId);
    let userType = 'admin';

    if (!user) {
      user = await Student.findById(decoded.userId);
      userType = 'student';
    }

    if (!user) {
      user = await Organization.findById(decoded.userId);
      userType = 'organization';
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: userType, // Use userType instead of user.role
        status: user.status,
        emailVerified: user.emailVerified,
        followedOrgs: (user as any).followedOrgs || [],
        ...(userType === 'student' && {
          faculty: (user as any).faculty,
          studentId: (user as any).studentId,
          yearOfStudy: (user as any).yearOfStudy,
          bio: (user as any).bio,
          interests: (user as any).interests,
          phone: (user as any).phone,
          website: (user as any).website,
          profileImage: (user as any).profileImage,
          googleId: (user as any).googleId,
          provider: (user as any).provider,
          badges: (user as any).badges || [],
          joinedEvents: (user as any).joinedEvents || []
        }),
        ...(userType === 'organization' && {
          orgId: (user as any).id,
          orgName: (user as any).name,
          orgType: (user as any).type,
          description: (user as any).description,
          president: (user as any).president,
          founded: (user as any).founded,
          members: (user as any).members,
          website: (user as any).website,
          profileImage: (user as any).profileImage,
          googleId: (user as any).googleId,
          provider: (user as any).provider,
          verificationFile: (user as any).verificationFile,
          socialMedia: (user as any).socialMedia
        })
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Profile fetch failed'
    });
  }
});

// Logout (client-side token removal)
router.post('/logout', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Real-time email validation route
router.post('/validate-email', async (req: Request, res: Response) => {
  try {
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    console.log('🔍 Real-time email validation:', { email, role });

    // Validate email format first
    if (!EmailValidator.isValidEmailFormat(email)) {
      return res.json({
        success: false,
        valid: false,
        message: 'Invalid email format'
      });
    }

    // Check AU email rules
    const auEmailCheck = EmailValidator.validateAUEmail(email);
    if (!auEmailCheck.valid) {
      return res.json({
        success: false,
        valid: false,
        message: auEmailCheck.reason
      });
    }

    // Check if email pattern matches role
    if (role === 'student' && auEmailCheck.type !== 'student') {
      return res.json({
        success: false,
        valid: false,
        message: 'Students must use AU email addresses (u[7-digits]@au.edu)'
      });
    }

    if (role === 'organization' && auEmailCheck.type !== 'organization') {
      return res.json({
        success: false,
        valid: false,
        message: 'Please use a valid email address for organization registration'
      });
    }

    // Check if email actually exists
    const existenceCheck = await EmailValidator.validateEmailExists(email);
    
    if (!existenceCheck.valid) {
      return res.json({
        success: false,
        valid: false,
        message: existenceCheck.reason || 'Email does not exist'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    const existingStudent = await Student.findOne({ email });

    if (existingUser || existingStudent) {
      return res.json({
        success: false,
        valid: false,
        message: 'User already exists with this email'
      });
    }

    res.json({
      success: true,
      valid: true,
      message: 'Email format and domain are valid. Verification email will be sent to confirm.',
      type: auEmailCheck.type,
      domain: existenceCheck.domain
    });

  } catch (error) {
    console.error('Email validation error:', error);
    res.status(500).json({
      success: false,
      valid: false,
      message: 'Email validation failed'
    });
  }
});

// Test email existence by sending a test email
router.post('/test-email-existence', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    console.log('🧪 Testing email existence for:', email);

    // Test if email actually exists by sending a test email
    const existenceTest = await EmailValidator.testEmailExistence(email);
    
    if (existenceTest.exists) {
      res.json({
        success: true,
        exists: true,
        message: 'Email address exists and can receive emails',
        reason: existenceTest.reason
      });
    } else {
      res.json({
        success: false,
        exists: false,
        message: 'Email address does not exist or cannot receive emails',
        reason: existenceTest.reason
      });
    }

  } catch (error) {
    console.error('Email existence test error:', error);
    res.status(500).json({
      success: false,
      exists: false,
      message: 'Email existence test failed'
    });
  }
});

// Google OAuth routes
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/google/callback', 
  passport.authenticate('google', { session: false }),
  async (req: any, res: Response) => {
    try {
      const result = req.user;
      
      if (!result) {
        return res.status(401).json({
          success: false,
          message: 'Google authentication failed'
        });
      }

      // If user exists, proceed with login
      if (result.isExisting) {
        const token = generateToken(result.user._id.toString());
        res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}&success=true`);
        return;
      }

      // If user doesn't exist, redirect to form completion
      if (result.profile) {
        // Store Google profile data temporarily in session or pass as URL params
        const profileData = encodeURIComponent(JSON.stringify(result.profile));
        res.redirect(`${process.env.FRONTEND_URL}/google-complete?profile=${profileData}`);
        return;
      }

      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?success=false&error=Authentication failed`);
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?success=false&error=Authentication failed`);
    }
  }
);

// Google OAuth form completion route
router.post('/google/complete', cloudinaryUpload.single('verificationFile'), async (req: Request, res: Response) => {
  try {
    // Check if registration is allowed
    const isRegistrationAllowed = await SettingsService.isRegistrationAllowed();
    if (!isRegistrationAllowed) {
      return res.status(403).json({
        success: false,
        message: 'New user registration is currently disabled'
      });
    }

    console.log('🔍 Google OAuth completion request body:', JSON.stringify(req.body, null, 2));
    console.log('🔍 Request headers:', req.headers);
    console.log('🔍 File uploaded:', req.file ? 'Yes' : 'No');
    
    // Parse FormData - profileData and formData are sent as JSON strings
    let profileData, formData;
    
    try {
      profileData = JSON.parse(req.body.profileData);
      formData = JSON.parse(req.body.formData);
    } catch (parseError) {
      console.log('❌ JSON parse error:', parseError);
      return res.status(400).json({
        success: false,
        message: 'Invalid data format'
      });
    }

    console.log('🔍 Parsed profileData:', profileData);
    console.log('🔍 Parsed formData:', formData);

    if (!profileData || !formData) {
      console.log('❌ Missing data - profileData:', !!profileData, 'formData:', !!formData);
      return res.status(400).json({
        success: false,
        message: 'Missing profile or form data'
      });
    }

    const { email, name, googleId, profileImage, emailPattern } = profileData;
    const { role, faculty, studentId, year, orgName, orgType, description, president, founded, members, website } = formData;

    // Check if user already exists in any collection
    const existingUser = await User.findOne({ email });
    const existingStudent = await Student.findOne({ email });
    const existingOrganization = await Organization.findOne({ email });

    if (existingUser || existingStudent || existingOrganization) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    if (emailPattern === 'student') {
      // Generate unique ID for student
      const lastStudent = await Student.findOne().sort({ id: -1 });
      const studentIdNum = lastStudent ? lastStudent.id + 1 : 1;

      // Students don't need verification files for Google OAuth

      // Create student with Google OAuth data
      const student = new Student({
        id: studentIdNum,
        name: formData.name || name,
        email,
        googleId,
        provider: 'google',
        profileImage,
        faculty,
        studentId,
        yearOfStudy: year,
        role: 'student',
        status: 'active', // Google OAuth users are pre-verified
        emailVerified: true // Google OAuth emails are already verified
      });

      await student.save();

      // Create activity for student registration
      try {
        await ActivityService.createActivity({
          type: 'student_registration',
          title: 'New student registration',
          description: `New student "${name}" has registered with Google OAuth`,
          userId: student.id,
          userName: name,
          userEmail: email,
          metadata: {
            faculty,
            studentId,
            yearOfStudy: year,
            provider: 'google'
          }
        });
      } catch (activityError) {
        console.error('Error creating student registration activity:', activityError);
        // Don't fail the registration if activity creation fails
      }

      const token = generateToken(student._id.toString());

      res.status(201).json({
        success: true,
        message: 'Student registered successfully with Google',
        token,
        user: {
          id: student._id,
          name: student.name,
          email: student.email,
          role: student.role,
          faculty: student.faculty,
          studentId: student.studentId,
          year: student.yearOfStudy,
          bio: student.bio,
          interests: student.interests,
          phone: student.phone,
          website: student.website,
          profileImage: student.profileImage,
          googleId: student.googleId,
          provider: student.provider,
          badges: student.badges || [],
          joinedEvents: student.joinedEvents || []
        }
      });
    } else if (emailPattern === 'organization') {
      // Generate unique ID for organization
      const lastOrganization = await Organization.findOne().sort({ id: -1 });
      const orgIdNum = lastOrganization ? lastOrganization.id + 1 : 1;

      // Handle verification file
      let verificationFileUrl = undefined;
      if (req.file) {
        const fileInfo = getCloudinaryFileInfo(req.file, 'verification');
        verificationFileUrl = fileInfo.url;
        console.log('📁 Verification file uploaded to Cloudinary:', fileInfo);
      }

      // Create organization with Google OAuth data
      const organization = new Organization({
        id: orgIdNum,
        name: orgName,
        type: orgType,
        description,
        email,
        googleId,
        provider: 'google',
        profileImage,
        president,
        founded,
        members,
        website,
        verificationFile: verificationFileUrl,
        status: 'pending',
        emailVerified: true // Google OAuth emails are already verified
      });

      await organization.save();

      // Generate unique ID for pending approval
      const lastApproval = await PendingApproval.findOne().sort({ id: -1 });
      const approvalIdNum = lastApproval ? lastApproval.id + 1 : 1;

      // Create pending approval with all required fields
      const approval = new PendingApproval({
        id: approvalIdNum,
        type: 'organization',
        name: orgName,
        applicant: formData.name || name,
        date: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
        status: 'pending',
        orgId: organization.id,
        registrationData: {
          name: formData.name || name,
          email,
          // No password field for Google OAuth users
          orgType,
          description,
          president,
          founded,
          website,
          members: parseInt(members) || 0,
          socialMedia: {
            facebook: '',
            instagram: '',
            twitter: ''
          }
        },
        verificationFile: req.file ? {
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          path: req.file.path,
          url: verificationFileUrl
        } : undefined
      });

      await approval.save();

      // Generate token for the organization so they can authenticate
      const token = generateToken(organization._id.toString());

      res.status(201).json({
        success: true,
        message: 'Organization registered successfully with Google. Your registration is pending admin approval.',
        token,
        approvalId: approval._id,
        user: {
          id: organization._id,
          name: organization.name,
          email: organization.email,
          role: 'organization',
          status: organization.status
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid email pattern'
      });
    }
  } catch (error) {
    console.error('Google completion error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({
      success: false,
      message: 'Registration completion failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Verify code endpoint (for frontend verification only)
router.post('/verify-code-frontend', [
  body('email').isEmail().normalizeEmail(),
  body('code').isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, code } = req.body;

    console.log('🔍 Verifying code for email:', email);
    console.log('🔍 Code provided:', code);
    console.log('🔍 Global tempCodes:', global.tempCodes);
    console.log('🔍 Email in tempCodes:', global.tempCodes?.[email]);

    // Check if code exists and is valid
    if (!global.tempCodes || !global.tempCodes[email]) {
      console.log('❌ No verification code found for email:', email);
      return res.status(400).json({
        success: false,
        message: 'No verification code found for this email. Please request a new code.'
      });
    }

    const storedCodeData = global.tempCodes[email];
    if (storedCodeData.code !== code) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    if (new Date() > storedCodeData.expiry) {
      delete global.tempCodes[email];
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new code.'
      });
    }

    res.json({
      success: true,
      message: 'Email verified successfully!'
    });
  } catch (error) {
    console.error('Code verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Code verification failed'
    });
  }
});

// Send verification code endpoint
router.post('/send-code', [
  body('email').isEmail().normalizeEmail()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address',
        errors: errors.array()
      });
    }

    const { email } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Generate verification code (6 digits, 10 minutes expiry)
    const verificationCode = generateVerificationCode();
    const codeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store the code temporarily (you might want to use Redis or a temporary collection)
    // For now, we'll just send the email
    const emailSent = await sendVerificationCode(
      email,
      'User', // We don't have a name yet
      verificationCode
    );

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification code'
      });
    }

    // Store code in a temporary way (you might want to use a proper temporary storage)
    // For now, we'll store it in a simple object (not production-ready)
    if (!global.tempCodes) {
      global.tempCodes = {};
    }
    global.tempCodes[email] = {
      code: verificationCode,
      expiry: codeExpiry
    };

    console.log('✅ Stored verification code for email:', email);
    console.log('✅ Code stored:', verificationCode);
    console.log('✅ Expiry:', codeExpiry);
    console.log('✅ Global tempCodes after storage:', global.tempCodes);

    res.json({
      success: true,
      message: 'Verification code sent to your email'
    });
  } catch (error) {
    console.error('Send code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification code'
    });
  }
});

export default router;