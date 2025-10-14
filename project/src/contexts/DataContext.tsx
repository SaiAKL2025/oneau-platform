import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import apiClient from '../utils/api';

interface Organization {
  id: number;
  name: string;
  type: string;
  description: string;
  followers: number;
  founded: string;
  email: string;
  website?: string;
  president: string;
  status: string;
  members: number;
  created: string;
  achievements?: string[];
  socialImpact?: string;
  socialMedia: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  profileImage?: string;
}

interface Event {
  id: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  orgId: number;
  orgName: string;
  type: string;
  location: string;
  venue: string;
  description: string;
  organizer: string;
  partner: string;
  responsiblePerson: string;
  responsibleEmail: string;
  responsiblePhone: string;
  capacity: number;
  registered: number;
  status: string;
  participants: number[];
  media?: Array<{ type: string; url: string }>;
}

interface User {
  _id?: string;
  id: number;
  name: string;
  email: string;
  role: string;
  faculty?: string;
  studentId?: string;
  status: string;
  joined: string;
  followedOrgs?: number[];
  joinedEvents?: number[];
  badges?: string[];
  orgId?: number;
  orgType?: string;
}

interface PendingApproval {
  id: number;
  type: string;
  name: string;
  applicant: string;
  date: string;
  status: string;
  orgId?: number;
  registrationData: any;
}

interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: string;
  relatedId?: number;
}

interface DataContextType {
  organizations: Organization[];
  events: Event[];
  users: User[];
  pendingApprovals: PendingApproval[];
  notifications: Notification[];
  loadAuthenticatedData: () => Promise<void>;
  followOrganization: (userId: string, orgId: number) => void;
  unfollowOrganization: (userId: string, orgId: number) => void;
  joinEvent: (userId: string, eventId: number) => void;
  leaveEvent: (userId: string, eventId: number) => void;
  approveOrganization: (approvalId: number) => void;
  rejectApproval: (approvalId: number) => void;
  createEvent: (eventData: any) => Promise<Event | undefined>;
  updateEvent: (eventId: number, eventData: any) => void;
  deleteEvent: (eventId: number) => void;
  updateOrganization: (orgId: number, orgData: any) => Promise<{ success: boolean; organization?: any }>;
  // Notification functions removed
  getOrganizationById: (id: number) => Organization | undefined;
  getEventById: (id: number) => Event | undefined;
  getUserById: (id: number) => User | undefined;
  getEventsByOrgId: (orgId: number) => Event[];
  // getUserNotifications removed
  isUserFollowingOrg: (userId: number, orgId: number) => boolean;
  isUserJoinedEvent: (userId: number, eventId: number) => boolean;
  setOrganizations: React.Dispatch<React.SetStateAction<Organization[]>>;
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  setPendingApprovals: React.Dispatch<React.SetStateAction<PendingApproval[]>>;
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: React.ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  // Organizations Data - Initialize as empty, will be loaded from API
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [authDataLoaded, setAuthDataLoaded] = useState(false);


  // Load initial data from API
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);

        // Load organizations
        const orgsResponse = await apiClient.getOrganizations();
        if (orgsResponse.success && orgsResponse.data) {
          setOrganizations(orgsResponse.data as Organization[]);
        }

        // Load events
        const eventsResponse = await apiClient.getEvents();
        if (eventsResponse.success) {
          // Handle both response formats: { success: true, events } or { success: true, data: events }
          const eventsData = (eventsResponse as any).events || eventsResponse.data;
          if (eventsData && Array.isArray(eventsData)) {
            setEvents(eventsData as Event[]);
          }
        }

        // Check if user is already authenticated and load their data
        const userData = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (userData && token) {
          console.log('🔍 User already authenticated, loading authenticated data...');
          await loadAuthenticatedData();
        }

      } catch (error: any) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Listen for authentication success events
  useEffect(() => {
    const handleAuthSuccess = () => {
      console.log('🔐 Authentication success detected, loading authenticated data...');
      setAuthDataLoaded(false); // Reset the flag to allow reloading
      loadAuthenticatedData();
    };

    window.addEventListener('auth:loginSuccess', handleAuthSuccess);

    return () => {
      window.removeEventListener('auth:loginSuccess', handleAuthSuccess);
    };
  }, []);

  // Cross-tab synchronization
  useEffect(() => {
    const broadcastChannel = new BroadcastChannel('data-sync');
    
    const handleBroadcastMessage = (event: MessageEvent) => {
      console.log('📡 Received cross-tab data update:', event.data);
      if (event.data.type === 'data-update') {
        // Reload data when other tabs make changes
        setAuthDataLoaded(false);
        loadAuthenticatedData();
      }
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'user' && event.newValue) {
        console.log('📡 localStorage user data changed, reloading data...');
        setAuthDataLoaded(false);
        loadAuthenticatedData();
      }
    };

    broadcastChannel.addEventListener('message', handleBroadcastMessage);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      broadcastChannel.removeEventListener('message', handleBroadcastMessage);
      window.removeEventListener('storage', handleStorageChange);
      broadcastChannel.close();
    };
  }, []);

  // Load authenticated data (users and notifications) when user is authenticated
  const loadAuthenticatedData = async () => {
    console.log('🔍 loadAuthenticatedData called, authDataLoaded:', authDataLoaded);
    if (authDataLoaded) return; // Already loaded

    try {
      console.log('🔄 Loading authenticated data...');

      // Get current user role from localStorage
      const userData = localStorage.getItem('user');
      let userRole = 'student'; // default

      if (userData) {
        try {
          const user = JSON.parse(userData);
          userRole = user.role;
          console.log('👤 Current user role:', userRole);
        } catch (e) {
          console.log('⚠️ Could not parse user data from localStorage');
        }
      }

      // Notifications feature removed - set empty array
      console.log('📡 Notifications feature disabled');
      setNotifications([]);

      // Load current user data for all authenticated users (needed for follow/unfollow functionality)
      console.log('📡 Loading current user data from localStorage...');
      try {
        // Get current user from localStorage
        const userData = localStorage.getItem('user');
        console.log('🔍 userData from localStorage:', userData);
        if (userData) {
          const currentUser = JSON.parse(userData);
          console.log('👤 Current user from localStorage:', {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
            followedOrgs: currentUser.followedOrgs?.length || 0
          });

          // Ensure followedOrgs is initialized as an array if it's undefined
          if (!currentUser.followedOrgs) {
            currentUser.followedOrgs = [];
            console.log('🔧 Initialized followedOrgs as empty array');
          }

          // Use the user data from localStorage for follow/unfollow functionality
          console.log('🔍 About to set users array with:', currentUser);
          setUsers([currentUser as User]);
          console.log('✅ Current user data loaded from localStorage');
        } else {
          console.log('⚠️ No user data found in localStorage');
        }
      } catch (error: any) {
        console.log('⚠️ Current user data load error:', error.message);
      }

      // Load all students data for all authenticated users (needed for followers functionality)
      console.log('📡 Loading all students for follower count calculation...');
      try {
        const studentsResponse = await apiClient.getStudents();
        console.log('📡 Students response:', studentsResponse);

        if (studentsResponse.success && studentsResponse.data) {
          const studentsData = Array.isArray(studentsResponse.data) ? studentsResponse.data : [];
          
          if (userRole === 'organization') {
            // For organization users, just use the students data (no need to add current user as it's not a student)
            setUsers(studentsData as User[]);
            console.log('✅ Students loaded for organization user:', studentsData.length);
          } else if (userRole === 'admin') {
            // For admin users, just set students
            setUsers(studentsData as User[]);
            console.log('✅ All students loaded:', studentsData.length);
          } else if (userRole === 'student') {
            // For student users, use fresh data from database but preserve some localStorage preferences
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            const updatedStudentsData = studentsData.map(student => {
              if (student._id === currentUser._id || student.id === currentUser.id) {
                console.log('🔍 Merging user data:');
                console.log('🔍 Fresh database data:', { 
                  id: student.id, 
                  _id: student._id, 
                  joinedEvents: student.joinedEvents, 
                  followedOrgs: student.followedOrgs 
                });
                console.log('🔍 LocalStorage data:', { 
                  id: currentUser.id, 
                  _id: currentUser._id, 
                  joinedEvents: currentUser.joinedEvents, 
                  followedOrgs: currentUser.followedOrgs 
                });
                
                // Use fresh database data as primary source, but preserve some localStorage preferences
                const mergedUser = { 
                  ...student, // Fresh database data (includes latest joinedEvents, followedOrgs)
                  // Only preserve certain localStorage preferences that aren't in database
                  profileImage: currentUser.profileImage || student.profileImage,
                  bio: currentUser.bio || student.bio,
                  interests: currentUser.interests || student.interests,
                  yearOfStudy: currentUser.yearOfStudy || student.yearOfStudy,
                  phone: currentUser.phone || student.phone,
                  website: currentUser.website || student.website
                };
                
                console.log('🔍 Merged user data:', { 
                  id: mergedUser.id, 
                  _id: mergedUser._id, 
                  joinedEvents: mergedUser.joinedEvents, 
                  followedOrgs: mergedUser.followedOrgs 
                });
                
                // Update localStorage with the fresh data
                localStorage.setItem('user', JSON.stringify(mergedUser));
                
                // Notify AuthContext about the updated user data
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('auth:profileUpdated', {
                    detail: { user: mergedUser }
                  }));
                }, 0);
                
                return mergedUser;
              }
              return student;
            });
            setUsers(updatedStudentsData as User[]);
            console.log('✅ All students loaded for student user with fresh database data:', updatedStudentsData.length);
          }
        } else {
          console.log('⚠️ Students failed to load:', studentsResponse.message);
        }
      } catch (error: any) {
        console.log('⚠️ Students API error:', error.message);
      }

      setAuthDataLoaded(true);
      console.log('✅ Authenticated data loaded successfully');

    } catch (error: any) {
      console.error('❌ Error loading authenticated data:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error stack:', error.stack);
      // Set authDataLoaded to true even on error to prevent infinite retries
      setAuthDataLoaded(true);
      console.log('⚠️ Continuing with login despite data loading errors');
    }
  };





  // Functions to manage data
  const followOrganization = async (userId: string, orgId: number) => {
    try {
      const response = await apiClient.followOrganization(orgId);
      if (response.success) {
        // Update local state optimistically
        setUsers(prev => prev.map(user => {
          if (user._id?.toString() === userId.toString()) {
            const updatedUser = { ...user, followedOrgs: [...(user.followedOrgs || []), orgId] };
            // Update localStorage with the new user data
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            // Dispatch event after render cycle to avoid React warnings
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('auth:profileUpdated', {
                detail: { user: updatedUser }
              }));
            }, 0);
            
            return updatedUser;
          }
          return user;
        }));

        setOrganizations(prev => prev.map(org =>
          org.id === orgId
            ? { ...org, followers: org.followers + 1 }
            : org
        ));

        // Notifications feature removed

        // Broadcast change to other tabs
        const broadcastChannel = new BroadcastChannel('data-sync');
        broadcastChannel.postMessage({ type: 'data-update', action: 'follow', orgId });
        broadcastChannel.close();
      }
    } catch (error) {
      console.error('Error following organization:', error);
      throw error;
    }
  };

  const unfollowOrganization = async (userId: string, orgId: number) => {
    try {
      const response = await apiClient.unfollowOrganization(orgId);
      if (response.success) {
        // Update local state optimistically
        setUsers(prev => prev.map(user => {
          if (user._id?.toString() === userId.toString()) {
            const updatedUser = { ...user, followedOrgs: (user.followedOrgs || []).filter(id => id !== orgId) };
            // Update localStorage with the new user data
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            // Dispatch event after render cycle to avoid React warnings
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('auth:profileUpdated', {
                detail: { user: updatedUser }
              }));
            }, 0);
            
            return updatedUser;
          }
          return user;
        }));

        setOrganizations(prev => prev.map(org =>
          org.id === orgId
            ? { ...org, followers: Math.max(0, org.followers - 1) }
            : org
        ));

        // Broadcast change to other tabs
        const broadcastChannel = new BroadcastChannel('data-sync');
        broadcastChannel.postMessage({ type: 'data-update', action: 'unfollow', orgId });
        broadcastChannel.close();
      }
    } catch (error) {
      console.error('Error unfollowing organization:', error);
      throw error;
    }
  };

  const joinEvent = async (userId: string, eventId: number) => {
    try {
      console.log('🔍 Joining event:', { userId, eventId });
      const response = await apiClient.joinEvent(eventId);
      if (response.success) {
        console.log('✅ Event join successful, updating state...');
        
        // Find the user to get their numeric ID
        const user = users.find(u => u._id?.toString() === userId.toString() || u.id?.toString() === userId.toString());
        const userNumericId = user?.id || 0;
        
        // Update local state optimistically
        setUsers(prev => prev.map(user => {
          if (user._id?.toString() === userId.toString() || user.id?.toString() === userId.toString()) {
            const updatedUser = { ...user, joinedEvents: [...(user.joinedEvents || []), eventId] };
            console.log('🔍 Updated user joinedEvents:', updatedUser.joinedEvents);
            
            // Update localStorage with the new user data
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            // Dispatch event after render cycle to avoid React warnings
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('auth:profileUpdated', {
                detail: { user: updatedUser }
              }));
            }, 0);
            
            return updatedUser;
          }
          return user;
        }));

        setEvents(prev => prev.map(event =>
          event.id === eventId
            ? {
                ...event,
                registered: event.registered + 1,
                participants: [...(event.participants || []), userNumericId]
              }
            : event
        ));

        // Notify user about successful event registration
        // Notifications feature removed

        // Broadcast change to other tabs
        const broadcastChannel = new BroadcastChannel('data-sync');
        broadcastChannel.postMessage({ type: 'data-update', action: 'join-event', eventId });
        broadcastChannel.close();
        
        console.log('✅ State updated successfully');
      }
    } catch (error) {
      console.error('Error joining event:', error);
      throw error;
    }
  };

  const leaveEvent = async (userId: string, eventId: number) => {
    try {
      console.log('🔍 Leaving event:', { userId, eventId });
      const response = await apiClient.leaveEvent(eventId);
      if (response.success) {
        console.log('✅ Event leave successful, updating state...');
        
        // Find the user to get their numeric ID
        const user = users.find(u => u._id?.toString() === userId.toString() || u.id?.toString() === userId.toString());
        const userNumericId = user?.id || 0;
        
        // Update local state optimistically
        setUsers(prev => prev.map(user => {
          if (user._id?.toString() === userId.toString() || user.id?.toString() === userId.toString()) {
            const updatedUser = { ...user, joinedEvents: (user.joinedEvents || []).filter(id => id !== eventId) };
            console.log('🔍 Updated user joinedEvents:', updatedUser.joinedEvents);
            
            // Update localStorage with the new user data
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            // Dispatch event after render cycle to avoid React warnings
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('auth:profileUpdated', {
                detail: { user: updatedUser }
              }));
            }, 0);
            
            return updatedUser;
          }
          return user;
        }));

        setEvents(prev => prev.map(event =>
          event.id === eventId
            ? {
                ...event,
                registered: Math.max(0, event.registered - 1),
                participants: (event.participants || []).filter(id => id !== userNumericId)
              }
            : event
        ));

        // Notify user about event cancellation
        // Notifications feature removed

        // Broadcast change to other tabs
        const broadcastChannel = new BroadcastChannel('data-sync');
        broadcastChannel.postMessage({ type: 'data-update', action: 'leave-event', eventId });
        broadcastChannel.close();
        
        console.log('✅ State updated successfully');
      }
    } catch (error) {
      console.error('Error leaving event:', error);
      throw error;
    }
  };

  const approveOrganization = async (approvalId: number) => {
    try {
      const response = await apiClient.approveOrganization(approvalId);
      if (response.success) {
        // Update local state
        const approval = pendingApprovals.find(a => a.id === approvalId);
        if (approval && approval.orgId) {
          setOrganizations(prev => prev.map(org =>
            org.id === approval.orgId
              ? { ...org, status: 'active' }
              : org
          ));

          // Notify all users about new organization approval
          const organization = getOrganizationById(approval.orgId);
          if (organization) {
            // Notifications feature removed
          }
        }

        setPendingApprovals(prev => prev.map(approval =>
          approval.id === approvalId
            ? { ...approval, status: 'approved' }
            : approval
        ));
      }
    } catch (error) {
      console.error('Error approving organization:', error);
      throw error;
    }
  };

  const rejectApproval = async (approvalId: number, rejectionData?: any) => {
    try {
      const response = await apiClient.rejectOrganization(approvalId, rejectionData);
      if (response.success) {
        // Update local state
        setPendingApprovals(prev => prev.map(approval =>
          approval.id === approvalId
            ? { ...approval, status: 'rejected' }
            : approval
        ));
      }
    } catch (error) {
      console.error('Error rejecting organization:', error);
      throw error;
    }
  };

  const createEvent = async (eventData: any) => {
    try {
      const response = await apiClient.createEvent(eventData);
      if (response.success && response.data) {
        const newEvent = response.data as Event;
        // Update local state
        setEvents(prev => [...prev, newEvent]);

        // Notify all followers of the organization about the new event
        // Notifications feature removed

        return newEvent;
      } else {
        // If response is not successful, throw an error
        throw new Error(response.message || 'Failed to create event');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  };

  const updateEvent = async (eventId: number, eventData: any) => {
    try {
      const oldEvent = getEventById(eventId);
      
      // Make API call to update event in database
      const response = await apiClient.updateEvent(eventId, eventData);
      
      if (response.success && response.data) {
        const updatedEvent = response.data as Event;
        
        // Update local state with the response from backend
        setEvents(prev => prev.map(event => 
          event.id === eventId ? updatedEvent : event
        ));
        
        // Notifications feature removed
        
        return updatedEvent;
      } else {
        throw new Error(response.message || 'Failed to update event');
      }
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  };

  const deleteEvent = async (eventId: number) => {
    try {
      const event = getEventById(eventId);
      
      // Make API call to delete event from database
      const response = await apiClient.deleteEvent(eventId);
      
      if (response.success) {
        // Notifications feature removed
        
        // Update local state - remove event from events list
        setEvents(prev => prev.filter(event => event.id !== eventId));
        
        // Remove event from users' joined events
        setUsers(prev => prev.map(user => ({
          ...user,
          joinedEvents: (user.joinedEvents || []).filter(id => id !== eventId)
        })));
        
        return true;
      } else {
        throw new Error(response.message || 'Failed to delete event');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  };

  const updateOrganization = async (orgId: number, orgData: any) => {
    try {
      // Make API call to update organization
      const response = await apiClient.updateOrganization(orgId, orgData);

      if (response.success) {
        // Update local state with the response data
        const updatedOrg = (response as any).organization || response.data;
        setOrganizations(prev => prev.map(org =>
          org.id === orgId
            ? { ...org, ...updatedOrg }
            : org
        ));

        // Refresh events data to ensure proper association with updated organization
        console.log('🔄 Refreshing events after organization update...');
        try {
          const eventsResponse = await apiClient.getEvents();
          if (eventsResponse.success) {
            const eventsData = (eventsResponse as any).events || eventsResponse.data;
            if (eventsData && Array.isArray(eventsData)) {
              setEvents(eventsData as Event[]);
              console.log('✅ Events refreshed after organization update');
            }
          }
        } catch (eventsError) {
          console.error('⚠️ Error refreshing events after organization update:', eventsError);
        }

        // Notifications feature removed

        return { success: true, organization: updatedOrg };
      } else {
        throw new Error(response.message || 'Failed to update organization');
      }
    } catch (error: any) {
      console.error('Error updating organization:', error);
      throw error;
    }
  };

  // Notification functions removed

  // Notification functions removed

  // Helper functions
  const getOrganizationById = (id: number | string) => organizations.find(org => org.id === parseInt(id.toString()));
  const getEventById = (id: number | string) => events.find(event => event.id === parseInt(id.toString()));
  const getUserById = (id: number | string) => users.find(user => user._id?.toString() === id.toString());
  const getEventsByOrgId = (orgId: number) => events.filter(event => event.orgId === orgId);
  const getUserNotifications = (userId: number) => notifications.filter(n => n.userId === userId);
  const isUserFollowingOrg = (userId: string, orgId: number) => {
    console.log(`🔍 isUserFollowingOrg called for userId: ${userId}, orgId: ${orgId}`);
    console.log('🔍 users array:', users);
    console.log('🔍 users array length:', users.length);
    const user = getUserById(userId);
    console.log('🔍 currentUser in isUserFollowingOrg:', user);
    console.log('🔍 currentUser.followedOrgs:', user?.followedOrgs);
    return user?.followedOrgs?.includes(orgId) || false;
  };
  const isUserJoinedEvent = (userId: string | number, eventId: number) => {
    // Handle both string and number user IDs
    const userIdStr = userId.toString();
    const user = users.find(u => u._id?.toString() === userIdStr || u.id?.toString() === userIdStr);
    
    // Check if user is in the event's participants array (this is the primary source of truth)
    const event = events.find(e => e.id === eventId);
    const userNumericId = user?.id || 0;
    const isInParticipants = event?.participants?.includes(userNumericId) || false;
    
    // Also check joinedEvents array for consistency
    const isInJoinedEvents = user?.joinedEvents?.includes(eventId) || false;
    
    console.log('🔍 isUserJoinedEvent check:', {
      userId,
      eventId,
      user: user ? { id: user.id, _id: user._id, joinedEvents: user.joinedEvents } : null,
      event: event ? { id: event.id, participants: event.participants, registered: event.registered } : null,
      userNumericId,
      isInJoinedEvents,
      isInParticipants,
      result: isInParticipants // Use participants array as primary source of truth
    });
    
    // Use participants array as the primary source of truth
    // This ensures the button state matches the actual participant count
    return isInParticipants;
  };

  const value: DataContextType = {
    // Data
    organizations,
    events,
    users,
    pendingApprovals,
    notifications,

    // Auth data loading
    loadAuthenticatedData,

    // Actions
    followOrganization,
    unfollowOrganization,
    joinEvent,
    leaveEvent,
    approveOrganization,
    rejectApproval,
    createEvent,
    updateEvent,
    deleteEvent,
    updateOrganization,
    // Notification functions removed
    
    // Helpers
    getOrganizationById,
    getEventById,
    getUserById,
    getEventsByOrgId,
    // getUserNotifications removed
    isUserFollowingOrg,
    isUserJoinedEvent,
    
    // Setters for direct manipulation if needed
    setOrganizations,
    setEvents,
    setUsers,
    setPendingApprovals,
    setNotifications
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};