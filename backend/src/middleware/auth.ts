import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import User, { IUser } from '../models/User';
import Student, { IStudent } from '../models/Student';
import Organization, { IOrganization } from '../models/Organization';

interface AuthRequest extends Request {
  user?: IUser | IStudent | IOrganization;
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log('🔍 Auth middleware: Processing request to', req.path);
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.log('❌ Auth middleware: No token provided');
      res.status(401).json({ message: 'Access token required' });
      return;
    }
    
    console.log('🔍 Auth middleware: Token found, verifying...');

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    // Try to find user in all collections
    let user = await User.findById(decoded.userId);
    if (user) {
      (user as any).role = 'admin'; // Explicitly set role for admins
    }

    // If not found in User collection, try Student collection
    if (!user) {
      const student = await Student.findById(decoded.userId);
      if (student) {
        user = student as any; // Type cast for compatibility
        (user as any).role = 'student'; // Explicitly set role for students
      }
    }

    // If not found in Student collection, try Organization collection
    if (!user) {
      const organization = await Organization.findById(decoded.userId);
      if (organization) {
        user = organization as any; // Type cast for compatibility
        (user as any).role = 'organization'; // Explicitly set role for organizations
      }
    }

    if (!user) {
      console.log('❌ Auth middleware: User not found');
      res.status(401).json({ message: 'Invalid token' });
      return;
    }

    console.log('✅ Auth middleware: User authenticated successfully:', {
      id: user._id,
      role: (user as any).role,
      name: (user as any).name
    });
    req.user = user;
    next();
  } catch (error) {
    console.log('❌ Auth middleware: Token verification failed:', error);
    res.status(403).json({ message: 'Invalid or expired token' });
  }
};

export const authorizeRoles = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!roles.includes((req.user as any).role)) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

export const generateToken = (userId: string): string => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRE || '7d' } as jwt.SignOptions
  );
};