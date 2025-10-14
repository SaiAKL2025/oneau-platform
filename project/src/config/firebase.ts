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
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAU4cDU9olDPugJHlXq4jGhJma0VWqfgbc",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "oneau-notifications.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "oneau-notifications",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "oneau-notifications.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "451372771031",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:451372771031:web:30ff21e0f7999a9ba8f292",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-KJY7TD3Q84"
};

console.log('🔍 Final Firebase config:', firebaseConfig);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const messaging = getMessaging(app);

// Initialize FCM and register token
export const initializeFCM = async () => {
  try {
    console.log('🔍 Initializing FCM...');
    
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
    onMessage(messaging, (payload) => {
      console.log('🔔 Foreground message received:', payload);
      resolve(payload);
    });
  });
};

export default app;
