import mongoose, { Document, Schema } from 'mongoose';

export interface ISettings extends Document {
  _id: mongoose.Types.ObjectId;
  platformName: string;
  allowRegistration: boolean;
  requireApproval: boolean;
  emailNotifications: boolean;
  maintenanceMode: boolean;
  maxFileSize: number;
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    platformName: {
      type: String,
      required: true,
      default: 'OneAU',
      trim: true
    },
    allowRegistration: {
      type: Boolean,
      required: true,
      default: true
    },
    requireApproval: {
      type: Boolean,
      required: true,
      default: true
    },
    emailNotifications: {
      type: Boolean,
      required: true,
      default: true
    },
    maintenanceMode: {
      type: Boolean,
      required: true,
      default: false
    },
    maxFileSize: {
      type: Number,
      required: true,
      default: 5242880, // 5MB in bytes
      min: 1048576, // Minimum 1MB
      max: 52428800 // Maximum 50MB
    }
  },
  {
    timestamps: true
  }
);

// Ensure only one settings document exists
SettingsSchema.index({}, { unique: true });

export default mongoose.model<ISettings>('Settings', SettingsSchema);
