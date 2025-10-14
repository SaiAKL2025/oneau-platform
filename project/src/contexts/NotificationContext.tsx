import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import apiClient from '../utils/api';
import { messaging } from '../config/firebase';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  data?: any;
  read: boolean;
  createdAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  registerForNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fcmRegistered, setFcmRegistered] = useState(false);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('⚠️ No auth token - skipping notification fetch');
        return;
      }

      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/notifications') as any;
      console.log('🔍 Notification response:', response);
      
      if (response.success) {
        const notifications = response.notifications || [];
        setNotifications(notifications);
        setUnreadCount(notifications.filter((n: Notification) => !n.read).length);
        console.log('✅ Notifications loaded:', notifications.length);
      } else {
        console.error('❌ API returned success: false:', response.message);
        setError(response.message || 'Failed to fetch notifications');
      }
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      console.error('Error details:', err);
      setError(err.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      await apiClient.markNotificationAsRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await apiClient.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err: any) {
      console.error('Error marking all notifications as read:', err);
    }
  }, []);

  // Register for push notifications
  const registerForNotifications = useCallback(async () => {
    try {
      // Check if already registered
      if (fcmRegistered) {
        console.log('🔍 FCM already registered, skipping');
        return;
      }

      // Check if user is authenticated
      const authToken = localStorage.getItem('token');
      if (!authToken) {
        console.log('⚠️ No auth token - skipping FCM registration');
        return;
      }

      console.log('🔍 Registering for notifications...');
      console.log('🔍 VAPID Key:', import.meta.env.VITE_FIREBASE_VAPID_KEY ? 'Present' : 'Missing');
      
      // Check current permission status
      if (Notification.permission === 'denied') {
        console.log('⚠️ Notification permission denied by user - skipping FCM registration');
        return;
      }
      
      if (Notification.permission === 'granted') {
        console.log('🔍 Notification permission already granted');
      } else {
        console.log('🔍 Requesting notification permission...');
        const permission = await Notification.requestPermission();
        console.log('🔍 Permission result:', permission);
        
        if (permission !== 'granted') {
          console.log('⚠️ Notification permission not granted:', permission);
          return;
        }
      }
      
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
      });

      console.log('🔍 FCM Token:', token ? 'Generated' : 'Not generated');

      if (token) {
        // Register token with backend
        await apiClient.registerFCMToken(token);
        console.log('✅ FCM token registered successfully');
        setFcmRegistered(true);
      } else {
        console.log('❌ No registration token available');
      }
    } catch (err: any) {
      console.error('Error registering for notifications:', err);
      // Don't show error to user if permission is blocked
      if (err.code === 'messaging/permission-blocked') {
        console.log('ℹ️ Notification permission blocked by browser - this is normal');
      }
    }
  }, [fcmRegistered]);

  // Listen for foreground messages
  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('📱 Message received in foreground:', payload);
      
      // Add notification to local state
      const newNotification: Notification = {
        id: payload.messageId || Date.now().toString(),
        title: payload.notification?.title || 'New Notification',
        body: payload.notification?.body || '',
        type: payload.data?.type || 'general',
        data: payload.data,
        read: false,
        createdAt: new Date().toISOString()
      };
      
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    return unsubscribe;
  }, []);

  // Listen for authentication state changes
  useEffect(() => {
    const handleAuthChange = () => {
      const token = localStorage.getItem('token');
      if (token) {
        // User is authenticated, fetch notifications and register FCM
        fetchNotifications();
        registerForNotifications();
      } else {
        // User is not authenticated, clear notifications
        setNotifications([]);
        setUnreadCount(0);
        setError(null);
        setFcmRegistered(false);
      }
    };

    // Check auth state on mount
    handleAuthChange();

    // Listen for storage changes (when token is added/removed)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        handleAuthChange();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom auth events
    const handleLoginSuccess = () => {
      console.log('🔔 Login success event received, fetching notifications');
      handleAuthChange();
    };
    
    const handleLogout = () => {
      console.log('🔔 Logout event received, clearing notifications');
      handleAuthChange();
    };

    window.addEventListener('auth:loginSuccess', handleLoginSuccess);
    window.addEventListener('auth:logout', handleLogout);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth:loginSuccess', handleLoginSuccess);
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, [fetchNotifications, registerForNotifications]);

  // Auto-refresh notifications every 30 seconds (only when authenticated)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      return; // Don't set up interval if not authenticated
    }

    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    registerForNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};