import mongoose, { Document, Schema } from 'mongoose';

export interface IEvent extends Document {
  _id: mongoose.Types.ObjectId;
  id: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  orgId: number;
  orgName: string;
  type: string;
  location: string;
  venue: string;
  description: string;
  organizer: string;
  partner: string;
  responsiblePerson: string;
  responsibleEmail: string;
  responsiblePhone: string;
  capacity: number;
  registered: number;
  status: 'active' | 'draft' | 'cancelled' | 'completed';
  participants: number[];
  media?: Array<{
    type: string;
    url: string;
    filename?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    id: {
      type: Number,
      required: true,
      unique: true
    },
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true
    },
    date: {
      type: String,
      required: [true, 'Event date is required']
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required']
    },
    endTime: {
      type: String,
      required: [true, 'End time is required']
    },
    orgId: {
      type: Number,
      required: [true, 'Organization ID is required']
    },
    orgName: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true
    },
    type: {
      type: String,
      required: [true, 'Event type is required'],
      trim: true
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true
    },
    venue: {
      type: String,
      required: [true, 'Venue is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true
    },
    organizer: {
      type: String,
      required: [true, 'Organizer is required'],
      trim: true
    },
    partner: {
      type: String,
      trim: true
    },
    responsiblePerson: {
      type: String,
      required: [true, 'Responsible person is required'],
      trim: true
    },
    responsibleEmail: {
      type: String,
      required: [true, 'Responsible email is required'],
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    responsiblePhone: {
      type: String,
      required: [true, 'Responsible phone is required'],
      trim: true
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: 1
    },
    registered: {
      type: Number,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      enum: ['active', 'draft', 'cancelled', 'completed'],
      default: 'active'
    },
    participants: [{
      type: Number
    }],
    media: [{
      type: {
        type: String,
        enum: ['image', 'video', 'document'],
        required: true
      },
      url: {
        type: String,
        required: true
      },
      filename: {
        type: String
      }
    }]
  },
  {
    timestamps: true
  }
);

// Create indexes for better query performance
EventSchema.index({ orgId: 1 });
EventSchema.index({ status: 1 });
EventSchema.index({ date: 1 });
EventSchema.index({ type: 1 });

export default mongoose.model<IEvent>('Event', EventSchema);