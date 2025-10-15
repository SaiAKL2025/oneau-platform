import express, { Request, Response } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import Student from '../models/Student';
import Organization from '../models/Organization';
import Event from '../models/Event';
import { FirebaseNotificationService } from '../services/firebaseNotificationService';

const router = express.Router();

// Get all students (accessible by admin, organization, and student users)
router.get('/', authenticateToken as any, authorizeRoles('admin', 'organization', 'student') as any, async (req: any, res: Response) => {
  try {
    const students = await Student.find({}).select('-password');
    res.json({
      success: true,
      data: students
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students'
    });
  }
});

// Get student by ID
router.get('/:id', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const student = await Student.findById(req.params.id).select('-password');
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student'
    });
  }
});

// Update student
router.put('/:id', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const updates = req.body;
    delete updates.password; // Don't allow password updates through this endpoint

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      message: 'Student updated successfully',
      data: student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update student'
    });
  }
});

// Delete student
router.delete('/:id', authenticateToken as any, authorizeRoles('admin') as any, async (req: any, res: Response) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete student'
    });
  }
});

// Follow organization
router.post('/follow/:organizationId', authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.id;
    const organizationId = parseInt(req.params.organizationId);

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    if (student.followedOrgs?.includes(organizationId)) {
      return res.status(400).json({ success: false, message: 'Already following this organization' });
    }

    if (!student.followedOrgs) {
      student.followedOrgs = [];
    }
    student.followedOrgs.push(organizationId);
    organization.followers += 1;
    
    await student.save();
    await organization.save();

    // Send notification to organization
    try {
      await FirebaseNotificationService.sendToUser(organizationId.toString(), {
        title: 'New Follower',
        body: `${student.name} started following your organization`,
        type: 'organization',
        data: { studentId, studentName: student.name, action: 'follow' }
      });
    } catch (notificationError) {
      console.error('Error sending follow notification:', notificationError);
    }

    res.json({ success: true, message: 'Successfully followed organization' });
  } catch (error) {
    console.error('Error following organization:', error);
    res.status(500).json({ success: false, message: 'Failed to follow organization' });
  }
});

// Unfollow organization
router.delete('/follow/:organizationId', authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.id;
    const organizationId = parseInt(req.params.organizationId);

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    if (!student.followedOrgs?.includes(organizationId)) {
      return res.status(400).json({ success: false, message: 'Not following this organization' });
    }

    student.followedOrgs = student.followedOrgs.filter((id: number) => id !== organizationId);
    organization.followers = Math.max(0, organization.followers - 1);
    
    await student.save();
    await organization.save();

    // Send notification to organization
    try {
      await FirebaseNotificationService.sendToUser(organizationId.toString(), {
        title: 'Follower Left',
        body: `${student.name} unfollowed your organization`,
        type: 'organization',
        data: { studentId, studentName: student.name, action: 'unfollow' }
      });
    } catch (notificationError) {
      console.error('Error sending unfollow notification:', notificationError);
    }

    res.json({ success: true, message: 'Successfully unfollowed organization' });
  } catch (error) {
    console.error('Error unfollowing organization:', error);
    res.status(500).json({ success: false, message: 'Failed to unfollow organization' });
  }
});

// Join event
router.post('/events/:eventId/join', authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.id;
    const eventId = parseInt(req.params.eventId);

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (student.joinedEvents?.includes(eventId)) {
      return res.status(400).json({ success: false, message: 'Already joined this event' });
    }

    if (!student.joinedEvents) {
      student.joinedEvents = [];
    }
    student.joinedEvents.push(eventId);
    event.registered += 1;
    
    await student.save();
    await event.save();

    // Send notification to organization
    try {
      await FirebaseNotificationService.sendToUser(event.orgId.toString(), {
        title: 'New Event Participant',
        body: `${student.name} joined your event "${event.title}"`,
        type: 'event',
        data: { studentId, studentName: student.name, eventId, eventTitle: event.title, action: 'join' }
      });
    } catch (notificationError) {
      console.error('Error sending join event notification:', notificationError);
    }

    res.json({ success: true, message: 'Successfully joined event' });
  } catch (error) {
    console.error('Error joining event:', error);
    res.status(500).json({ success: false, message: 'Failed to join event' });
  }
});

// Leave event
router.delete('/events/:eventId/leave', authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.id;
    const eventId = parseInt(req.params.eventId);

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (!student.joinedEvents?.includes(eventId)) {
      return res.status(400).json({ success: false, message: 'Not joined this event' });
    }

    student.joinedEvents = student.joinedEvents.filter((id: number) => id !== eventId);
    event.registered = Math.max(0, event.registered - 1);
    
    await student.save();
    await event.save();

    // Send notification to organization
    try {
      await FirebaseNotificationService.sendToUser(event.orgId.toString(), {
        title: 'Event Participant Left',
        body: `${student.name} left your event "${event.title}"`,
        type: 'event',
        data: { studentId, studentName: student.name, eventId, eventTitle: event.title, action: 'leave' }
      });
    } catch (notificationError) {
      console.error('Error sending leave event notification:', notificationError);
    }

    res.json({ success: true, message: 'Successfully left event' });
  } catch (error) {
    console.error('Error leaving event:', error);
    res.status(500).json({ success: false, message: 'Failed to leave event' });
  }
});

export default router;