import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useNotifications } from '../../contexts/NotificationContext';
import apiClient from '../../utils/api';
import EventCountdown from '../../components/EventCountdown';
import EventStatusBadge from '../../components/EventStatusBadge';
import { getEventStatus } from '../../utils/eventStatus';
import { getImageUrl, handleImageError } from '../../utils/imageUtils';
import NotificationBell from '../../components/NotificationBell';
import NotificationsPage from '../NotificationsPage';
import {
  Home,
  Search,
  Calendar,
  Users,
  MapPin,
  Clock,
  User,
  ArrowLeft,
  ExternalLink,
  Heart,
  HeartOff,
  UserPlus,
  Award,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Bell
} from 'lucide-react';

// Student Dashboard Components
const StudentHome = () => {
  const { user } = useAuth();
  const { events, organizations, isUserFollowingOrg, isUserJoinedEvent, loadAuthenticatedData } = useData();

  
  // Get followed organizations (only approved ones)
  const followedOrgs = organizations.filter(org => 
    org.status === 'active' && isUserFollowingOrg(user?._id || '', org.id)
  );
  
  // Get upcoming events from followed organizations (show until event end time)
  const upcomingEvents = events.filter(event => {
    if (!followedOrgs.some(org => org.id === event.orgId)) return false;
    
    // Check if event hasn't ended yet (current time < event end time)
    const now = new Date();
    const eventEndDateTime = new Date(`${event.date}T${event.endTime}`);
    
    return now < eventEndDateTime;
  }).sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA.getTime() - dateB.getTime();
  }).slice(0, 3);

  // Get joined events with organization status check
  const joinedEvents = events.filter(event => 
    isUserJoinedEvent(user?._id || '', event.id)
  ).map(event => {
    const organization = organizations.find(org => org.id === event.orgId);
    return {
      ...event,
      isOrgSuspended: organization?.status === 'suspended'
    };
  }).sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA.getTime() - dateB.getTime();
  }).slice(0, 3);

  // Debug logging for joined events
  console.log('🔍 StudentHome Debug:', {
    user: user ? { _id: user._id, id: user.id, joinedEvents: user.joinedEvents } : null,
    events: events.map(e => ({ id: e.id, title: e.title, participants: e.participants })),
    joinedEventsCount: joinedEvents.length,
    joinedEvents: joinedEvents.map(e => ({ id: e.id, title: e.title }))
  });

  // Refresh data when component mounts to ensure we have the latest state
  useEffect(() => {
    const refreshData = async () => {
      try {
        await loadAuthenticatedData();
        console.log('🔄 StudentHome: Data refreshed on mount');
      } catch (error) {
        console.error('❌ Error refreshing data:', error);
      }
    };
    
    refreshData();
  }, []); // Remove loadAuthenticatedData dependency to prevent infinite re-renders

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Welcome back, {user?.name}!</h2>
        <p className="text-blue-100">Stay connected with your university community</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/student/explore" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center justify-center">
            <Users className="h-12 w-12 text-blue-500 mr-4" />
            <div className="ml-4">
              <p className="text-3xl font-bold text-gray-900">{followedOrgs.length}</p>
              <p className="text-lg text-gray-600">Organizations</p>
            </div>
          </div>
        </Link>
        <Link to="/student/events" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center justify-center">
            <Calendar className="h-12 w-12 text-green-500 mr-4" />
            <div className="ml-4">
              <p className="text-3xl font-bold text-gray-900">{joinedEvents.length}</p>
              <p className="text-lg text-gray-600">Events Joined</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Upcoming Events */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Upcoming Events</h3>
          <Link to="/student/events" className="text-blue-600 hover:text-blue-800 text-sm">
            View all
          </Link>
        </div>
        <div className="p-6">
          {upcomingEvents.length > 0 ? (
            <div className="space-y-4">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">{event.title}</h4>
                          <EventStatusBadge eventDate={event.date} startTime={event.startTime} endTime={event.endTime} />
                        </div>
                      <p className="text-sm text-gray-600 mt-1">{event.orgName} • {event.type}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(event.date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {event.startTime} - {event.endTime}
                        </span>
                        <span className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {event.location}
                        </span>
                      </div>
                    </div>
                    <Link
                      to={`/student/events/${event.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No upcoming events from your followed organizations</p>
              <Link to="/student/explore" className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block">
                Explore organizations
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* My Events */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">My Events</h3>
          <Link to="/student/events?tab=my" className="text-blue-600 hover:text-blue-800 text-sm">
            View all
          </Link>
        </div>
        <div className="p-6">
          {joinedEvents.length > 0 ? (
            <div className="space-y-4">
              {joinedEvents.map((event) => (
                <div key={event.id} className={`border rounded-lg p-4 ${
                  event.isOrgSuspended 
                    ? 'border-orange-200 bg-orange-50' 
                    : 'border-gray-200'
                }`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className={`font-medium ${
                          event.isOrgSuspended ? 'text-gray-500' : 'text-gray-900'
                        }`}>{event.title}</h4>
                        {event.isOrgSuspended && (
                          <span className="text-orange-600" title="Organization suspended">⚠️</span>
                        )}
                      </div>
                      <p className={`text-sm mt-1 ${
                        event.isOrgSuspended ? 'text-gray-400' : 'text-gray-600'
                      }`}>{event.orgName} • {event.type}</p>
                      
                      {event.isOrgSuspended && (
                        <div className="mt-2 p-2 bg-orange-100 border border-orange-200 rounded text-sm text-orange-800">
                          This event is currently inactive because the hosting organization has been suspended.
                        </div>
                      )}
                      
                      <div className={`flex items-center space-x-4 mt-2 text-sm ${
                        event.isOrgSuspended ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(event.date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {event.startTime} - {event.endTime}
                        </span>
                        <span className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {event.location}
                        </span>
                      </div>
                    </div>
                    <span className={`text-sm font-medium ${
                      event.isOrgSuspended ? 'text-orange-600' : 'text-green-600'
                    }`}>
                      {event.isOrgSuspended ? 'Suspended' : 'Joined'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">You haven't joined any events yet</p>
              <Link to="/student/events" className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block">
                Browse events
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StudentExplore = () => {
  const { user } = useAuth();
  const { 
    organizations, 
    users,
    followOrganization, 
    unfollowOrganization, 
    isUserFollowingOrg 
  } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  
  // Unfollow confirmation dialog state
  const [showUnfollowConfirmation, setShowUnfollowConfirmation] = useState(false);
  const [orgToUnfollow, setOrgToUnfollow] = useState<number | null>(null);
  
  // CAPTCHA state for follow
  const [showFollowCaptcha, setShowFollowCaptcha] = useState(false);
  const [orgToFollow, setOrgToFollow] = useState<number | null>(null);
  const [followCaptchaVerified, setFollowCaptchaVerified] = useState(false);

  // Filter organizations (ONLY show approved organizations to students)
  const filteredOrgs = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === '' || selectedType === 'A to Z' || selectedType === 'Z to A' || org.type === selectedType;
    // CRITICAL: Only show approved organizations to students
    const isApproved = org.status === 'active';
    return matchesSearch && matchesType && isApproved;
  }).sort((a, b) => {
    if (selectedType === 'A to Z') {
      return a.name.localeCompare(b.name);
    } else if (selectedType === 'Z to A') {
      return b.name.localeCompare(a.name);
    }
    return 0;
  });

  const orgTypes = [...new Set(organizations.map(org => org.type))];

  const handleFollowToggle = async (orgId: number) => {
    try {
      if (isUserFollowingOrg(user?._id || '', orgId)) {
        // Show confirmation dialog for unfollowing
        setOrgToUnfollow(orgId);
        setShowUnfollowConfirmation(true);
      } else {
        // Show CAPTCHA for following organization
        setOrgToFollow(orgId);
        setShowFollowCaptcha(true);
        setFollowCaptchaVerified(false);
      }
    } catch (error) {
      console.error('Error toggling follow status:', error);
      // Optionally show a user-friendly error message
    }
  };

  const handleConfirmUnfollow = async () => {
    if (orgToUnfollow) {
      try {
        await unfollowOrganization(user?._id || '', orgToUnfollow);
        setShowUnfollowConfirmation(false);
        setOrgToUnfollow(null);
      } catch (error) {
        console.error('Error unfollowing organization:', error);
        alert('Failed to unfollow organization. Please try again.');
      }
    }
  };

  const handleCancelUnfollow = () => {
    setShowUnfollowConfirmation(false);
    setOrgToUnfollow(null);
  };

  const handleFollowCaptchaVerify = () => {
    setFollowCaptchaVerified(true);
    
    // Auto-follow after 1.5 seconds
    setTimeout(() => {
      handleAutoFollow();
    }, 1500);
  };

  const handleAutoFollow = async () => {
    if (orgToFollow) {
      try {
        await followOrganization(user?._id || '', orgToFollow);
        setShowFollowCaptcha(false);
        setOrgToFollow(null);
        setFollowCaptchaVerified(false);
      } catch (error) {
        console.error('Error following organization:', error);
        alert('Failed to follow organization. Please try again.');
        setShowFollowCaptcha(false);
        setOrgToFollow(null);
        setFollowCaptchaVerified(false);
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search organizations..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="A to Z">A to Z</option>
              <option value="Z to A">Z to A</option>
              {orgTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Organizations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOrgs.map((org) => {
          const isFollowing = user?.role === 'student' ? isUserFollowingOrg(user?._id || '', org.id) : false;
          const isOrgSuspended = org.status === 'suspended';
          
          return (
            <div key={org.id} className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow ${
              isOrgSuspended ? 'opacity-75' : ''
            }`}>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start space-x-3">
                    {/* Organization Profile Image */}
                    <div className="flex-shrink-0">
                      {org.profileImage ? (
                        <img
                          src={getImageUrl(org.profileImage)}
                          alt={`${org.name} profile`}
                          className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                          onError={handleImageError}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {org.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Organization Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className={`text-lg font-semibold truncate ${
                          isOrgSuspended ? 'text-gray-500' : 'text-gray-900'
                        }`}>{org.name}</h3>
                        {isOrgSuspended && (
                          <span className="text-orange-600" title="Organization suspended">⚠️</span>
                        )}
                      </div>
                      <p className={`text-sm ${
                        isOrgSuspended ? 'text-gray-400' : 'text-gray-600'
                      }`}>{org.type}</p>
                      {org.founded && (
                        <p className={`text-xs ${
                          isOrgSuspended ? 'text-gray-400' : 'text-gray-500'
                        }`}>Founded {org.founded}</p>
                      )}
                      {isOrgSuspended && (
                        <span className="text-xs text-orange-600 font-medium">(Suspended)</span>
                      )}
                    </div>
                  </div>
                  {user?.role === 'student' && (
                    isOrgSuspended ? (
                      <div className="flex flex-col items-center space-y-1">
                        <button
                          disabled
                          className="p-2 rounded-full bg-gray-100 text-gray-400 cursor-not-allowed"
                          title="Organization suspended"
                        >
                          <HeartOff className="h-5 w-5" />
                        </button>
                        <span className="text-xs text-orange-600">Suspended</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleFollowToggle(org.id)}
                        className={`p-2 rounded-full transition-colors ${
                          isFollowing 
                            ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                            : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                        }`}
                      >
                        {isFollowing ? <HeartOff className="h-5 w-5" /> : <Heart className="h-5 w-5" />}
                      </button>
                    )
                  )}
                </div>
                
                <p className={`text-sm mb-4 line-clamp-3 ${
                  isOrgSuspended ? 'text-gray-400' : 'text-gray-700'
                }`}>{org.description}</p>
                
                {/* Additional Profile Information */}
                <div className="mb-4 space-y-2">
                  {org.president && (
                    <div className="flex items-center text-xs text-gray-500">
                      <User className="w-3 h-3 mr-1" />
                      <span>President: {org.president}</span>
                    </div>
                  )}
                  {org.members > 0 && (
                    <div className="flex items-center text-xs text-gray-500">
                      <Users className="w-3 h-3 mr-1" />
                      <span>{org.members} members</span>
                    </div>
                  )}
                  {org.website && (
                    <div className="flex items-center text-xs text-blue-600">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      <a 
                        href={org.website.startsWith('http') ? org.website : `https://${org.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline truncate"
                      >
                        {org.website}
                      </a>
                    </div>
                  )}
                </div>
                
                {isOrgSuspended && (
                  <div className="mb-4 p-2 bg-orange-100 border border-orange-200 rounded text-sm text-orange-800">
                    This organization is currently suspended. You can view details but cannot follow or interact.
                  </div>
                )}
                
                <div className={`flex items-center justify-between text-sm mb-4 ${
                  isOrgSuspended ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  <span className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {users.filter(u => u.role === 'student' && u.followedOrgs?.includes(org.id)).length} followers
                  </span>
                  <span>Founded {org.founded}</span>
                </div>
                
                <div className="flex space-x-2">
                  <Link
                    to={`/student/organization/${org.id}`}
                    className="flex-1 bg-blue-600 text-white text-center py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    View Profile
                  </Link>
                  {user?.role === 'student' && (
                    isOrgSuspended ? (
                      <button
                        disabled
                        className="px-4 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
                      >
                        Suspended
                      </button>
                    ) : (
                      <button
                        onClick={() => handleFollowToggle(org.id)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          isFollowing
                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {isFollowing ? 'Unfollow' : 'Follow'}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredOrgs.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No organizations found</p>
          <p className="text-sm text-gray-400 mt-2">Try adjusting your search or filter criteria</p>
        </div>
      )}

      {/* Unfollow Confirmation Dialog */}
      {showUnfollowConfirmation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-2">Unfollow Organization</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to Unfollow this Organization?
                </p>
              </div>
              <div className="flex justify-center space-x-4 mt-4">
                <button
                  onClick={handleCancelUnfollow}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  No
                </button>
                <button
                  onClick={handleConfirmUnfollow}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Follow CAPTCHA Verification Dialog */}
      {showFollowCaptcha && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto w-96 shadow-2xl rounded-lg bg-white overflow-hidden">
            {/* Blue Title Bar */}
            <div className="bg-blue-500 px-4 py-3 flex items-center justify-between">
              <h3 className="text-white font-semibold text-lg">Captcha</h3>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
            
            {/* Content Area */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={followCaptchaVerified}
                      onChange={handleFollowCaptchaVerify}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                      followCaptchaVerified 
                        ? 'bg-blue-500 border-blue-500' 
                        : 'border-blue-300 hover:border-blue-400'
                    }`}>
                      {followCaptchaVerified && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-gray-800 font-medium">I am not a robot</span>
                </label>
                
                <button 
                  onClick={handleFollowCaptchaVerify}
                  className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                  title="Refresh"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              
              {followCaptchaVerified && (
                <div className="text-center">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">Verified! Following organization...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StudentEvents = () => {
  const { user } = useAuth();
  const { organizations, events, isUserFollowingOrg, isUserJoinedEvent, joinEvent, leaveEvent, loadAuthenticatedData } = useData();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Confirmation dialog state
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);
  const [eventToLeave, setEventToLeave] = useState<number | null>(null);
  
  // CAPTCHA state
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [eventToJoin, setEventToJoin] = useState<number | null>(null);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  // Get followed organizations (only approved ones)
  const followedOrgs = organizations.filter(org => 
    org.status === 'active' && isUserFollowingOrg(user?._id || '', org.id)
  );
  
  // Set loading to false since we're using events from DataContext
  React.useEffect(() => {
    setLoading(false);
  }, []);

  // Get events based on active tab
  const getFilteredEvents = () => {
    let filteredEvents = events;

    // Then filter by tab
    if (activeTab === 'upcoming') {
      // For upcoming tab, show events that haven't ended yet from followed organizations
      const followedOrgIds = followedOrgs.map(org => org.id);
      filteredEvents = filteredEvents.filter(event => {
        if (!followedOrgIds.includes(event.orgId) || event.status !== 'active') return false;
        
        // Check if event hasn't ended yet (current time < event end time)
        const now = new Date();
        const eventEndDateTime = new Date(`${event.date}T${event.endTime}`);
        
        return now < eventEndDateTime;
      });
    } else if (activeTab === 'my') {
      // For my events tab, show only events the user has joined from followed organizations
      const followedOrgIds = followedOrgs.map(org => org.id);
      filteredEvents = filteredEvents.filter(event =>
        followedOrgIds.includes(event.orgId) &&
        isUserJoinedEvent(user?._id || '', event.id)
      );
    } else if (activeTab === 'all') {
      // For all events tab, show only events from organizations the user follows
      const followedOrgIds = followedOrgs.map(org => org.id);
      filteredEvents = filteredEvents.filter(event => 
        followedOrgIds.includes(event.orgId) && event.status === 'active'
      );
    }

    // Filter by selected date from calendar
    if (selectedDate) {
      filteredEvents = filteredEvents.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate.toDateString() === selectedDate.toDateString();
      });
    }

    // Apply search and filters
    filteredEvents = filteredEvents.filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === '' || selectedType === 'A to Z' || selectedType === 'Z to A' || event.type === selectedType;
      const matchesOrg = selectedOrg === '' || event.orgId.toString() === selectedOrg;
      return matchesSearch && matchesType && matchesOrg;
    });

    // Sort events
    return filteredEvents.sort((a, b) => {
      if (selectedType === 'A to Z') {
        return a.title.localeCompare(b.title);
      } else if (selectedType === 'Z to A') {
        return b.title.localeCompare(a.title);
      } else {
        // Default: sort by date (earliest first)
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      }
    });
  };

  const filteredEvents = getFilteredEvents();
  const eventTypes = [...new Set(events.map(event => event.type))];

  // Debug logging for My Events tab
  if (activeTab === 'my') {
    console.log('🔍 My Events Debug:', {
      user: user ? { _id: user._id, id: user.id, joinedEvents: user.joinedEvents } : null,
      followedOrgs: followedOrgs.map(org => ({ id: org.id, name: org.name })),
      events: events.map(e => ({ 
        id: e.id, 
        title: e.title, 
        orgId: e.orgId, 
        participants: e.participants,
        isJoined: isUserJoinedEvent(user?._id || '', e.id)
      })),
      filteredEventsCount: filteredEvents.length,
      filteredEvents: filteredEvents.map(e => ({ id: e.id, title: e.title }))
    });
  }

  // Debug logging for All Events tab
  if (activeTab === 'all') {
    console.log('🔍 All Events Debug:', {
      followedOrgs: followedOrgs.map(org => ({ id: org.id, name: org.name })),
      followedOrgIds: followedOrgs.map(org => org.id),
      allEvents: events.map(e => ({ 
        id: e.id, 
        title: e.title, 
        orgId: e.orgId, 
        status: e.status,
        isFromFollowedOrg: followedOrgs.some(org => org.id === e.orgId)
      })),
      filteredEventsCount: filteredEvents.length,
      filteredEvents: filteredEvents.map(e => ({ id: e.id, title: e.title, orgId: e.orgId }))
    });
  }

  // Refresh data when component mounts to ensure we have the latest state
  useEffect(() => {
    const refreshData = async () => {
      try {
        await loadAuthenticatedData();
        console.log('🔄 StudentEvents: Data refreshed on mount');
      } catch (error) {
        console.error('❌ Error refreshing data:', error);
      }
    };
    
    refreshData();
  }, [loadAuthenticatedData]);

  const handleJoinToggle = async (eventId: number) => {
    try {
      const isJoined = isUserJoinedEvent(user?._id || '', eventId);

      if (isJoined) {
        // Show confirmation dialog for leaving event
        setEventToLeave(eventId);
        setShowLeaveConfirmation(true);
      } else {
        // Show CAPTCHA for joining event
        setEventToJoin(eventId);
        setShowCaptcha(true);
        setCaptchaVerified(false);
      }
    } catch (error) {
      console.error('Error updating event participation:', error);
      alert('Failed to update event participation. Please try again.');
    }
  };

  const handleConfirmLeave = async () => {
    if (eventToLeave) {
      try {
        await leaveEvent(user?._id || '', eventToLeave);
        setShowLeaveConfirmation(false);
        setEventToLeave(null);
      } catch (error) {
        console.error('Error leaving event:', error);
        alert('Failed to leave event. Please try again.');
      }
    }
  };

  const handleCancelLeave = () => {
    setShowLeaveConfirmation(false);
    setEventToLeave(null);
  };

  const handleCaptchaVerify = () => {
    setCaptchaVerified(true);
    
    // Auto-join after 1.5 seconds
    setTimeout(() => {
      handleAutoJoin();
    }, 1500);
  };

  const handleAutoJoin = async () => {
    if (eventToJoin) {
      try {
        await joinEvent(user?._id || '', eventToJoin);
        setShowCaptcha(false);
        setEventToJoin(null);
        setCaptchaVerified(false);
      } catch (error) {
        console.error('Error joining event:', error);
        alert('Failed to join event. Please try again.');
        setShowCaptcha(false);
        setEventToJoin(null);
        setCaptchaVerified(false);
      }
    }
  };

  // Calendar helper functions
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const getDatesWithEvents = () => {
    const datesWithEvents = new Set<string>();
    filteredEvents.forEach(event => {
      const eventDate = new Date(event.date);
      if (eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear) {
        datesWithEvents.add(eventDate.getDate().toString());
      }
    });
    return datesWithEvents;
  };

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentYear, currentMonth, day);
    const hasEvents = filteredEvents.some(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === clickedDate.toDateString();
    });

    if (hasEvents) {
      setSelectedDate(selectedDate?.toDateString() === clickedDate.toDateString() ? null : clickedDate);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
    setSelectedDate(null);
  };

  const datesWithEvents = getDatesWithEvents();

  return (
    <div className="p-6 space-y-6">
      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => {
                setActiveTab('upcoming');
                setSelectedDate(null);
              }}
              className={`py-4 px-6 text-sm font-medium border-b-2 ${
                activeTab === 'upcoming'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              >
                Upcoming Events ({events.filter(e => {
                  if (!followedOrgs.some(org => org.id === e.orgId) || e.status !== 'active') return false;
                  const now = new Date();
                  const eventEndDateTime = new Date(`${e.date}T${e.endTime}`);
                  return now < eventEndDateTime;
                }).length})
              </button>
            <button
              onClick={() => {
                setActiveTab('my');
                setSelectedDate(null);
              }}
              className={`py-4 px-6 text-sm font-medium border-b-2 ${
                activeTab === 'my'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Events ({events.filter(e => isUserJoinedEvent(user?._id || '', e.id) && followedOrgs.some(org => org.id === e.orgId)).length})
            </button>
            <button
              onClick={() => {
                setActiveTab('all');
                setSelectedDate(null);
              }}
              className={`py-4 px-6 text-sm font-medium border-b-2 ${
                activeTab === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                All Events ({events.filter(e => followedOrgs.some(org => org.id === e.orgId) && e.status === 'active').length})
              </button>
          </nav>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search events..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="sm:w-40">
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="A to Z">A to Z</option>
                <option value="Z to A">Z to A</option>
                <option value="Academic">Academic</option>
                <option value="Conference">Conference</option>
                <option value="Cultural">Cultural</option>
                <option value="Meeting">Meeting</option>
                <option value="Performance">Performance</option>
                <option value="Social">Social</option>
                <option value="Sports">Sports</option>
                <option value="Volunteer">Volunteer</option>
                <option value="Workshop">Workshop</option>
              </select>
            </div>
            <div className="sm:w-48">
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
              >
                <option value="">All Followed Organizations</option>
                {followedOrgs.map(org => (
                  <option key={org.id} value={org.id.toString()}>{org.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Component */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-1 hover:bg-gray-200 rounded-md transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => navigateMonth('next')}
              className="p-1 hover:bg-gray-200 rounded-md transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}

          {/* Empty cells for days before the first day of the month */}
          {Array.from({ length: getFirstDayOfMonth(currentMonth, currentYear) }, (_, i) => (
            <div key={`empty-${i}`} className="p-2"></div>
          ))}

          {/* Calendar days */}
          {Array.from({ length: getDaysInMonth(currentMonth, currentYear) }, (_, i) => {
            const day = i + 1;
            const hasEvents = datesWithEvents.has(day.toString());
            const isSelected = selectedDate?.getDate() === day &&
                             selectedDate?.getMonth() === currentMonth &&
                             selectedDate?.getFullYear() === currentYear;
            const isToday = new Date().getDate() === day &&
                          new Date().getMonth() === currentMonth &&
                          new Date().getFullYear() === currentYear;

            return (
              <div
                key={day}
                onClick={() => handleDateClick(day)}
                className={`relative p-2 text-center text-sm cursor-pointer transition-colors rounded-md hover:opacity-80 ${
                  isToday && !isSelected
                    ? 'text-white' // Current date text color
                    : hasEvents
                    ? isSelected
                      ? 'text-white' // Selected event date text color
                      : 'text-white' // Event date text color
                    : 'text-gray-700' // Regular date text color
                }`}
                style={{
                  backgroundColor: isToday && !isSelected
                    ? '#abd9c5' // Current date background
                    : hasEvents
                    ? isSelected
                      ? '#02cb25' // Selected event date background
                      : '#02cb25' // Event date background
                    : 'transparent', // Regular date background
                }}
              >
                {day}
                {hasEvents && (
                  <div className={`absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full ${
                    isSelected ? 'bg-white' : 'bg-white'
                  }`}></div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Date Events */}
        {selectedDate && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-blue-900">
                Events on {selectedDate.toLocaleDateString()}
              </h4>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Clear Filter
              </button>
            </div>
            <div className="space-y-2">
              {filteredEvents
                .filter(event => {
                  const eventDate = new Date(event.date);
                  return eventDate.toDateString() === selectedDate.toDateString();
                })
                .map(event => (
                  <div key={event.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium text-gray-900">{event.title}</span>
                      <span className="text-gray-500 ml-2">{event.startTime} - {event.endTime}</span>
                    </div>
                    <Link
                      to={`/student/events/${event.id}`}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      View
                    </Link>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Events List - Card Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((event) => {
          const isJoined = isUserJoinedEvent(user?._id || '', event.id);
          const organization = organizations.find(org => org.id === event.orgId);
          const isOrgSuspended = organization?.status === 'suspended';
          
          return (
            <div key={event.id} className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden ${
              isOrgSuspended ? 'opacity-75' : ''
            }`}>
              {/* Event Image */}
              <div className="relative h-48 bg-gray-200">
                {event.media && event.media.length > 0 ? (
                  <img
                    src={getImageUrl(event.media[0].url, 'event')}
                    alt={event.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to gradient background if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <div class="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <span class="text-white text-4xl font-bold">${event.title.charAt(0)}</span>
                          </div>
                        `;
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <span className="text-white text-4xl font-bold">
                      {event.title.charAt(0)}
                    </span>
                  </div>
                )}
                {isOrgSuspended && (
                  <div className="absolute top-2 right-2 bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded-full">
                    ⚠️ Suspended
                  </div>
                )}
              </div>
              
              {/* Event Content */}
              <div className="p-4">
                {/* Organization Badge */}
                <div className="flex items-center space-x-2 mb-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    isOrgSuspended 
                      ? 'bg-orange-100 text-orange-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {event.orgName}
                    {isOrgSuspended && ' (Suspended)'}
                  </span>
                  <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2 py-1 rounded">
                    {event.type}
                  </span>
                </div>
                
                {/* Event Title */}
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className={`text-lg font-semibold ${
                    isOrgSuspended ? 'text-gray-500' : 'text-gray-900'
                  }`}>{event.title}</h3>
                  <EventStatusBadge eventDate={event.date} startTime={event.startTime} endTime={event.endTime} />
                </div>
                
                {/* Event Description */}
                <p className={`text-sm mb-3 line-clamp-2 ${
                  isOrgSuspended ? 'text-gray-400' : 'text-gray-600'
                }`}>{event.description}</p>
                
                {/* Suspension Message */}
                {isOrgSuspended && (
                  <div className="mb-3 p-2 bg-orange-100 border border-orange-200 rounded text-sm text-orange-800">
                    This event is currently inactive because the hosting organization has been suspended.
                  </div>
                )}
                
                {/* Event Details */}
                <div className="space-y-2 text-sm text-gray-500 mb-4">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>{new Date(event.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>{event.startTime} - {event.endTime}</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span className="truncate">{event.location}</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    <span>{event.registered} participants</span>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-col space-y-2">
                  <Link
                    to={`/student/events/${event.id}`}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium text-center"
                  >
                    View Details
                  </Link>
                  {isOrgSuspended ? (
                    <div className="flex flex-col space-y-1">
                      <button
                        disabled
                        className="px-4 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
                      >
                        Event Suspended
                      </button>
                      <span className="text-xs text-orange-600 text-center">Organization suspended</span>
                    </div>
                  ) : (() => {
                    const eventStatus = getEventStatus(event);
                    
                    if (eventStatus.status === 'ended') {
                      return (
                        <button
                          disabled
                          className="px-4 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
                        >
                          Event Ended
                        </button>
                      );
                    }
                    
                    return (
                      <button
                        onClick={() => handleJoinToggle(event.id)}
                        disabled={!eventStatus.canJoin && !eventStatus.canLeave}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          !eventStatus.canJoin && !eventStatus.canLeave
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : isJoined
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {isJoined ? 'Leave Event' : 'Join Event'}
                      </button>
                    );
                  })()}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No events found</p>
          <p className="text-sm text-gray-400 mt-2">Try adjusting your search or filter criteria</p>
        </div>
      )}

      {/* Leave Event Confirmation Dialog */}
      {showLeaveConfirmation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-2">Leave Event</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to leave this event?
                </p>
              </div>
              <div className="flex justify-center space-x-4 mt-4">
                <button
                  onClick={handleCancelLeave}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  No
                </button>
                <button
                  onClick={handleConfirmLeave}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CAPTCHA Verification Dialog */}
      {showCaptcha && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto w-96 shadow-2xl rounded-lg bg-white overflow-hidden">
            {/* Blue Title Bar */}
            <div className="bg-blue-500 px-4 py-3 flex items-center justify-between">
              <h3 className="text-white font-semibold text-lg">Captcha</h3>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
            
            {/* Content Area */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={captchaVerified}
                      onChange={handleCaptchaVerify}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                      captchaVerified 
                        ? 'bg-blue-500 border-blue-500' 
                        : 'border-blue-300 hover:border-blue-400'
                    }`}>
                      {captchaVerified && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-gray-800 font-medium">I am not a robot</span>
                </label>
                
                <button 
                  onClick={handleCaptchaVerify}
                  className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                  title="Refresh"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              
              {captchaVerified && (
                <div className="text-center">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">Verified! Joining event...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const EventDetails = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    getEventById, 
    getOrganizationById, 
    joinEvent, 
    leaveEvent, 
    isUserJoinedEvent,
    loadAuthenticatedData
  } = useData();

  const event = getEventById(parseInt(eventId || '0'));
  const organization = event ? getOrganizationById(event.orgId) : null;
  const isJoined = event ? isUserJoinedEvent(user?._id || '', event.id) : false;
  const isOrgSuspended = organization?.status === 'suspended';
  
  // Debug logging
  console.log('🔍 EventDetails Debug:', {
    eventId: eventId,
    event: event ? { id: event.id, title: event.title, participants: event.participants, registered: event.registered } : null,
    user: user ? { _id: user._id, id: user.id, joinedEvents: user.joinedEvents } : null,
    isJoined: isJoined
  });
  
  // Refresh data when component mounts to ensure we have the latest state
  useEffect(() => {
    const refreshData = async () => {
      try {
        await loadAuthenticatedData();
        console.log('🔄 EventDetails: Data refreshed on mount');
      } catch (error) {
        console.error('❌ Error refreshing data:', error);
      }
    };
    
    refreshData();
  }, [eventId, loadAuthenticatedData]);
  
  // Confirmation dialog state
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);
  
  // CAPTCHA state
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  if (!event) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-500">Event not found</p>
          <button
            onClick={() => navigate('/student/events')}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  const handleJoinToggle = () => {
    if (isJoined) {
      // Show confirmation dialog for leaving event
      setShowLeaveConfirmation(true);
    } else {
      // Show CAPTCHA for joining event
      setShowCaptcha(true);
      setCaptchaVerified(false);
    }
  };

  const handleConfirmLeave = async () => {
    try {
      await leaveEvent(user?._id || '', event.id);
      setShowLeaveConfirmation(false);
    } catch (error) {
      console.error('Error leaving event:', error);
      alert('Failed to leave event. Please try again.');
    }
  };

  const handleCancelLeave = () => {
    setShowLeaveConfirmation(false);
  };

  const handleCaptchaVerify = () => {
    setCaptchaVerified(true);
    
    // Auto-join after 1.5 seconds
    setTimeout(() => {
      handleAutoJoin();
    }, 1500);
  };

  const handleAutoJoin = async () => {
    try {
      await joinEvent(user?._id || '', event.id);
      setShowCaptcha(false);
      setCaptchaVerified(false);
    } catch (error) {
      console.error('Error joining event:', error);
      alert('Failed to join event. Please try again.');
      setShowCaptcha(false);
      setCaptchaVerified(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/student/events')}
        className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </button>

      {/* Suspension Banner */}
      {isOrgSuspended && (
        <div className="bg-orange-100 border border-orange-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3">
            <span className="text-orange-600 text-xl">⚠️</span>
            <div>
              <h3 className="text-orange-800 font-semibold">This event is temporarily unavailable</h3>
              <p className="text-orange-700 text-sm mt-1">
                Due to the organization's suspension. You can view event details but cannot join, leave, or interact with this event.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Header */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center space-x-2 mb-4">
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded">
                {event.orgName}
              </span>
              <span className="bg-gray-100 text-gray-800 text-sm font-medium px-3 py-1 rounded">
                {event.type}
              </span>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{event.title}</h1>
            
            {/* Event Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Date</p>
                  <p className="text-sm text-gray-900">{new Date(event.date).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Time</p>
                  <p className="text-sm text-gray-900">{event.startTime} - {event.endTime}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Location</p>
                  <p className="text-sm text-gray-900">{event.location}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Participants</p>
                  <p className="text-sm text-gray-900">{event.registered}</p>
                </div>
              </div>
            </div>

            {/* Venue */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Venue</h3>
              <p className="text-gray-700">{event.venue}</p>
            </div>

            {/* Partner */}
            {event.partner && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Partner</h3>
                <p className="text-gray-700">{event.partner}</p>
              </div>
            )}

            {/* Event Images */}
            {event.media && event.media.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Images</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {event.media.map((mediaItem, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={getImageUrl(mediaItem.url)}
                        alt={`Event image ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => window.open(getImageUrl(mediaItem.url), '_blank')}
                        onError={handleImageError}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg flex items-center justify-center">
                        <ExternalLink className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700 leading-relaxed">{event.description}</p>
            </div>
          </div>

          {/* Organization Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Organization</h3>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{organization?.name}</h4>
                <p className="text-sm text-gray-600">{organization?.type}</p>
              </div>
              <Link
                to={`/student/organization/${organization?.id}`}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
              >
                View Organization Profile
                <ExternalLink className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Join/Leave Button */}
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="mb-4">
              <p className="text-3xl font-bold text-gray-900">{event.registered}</p>
              <p className="text-gray-600">Participants</p>
            </div>
            {isOrgSuspended ? (
              <div className="space-y-2">
                <button
                  disabled
                  className="w-full py-3 px-4 rounded-lg font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
                >
                  Event Suspended
                </button>
                <p className="text-xs text-orange-600">Organization suspended</p>
              </div>
            ) : (() => {
              const eventStatus = getEventStatus(event);
              
              if (eventStatus.status === 'ended') {
                return (
                  <button
                    disabled
                    className="w-full py-3 px-4 rounded-lg font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
                  >
                    Event Ended
                  </button>
                );
              }
              
              return (
                <button
                  onClick={handleJoinToggle}
                  disabled={!eventStatus.canJoin && !eventStatus.canLeave}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                    !eventStatus.canJoin && !eventStatus.canLeave
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : isJoined
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isJoined ? 'Leave Event' : 'Join Event'}
                </button>
              );
            })()}
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-500">Responsible Person</label>
                <p className="text-gray-900">{event.responsiblePerson}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">Email</label>
                <a href={`mailto:${event.responsibleEmail || organization?.email}`} className="text-blue-600 hover:text-blue-800">
                  {event.responsibleEmail || organization?.email}
                </a>
              </div>
              
              {event.responsiblePhone && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Phone</label>
                  <a href={`tel:${event.responsiblePhone}`} className="text-blue-600 hover:text-blue-800">
                    {event.responsiblePhone}
                  </a>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-500">Organization</label>
                <p className="text-gray-900">{organization?.name}</p>
              </div>
            </div>
            
            <Link
              to={`/student/organization/${organization?.id}`}
              className="w-full mt-4 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-center block"
            >
              View Organization Profile
            </Link>
          </div>

          {/* Event Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Information</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                {(() => {
                  const eventStatus = getEventStatus(event);
                  return (
                    <span className={`font-medium ${
                      eventStatus.status === 'upcoming' ? 'text-blue-600' :
                      eventStatus.status === 'started' ? 'text-orange-600' :
                      eventStatus.status === 'ended' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {eventStatus.statusText}
                    </span>
                  );
                })()}
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Capacity</span>
                <span className="font-medium">{event.capacity || 'Unlimited'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Registered</span>
                <span className="font-medium">{event.registered}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Organizer</span>
                <span className="font-medium">{event.organizer}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Leave Event Confirmation Dialog */}
      {showLeaveConfirmation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-2">Leave Event</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to leave this event?
                </p>
              </div>
              <div className="flex justify-center space-x-4 mt-4">
                <button
                  onClick={handleCancelLeave}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  No
                </button>
                <button
                  onClick={handleConfirmLeave}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CAPTCHA Verification Dialog */}
      {showCaptcha && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto w-96 shadow-2xl rounded-lg bg-white overflow-hidden">
            {/* Blue Title Bar */}
            <div className="bg-blue-500 px-4 py-3 flex items-center justify-between">
              <h3 className="text-white font-semibold text-lg">Captcha</h3>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
            
            {/* Content Area */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={captchaVerified}
                      onChange={handleCaptchaVerify}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                      captchaVerified 
                        ? 'bg-blue-500 border-blue-500' 
                        : 'border-blue-300 hover:border-blue-400'
                    }`}>
                      {captchaVerified && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-gray-800 font-medium">I am not a robot</span>
                </label>
                
                <button 
                  onClick={handleCaptchaVerify}
                  className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                  title="Refresh"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              
              {captchaVerified && (
                <div className="text-center">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">Verified! Joining event...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const OrganizationProfile = () => {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    getOrganizationById, 
    getEventsByOrgId, 
    followOrganization, 
    unfollowOrganization, 
    isUserFollowingOrg,
    isUserJoinedEvent,
    joinEvent,
    leaveEvent,
    users
  } = useData();

  const organization = getOrganizationById(parseInt(orgId || '0'));
  const orgEvents = organization ? getEventsByOrgId(organization.id) : [];
  const isFollowing = organization ? isUserFollowingOrg(user?._id || '', organization.id) : false;
  const isOrgSuspended = organization?.status === 'suspended';
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [activeEventTab, setActiveEventTab] = useState('upcoming');
  
  // Confirmation dialog state
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);
  const [eventToLeave, setEventToLeave] = useState<number | null>(null);
  
  // CAPTCHA state
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [eventToJoin, setEventToJoin] = useState<number | null>(null);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  
  // Unfollow confirmation dialog state
  const [showUnfollowConfirmation, setShowUnfollowConfirmation] = useState(false);
  
  // CAPTCHA state for follow
  const [showFollowCaptcha, setShowFollowCaptcha] = useState(false);
  const [followCaptchaVerified, setFollowCaptchaVerified] = useState(false);

  // Get actual followers count (students who follow this organization)
  const followersCount = organization ? users.filter(u => 
    u.role === 'student' && u.followedOrgs?.includes(organization.id)
  ).length : 0;

  // Debug logging
  console.log('🔍 OrganizationProfile Debug:');
  console.log('🔍 organization:', organization);
  console.log('🔍 organization.id:', organization?.id);
  console.log('🔍 users array:', users);
  console.log('🔍 users with role student:', users.filter(u => u.role === 'student'));
  console.log('🔍 students followedOrgs:', users.filter(u => u.role === 'student').map(u => ({ name: u.name, followedOrgs: u.followedOrgs })));
  console.log('🔍 calculated followersCount:', followersCount);

  if (!organization) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-500">Organization not found</p>
          <button
            onClick={() => navigate('/student/explore')}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Back to Explore
          </button>
        </div>
      </div>
    );
  }

  const handleFollowToggle = async () => {
    try {
      if (isFollowing) {
        // Show confirmation dialog for unfollowing
        setShowUnfollowConfirmation(true);
      } else {
        // Show CAPTCHA for following organization
        setShowFollowCaptcha(true);
        setFollowCaptchaVerified(false);
      }
    } catch (error) {
      console.error('Error toggling follow status:', error);
      // Optionally show a user-friendly error message
    }
  };

  const handleJoinEvent = (eventId: number) => {
    if (isUserJoinedEvent(user?._id || '', eventId)) {
      // Show confirmation dialog for leaving event
      setEventToLeave(eventId);
      setShowLeaveConfirmation(true);
    } else {
      // Show CAPTCHA for joining event
      setEventToJoin(eventId);
      setShowCaptcha(true);
      setCaptchaVerified(false);
    }
  };

  const handleConfirmLeave = async () => {
    if (eventToLeave) {
      try {
        await leaveEvent(user?._id || '', eventToLeave);
        setShowLeaveConfirmation(false);
        setEventToLeave(null);
      } catch (error) {
        console.error('Error leaving event:', error);
        alert('Failed to leave event. Please try again.');
      }
    }
  };

  const handleCancelLeave = () => {
    setShowLeaveConfirmation(false);
    setEventToLeave(null);
  };

  const handleCaptchaVerify = () => {
    setCaptchaVerified(true);
    
    // Auto-join after 1.5 seconds
    setTimeout(() => {
      handleAutoJoin();
    }, 1500);
  };

  const handleAutoJoin = async () => {
    if (eventToJoin) {
      try {
        await joinEvent(user?._id || '', eventToJoin);
        setShowCaptcha(false);
        setEventToJoin(null);
        setCaptchaVerified(false);
      } catch (error) {
        console.error('Error joining event:', error);
        alert('Failed to join event. Please try again.');
        setShowCaptcha(false);
        setEventToJoin(null);
        setCaptchaVerified(false);
      }
    }
  };

  const handleConfirmUnfollow = async () => {
    try {
      await unfollowOrganization(user?._id || '', organization.id);
      setShowUnfollowConfirmation(false);
    } catch (error) {
      console.error('Error unfollowing organization:', error);
      alert('Failed to unfollow organization. Please try again.');
    }
  };

  const handleCancelUnfollow = () => {
    setShowUnfollowConfirmation(false);
  };

  const handleFollowCaptchaVerify = () => {
    setFollowCaptchaVerified(true);
    
    // Auto-follow after 1.5 seconds
    setTimeout(() => {
      handleAutoFollow();
    }, 1500);
  };

  const handleAutoFollow = async () => {
    try {
      await followOrganization(user?._id || '', organization.id);
      setShowFollowCaptcha(false);
      setFollowCaptchaVerified(false);
    } catch (error) {
      console.error('Error following organization:', error);
      alert('Failed to follow organization. Please try again.');
      setShowFollowCaptcha(false);
      setFollowCaptchaVerified(false);
    }
  };

  // Filter events based on active tab (consistent with main Events page logic)
  const getFilteredEvents = () => {
    if (activeEventTab === 'upcoming') {
      // For upcoming tab, show events that haven't ended yet from this organization
      return orgEvents.filter(event => {
        if (event.status !== 'active') return false;
        
        // Check if event hasn't ended yet (current time < event end time)
        const now = new Date();
        const eventEndDateTime = new Date(`${event.date}T${event.endTime}`);
        
        return now < eventEndDateTime;
      });
    } else if (activeEventTab === 'all') {
      // For all events tab, show all active events from this organization
      return orgEvents.filter(event => event.status === 'active');
    }
    return [];
  };

  const filteredEvents = getFilteredEvents();
  const eventsToShow = showAllEvents ? filteredEvents : filteredEvents.slice(0, 3);

  return (
    <div className="p-6 space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/student/explore')}
        className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Explore
      </button>

      {/* Suspension Banner */}
      {isOrgSuspended && (
        <div className="bg-orange-100 border border-orange-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3">
            <span className="text-orange-600 text-xl">⚠️</span>
            <div>
              <h3 className="text-orange-800 font-semibold">This organization is currently suspended</h3>
              <p className="text-orange-700 text-sm mt-1">
                You can view organization details but cannot follow, unfollow, or interact with this organization.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Organization Header */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {organization.profileImage ? (
                    <img
                      src={getImageUrl(organization.profileImage, 'profile')}
                      alt={organization.name}
                      className="h-20 w-20 rounded-full object-cover border-4 border-gray-200"
                      onError={(e) => {
                        // Fallback to gradient background if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-4 border-gray-200">
                              <span class="text-white text-2xl font-bold">${organization.name.charAt(0)}</span>
                            </div>
                          `;
                        }
                      }}
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-4 border-gray-200">
                      <span className="text-white text-2xl font-bold">
                        {organization.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <h1 className={`text-3xl font-bold ${
                      isOrgSuspended ? 'text-gray-500' : 'text-gray-900'
                    }`}>{organization.name}</h1>
                    {isOrgSuspended && (
                      <span className="text-orange-600 text-xl" title="Organization suspended">⚠️</span>
                    )}
                  </div>
                  <p className={`text-lg ${
                    isOrgSuspended ? 'text-gray-400' : 'text-gray-600'
                  }`}>{organization.type}</p>
                  {isOrgSuspended && (
                    <span className="text-sm text-orange-600 font-medium">(Suspended)</span>
                  )}
                </div>
              </div>
              {user?.role === 'student' && (
                isOrgSuspended ? (
                  <div className="flex flex-col items-center space-y-2">
                    <button
                      disabled
                      className="px-6 py-2 rounded-lg font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
                    >
                      Organization Suspended
                    </button>
                    <span className="text-xs text-orange-600">Cannot follow/unfollow</span>
                  </div>
                ) : (
                  <button
                    onClick={handleFollowToggle}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      isFollowing
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isFollowing ? 'Unfollow' : 'Follow'}
                  </button>
                )
              )}
            </div>
            
            <p className={`leading-relaxed mb-6 ${
              isOrgSuspended ? 'text-gray-400' : 'text-gray-700'
            }`}>{organization.description}</p>
            
            {isOrgSuspended && (
              <div className="mb-6 p-3 bg-orange-100 border border-orange-200 rounded text-sm text-orange-800">
                This organization is currently suspended. You can view details but cannot follow or interact.
              </div>
            )}
            
            {/* Organization Stats */}
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className={`text-2xl font-bold ${
                  isOrgSuspended ? 'text-gray-400' : 'text-gray-900'
                }`}>{followersCount}</p>
                <p className={`text-sm ${
                  isOrgSuspended ? 'text-gray-400' : 'text-gray-600'
                }`}>Followers</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${
                  isOrgSuspended ? 'text-gray-400' : 'text-gray-900'
                }`}>{organization.members}</p>
                <p className={`text-sm ${
                  isOrgSuspended ? 'text-gray-400' : 'text-gray-600'
                }`}>Members</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${
                  isOrgSuspended ? 'text-gray-400' : 'text-gray-900'
                }`}>{orgEvents.length}</p>
                <p className={`text-sm ${
                  isOrgSuspended ? 'text-gray-400' : 'text-gray-600'
                }`}>Events</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${
                  isOrgSuspended ? 'text-gray-400' : 'text-gray-900'
                }`}>{organization.founded}</p>
                <p className={`text-sm ${
                  isOrgSuspended ? 'text-gray-400' : 'text-gray-600'
                }`}>Founded</p>
              </div>
            </div>
          </div>

          {/* Achievements */}

          {/* Events */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Events</h3>
              {filteredEvents.length > 3 && (
                <button
                  onClick={() => setShowAllEvents(!showAllEvents)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                >
                  {showAllEvents ? 'Show Less' : 'Show All'}
                  {showAllEvents ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                </button>
              )}
            </div>

            {/* Event Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex">
                <button
                  onClick={() => setActiveEventTab('upcoming')}
                  className={`py-2 px-4 text-sm font-medium border-b-2 ${
                    activeEventTab === 'upcoming'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Upcoming Events ({orgEvents.filter(event => {
                    if (event.status !== 'active') return false;
                    const now = new Date();
                    const eventEndDateTime = new Date(`${event.date}T${event.endTime}`);
                    return now < eventEndDateTime;
                  }).length})
                </button>
                <button
                  onClick={() => setActiveEventTab('all')}
                  className={`py-2 px-4 text-sm font-medium border-b-2 ${
                    activeEventTab === 'all'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  All Events ({orgEvents.filter(event => event.status === 'active').length})
                </button>
              </nav>
            </div>
            
            {eventsToShow.length > 0 ? (
              <div className="space-y-4">
                {eventsToShow.map((event) => {
                  const isEventJoined = isUserJoinedEvent(user?._id || '', event.id);
                  const isOrgSuspended = organization?.status === 'suspended';
                  
                  return (
                    <div key={event.id} className={`border rounded-lg p-4 ${
                      isOrgSuspended 
                        ? 'border-orange-200 bg-orange-50' 
                        : 'border-gray-200'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className={`font-medium ${
                              isOrgSuspended ? 'text-gray-500' : 'text-gray-900'
                            }`}>{event.title}</h4>
                            {isOrgSuspended && (
                              <span className="text-orange-600" title="Organization suspended">⚠️</span>
                            )}
                          </div>
                          <p className={`text-sm mt-1 ${
                            isOrgSuspended ? 'text-gray-400' : 'text-gray-600'
                          }`}>{event.type}</p>
                          
                          {isOrgSuspended && (
                            <div className="mt-2 p-2 bg-orange-100 border border-orange-200 rounded text-sm text-orange-800">
                              This event is currently inactive because the hosting organization has been suspended.
                            </div>
                          )}
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {new Date(event.date).toLocaleDateString()}
                            </span>
                            <span className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {event.startTime} - {event.endTime}
                            </span>
                            <span className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {event.location}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col space-y-2 ml-4">
                          <Link
                            to={`/student/events/${event.id}`}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors text-center"
                          >
                            View Details
                          </Link>
                          {isOrgSuspended ? (
                            <div className="flex flex-col space-y-1">
                              <button
                                disabled
                                className="px-3 py-1 rounded text-sm bg-gray-100 text-gray-400 cursor-not-allowed"
                              >
                                Event Suspended
                              </button>
                              <span className="text-xs text-orange-600 text-center">Organization suspended</span>
                            </div>
                          ) : (() => {
                            const eventStatus = getEventStatus(event);
                            
                            if (eventStatus.status === 'ended') {
                              return (
                                <button
                                  disabled
                                  className="px-3 py-1 rounded text-sm bg-gray-100 text-gray-400 cursor-not-allowed"
                                >
                                  Event Ended
                                </button>
                              );
                            }
                            
                            return (
                              <button
                                onClick={() => handleJoinEvent(event.id)}
                                disabled={!eventStatus.canJoin && !eventStatus.canLeave}
                                className={`px-3 py-1 rounded text-sm transition-colors ${
                                  !eventStatus.canJoin && !eventStatus.canLeave
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : isEventJoined
                                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                    : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                              >
                                {isEventJoined ? 'Leave' : 'Join'}
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {activeEventTab === 'upcoming' 
                    ? 'No upcoming events from this organization' 
                    : 'No events from this organization'
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Organization Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Organization Info</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-500">President</label>
                <p className="text-gray-900">{organization.president}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Members</label>
                <p className="text-gray-900">{organization.members} members</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Founded</label>
                <p className="text-gray-900">{organization.founded}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Status</label>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  organization.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : organization.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {organization.status}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Email</label>
                <a href={`mailto:${organization.email}`} className="text-blue-600 hover:text-blue-800">
                  {organization.email}
                </a>
              </div>
              {organization.website && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Website</label>
                  <a href={organization.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center">
                    Visit Website
                    <ExternalLink className="h-4 w-4 ml-1" />
                  </a>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-500">Created</label>
                <p className="text-gray-900">{new Date(organization.created).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Social Media */}
          {(organization.socialMedia?.facebook || organization.socialMedia?.instagram || organization.socialMedia?.twitter) && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Media</h3>
              <div className="space-y-2">
                {organization.socialMedia?.facebook && (
                  <a href={organization.socialMedia.facebook} target="_blank" rel="noopener noreferrer"
                     className="block text-blue-600 hover:text-blue-800 text-sm">
                    Facebook
                  </a>
                )}
                {organization.socialMedia?.instagram && (
                  <p className="text-sm text-gray-900">
                    Instagram: {organization.socialMedia.instagram}
                  </p>
                )}
                {organization.socialMedia?.twitter && (
                  <p className="text-sm text-gray-900">
                    Twitter: {organization.socialMedia.twitter}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Achievements */}
          {organization.achievements && organization.achievements.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Achievements</h3>
              <div className="space-y-2">
                {organization.achievements.map((achievement, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Award className="h-4 w-4 text-yellow-500" />
                    <p className="text-sm text-gray-900">{achievement}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Social Impact */}
          {organization.socialImpact && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Impact</h3>
              <p className="text-sm text-gray-700">{organization.socialImpact}</p>
            </div>
          )}
        </div>
      </div>

      {/* Leave Event Confirmation Dialog */}
      {showLeaveConfirmation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-2">Leave Event</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to leave this event?
                </p>
              </div>
              <div className="flex justify-center space-x-4 mt-4">
                <button
                  onClick={handleCancelLeave}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  No
                </button>
                <button
                  onClick={handleConfirmLeave}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CAPTCHA Verification Dialog */}
      {showCaptcha && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto w-96 shadow-2xl rounded-lg bg-white overflow-hidden">
            {/* Blue Title Bar */}
            <div className="bg-blue-500 px-4 py-3 flex items-center justify-between">
              <h3 className="text-white font-semibold text-lg">Captcha</h3>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
            
            {/* Content Area */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={captchaVerified}
                      onChange={handleCaptchaVerify}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                      captchaVerified 
                        ? 'bg-blue-500 border-blue-500' 
                        : 'border-blue-300 hover:border-blue-400'
                    }`}>
                      {captchaVerified && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-gray-800 font-medium">I am not a robot</span>
                </label>
                
                <button 
                  onClick={handleCaptchaVerify}
                  className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                  title="Refresh"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              
              {captchaVerified && (
                <div className="text-center">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">Verified! Joining event...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unfollow Confirmation Dialog */}
      {showUnfollowConfirmation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-2">Unfollow Organization</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to Unfollow this Organization?
                </p>
              </div>
              <div className="flex justify-center space-x-4 mt-4">
                <button
                  onClick={handleCancelUnfollow}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  No
                </button>
                <button
                  onClick={handleConfirmUnfollow}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Follow CAPTCHA Verification Dialog */}
      {showFollowCaptcha && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto w-96 shadow-2xl rounded-lg bg-white overflow-hidden">
            {/* Blue Title Bar */}
            <div className="bg-blue-500 px-4 py-3 flex items-center justify-between">
              <h3 className="text-white font-semibold text-lg">Captcha</h3>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
            
            {/* Content Area */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={followCaptchaVerified}
                      onChange={handleFollowCaptchaVerify}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                      followCaptchaVerified 
                        ? 'bg-blue-500 border-blue-500' 
                        : 'border-blue-300 hover:border-blue-400'
                    }`}>
                      {followCaptchaVerified && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-gray-800 font-medium">I am not a robot</span>
                </label>
                
                <button 
                  onClick={handleFollowCaptchaVerify}
                  className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                  title="Refresh"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              
              {followCaptchaVerified && (
                <div className="text-center">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">Verified! Following organization...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// StudentNotifications component removed - notifications feature disabled

const StudentDashboard = () => {
  const location = useLocation();
  const currentPath = location.pathname.split('/').pop() || 'student';

  const sidebarItems = [
    { id: 'student', label: 'Home', icon: Home, path: '/student' },
    { id: 'explore', label: 'Explore', icon: Search, path: '/student/explore' },
    { id: 'events', label: 'Events', icon: Calendar, path: '/student/events' },
    { id: 'notifications', label: 'Notifications', icon: Bell, path: '/student/notifications' }
  ];

  const sidebarContent = (
    <nav className="mt-6 px-3">
      <div className="space-y-1">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = (item.path === '/student' && currentPath === 'student') || 
                          (item.path !== '/student' && currentPath === item.id);
          
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );

  const getPageTitle = () => {
    switch (currentPath) {
      case 'explore': return 'Explore Organizations';
      case 'events': return 'Events';
      case 'notifications': return 'Notifications';
      default: return 'Student Dashboard';
    }
  };

  return (
    <Layout sidebarContent={sidebarContent} title={getPageTitle()}>
      <Routes>
        <Route path="/" element={<StudentHome />} />
        <Route path="/explore" element={<StudentExplore />} />
        <Route path="/events" element={<StudentEvents />} />
        <Route path="/events/:eventId" element={<EventDetails />} />
        <Route path="/organization/:orgId" element={<OrganizationProfile />} />
        <Route path="/notifications" element={<NotificationsPage />} />
      </Routes>
    </Layout>
  );
};

export default StudentDashboard;