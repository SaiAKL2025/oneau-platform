import express, { Request, Response } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { SettingsService } from '../services/settingsService';

const router = express.Router();

// Get settings (admin only)
router.get('/', authenticateToken as any, authorizeRoles('admin') as any, async (req: Request, res: Response) => {
  try {
    const settings = await SettingsService.getSettings();
    
    res.json({
      success: true,
      settings: {
        platformName: settings.platformName,
        allowRegistration: settings.allowRegistration,
        requireApproval: settings.requireApproval,
        emailNotifications: settings.emailNotifications,
        maintenanceMode: settings.maintenanceMode,
        maxFileSize: settings.maxFileSize
      }
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
});

// Update settings (admin only)
router.put('/', authenticateToken as any, authorizeRoles('admin') as any, async (req: Request, res: Response) => {
  try {
    const {
      platformName,
      allowRegistration,
      requireApproval,
      emailNotifications,
      maintenanceMode,
      maxFileSize
    } = req.body;

    const settingsData = {
      platformName,
      allowRegistration,
      requireApproval,
      emailNotifications,
      maintenanceMode,
      maxFileSize
    };

    const updatedSettings = await SettingsService.updateSettings(settingsData);
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: {
        platformName: updatedSettings.platformName,
        allowRegistration: updatedSettings.allowRegistration,
        requireApproval: updatedSettings.requireApproval,
        emailNotifications: updatedSettings.emailNotifications,
        maintenanceMode: updatedSettings.maintenanceMode,
        maxFileSize: updatedSettings.maxFileSize
      }
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings'
    });
  }
});

// Check if registration is allowed (public endpoint)
router.get('/registration-status', async (req: Request, res: Response) => {
  try {
    const isAllowed = await SettingsService.isRegistrationAllowed();
    
    res.json({
      success: true,
      allowRegistration: isAllowed
    });
  } catch (error) {
    console.error('Error checking registration status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check registration status'
    });
  }
});

// Check maintenance mode (public endpoint)
router.get('/maintenance-status', async (req: Request, res: Response) => {
  try {
    const isMaintenanceMode = await SettingsService.isMaintenanceMode();
    
    res.json({
      success: true,
      maintenanceMode: isMaintenanceMode
    });
  } catch (error) {
    console.error('Error checking maintenance mode:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check maintenance mode'
    });
  }
});

export default router;
