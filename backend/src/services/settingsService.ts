import Settings, { ISettings } from '../models/Settings';

export class SettingsService {
  static async getSettings(): Promise<ISettings> {
    try {
      let settings = await Settings.findOne();
      
      if (!settings) {
        // Create default settings if none exist
        settings = new Settings({
          platformName: 'OneAU',
          allowRegistration: true,
          requireApproval: true,
          emailNotifications: true,
          maintenanceMode: false,
          maxFileSize: 5242880 // 5MB
        });
        await settings.save();
      }
      
      return settings;
    } catch (error) {
      console.error('Error getting settings:', error);
      throw error;
    }
  }

  static async updateSettings(settingsData: Partial<ISettings>): Promise<ISettings> {
    try {
      let settings = await Settings.findOne();
      
      if (!settings) {
        // Create new settings if none exist
        settings = new Settings(settingsData);
      } else {
        // Update existing settings
        Object.assign(settings, settingsData);
      }
      
      await settings.save();
      return settings;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  static async isRegistrationAllowed(): Promise<boolean> {
    try {
      const settings = await this.getSettings();
      return settings.allowRegistration && !settings.maintenanceMode;
    } catch (error) {
      console.error('Error checking registration status:', error);
      return false; // Default to false if error
    }
  }

  static async isMaintenanceMode(): Promise<boolean> {
    try {
      const settings = await this.getSettings();
      return settings.maintenanceMode;
    } catch (error) {
      console.error('Error checking maintenance mode:', error);
      return false; // Default to false if error
    }
  }

  static async getMaxFileSize(): Promise<number> {
    try {
      const settings = await this.getSettings();
      return settings.maxFileSize;
    } catch (error) {
      console.error('Error getting max file size:', error);
      return 5242880; // Default 5MB
    }
  }

  static async areEmailNotificationsEnabled(): Promise<boolean> {
    try {
      const settings = await this.getSettings();
      return settings.emailNotifications;
    } catch (error) {
      console.error('Error checking email notifications:', error);
      return true; // Default to true if error
    }
  }

  static async isApprovalRequired(): Promise<boolean> {
    try {
      const settings = await this.getSettings();
      return settings.requireApproval;
    } catch (error) {
      console.error('Error checking approval requirement:', error);
      return true; // Default to true if error
    }
  }
}
