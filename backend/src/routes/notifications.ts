import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { FirebaseNotificationService } from '../services/firebaseNotificationService';

const router = express.Router();

// Register FCM token for user
router.post('/register-token', authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const { fcmToken } = req.body;
    const userEmail = (req as any).user.email;

    console.log('🔍 Register token - User data:', {
      userId,
      userEmail,
      fcmToken: fcmToken ? 'present' : 'missing'
    });

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    await FirebaseNotificationService.registerUserToken(userId, fcmToken, userEmail);
    
    res.json({
      success: true,
      message: 'FCM token registered successfully'
    });
  } catch (error) {
    console.error('❌ Error registering FCM token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register FCM token'
    });
  }
});

// Get user notifications
router.get('/', authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const limit = parseInt(req.query.limit as string) || 20;
    
    console.log('🔍 GET /api/notifications - User ID:', userId);
    console.log('🔍 GET /api/notifications - User ID type:', typeof userId);
    console.log('🔍 GET /api/notifications - Limit:', limit);
    console.log('🔍 GET /api/notifications - User object:', (req as any).user);
    
    // Check if user is authenticated
    if (!userId) {
      console.log('❌ No user ID found in request');
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    console.log('🔍 Calling FirebaseNotificationService.getUserNotifications...');
    const notifications = await FirebaseNotificationService.getUserNotifications(String(userId), limit);
    
    console.log('✅ Notifications fetched successfully:', notifications.length);
    
    res.json({
      success: true,
      notifications
    });
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await FirebaseNotificationService.markAsRead(id);
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    
    await FirebaseNotificationService.markAllAsRead(String(userId));
    
    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('❌ Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read'
    });
  }
});

// Test endpoint to create a sample notification (for debugging)
router.post('/test', authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    
    console.log('🔍 Creating test notification for user:', userId);
    
    await FirebaseNotificationService.sendToUser(String(userId), {
      title: 'Test Notification',
      body: 'This is a test notification to verify the system is working',
      type: 'test',
      data: { test: true }
    });
    
    res.json({
      success: true,
      message: 'Test notification created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test notification'
    });
  }
});

export default router;
