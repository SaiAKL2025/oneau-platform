import mongoose, { Document, Schema } from 'mongoose';

export interface IPendingApproval extends Document {
  _id: mongoose.Types.ObjectId;
  id: number;
  type: string;
  name: string;
  applicant: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  orgId?: number;
  registrationData: {
    name: string;
    email: string;
    password?: string; // Store password for organization approval (optional for Google OAuth)
    orgType: string;
    description: string;
    president: string;
    founded: string;
    website?: string;
    members: number;
    socialMedia: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
    };
  };
  verificationFile?: {
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    path: string;
    url: string;
  };
  rejectionDetails?: {
    reason: string;
    allowResubmission: boolean;
    resubmissionDeadline?: Date;
    rejectedAt: Date;
    rejectedBy: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PendingApprovalSchema = new Schema<IPendingApproval>(
  {
    id: {
      type: Number,
      required: true,
      unique: true
    },
    type: {
      type: String,
      required: [true, 'Approval type is required'],
      enum: ['organization', 'event']
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    applicant: {
      type: String,
      required: [true, 'Applicant name is required'],
      trim: true
    },
    date: {
      type: String,
      required: [true, 'Application date is required']
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    orgId: {
      type: Number
    },
    verificationFile: {
      filename: String,
      originalName: String,
      mimetype: String,
      size: Number,
      path: String,
      url: String
    },
    registrationData: {
      name: {
        type: String,
        required: true
      },
      email: {
        type: String,
        required: true,
        lowercase: true
      },
      password: {
        type: String,
        required: false // Make optional for Google OAuth users
      },
      orgType: {
        type: String,
        required: true
      },
      description: {
        type: String,
        required: true
      },
      president: {
        type: String,
        required: true
      },
      founded: {
        type: String,
        required: true
      },
      website: {
        type: String
      },
      members: {
        type: Number,
        required: true,
        min: 0
      },
      socialMedia: {
        facebook: String,
        instagram: String,
        twitter: String
      }
    },
    rejectionDetails: {
      reason: {
        type: String,
        required: function() {
          return this.status === 'rejected';
        }
      },
      allowResubmission: {
        type: Boolean,
        default: true
      },
      resubmissionDeadline: {
        type: Date
      },
      rejectedAt: {
        type: Date,
        default: Date.now
      },
      rejectedBy: {
        type: String,
        required: function() {
          return this.status === 'rejected';
        }
      }
    }
  },
  {
    timestamps: true
  }
);

// Create indexes for better query performance
PendingApprovalSchema.index({ status: 1 });
PendingApprovalSchema.index({ type: 1 });

export default mongoose.model<IPendingApproval>('PendingApproval', PendingApprovalSchema);