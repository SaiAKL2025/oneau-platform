import Activity, { IActivity } from '../models/Activity';

export interface CreateActivityData {
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
  metadata?: { [key: string]: any };
}

export class ActivityService {
  static async createActivity(data: CreateActivityData): Promise<IActivity> {
  try {
    // Generate unique ID for activity
    const lastActivity = await Activity.findOne().sort({ id: -1 });
    const activityIdNum = lastActivity ? lastActivity.id + 1 : 1;

    const activity = new Activity({
      id: activityIdNum,
      ...data
    });

    await activity.save();
    return activity;
  } catch (error) {
    console.error('Error creating activity:', error);
    throw error;
  }
}
}

export class ActivityQueries {
  static async getRecentActivities(limit: number = 10): Promise<IActivity[]> {
    try {
      const activities = await Activity.find({})
        .sort({ createdAt: -1 })
        .limit(limit);
      
      return activities;
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      throw error;
    }
  }

  static async getActivitiesByType(type: string, limit: number = 10): Promise<IActivity[]> {
    try {
      const activities = await Activity.find({ type })
        .sort({ createdAt: -1 })
        .limit(limit);
      
      return activities;
    } catch (error) {
      console.error('Error fetching activities by type:', error);
      throw error;
    }
  }

  static async getActivityStats(): Promise<{
    totalActivities: number;
    activitiesByType: { [key: string]: number };
    recentActivityCount: number;
  }> {
    try {
      const totalActivities = await Activity.countDocuments();
      
      const activitiesByType = await Activity.aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        }
      ]);

      const recentActivityCount = await Activity.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      });

      const typeStats: { [key: string]: number } = {};
      activitiesByType.forEach(item => {
        typeStats[item._id] = item.count;
      });

      return {
        totalActivities,
        activitiesByType: typeStats,
        recentActivityCount
      };
    } catch (error) {
      console.error('Error fetching activity stats:', error);
      throw error;
    }
  }
}
