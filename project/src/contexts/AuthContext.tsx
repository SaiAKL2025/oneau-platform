import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../utils/api';
import { initializeFCM } from '../config/firebase';

interface User {
  _id?: string;
  id: number;
  email: string;
  role: string;
  name: string;
  faculty?: string;
  orgType?: string;
  orgId?: number;
  studentId?: string;
  status?: string;
  joined?: string;
  followedOrgs?: number[];
  joinedEvents?: number[];
  badges?: string[];
  // Profile fields
  bio?: string;
  interests?: string;
  yearOfStudy?: string;
  phone?: string;
  website?: string;
  profileImage?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  register: (userData: any) => Promise<{ success: boolean; error?: string; message?: string; requiresApproval?: boolean }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Function to refresh user data from backend
  const refreshUserData = async (token: string): Promise<User | null> => {
    try {
      const response = await apiClient.getProfile();
      if (response.success && response.user) {
        return response.user as User;
      }
      return null;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      return null;
    }
  };

  useEffect(() => {
    // Check for stored authentication data on app load
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');

    if (storedUser && storedToken) {
      try {
        const userData = JSON.parse(storedUser);
        console.log('🔍 AuthContext: parsedUser from localStorage:', userData);
        
        // Map the MongoDB _id to _id field for consistency
        if (userData.id && typeof userData.id === 'string') {
          userData._id = userData.id;
        }
        
        // For organization users, refresh user data from backend to get updated status
        if (userData.role === 'organization') {
          console.log('🔄 Refreshing organization user data from backend...');
          refreshUserData(storedToken).then((refreshedUser) => {
            if (refreshedUser) {
              setUser(refreshedUser);
              setIsAuthenticated(true);
              localStorage.setItem('user', JSON.stringify(refreshedUser));
              console.log('✅ Updated organization user data:', refreshedUser.name, '(' + refreshedUser.role + ')', 'Status:', refreshedUser.status);
              
              // Dispatch custom event to notify other contexts about restored authentication
              window.dispatchEvent(new CustomEvent('auth:loginSuccess', {
                detail: { user: refreshedUser, token: storedToken }
              }));
            } else {
              // Fallback to localStorage data if refresh fails
              setUser(userData);
              setIsAuthenticated(true);
              console.log('✅ Restored authentication (fallback):', userData.name, '(' + userData.role + ')');
              
              // Dispatch custom event to notify other contexts about restored authentication
              window.dispatchEvent(new CustomEvent('auth:loginSuccess', {
                detail: { user: userData, token: storedToken }
              }));
            }
            setLoading(false);
          }).catch((error) => {
            console.error('❌ Error refreshing user data:', error);
            // Fallback to localStorage data
            // Map the MongoDB _id to _id field for consistency
            if (userData.id && typeof userData.id === 'string') {
              userData._id = userData.id;
            }
            setUser(userData);
            setIsAuthenticated(true);
            console.log('✅ Restored authentication (fallback):', userData.name, '(' + userData.role + ')');
            
            // Dispatch custom event to notify other contexts about restored authentication
            window.dispatchEvent(new CustomEvent('auth:loginSuccess', {
              detail: { user: userData, token: storedToken }
            }));
            setLoading(false);
          });
        } else {
          // For non-organization users, use localStorage data directly
          // Map the MongoDB _id to _id field for consistency
          if (userData.id && typeof userData.id === 'string') {
            userData._id = userData.id;
          }
          setUser(userData);
          setIsAuthenticated(true);
          console.log('✅ Restored authentication:', userData.name, '(' + userData.role + ')');
          
          // Dispatch custom event to notify other contexts about restored authentication
          window.dispatchEvent(new CustomEvent('auth:loginSuccess', {
            detail: { user: userData, token: storedToken }
          }));
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ Error parsing stored user data:', error);
        // Clear corrupted data
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setLoading(false);
      }
    } else if (storedUser || storedToken) {
      console.log('⚠️ Partial authentication data found - clearing');
      // Clear partial authentication data
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setLoading(false);
    } else {
      console.log('ℹ️ No stored authentication found');
      setLoading(false);
    }
  }, []);

  // Listen for profile update events and login success events
  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent) => {
      const { user: updatedUser } = event.detail;
      console.log('🔄 Profile updated, updating user context:', updatedUser);
      
      // Map the MongoDB _id to _id field for consistency
      if (updatedUser.id && typeof updatedUser.id === 'string') {
        updatedUser._id = updatedUser.id;
      }
      
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      console.log('✅ User context updated with fresh data');
    };

    const handleLoginSuccess = async (event: CustomEvent) => {
      const { user: userData, token } = event.detail;
      console.log('🔄 Login success event received, updating user context:', userData);
      console.log('🔄 Setting isAuthenticated to true');
      
      // Map the MongoDB _id to _id field for consistency
      if (userData.id && typeof userData.id === 'string') {
        userData._id = userData.id;
      }
      
      setUser(userData);
      setIsAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(userData));
      if (token) {
        localStorage.setItem('token', token);
      }
      console.log('✅ Authentication state updated successfully');
      
      // Initialize FCM for notifications
      try {
        await initializeFCM();
        console.log('✅ FCM initialized successfully');
      } catch (error) {
        console.error('❌ Error initializing FCM:', error);
      }
    };

    const handleLogout = () => {
      console.log('🔄 Logout event received, clearing authentication state');
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    };

    window.addEventListener('auth:profileUpdated', handleProfileUpdate as EventListener);
    window.addEventListener('auth:loginSuccess', handleLoginSuccess as EventListener);
    window.addEventListener('auth:logout', handleLogout as EventListener);

    return () => {
      window.removeEventListener('auth:profileUpdated', handleProfileUpdate as EventListener);
      window.removeEventListener('auth:loginSuccess', handleLoginSuccess as EventListener);
      window.removeEventListener('auth:logout', handleLogout as EventListener);
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.login(email, password);

      if (response.success) {
        const userData = (response as any).user;
        const token = (response as any).token;

        // Store token in localStorage
        if (token) {
          localStorage.setItem('token', token);
        }

        // Store user data
        setUser(userData);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(userData));

        // Dispatch custom event to notify other contexts about successful login
        window.dispatchEvent(new CustomEvent('auth:loginSuccess', {
          detail: { user: userData, token }
        }));

        return { success: true, user: userData };
      } else {
        // Handle organization pending approval case
        const responseData = response as any;
        if (responseData.requiresApproval) {
          console.log('🏢 Organization login - requires approval:', responseData.approvalStatus);

          // Store pending organization data for status page
          const pendingOrgData = {
            email: email,
            approvalId: responseData.approvalId,
            status: responseData.approvalStatus,
            allowResubmission: responseData.allowResubmission
          };
          localStorage.setItem('pendingOrganization', JSON.stringify(pendingOrgData));

          // Dispatch event to notify about pending approval
          window.dispatchEvent(new CustomEvent('auth:pendingApproval', {
            detail: {
              email: email,
              approvalId: responseData.approvalId,
              status: responseData.approvalStatus,
              allowResubmission: responseData.allowResubmission
            }
          }));

          return {
            success: false,
            error: responseData.message || 'Your organization registration requires approval',
            requiresApproval: true,
            approvalStatus: responseData.approvalStatus,
            allowResubmission: responseData.allowResubmission
          };
        }

        return { success: false, error: response.message || 'Login failed' };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  const register = async (userData: any) => {
    try {
      const response = await apiClient.register(userData);

      if (response.success) {
        // Check role - handle both object and FormData
        const role = userData instanceof FormData ? userData.get('role') : userData.role;

        if (role === 'organization') {
          // For organizations, registration is submitted for approval
          return {
            success: true,
            message: response.message || 'Organization registration submitted for approval. You will be notified once approved.',
            requiresApproval: true
          };
        } else {
          // For students, proceed with normal registration and login
          const userDataResponse = (response as any).user;
          const token = (response as any).token;

          if (token) {
            localStorage.setItem('token', token);
          }

          setUser(userDataResponse);
          setIsAuthenticated(true);
          localStorage.setItem('user', JSON.stringify(userDataResponse));

          return { success: true, user: userDataResponse };
        }
      } else {
        return { success: false, error: response.message || 'Registration failed' };
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      return { success: false, error: error.message || 'Registration failed' };
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    // Dispatch custom event to notify other contexts about logout
    window.dispatchEvent(new CustomEvent('auth:logout'));
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};