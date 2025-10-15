import express, { Request, Response } from 'express';
import Organization from '../models/Organization';
import mongoose from 'mongoose';

const router = express.Router();

// Check if database is connected
const isDatabaseConnected = () => {
  return mongoose.connection.readyState === 1;
};

// Get popular organizations (public endpoint)
router.get('/organizations/popular', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 6;
    
    // Check if database is connected
    if (!isDatabaseConnected()) {
      console.log('Database not connected, returning mock data');
      // Return mock data when database is not connected
      const mockOrganizations = [
        {
          id: '1',
          name: 'AUSO (Assumption University Student Organization)',
          type: 'Student Government',
          description: 'The main student government organization representing all students at Assumption University.',
          followers: 1500,
          profileImage: null
        },
        {
          id: '2',
          name: 'Computer Science Club',
          type: 'Academic',
          description: 'A community for computer science students to share knowledge and collaborate on projects.',
          followers: 800,
          profileImage: null
        },
        {
          id: '3',
          name: 'Environmental Society',
          type: 'Environmental',
          description: 'Promoting environmental awareness and sustainability on campus.',
          followers: 600,
          profileImage: null
        },
        {
          id: '4',
          name: 'Drama Club',
          type: 'Arts & Culture',
          description: 'Exploring the world of theater and performing arts.',
          followers: 400,
          profileImage: null
        },
        {
          id: '5',
          name: 'Sports Club',
          type: 'Sports',
          description: 'Organizing sports activities and competitions for students.',
          followers: 1200,
          profileImage: null
        },
        {
          id: '6',
          name: 'Volunteer Network',
          type: 'Community Service',
          description: 'Connecting students with volunteer opportunities in the community.',
          followers: 900,
          profileImage: null
        }
      ].slice(0, limit);

      return res.json({
        success: true,
        organizations: mockOrganizations,
        message: 'Using mock data - database not connected'
      });
    }
    
    // Get organizations sorted by follower count (descending)
    const organizations = await Organization.find({ status: 'active' })
      .sort({ followers: -1 })
      .limit(limit)
      .select('name type description followers profileImage')
      .lean();

    // Format the response
    const formattedOrgs = organizations.map(org => ({
      id: org.id,
      name: org.name,
      type: org.type,
      description: org.description,
      followers: org.followers || 0,
      profileImage: org.profileImage
    }));

    res.json({
      success: true,
      organizations: formattedOrgs
    });
  } catch (error) {
    console.error('Error fetching popular organizations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch popular organizations'
    });
  }
});

export default router;
