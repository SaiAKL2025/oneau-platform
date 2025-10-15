import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IStudent extends Document {
  _id: mongoose.Types.ObjectId;
  id: number;
  email: string;
  password: string;
  name: string;
  faculty: string;
  studentId: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  role: string;
  joined: Date;
  followedOrgs?: number[];
  joinedEvents?: number[];
  badges?: string[];
  // Profile fields
  bio?: string;
  interests?: string;
  yearOfStudy?: string;
  phone?: string;
  website?: string;
  profileImage?: string;
  googleId?: string;
  provider?: 'local' | 'google';
  // Email verification fields
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  // Email verification code fields
  emailVerificationCode?: string;
  emailVerificationCodeExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    id: {
      type: Number,
      required: true,
      unique: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
      type: String,
      required: function(this: IStudent) {
        return this.provider === 'local';
      },
      minlength: [6, 'Password must be at least 6 characters long']
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    faculty: {
      type: String,
      required: [true, 'Faculty is required'],
      trim: true
    },
    studentId: {
      type: String,
      required: [true, 'Student ID is required'],
      unique: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending'],
      default: 'active'
    },
    role: {
      type: String,
      default: 'student'
    },
    joined: {
      type: Date,
      default: Date.now
    },
    followedOrgs: [{
      type: Number
    }],
    joinedEvents: [{
      type: Number
    }],
    badges: [{
      type: String
    }],
    // Profile fields
    bio: {
      type: String,
      trim: true
    },
    interests: {
      type: String,
      trim: true
    },
    yearOfStudy: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    website: {
      type: String,
      trim: true
    },
    profileImage: {
      type: String,
      trim: true
    },
    googleId: {
      type: String,
      trim: true
    },
    provider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local'
    },
    // Email verification fields
    emailVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationToken: {
      type: String,
      trim: true
    },
    emailVerificationExpires: {
      type: Date
    },
    emailVerificationCode: {
      type: String,
      trim: true
    },
    emailVerificationCodeExpires: {
      type: Date
    },
    passwordResetToken: {
      type: String,
      trim: true
    },
    passwordResetExpires: {
      type: Date
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        delete (ret as any).password;
        delete (ret as any).emailVerificationToken;
        delete (ret as any).passwordResetToken;
        return ret;
      }
    }
  }
);

// Hash password before saving (only for local users)
StudentSchema.pre('save', async function(next) {
  if (!this.isModified('password') || this.provider !== 'local') return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method (only for local users)
StudentSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (this.provider !== 'local' || !this.password) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IStudent>('Student', StudentSchema);