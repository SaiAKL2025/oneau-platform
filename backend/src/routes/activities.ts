import express, { Request, Response } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { ActivityService, ActivityQueries } from '../services/activityService';

const router = express.Router();

// Get recent activities (admin only)
router.get('/recent', authenticateToken as any, authorizeRoles('admin') as any, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const activities = await ActivityQueries.getRecentActivities(limit);
    
    res.json({
      success: true,
      activities
    });
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activities'
    });
  }
});

// Get activities by type (admin only)
router.get('/by-type/:type', authenticateToken as any, authorizeRoles('admin') as any, async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;
    const activities = await ActivityQueries.getActivitiesByType(type, limit);
    
    res.json({
      success: true,
      activities
    });
  } catch (error) {
    console.error('Error fetching activities by type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activities by type'
    });
  }
});

// Get activity statistics (admin only)
router.get('/stats', authenticateToken as any, authorizeRoles('admin') as any, async (req: Request, res: Response) => {
  try {
    const stats = await ActivityQueries.getActivityStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity statistics'
    });
  }
});

export default router;
