// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import apiClient from '../utils/api';

// Debug environment variables
console.log('🔍 Environment variables check:');
console.log('VITE_FIREBASE_API_KEY:', import.meta.env.VITE_FIREBASE_API_KEY);
console.log('VITE_FIREBASE_PROJECT_ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID);
console.log('VITE_FIREBASE_APP_ID:', import.meta.env.VITE_FIREBASE_APP_ID);

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Check if Firebase config is valid
const isFirebaseConfigValid = () => {
  return firebaseConfig.apiKey && 
         firebaseConfig.projectId && 
         firebaseConfig.appId;
};

console.log('🔍 Final Firebase config:', firebaseConfig);

// Initialize Firebase only if config is valid
let app: any = null;
let analytics: any = null;
let auth: any = null;
let db: any = null;
let messaging: any = null;

if (isFirebaseConfigValid()) {
  try {
    app = initializeApp(firebaseConfig);
    analytics = getAnalytics(app);
    auth = getAuth(app);
    db = getFirestore(app);
    messaging = getMessaging(app);
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
  }
} else {
  console.warn('⚠️ Firebase configuration is incomplete - Firebase features will be disabled');
}

export { auth, db, messaging };

// Initialize FCM and register token
export const initializeFCM = async () => {
  try {
    console.log('🔍 Initializing FCM...');
    
    // Check if Firebase is properly initialized
    if (!messaging) {
      console.warn('⚠️ Firebase messaging not available - skipping FCM initialization');
      return null;
    }
    
    // Request notification permission
    const permission = await Notification.requestPermission();
    console.log('🔍 Notification permission:', permission);
    
    if (permission === 'granted') {
      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
      });
      
      console.log('🔍 FCM Token:', token);
      
      if (token) {
        // Check if user is authenticated before registering token
        const authToken = localStorage.getItem('token');
        if (authToken) {
          // Send token to backend using ApiClient
          try {
            const response = await apiClient.request('/notifications/register-token', {
              method: 'POST',
              body: JSON.stringify({ fcmToken: token })
            });
            
            if (response.success) {
              console.log('✅ FCM token registered successfully');
            } else {
              console.error('❌ Failed to register FCM token:', response.message);
            }
          } catch (error) {
            console.error('❌ Error registering FCM token:', error);
          }
        } else {
          console.log('⚠️ No auth token - FCM token not registered');
        }
        
        return token;
      }
    } else {
      console.log('⚠️ Notification permission denied');
    }
  } catch (error) {
    console.error('❌ Error initializing FCM:', error);
  }
};

// Handle foreground messages
export const onMessageListener = () => {
  return new Promise((resolve) => {
    if (!messaging) {
      console.warn('⚠️ Firebase messaging not available - onMessageListener disabled');
      resolve(null);
      return;
    }
    
    onMessage(messaging, (payload) => {
      console.log('🔔 Foreground message received:', payload);
      resolve(payload);
    });
  });
};

export default app;
