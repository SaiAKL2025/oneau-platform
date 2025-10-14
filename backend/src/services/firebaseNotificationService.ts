import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
} as admin.ServiceAccount;

// Initialize Firebase Admin (only if not already initialized)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:', error);
  }
}

export const firebaseAdmin = admin;
export const db = admin.firestore();

export class FirebaseNotificationService {
  // Register user's FCM token (link Firebase user to MongoDB user)
  static async registerUserToken(mongodbUserId: string, fcmToken: string, email: string) {
    try {
      console.log('🔍 Firebase: Registering token for user:', {
        mongodbUserId,
        fcmToken: fcmToken ? 'present' : 'missing',
        email
      });

      if (!mongodbUserId || String(mongodbUserId).trim() === '') {
        throw new Error('MongoDB User ID is required and cannot be empty');
      }

      if (!fcmToken || String(fcmToken).trim() === '') {
        throw new Error('FCM token is required and cannot be empty');
      }

      const userRef = db.collection('users').doc(String(mongodbUserId));
      await userRef.set({
        mongodbUserId: String(mongodbUserId),
        fcmToken,
        email,
        lastActive: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      console.log(`✅ FCM token registered for user ${mongodbUserId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error registering user token:', error);
      throw error;
    }
  }

  // Send notification to specific MongoDB user
  static async sendToUser(mongodbUserId: string, notification: {
    title: string;
    body: string;
    data?: any;
    type: 'event' | 'organization' | 'system' | 'approval' | 'test';
  }) {
    try {
      // Store notification in Firebase Firestore
      await db.collection('notifications').add({
        mongodbUserId: String(mongodbUserId),
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        type: notification.type,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Get user's FCM token and send push notification
      const userDoc = await db.collection('users').doc(String(mongodbUserId)).get();
      const fcmToken = userDoc.data()?.fcmToken;
      
      if (fcmToken) {
        await admin.messaging().send({
          token: fcmToken,
          notification: {
            title: notification.title,
            body: notification.body
          },
          data: notification.data || {}
        });
        console.log(`✅ Push notification sent to user ${mongodbUserId}`);
      } else {
        console.log(`⚠️ No FCM token found for user ${mongodbUserId}`);
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error sending notification:', error);
      throw error;
    }
  }

  // Send notification to multiple MongoDB users
  static async sendToUsers(mongodbUserIds: string[], notification: {
    title: string;
    body: string;
    data?: any;
    type: 'event' | 'organization' | 'system' | 'approval' | 'test';
  }) {
    try {
      const batch = db.batch();
      
      // Store notifications in Firestore
      mongodbUserIds.forEach(mongodbUserId => {
        const notificationRef = db.collection('notifications').doc();
        batch.set(notificationRef, {
          mongodbUserId: String(mongodbUserId),
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          type: notification.type,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      await batch.commit();

      // Get FCM tokens and send push notifications
      const userDocs = await db.collection('users')
        .where('mongodbUserId', 'in', mongodbUserIds)
        .get();

      const tokens = userDocs.docs
        .map((doc: any) => doc.data().fcmToken)
        .filter((token: any) => token);

      if (tokens.length > 0) {
        // Send individual notifications to each token
        const sendPromises = tokens.map(token => 
          admin.messaging().send({
            token,
            notification: {
              title: notification.title,
              body: notification.body
            },
            data: notification.data || {}
          })
        );
        
        await Promise.all(sendPromises);
        console.log(`✅ Push notifications sent to ${tokens.length} users`);
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error sending notifications:', error);
      throw error;
    }
  }

  // Get notifications for MongoDB user
  static async getUserNotifications(mongodbUserId: string, limit: number = 20) {
    try {
      console.log('🔍 Firebase: Getting notifications for user:', mongodbUserId);
      console.log('🔍 Firebase: Limit:', limit);
      
      // Check if Firestore is properly initialized
      if (!db) {
        console.error('❌ Firestore database not initialized');
        throw new Error('Firestore database not initialized');
      }
      
      console.log('🔍 Firebase: Database connection verified');
      
      console.log('🔍 Firebase: Querying notifications collection...');
      // First get all notifications for the user, then sort in memory to avoid index requirement
      const snapshot = await db.collection('notifications')
        .where('mongodbUserId', '==', String(mongodbUserId))
        .get();

      console.log('🔍 Firebase: Query completed, found', snapshot.docs.length, 'notifications');

      const notifications = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      }))
      .sort((a, b) => {
        // Sort by createdAt in descending order (newest first)
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      })
      .slice(0, limit); // Apply limit after sorting
      
      console.log('🔍 Firebase: Mapped and sorted notifications:', notifications.length);
      
      // Return empty array if no notifications found
      if (notifications.length === 0) {
        console.log('🔍 Firebase: No notifications found for user');
        return [];
      }
      
      return notifications;
    } catch (error) {
      console.error('❌ Error getting notifications:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
      throw error;
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId: string) {
    try {
      await db.collection('notifications').doc(notificationId).update({
        read: true,
        readAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(mongodbUserId: string) {
    try {
      const snapshot = await db.collection('notifications')
        .where('mongodbUserId', '==', mongodbUserId)
        .where('read', '==', false)
        .get();

      const batch = db.batch();
      snapshot.docs.forEach((doc: any) => {
        batch.update(doc.ref, {
          read: true,
          readAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      throw error;
    }
  }
}
