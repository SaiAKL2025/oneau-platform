import mongoose, { Document, Schema } from 'mongoose';

export interface IActivity extends Document {
  _id: mongoose.Types.ObjectId;
  id: number;
  type: 'organization_registration' | 'student_registration' | 'event_creation' | 'event_capacity_reached' | 'organization_approved' | 'organization_suspended' | 'student_suspended';
  title: string;
  description: string;
  userId?: number;
  userName?: string;
  userEmail?: string;
  organizationId?: number;
  organizationName?: string;
  eventId?: number;
  eventTitle?: string;
  metadata?: {
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    id: {
      type: Number,
      required: true,
      unique: true
    },
    type: {
      type: String,
      required: true,
      enum: [
        'organization_registration',
        'student_registration', 
        'event_creation',
        'event_capacity_reached',
        'organization_approved',
        'organization_suspended',
        'student_suspended'
      ]
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    userId: {
      type: Number
    },
    userName: {
      type: String,
      trim: true
    },
    userEmail: {
      type: String,
      trim: true
    },
    organizationId: {
      type: Number
    },
    organizationName: {
      type: String,
      trim: true
    },
    eventId: {
      type: Number
    },
    eventTitle: {
      type: String,
      trim: true
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Create indexes for better query performance
ActivitySchema.index({ type: 1 });
ActivitySchema.index({ createdAt: -1 });
ActivitySchema.index({ userId: 1 });
ActivitySchema.index({ organizationId: 1 });
ActivitySchema.index({ eventId: 1 });

export default mongoose.model<IActivity>('Activity', ActivitySchema);
