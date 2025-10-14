import express, { Request, Response } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import Student from '../models/Student';
import Organization from '../models/Organization';
import Event from '../models/Event';
import { ActivityQueries } from '../services/activityService';

const router = express.Router();

// Get comprehensive analytics (admin only)
router.get('/', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Analytics API called');
    
    // Get basic counts
    const totalStudents = await Student.countDocuments();
    const totalOrganizations = await Organization.countDocuments();
    const totalEvents = await Event.countDocuments();
    const activeEvents = await Event.countDocuments({ status: 'active' });
    const totalRegistrations = await Event.aggregate([
      { $group: { _id: null, total: { $sum: '$registered' } } }
    ]);

    console.log('🔍 Basic counts:', {
      totalStudents,
      totalOrganizations,
      totalEvents,
      activeEvents,
      totalRegistrations: totalRegistrations[0]?.total || 0
    });

    // Get user growth data (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const userGrowthData = await Student.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Get organization growth data
    const orgGrowthData = await Organization.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Get event types distribution
    const eventTypes = await Event.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get organization types distribution
    const orgTypes = await Organization.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get faculty distribution
    const facultyDistribution = await Student.aggregate([
      {
        $group: {
          _id: '$faculty',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get recent activity stats
    const activityStats = await ActivityQueries.getActivityStats();

    // Get monthly event creation data
    const eventCreationData = await Event.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Get top organizations by event count
    const topOrganizations = await Event.aggregate([
      {
        $group: {
          _id: '$orgName',
          eventCount: { $sum: 1 },
          totalRegistrations: { $sum: '$registered' }
        }
      },
      {
        $sort: { eventCount: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Get event capacity utilization
    const capacityUtilization = await Event.aggregate([
      {
        $match: { capacity: { $gt: 0 } }
      },
      {
        $group: {
          _id: null,
          totalCapacity: { $sum: '$capacity' },
          totalRegistered: { $sum: '$registered' },
          avgUtilization: { $avg: { $divide: ['$registered', '$capacity'] } }
        }
      }
    ]);

    // Format user growth data for frontend
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = new Date();
    const userGrowth = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthData = userGrowthData.find(d => 
        d._id.year === date.getFullYear() && d._id.month === date.getMonth() + 1
      );
      userGrowth.push({
        month: months[date.getMonth()],
        users: monthData ? monthData.count : 0
      });
    }

    // Format organization growth data
    const orgGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthData = orgGrowthData.find(d => 
        d._id.year === date.getFullYear() && d._id.month === date.getMonth() + 1
      );
      orgGrowth.push({
        month: months[date.getMonth()],
        organizations: monthData ? monthData.count : 0
      });
    }

    // Format event creation data
    const eventCreation = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthData = eventCreationData.find(d => 
        d._id.year === date.getFullYear() && d._id.month === date.getMonth() + 1
      );
      eventCreation.push({
        month: months[date.getMonth()],
        events: monthData ? monthData.count : 0
      });
    }

    const analyticsResponse = {
      success: true,
      analytics: {
        // Basic metrics
        totalUsers: totalStudents,
        totalOrganizations,
        totalEvents,
        activeEvents,
        totalRegistrations: totalRegistrations[0]?.total || 0,
        
        // Growth data
        userGrowth,
        orgGrowth,
        eventCreation,
        
        // Distributions
        eventTypes: eventTypes.map(et => ({ type: et._id, count: et.count })),
        orgTypes: orgTypes.map(ot => ({ type: ot._id, count: ot.count })),
        facultyDistribution: facultyDistribution.map(fd => ({ faculty: fd._id, count: fd.count })),
        
        // Activity stats
        activityStats,
        
        // Top performers
        topOrganizations,
        
        // Capacity utilization
        capacityUtilization: capacityUtilization[0] || {
          totalCapacity: 0,
          totalRegistered: 0,
          avgUtilization: 0
        }
      }
    };

    console.log('🔍 Analytics response:', JSON.stringify(analyticsResponse, null, 2));
    res.json(analyticsResponse);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data'
    });
  }
});

export default router;
