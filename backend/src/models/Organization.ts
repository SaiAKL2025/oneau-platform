import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IOrganization extends Document {
  _id: mongoose.Types.ObjectId;
  id: number;
  name: string;
  type: string;
  description: string;
  followers: number;
  founded: string;
  email: string;
  password: string;
  website?: string;
  president: string;
  status: 'active' | 'pending' | 'inactive' | 'suspended';
  members: number;
  created: Date;
  achievements: string[];
  socialImpact: string;
  socialMedia: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  verificationFile?: string;
  // Authentication fields
  googleId?: string;
  provider?: 'local' | 'google';
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  // Profile fields
  profileImage?: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    id: {
      type: Number,
      required: true,
      unique: true
    },
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true
    },
    type: {
      type: String,
      required: [true, 'Organization type is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true
    },
    followers: {
      type: Number,
      default: 0,
      min: 0
    },
    founded: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    website: {
      type: String,
      trim: true
    },
    president: {
      type: String,
      required: false,
      trim: true
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'inactive', 'suspended'],
      default: 'pending'
    },
    members: {
      type: Number,
      default: 0,
      min: 0
    },
    created: {
      type: Date,
      default: Date.now
    },
    achievements: [{
      type: String,
      trim: true
    }],
    socialImpact: {
      type: String,
      trim: true
    },
    socialMedia: {
      facebook: {
        type: String,
        trim: true
      },
      instagram: {
        type: String,
        trim: true
      },
      twitter: {
        type: String,
        trim: true
      }
    },
    verificationFile: {
      type: String,
      trim: true
    },
    // Authentication fields
    password: {
      type: String,
      required: function(this: IOrganization) {
        return this.provider === 'local';
      },
      minlength: [6, 'Password must be at least 6 characters long']
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
    passwordResetToken: {
      type: String,
      trim: true
    },
    passwordResetExpires: {
      type: Date
    },
    profileImage: {
      type: String,
      trim: true
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

// Hash password before saving (only for local organizations)
OrganizationSchema.pre('save', async function(next) {
  if (!this.isModified('password') || this.provider !== 'local') return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method (only for local organizations)
OrganizationSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (this.provider !== 'local' || !this.password) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.password);
};

// Create indexes for better query performance
OrganizationSchema.index({ status: 1 });
OrganizationSchema.index({ type: 1 });

export default mongoose.model<IOrganization>('Organization', OrganizationSchema);