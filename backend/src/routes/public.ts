import express, { Request, Response } from 'express';
import Organization from '../models/Organization';

const router = express.Router();

// Get popular organizations (public endpoint)
router.get('/organizations/popular', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 6;
    
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
