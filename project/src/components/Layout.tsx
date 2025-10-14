import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import apiClient from '../utils/api';
import { LogOut, User, X, Camera, Edit3, Building2, Calendar, Users, Globe, Mail, Phone } from 'lucide-react';
import { getImageUrl, handleImageError } from '../utils/imageUtils';
import NotificationBell from './NotificationBell';

interface LayoutProps {
  children: React.ReactNode;
  sidebarContent: React.ReactNode;
  title?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, sidebarContent, title = "OneAU" }) => {
  const { user, logout } = useAuth();
  const { organizations, updateOrganization, loadAuthenticatedData } = useData();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    faculty: '',
    bio: '',
    interests: '',
    yearOfStudy: '',
    phone: '',
    website: ''
  });
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  
  // Get organization data for organization users
  const organization = user?.role === 'organization' && user?.orgId 
    ? organizations.find(org => org.id === user.orgId) 
    : null;
  
  // For pending organization users, use user data directly
  const isPendingOrganization = user?.role === 'organization' && user?.status === 'pending';
  
  // Use organization data if available, otherwise use user data for pending organizations
  // If user has organization data directly (orgName, orgType, etc.), use that
  const orgData = organization || (user?.role === 'organization' && user?.orgName ? user : null) || user;
  
  // Notifications feature removed - no unread count
  const unreadCount = 0;

  // Initialize profile data when user changes
  React.useEffect(() => {
    if (user) {
      console.log('🔍 User object in Layout:', user);
      console.log('🔍 User profileImage:', user.profileImage);
      console.log('🔍 User role:', user.role);
      console.log('🔍 User status:', user.status);
      console.log('🔍 User yearOfStudy:', user.yearOfStudy);
      console.log('🔍 User faculty:', user.faculty);
      console.log('🔍 User bio:', user.bio);
      console.log('🔍 User interests:', user.interests);
      console.log('🔍 User phone:', user.phone);
      console.log('🔍 User website:', user.website);
      console.log('🔍 Organization found:', !!organization);
      console.log('🔍 Is pending organization:', isPendingOrganization);
      console.log('🔍 Organization data:', organization);
      console.log('🔍 User orgName:', user.orgName);
      console.log('🔍 User orgType:', user.orgType);
      console.log('🔍 User president:', user.president);
      console.log('🔍 User founded:', user.founded);
      console.log('🔍 User members:', user.members);
      console.log('🔍 User description:', user.description);
      
      if (user.role === 'organization' && (organization || isPendingOrganization || user.orgName)) {
        // Use organization data if available, otherwise use user data for pending organizations
        const orgData = organization || user;
        setProfileData({
          name: orgData.orgName || orgData.name || '',
          faculty: orgData.orgType || orgData.type || '',
          bio: orgData.description || orgData.bio || '',
          interests: '',
          yearOfStudy: '',
          phone: '',
          website: orgData.website || '',
          president: orgData.president || '',
          founded: orgData.founded || '',
          members: orgData.members || '',
          email: orgData.email || '',
          socialMedia: orgData.socialMedia || {}
        });
      } else {
        const studentProfileData = {
          name: user.name || '',
          faculty: user.faculty || '',
          bio: user.bio || '',
          interests: user.interests || '',
          yearOfStudy: user.yearOfStudy || '',
          phone: user.phone || '',
          website: user.website || ''
        };
        console.log('🔍 Setting student profile data:', studentProfileData);
        setProfileData(studentProfileData);
      }
    }
  }, [user, organization, isPendingOrganization]);

  const handleProfileClick = async () => {
    setShowProfileModal(true);
    setIsEditing(false);
    
    // Refresh user data when opening profile modal
    try {
      console.log('🔄 Refreshing user data for profile modal...');
      const response = await apiClient.getProfile();
      if (response.success && response.user) {
        console.log('✅ Fresh user data received:', response.user);
        // Update the user context with fresh data
        window.dispatchEvent(new CustomEvent('auth:profileUpdated', {
          detail: { user: response.user }
        }));
      }
    } catch (error) {
      console.error('❌ Error refreshing user data for profile:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Handle nested social media fields
    if (name.startsWith('socialMedia.')) {
      const socialField = name.split('.')[1];
      setProfileData(prev => ({
        ...prev,
        socialMedia: {
          ...prev.socialMedia,
          [socialField]: value
        }
      }));
    } else {
      setProfileData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    try {
      let updateData = { ...profileData };
      
      console.log('🔍 Saving profile with data:', updateData);
      
      // If there's a profile image, upload it first
      if (profileImage) {
        console.log('📸 Uploading profile image:', profileImage.name);
        
        const uploadResponse = await apiClient.uploadFile(profileImage);
        console.log('📸 Upload response:', uploadResponse);
        
        if (uploadResponse && uploadResponse.success && uploadResponse.file && uploadResponse.file.url) {
          updateData.profileImage = uploadResponse.file.url;
          console.log('📸 Profile image URL set:', updateData.profileImage);
        } else {
          console.error('❌ Failed to upload profile image - invalid response:', uploadResponse);
          alert('Failed to upload profile image. Please try again.');
          return;
        }
      }

      console.log('💾 Updating profile with final data:', updateData);
      
      // For all users (students, organizations, admins), use the regular profile update
      // This ensures profile images are properly stored in the User collection
      const response = await apiClient.updateProfile(updateData);
      console.log('💾 Profile update response:', response);
      
      if (response.success) {
        alert('Profile updated successfully!');
        setIsEditing(false);
        // Update local user data with the complete updated user data from backend
        if (response.user) {
          localStorage.setItem('user', JSON.stringify(response.user));
          // Update the user context without page reload
          window.dispatchEvent(new CustomEvent('auth:profileUpdated', {
            detail: { user: response.user }
          }));
        }
        
        // For organization users, also update the organization data in DataContext
        if (user?.role === 'organization' && user?.orgId && organization) {
          const orgUpdateData = {
            name: response.user.name,
            type: response.user.faculty,
            description: response.user.bio,
            president: response.user.president,
            founded: response.user.founded,
            members: response.user.members,
            email: response.user.email,
            website: response.user.website,
            socialMedia: response.user.socialMedia
          };
          
          console.log('🏢 Updating organization in DataContext:', orgUpdateData);
          await updateOrganization(orgData.id, orgUpdateData);
          
          // Refresh all data to ensure events are properly loaded
          console.log('🔄 Refreshing all data after organization profile update...');
          await loadAuthenticatedData();
        }
      } else {
        console.error('❌ Profile update failed:', response);
        alert(`Failed to update profile: ${response.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      alert(`Failed to update profile. Please try again. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCancelEdit = () => {
    if (user) {
      if (user.role === 'organization' && (organization || user.orgName)) {
        setProfileData({
          name: orgData.orgName || orgData.name || '',
          faculty: orgData.orgType || orgData.type || '',
          bio: orgData.description || '',
          interests: '',
          yearOfStudy: '',
          phone: '',
          website: orgData.website || '',
          president: orgData.president || '',
          founded: orgData.founded || '',
          members: orgData.members || '',
          email: orgData.email || '',
          socialMedia: orgData.socialMedia || {}
        });
      } else {
        setProfileData({
          name: user.name || '',
          faculty: user.faculty || '',
          bio: user.bio || '',
          interests: user.interests || '',
          yearOfStudy: user.yearOfStudy || '',
          phone: user.phone || '',
          website: user.website || ''
        });
      }
    }
    setProfileImage(null);
    setProfileImagePreview(null);
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Fixed Sidebar */}
      <div className="w-72 bg-white shadow-lg flex flex-col fixed left-0 top-0 h-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-3 mb-4">
            <img src="/image copy copy.png" alt="OneAU Logo" className="h-8 w-auto" />
            <h1 className="text-xl font-bold text-gray-900">OneAU</h1>
          </div>
          
          {/* User Info */}
          <div 
            className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={handleProfileClick}
            title="Click to view/edit profile"
          >
            <div className="flex-shrink-0 relative">
              {user?.profileImage ? (
                <img 
                  src={getImageUrl(user.profileImage, 'profile')} 
                  alt="Profile" 
                  className="h-10 w-10 rounded-full object-cover"
                  onError={(e) => {
                    console.log('❌ Profile image failed to load:', user.profileImage);
                    console.log('❌ Constructed URL:', getImageUrl(user.profileImage, 'profile'));
                    handleImageError(e);
                  }}
                  onLoad={() => {
                    console.log('✅ Profile image loaded successfully:', user.profileImage);
                    console.log('✅ Constructed URL:', getImageUrl(user.profileImage, 'profile'));
                  }}
                />
              ) : (
                <div className="h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
              )}
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-medium">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.faculty || user?.orgType || 'Administrator'}
              </p>
              {unreadCount > 0 && (
                <p className="text-xs text-red-600">
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            <Edit3 className="h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Sidebar Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {sidebarContent}
        </div>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Log out</span>
          </button>
        </div>
      </div>

      {/* Main Content - Offset by sidebar width */}
      <div className="flex-1 flex flex-col ml-72">
        {/* Top Bar - Fixed */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
            <NotificationBell />
          </div>
        </header>

        {/* Content - Scrollable */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Profile</h3>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Profile Picture Section */}
                <div className="flex items-center space-x-4 pb-4 border-b border-gray-200">
                  <div className="relative">
                    {profileImagePreview || user?.profileImage ? (
                      <img 
                        src={profileImagePreview || getImageUrl(user?.profileImage || '', 'profile')} 
                        alt="Profile" 
                        className="h-20 w-20 rounded-full object-cover"
                        onError={(e) => {
                          console.log('❌ Profile image failed to load in modal:', user?.profileImage);
                          console.log('❌ Constructed URL:', getImageUrl(user?.profileImage || '', 'profile'));
                          // Set a fallback avatar
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                        onLoad={() => {
                          console.log('✅ Profile image loaded successfully in modal:', user?.profileImage);
                          console.log('✅ Constructed URL:', getImageUrl(user?.profileImage || '', 'profile'));
                        }}
                      />
                    ) : (
                      <div className="h-20 w-20 bg-blue-500 rounded-full flex items-center justify-center">
                        <User className="h-10 w-10 text-white" />
                      </div>
                    )}
                    {/* Fallback avatar for when image fails to load */}
                    <div className="h-20 w-20 bg-blue-500 rounded-full flex items-center justify-center hidden">
                      <User className="h-10 w-10 text-white" />
                    </div>
                    {isEditing && (
                      <label className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-1 cursor-pointer hover:bg-blue-600">
                        <Camera className="h-4 w-4" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">{user?.name}</h4>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 mt-1">
                      {user?.role}
                    </span>
                  </div>
                </div>

                {/* Profile Information */}
                <div className="space-y-4">
                  {user?.role === 'organization' && (organization || isPendingOrganization || user.orgName) ? (
                    // Organization Profile Information
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                            <Building2 className="h-4 w-4 mr-1" />
                            Organization Name
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              name="name"
                              value={profileData.name}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <p className="text-sm text-gray-900">{orgData.orgName || orgData.name}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                            <Building2 className="h-4 w-4 mr-1" />
                            Organization Type
                          </label>
                          {isEditing ? (
                            <select
                              name="faculty"
                              value={profileData.faculty}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select Type</option>
                              <option value="Student Government">Student Government</option>
                              <option value="Medical Society">Medical Society</option>
                              <option value="International Exchange">International Exchange</option>
                              <option value="Community Service">Community Service</option>
                              <option value="Sports & Recreation">Sports & Recreation</option>
                              <option value="Arts & Culture">Arts & Culture</option>
                              <option value="Academic">Academic</option>
                              <option value="Religious">Religious</option>
                              <option value="Environmental">Environmental</option>
                              <option value="Other">Other</option>
                            </select>
                          ) : (
                            <p className="text-sm text-gray-900">{orgData.orgType || orgData.type}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            President
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              name="president"
                              value={profileData.president || ''}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <p className="text-sm text-gray-900">{orgData.president || 'Not specified'}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            Founded Year
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              name="founded"
                              value={profileData.founded || ''}
                              onChange={handleInputChange}
                              placeholder="e.g., 2020"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <p className="text-sm text-gray-900">{orgData.founded || 'Not specified'}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            Member Count
                          </label>
                          {isEditing ? (
                            <input
                              type="number"
                              name="members"
                              value={profileData.members || ''}
                              onChange={handleInputChange}
                              min="0"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <p className="text-sm text-gray-900">{orgData.members || 0} members</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            Followers
                          </label>
                          <p className="text-sm text-gray-900">{orgData.followers || 0} followers</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                            <Mail className="h-4 w-4 mr-1" />
                            Contact Email
                          </label>
                          {isEditing ? (
                            <input
                              type="email"
                              name="email"
                              value={profileData.email || ''}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <p className="text-sm text-gray-900">{orgData.email}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                            <Globe className="h-4 w-4 mr-1" />
                            Website
                          </label>
                          {isEditing ? (
                            <input
                              type="url"
                              name="website"
                              value={profileData.website}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <p className="text-sm text-gray-900">
                              {orgData.website ? (
                                <a href={orgData.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                                  {orgData.website}
                                </a>
                              ) : 'Not specified'}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        {isEditing ? (
                          <textarea
                            name="bio"
                            value={profileData.bio}
                            onChange={handleInputChange}
                            rows={3}
                            placeholder="Tell us about your orgData..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <p className="text-sm text-gray-900">{orgData.description || 'No description available'}</p>
                        )}
                      </div>

                      {/* Social Media Links */}
                      {isEditing ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Social Media</label>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Facebook</label>
                              <input
                                type="url"
                                name="socialMedia.facebook"
                                value={profileData.socialMedia?.facebook || ''}
                                onChange={handleInputChange}
                                placeholder="https://facebook.com/yourorg"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Instagram</label>
                              <input
                                type="text"
                                name="socialMedia.instagram"
                                value={profileData.socialMedia?.instagram || ''}
                                onChange={handleInputChange}
                                placeholder="@yourorg"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Twitter</label>
                              <input
                                type="text"
                                name="socialMedia.twitter"
                                value={profileData.socialMedia?.twitter || ''}
                                onChange={handleInputChange}
                                placeholder="@yourorg"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        (orgData.socialMedia?.facebook || orgData.socialMedia?.instagram || orgData.socialMedia?.twitter) && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Social Media</label>
                            <div className="space-y-1">
                              {orgData.socialMedia?.facebook && (
                                <p className="text-sm text-gray-900">
                                  <span className="font-medium">Facebook:</span>{' '}
                                  <a href={orgData.socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                                    {orgData.socialMedia.facebook}
                                  </a>
                                </p>
                              )}
                              {orgData.socialMedia?.instagram && (
                                <p className="text-sm text-gray-900">
                                  <span className="font-medium">Instagram:</span> {orgData.socialMedia.instagram}
                                </p>
                              )}
                              {orgData.socialMedia?.twitter && (
                                <p className="text-sm text-gray-900">
                                  <span className="font-medium">Twitter:</span> {orgData.socialMedia.twitter}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      )}

                      {/* Organization Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          orgData.status === 'active' ? 'bg-green-100 text-green-800' : 
                          orgData.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {orgData.status}
                        </span>
                      </div>
                    </div>
                  ) : (
                    // Student/Admin Profile Information
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                          {isEditing ? (
                            <input
                              type="text"
                              name="name"
                              value={profileData.name}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <p className="text-sm text-gray-900">{profileData.name || 'Not specified'}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Faculty/Type</label>
                          {isEditing ? (
                            <input
                              type="text"
                              name="faculty"
                              value={profileData.faculty}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <p className="text-sm text-gray-900">{profileData.faculty || user?.orgType || 'Not specified'}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                          {isEditing ? (
                            <input
                              type="tel"
                              name="phone"
                              value={profileData.phone}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <p className="text-sm text-gray-900">{profileData.phone || 'Not specified'}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                          {isEditing ? (
                            <input
                              type="url"
                              name="website"
                              value={profileData.website}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <p className="text-sm text-gray-900">
                              {profileData.website ? (
                                <a href={profileData.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                                  {profileData.website}
                                </a>
                              ) : 'Not specified'}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Additional fields for students */}
                      {user?.role === 'student' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Year of Study</label>
                            {isEditing ? (
                              <select
                                name="yearOfStudy"
                                value={profileData.yearOfStudy}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select year</option>
                                <option value="1st Year">1st Year</option>
                                <option value="2nd Year">2nd Year</option>
                                <option value="3rd Year">3rd Year</option>
                                <option value="4th Year">4th Year</option>
                                <option value="Graduate">Graduate</option>
                              </select>
                            ) : (
                              <p className="text-sm text-gray-900">{profileData.yearOfStudy || 'Not specified'}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Interests</label>
                            {isEditing ? (
                              <input
                                type="text"
                                name="interests"
                                value={profileData.interests}
                                onChange={handleInputChange}
                                placeholder="e.g., Technology, Sports, Music"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            ) : (
                              <p className="text-sm text-gray-900">{profileData.interests || 'Not specified'}</p>
                            )}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                        {isEditing ? (
                          <textarea
                            name="bio"
                            value={profileData.bio}
                            onChange={handleInputChange}
                            rows={3}
                            placeholder="Tell us about yourself..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <p className="text-sm text-gray-900">{profileData.bio || 'No bio available'}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="border-t pt-4 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Close
                  </button>
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                      >
                        Save Changes
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;