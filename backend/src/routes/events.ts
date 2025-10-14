import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import Event from '../models/Event';
import User from '../models/User';
import upload, { handleUploadError } from '../config/upload';
import { cloudinaryUpload, cloudinaryUploadMultiple, getCloudinaryFileInfo } from '../config/cloudinary';
import { ActivityService } from '../services/activityService';
import { FirebaseNotificationService } from '../services/firebaseNotificationService';
import Student from '../models/Student';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/events');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, JPEG, and PNG files are allowed'));
  }
};

// Note: Using cloudinaryUploadMultiple instead of local multer configuration

const router = express.Router();

// Create event with image uploads
router.post('/', authenticateToken as any, authorizeRoles('organization') as any, cloudinaryUploadMultiple.array('images', 5), async (req: any, res: Response) => {
  try {
    const user = (req as any).user;
    const files = req.files as Express.Multer.File[];
    const eventData = req.body;

    console.log('🔍 Creating event:', {
      userRole: user.role,
      userId: user.id,
      userEmail: user.email,
      eventData: eventData,
      filesCount: files ? files.length : 0
    });

    // Generate unique ID
    const lastEvent = await Event.findOne().sort({ id: -1 });
    const newId = lastEvent ? lastEvent.id + 1 : 1;

    // Process uploaded images using Cloudinary
    const media = files ? files.map(file => {
      const fileInfo = getCloudinaryFileInfo(file, 'event');
      return {
        type: 'image' as const,
        url: fileInfo.url,
        filename: fileInfo.filename,
        originalName: fileInfo.originalName,
        mimetype: fileInfo.mimetype,
        size: fileInfo.size
      };
    }) : [];

    const event = new Event({
      id: newId,
      ...eventData,
      orgId: user.id,
      orgName: user.name,
      organizer: user.name,
      capacity: parseInt(eventData.capacity) || 100,
      registered: 0,
      participants: [],
      media,
      status: 'active'
    });

    await event.save();

    // Create activity for event creation
    try {
      await ActivityService.createActivity({
        type: 'event_creation',
        title: 'New event created',
        description: `New event "${eventData.title}" has been created by ${user.name}`,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        organizationId: user.id,
        organizationName: user.name,
        eventId: event.id,
        eventTitle: eventData.title,
        metadata: {
          eventType: eventData.type,
          location: eventData.location,
          venue: eventData.venue,
          capacity: eventData.capacity,
          date: eventData.date
        }
      });
    } catch (activityError) {
      console.error('Error creating event creation activity:', activityError);
      // Don't fail the event creation if activity creation fails
    }

    // Send notifications to organization followers
    try {
      // Get students who follow this organization
      const followers = await Student.find({ 
        followedOrgs: { $in: [user.id] },
        status: 'active'
      }).select('id');
      
      const followerIds = followers.map(follower => follower.id);
      
      if (followerIds.length > 0) {
        await FirebaseNotificationService.sendToUsers(followerIds, {
          title: 'New Event Created',
          body: `${eventData.title} by ${user.name}`,
          type: 'event',
          data: { 
            eventId: event.id, 
            organizationId: user.id,
            eventTitle: eventData.title
          }
        });
        console.log(`✅ Event notifications sent to ${followerIds.length} followers`);
      }
    } catch (notificationError) {
      console.error('Error sending event notifications:', notificationError);
      // Don't fail the event creation if notifications fail
    }

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: event
    });
  } catch (error) {
    console.error('❌ Error creating event:', error);
    
    // Clean up uploaded files if event creation fails
    if (req.files) {
      const files = req.files as Express.Multer.File[];
      files.forEach(file => {
        fs.unlinkSync(file.path);
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create event'
    });
  }
});

// Update event with image uploads
router.put('/:id', authenticateToken as any, authorizeRoles('organization') as any, cloudinaryUpload.array('images', 5), async (req: any, res: Response) => {
  try {
    const user = (req as any).user;
    const eventId = parseInt(req.params.id);
    const files = req.files as Express.Multer.File[];
    const updateData = req.body;

    const event = await Event.findOne({ id: eventId, orgId: user.id });
    if (!event) {
      // Clean up uploaded files
      if (req.files) {
        const files = req.files as Express.Multer.File[];
        files.forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
      return res.status(404).json({
        success: false,
        message: 'Event not found or access denied'
      });
    }

    // Process new uploaded images using Cloudinary
    const newMedia = files ? files.map(file => {
      const fileInfo = getCloudinaryFileInfo(file, 'event');
      return {
        type: 'image' as const,
        url: fileInfo.url,
        filename: fileInfo.filename,
        originalName: fileInfo.originalName,
        mimetype: fileInfo.mimetype,
        size: fileInfo.size
      };
    }) : [];

    // Handle existing images - if existingImages is provided, use it; otherwise keep all existing
    let existingMediaToKeep = event.media || [];
    if (updateData.existingImages) {
      try {
        existingMediaToKeep = JSON.parse(updateData.existingImages);
        console.log('Parsed existingImages:', existingMediaToKeep.length, 'images');
        console.log('Original event media:', event.media?.length || 0, 'images');
      } catch (error) {
        console.error('Error parsing existingImages:', error);
        // Fallback to keeping all existing images if parsing fails
        existingMediaToKeep = event.media || [];
      }
    } else {
      console.log('No existingImages provided, keeping all existing media');
    }

    // Combine kept existing media with new uploads
    const updatedMedia = [...existingMediaToKeep, ...newMedia];

    // Update event
    Object.assign(event, {
      ...updateData,
      media: updatedMedia,
      capacity: parseInt(updateData.capacity) || event.capacity
    });

    await event.save();

    // Send notifications to event participants
    try {
      const participants = event.participants || [];
      if (participants.length > 0) {
        await FirebaseNotificationService.sendToUsers(participants.map(id => id.toString()), {
          title: 'Event Updated',
          body: `"${event.title}" has been updated`,
          type: 'event',
          data: { 
            eventId: event.id,
            eventTitle: event.title,
            organizationId: event.orgId
          }
        });
        console.log(`✅ Event update notifications sent to ${participants.length} participants`);
      }
    } catch (notificationError) {
      console.error('Error sending event update notifications:', notificationError);
      // Don't fail the update if notifications fail
    }

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: event
    });
  } catch (error) {
    // Clean up uploaded files if update fails
    if (req.files) {
      const files = req.files as Express.Multer.File[];
      files.forEach(file => {
        fs.unlinkSync(file.path);
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update event'
    });
  }
});

// Delete event
router.delete('/:id', authenticateToken as any, authorizeRoles('organization') as any, async (req: any, res: Response) => {
  try {
    const user = (req as any).user;
    const eventId = parseInt(req.params.id);

    const event = await Event.findOne({ id: eventId, orgId: user.id });
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found or access denied'
      });
    }

    // Delete associated image files
    if (event.media) {
      event.media.forEach(mediaItem => {
        if (mediaItem.filename) {
          const filePath = path.join(__dirname, '../../uploads/events', mediaItem.filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      });
    }

    // Send notifications to event participants before deleting
    try {
      const participants = event.participants || [];
      if (participants.length > 0) {
        await FirebaseNotificationService.sendToUsers(participants.map(id => id.toString()), {
          title: 'Event Cancelled',
          body: `"${event.title}" has been cancelled`,
          type: 'event',
          data: { 
            eventId: event.id,
            eventTitle: event.title,
            organizationId: event.orgId
          }
        });
        console.log(`✅ Event cancellation notifications sent to ${participants.length} participants`);
      }
    } catch (notificationError) {
      console.error('Error sending event cancellation notifications:', notificationError);
      // Don't fail the delete if notifications fail
    }

    await Event.deleteOne({ id: eventId });

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete event'
    });
  }
});

// Get all events
router.get('/', async (req: any, res: Response) => {
  try {
    const events = await Event.find({});
    res.json({
      success: true,
      events
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events'
    });
  }
});

// Serve event images through API (to avoid CORS issues)
router.get('/images/:filename', (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;
    const imagePath = path.join(__dirname, '../../uploads/events', filename);
    
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }
    
    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'image/png'; // default
    
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
      default:
        contentType = 'image/png';
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // Override Helmet's same-origin policy
    
    // Send the file
    res.sendFile(imagePath);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to serve image'
    });
  }
});

// Get event by ID
router.get('/:id', async (req: any, res: Response) => {
  try {
    const event = await Event.findOne({
      id: parseInt(req.params.id)
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event'
    });
  }
});

// Join event
router.post('/:id/join', authenticateToken as any, async (req: any, res: Response) => {
  try {
    console.log('🔍 Join event request received');
    const user = (req as any).user;
    const eventId = parseInt(req.params.id);
    
    console.log('🔍 User:', { _id: user._id, role: user.role, joinedEvents: user.joinedEvents });
    console.log('🔍 Event ID:', eventId);

    const event = await Event.findOne({ id: eventId });
    if (!event) {
      console.log('❌ Event not found:', eventId);
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    console.log('🔍 Event found:', { id: event.id, title: event.title, registered: event.registered, capacity: event.capacity });

    if (event.registered >= event.capacity) {
      console.log('❌ Event is full');
      return res.status(400).json({
        success: false,
        message: 'Event is full'
      });
    }

    // Add user to participants
    if (!event.participants.includes(user.id)) {
      console.log('🔍 Adding user to participants');
      event.participants.push(user.id);
      event.registered += 1;
      await event.save();
      console.log('✅ Event saved successfully');
    } else {
      console.log('🔍 User already in participants');
    }

    // Add event to user's joined events
    if (!user.joinedEvents?.includes(eventId)) {
      console.log('🔍 Adding event to user joined events');
      user.joinedEvents = [...(user.joinedEvents || []), eventId];
      await user.save();
      console.log('✅ User saved successfully');
    } else {
      console.log('🔍 User already has event in joined events');
    }

    // Send notification to organization owner
    try {
      const organization = await User.findOne({ id: event.orgId });
      if (organization) {
        await FirebaseNotificationService.sendToUser(organization.id.toString(), {
          title: 'New Event Participant',
          body: `${user.name} joined your event "${event.title}"`,
          type: 'event',
          data: { 
            studentId: user.id,
            studentName: user.name,
            eventId: event.id,
            eventTitle: event.title,
            organizationId: event.orgId
          }
        });
        console.log(`✅ Join event notification sent to organization ${event.orgId}`);
      }
    } catch (notificationError) {
      console.error('Error sending join event notification:', notificationError);
      // Don't fail the join if notifications fail
    }

    console.log('✅ Join event successful');
    res.json({
      success: true,
      message: 'Successfully joined event'
    });
  } catch (error) {
    console.error('❌ Error in join event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join event',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Leave event
router.delete('/:id/leave', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const user = (req as any).user;
    const eventId = parseInt(req.params.id);

    const event = await Event.findOne({ id: eventId });
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Remove user from participants
    event.participants = event.participants.filter(id => id !== user.id);
    event.registered = Math.max(0, event.registered - 1);
    await event.save();

    // Remove event from user's joined events
    user.joinedEvents = user.joinedEvents?.filter((id: number) => id !== eventId) || [];
    await user.save();

    // Send notification to organization owner
    try {
      const organization = await User.findOne({ id: event.orgId });
      if (organization) {
        await FirebaseNotificationService.sendToUser(organization.id.toString(), {
          title: 'Event Participant Left',
          body: `${user.name} left your event "${event.title}"`,
          type: 'event',
          data: { 
            studentId: user.id,
            studentName: user.name,
            eventId: event.id,
            eventTitle: event.title,
            organizationId: event.orgId
          }
        });
        console.log(`✅ Leave event notification sent to organization ${event.orgId}`);
      }
    } catch (notificationError) {
      console.error('Error sending leave event notification:', notificationError);
      // Don't fail the leave if notifications fail
    }

    res.json({
      success: true,
      message: 'Successfully left event'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to leave event'
    });
  }
});

export default router;