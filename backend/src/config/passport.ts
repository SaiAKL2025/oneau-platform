import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import User from '../models/User';
import Student from '../models/Student';
import Organization from '../models/Organization';
import PendingApproval from '../models/PendingApproval';

// Email validation function
const validateEmail = (email: string): boolean => {
  // Student pattern: u1234567@au.edu (must be AU email)
  const studentPattern = /^u\d{7}@au\.edu$/;
  
  // Organization pattern: any valid email domain
  const orgPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  return studentPattern.test(email) || orgPattern.test(email);
};

// Determine email pattern and user type
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

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: `${process.env.API_URL}/api/auth/google/callback`
}, async (accessToken: string, refreshToken: string, profile: Profile, done: any) => {
  try {
    const email = profile.emails?.[0]?.value;
    
    if (!email) {
      return done(null, false, { message: 'No email found in Google profile' });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return done(null, false, { 
        message: 'Invalid email format. Please use a valid email address.' 
      });
    }

    const emailPattern = getEmailPattern(email);
    
    // Check if user already exists
    // First check admin users (any email can be admin)
    const existingAdmin = await User.findOne({ 
      $or: [
        { email: email },
        { googleId: profile.id }
      ]
    });

    if (existingAdmin) {
      // User exists as admin, proceed with login
      return done(null, { 
        user: existingAdmin, 
        type: 'admin',
        isExisting: true 
      });
    }

    if (emailPattern === 'student') {
      const existingStudent = await Student.findOne({ 
        $or: [
          { email: email },
          { googleId: profile.id }
        ]
      });

      if (existingStudent) {
        // User exists, proceed with login
        return done(null, { 
          user: existingStudent, 
          type: 'student',
          isExisting: true 
        });
      }
    } else if (emailPattern === 'organization') {
      const existingOrganization = await Organization.findOne({ 
        $or: [
          { email: email },
          { googleId: profile.id }
        ]
      });

      if (existingOrganization) {
        // User exists, proceed with login
        return done(null, { 
          user: existingOrganization, 
          type: 'organization',
          isExisting: true 
        });
      }
    }

    // User doesn't exist, return profile info for form completion
    return done(null, { 
      profile: {
        email: email,
        name: profile.displayName || profile.name?.givenName + ' ' + profile.name?.familyName,
        googleId: profile.id,
        profileImage: profile.photos?.[0]?.value,
        emailPattern: emailPattern
      },
      isExisting: false
    });
  } catch (error) {
    console.error('Google OAuth error:', error);
    return done(error, false);
  }
}));

// Serialize user for session
passport.serializeUser((user: any, done: any) => {
  done(null, user);
});

// Deserialize user from session
passport.deserializeUser((user: any, done: any) => {
  done(null, user);
});

export default passport;