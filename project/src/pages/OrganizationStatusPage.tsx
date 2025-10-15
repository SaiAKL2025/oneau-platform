import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  XCircle,
  Clock,
  Upload,
  FileText,
  AlertTriangle,
  RefreshCw,
  Calendar,
  User,
  Mail,
  Phone,
  ExternalLink,
  Download,
  MessageSquare,
  HelpCircle,
  ChevronRight,
  Info,
  Users
} from 'lucide-react';
import apiClient from '../utils/api';
import { PendingApproval } from '../types/approval';

// Extended interface for OrganizationStatusPage with additional UI fields
interface ExtendedPendingApproval extends PendingApproval {
  rejectionDetails?: PendingApproval['rejectionDetails'] & {
    feedback?: string[];
    improvementSuggestions?: string[];
  };
  submittedDocuments?: Array<{
    type: string;
    name: string;
    status: 'approved' | 'rejected' | 'pending';
    feedback?: string;
  }>;
  timeline?: Array<{
    date: string;
    status: string;
    description: string;
    actor?: string;
  }>;
}

const OrganizationStatusPage = () => {
  const [pendingApproval, setPendingApproval] = useState<ExtendedPendingApproval | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [documentSaved, setDocumentSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkOrganizationStatus = async () => {
      try {
        // Check if we have an approvalId from URL (Google OAuth flow)
        const urlParams = new URLSearchParams(window.location.search);
        const approvalId = urlParams.get('approvalId');
        
        if (approvalId) {
          // Google OAuth flow - fetch status by approvalId
          console.log('Fetching organization status by approvalId:', approvalId);
          const response = await apiClient.getOrganizationStatusById(approvalId);
          
          if (response.success && response.approval) {
            console.log('Organization status fetched by ID:', response.approval);
            setPendingApproval(response.approval as ExtendedPendingApproval);
          } else {
            console.warn('No approval found for ID:', approvalId);
            setError('No application found for this approval ID');
          }
        } else {
          // No approvalId in URL - determine signup approach and fetch accordingly
          const user = localStorage.getItem('user');
          
          if (user) {
            // User is logged in - check if they are a suspended organization
            try {
              const userData = JSON.parse(user);
              console.log('🔍 Logged in user detected:', userData.email, 'Status:', userData.status);
              
              // Clear any old manual signup data to prevent conflicts
              localStorage.removeItem('pendingOrganization');
              console.log('🧹 Cleared manual signup data to prevent conflicts');
              
              // If user is a suspended organization, create a mock approval object
              if (userData.role === 'organization' && userData.status === 'suspended') {
                console.log('🔍 Suspended organization detected, creating mock approval object');
                const mockApproval: ExtendedPendingApproval = {
                  id: userData.id,
                  type: 'organization',
                  name: userData.name || userData.orgName || 'Organization',
                  applicant: userData.email,
                  date: new Date().toISOString().split('T')[0],
                  status: 'suspended',
                  registrationData: {
                    name: userData.name || userData.orgName || '',
                    email: userData.email,
                    orgType: userData.type || userData.orgType || '',
                    description: userData.description || '',
                    president: userData.president || '',
                    founded: userData.founded || '',
                    members: userData.members || 0,
                    website: userData.website || '',
                    socialMedia: {
                      facebook: userData.socialMedia?.facebook || '',
                      instagram: userData.socialMedia?.instagram || '',
                      twitter: userData.socialMedia?.twitter || ''
                    }
                  }
                };
                setPendingApproval(mockApproval);
                return;
              }
              
              // Try to fetch status using the new organization endpoint
              const response = await apiClient.getMyOrganizationStatus();
              
              if (response.success && response.approval) {
                console.log('✅ Organization status fetched for user:', response.approval);
                setPendingApproval(response.approval as ExtendedPendingApproval);
              } else {
                console.warn('❌ No approval found for user');
                setError('No pending application found for your account');
              }
            } catch (parseError) {
              console.error('❌ Error parsing user data:', parseError);
              setError('Invalid user data');
            }
          } else {
            // Manual signup approach: No user logged in, use localStorage
            const storedOrgData = localStorage.getItem('pendingOrganization');
            if (storedOrgData) {
              try {
                const orgData = JSON.parse(storedOrgData);
                console.log('🔍 Manual signup detected, fetching status for email:', orgData.email);

                // Fetch real status from backend
                const response = await apiClient.getOrganizationStatus(orgData.email);

                if (response.success && response.approval) {
                  console.log('✅ Organization status fetched for manual signup:', response.approval);
                  setPendingApproval(response.approval as ExtendedPendingApproval);
                } else {
                  console.warn('⚠️ No backend approval found, using local data for manual signup');
                  // Fallback to local data if no backend data found
                  setPendingApproval({
                    id: 1,
                    type: 'organization',
                    name: orgData.name,
                    applicant: orgData.email,
                    date: new Date().toISOString().split('T')[0],
                    status: 'pending',
                    registrationData: orgData
                  });
                }
              } catch (parseError) {
                console.error('❌ Error parsing manual signup data:', parseError);
                setError('Invalid manual signup data');
              }
            } else {
              // If no pending data and no user logged in, redirect to registration
              console.log('❌ No user logged in and no pending organization data found');
              navigate('/register');
            }
          }
        }
      } catch (error) {
        console.error('Error checking organization status:', error);
        setError('Failed to load organization status');
      } finally {
        setLoading(false);
      }
    };

    checkOrganizationStatus();
  }, [navigate]);

  // Debug rejection details
  useEffect(() => {
    if (pendingApproval) {
      console.log('Pending approval status:', pendingApproval.status);
      console.log('Rejection details:', pendingApproval.rejectionDetails);
      console.log('Allow resubmission:', pendingApproval.rejectionDetails?.allowResubmission);
      console.log('Should show resubmit button:', pendingApproval.status === 'rejected' && pendingApproval.rejectionDetails?.allowResubmission);
    }
  }, [pendingApproval]);

  // Track changes
  useEffect(() => {
    if (pendingApproval && editedData) {
      const originalData = pendingApproval.registrationData;
      const hasDataChanges = JSON.stringify(originalData) !== JSON.stringify(editedData);
      const hasFileChanges = !!selectedFile;
      setHasChanges(hasDataChanges || hasFileChanges);
    } else if (selectedFile) {
      setHasChanges(true);
    } else {
      setHasChanges(false);
    }
  }, [editedData, selectedFile, pendingApproval]);

  const handleEdit = () => {
    if (pendingApproval) {
      setEditedData({ ...pendingApproval.registrationData });
      setSelectedFile(null);
      setFilePreview(null);
      setIsEditing(true);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFilePreview(file.name);
    }
  };

  const handleSave = async () => {
    if (!pendingApproval) return;

    try {
      // Check if this is a suspended organization (mock approval)
      const isSuspendedOrg = pendingApproval.status === 'suspended' && !(pendingApproval as any)._id;
      
      if (isSuspendedOrg) {
        // Handle suspended organization updates
        console.log('Updating suspended organization data');
        console.log('Selected file:', selectedFile);
        console.log('Edited data:', editedData);

        if (!editedData && !selectedFile) {
          alert('Please make some changes before saving.');
          return;
        }

        // Get current user data
        const user = localStorage.getItem('user');
        if (!user) {
          alert('User session expired. Please log in again.');
          return;
        }

        const userData = JSON.parse(user);
        const orgId = userData.id;

        // Prepare update data for organization
        const updateData: any = {};
        if (editedData) {
          updateData.name = editedData.name;
          updateData.type = editedData.orgType;
          updateData.description = editedData.description;
          updateData.president = editedData.president;
          updateData.founded = editedData.founded;
          updateData.members = editedData.members;
          updateData.website = editedData.website;
        }

        // Update organization via API
        const response = await apiClient.updateOrganization(orgId, updateData);

        if (response.success) {
          // Update local user data
          const updatedUserData = {
            ...userData,
            ...updateData,
            orgName: editedData?.name || userData.orgName,
            orgType: editedData?.orgType || userData.orgType,
            description: editedData?.description || userData.description,
            president: editedData?.president || userData.president,
            founded: editedData?.founded || userData.founded,
            members: editedData?.members || userData.members,
            website: editedData?.website || userData.website
          };
          
          localStorage.setItem('user', JSON.stringify(updatedUserData));
          
          // Update the mock approval object
          const updatedApproval = {
            ...pendingApproval,
            registrationData: {
              ...pendingApproval.registrationData,
              ...editedData
            }
          };
          
          setPendingApproval(updatedApproval);
          setIsEditing(false);
          setEditedData(null);
          setSelectedFile(null);
          setFilePreview(null);
          setDocumentSaved(true);

          alert('Organization information updated successfully! Your changes have been saved and will be reviewed by administrators.');
        } else {
          alert('Failed to update organization: ' + (response.message || 'Unknown error'));
        }
      } else {
        // Handle pending approval updates (existing logic)
        const mongoId = (pendingApproval as any)._id;
        console.log('Updating approval with MongoDB ID:', mongoId);
        console.log('Selected file:', selectedFile);
        console.log('Edited data:', editedData);

        // Determine what to update based on what's being edited
        let updateData: any = {};
        let updateMessage = '';

        if (editedData && selectedFile) {
          // Both details and file are being updated
          updateData = { registrationData: editedData };
          updateMessage = 'Application details and verification document updated successfully!';
          console.log('Updating both data and file');
        } else if (editedData) {
          // Only details are being updated
          updateData = { registrationData: editedData };
          updateMessage = 'Application details updated successfully!';
          console.log('Updating only data');
        } else if (selectedFile) {
          // Only file is being updated
          updateData = {}; // Empty data, just the file
          updateMessage = 'Verification document updated successfully!';
          console.log('Updating only file');
        } else {
          // No changes to save
          console.log('No changes to save');
          alert('Please make some changes before saving.');
          return;
        }

        console.log('Final update data:', updateData);
        console.log('File to upload:', selectedFile?.name);

        // Update the application in the backend with file support
        const response = await apiClient.updatePendingApprovalWithFile(mongoId, updateData, selectedFile || undefined);

        if (response.success) {
          // Update local state with the new data
          const updatedApproval = {
            ...pendingApproval,
            status: 'pending' as const, // Reset to pending for re-review
            updatedAt: new Date().toISOString(),
          };

          // Update registration data if it was edited
          if (editedData) {
            updatedApproval.registrationData = editedData;
          }

          // Update verification file if a new one was uploaded
          if (selectedFile && response.approval?.verificationFile) {
            updatedApproval.verificationFile = response.approval.verificationFile;
            console.log('✅ Frontend file updated:', response.approval.verificationFile.originalName);
          }

          setPendingApproval(updatedApproval);
          setIsEditing(false);
          setEditedData(null);
          setSelectedFile(null);
          setFilePreview(null);
          setDocumentSaved(true);

          // Immediately fetch updated data from backend instead of page reload
          try {
            const response = await apiClient.getMyOrganizationStatus();
            if (response.success && response.approval) {
              setPendingApproval(response.approval as ExtendedPendingApproval);
              console.log('✅ Frontend data refreshed with latest backend data');
            }
          } catch (refreshError) {
            console.error('❌ Error refreshing data:', refreshError);
            // Fallback to page reload if API call fails
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          }

          alert(updateMessage + ' The page will refresh to show your updated information.');
        } else {
          alert('Failed to update application: ' + (response.message || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Failed to save changes. Please try again.');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedData(null);
    setSelectedFile(null);
    setFilePreview(null);
    setHasChanges(false);
  };

  const handleResubmitApplication = async () => {
    if (!pendingApproval) return;

    try {
      // Use the MongoDB _id field
      const mongoId = (pendingApproval as any)._id;
      console.log('Resubmitting approval with MongoDB ID:', mongoId);

      // Resubmit the application (no file changes, just status update)
      const response = await apiClient.updatePendingApproval(mongoId, {
        // No data changes, just trigger resubmission
      });

      if (response.success) {
        // Update local state
        setPendingApproval({
          ...pendingApproval,
          status: 'pending' as const,
          updatedAt: new Date().toISOString(),
        });
        setDocumentSaved(false);
        alert('Application resubmitted successfully! It will be reviewed again by an administrator.');
      } else {
        alert('Failed to resubmit application: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error resubmitting application:', error);
      alert('Failed to resubmit application. Please try again.');
    }
  };

  const handleResubmit = () => {
    console.log('Resubmit button clicked');
    console.log('Pending approval:', pendingApproval);
    console.log('Rejection details:', pendingApproval?.rejectionDetails);
    console.log('Allow resubmission:', pendingApproval?.rejectionDetails?.allowResubmission);

    if (pendingApproval?.rejectionDetails?.allowResubmission) {
      console.log('Enabling edit mode for resubmission');
      // Enable edit mode for inline resubmission
      setIsEditing(true);
    } else {
      console.log('Resubmission not allowed, navigating to register');
      // If resubmission not allowed, go to register page
      localStorage.removeItem('pendingOrganization');
      navigate('/register');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading organization status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            to="/register"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md"
          >
            Back to Registration
          </Link>
        </div>
      </div>
    );
  }

  if (!pendingApproval) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Pending Application</h2>
          <p className="text-gray-600 mb-4">You don't have any pending organization applications.</p>
          <Link
            to="/register"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md"
          >
            Register Organization
          </Link>
        </div>
      </div>
    );
  }

  const getStatusIcon = () => {
    switch (pendingApproval.status) {
      case 'approved':
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-16 w-16 text-red-500" />;
      case 'suspended':
        return <AlertTriangle className="h-16 w-16 text-orange-500" />;
      default:
        return <Clock className="h-16 w-16 text-blue-500" />;
    }
  };

  const getStatusColor = () => {
    switch (pendingApproval.status) {
      case 'approved':
        return 'text-green-600';
      case 'rejected':
        return 'text-red-600';
      case 'suspended':
        return 'text-orange-600';
      default:
        return 'text-blue-600';
    }
  };

  const getStatusBg = () => {
    switch (pendingApproval.status) {
      case 'approved':
        return 'bg-green-50 border-green-200';
      case 'rejected':
        return 'bg-red-50 border-red-200';
      case 'suspended':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  // Build timeline from real data
  const timeline = [
    {
      date: pendingApproval.date,
      status: 'submitted',
      description: 'Application submitted successfully',
      actor: pendingApproval.applicant
    },
    ...(pendingApproval.updatedAt && pendingApproval.updatedAt !== pendingApproval.date ? [{
      date: new Date(pendingApproval.updatedAt).toISOString().split('T')[0],
      status: 'resubmitted',
      description: 'Application resubmitted for review',
      actor: pendingApproval.applicant
    }] : []),
    ...(pendingApproval.status !== 'pending' ? [{
      date: pendingApproval.updatedAt ? new Date(pendingApproval.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: pendingApproval.status,
      description: pendingApproval.status === 'approved' ? 'Application approved successfully' : 'Application reviewed and feedback provided',
      actor: pendingApproval.rejectionDetails?.rejectedBy || 'Admin Team'
    }] : [])
  ];

  // Use real document data if available, otherwise show uploaded file info
  const documents = pendingApproval.verificationFile ? [
    {
      type: 'Verification Document',
      name: pendingApproval.verificationFile.originalName || 'Uploaded File',
      status: 'submitted' as const,
      fileUrl: pendingApproval.verificationFile.url,
      fileSize: pendingApproval.verificationFile.size,
      mimeType: pendingApproval.verificationFile.mimetype
    }
  ] : [];

  // Helper function to get the correct file URL
  const getFileUrl = (fileUrl: string) => {
    console.log('🔍 OrganizationStatusPage getFileUrl called with:', fileUrl);
    console.log('🔍 OrganizationStatusPage fileUrl type:', typeof fileUrl);
    console.log('🔍 OrganizationStatusPage fileUrl starts with http:', fileUrl.startsWith('http'));
    console.log('🔍 OrganizationStatusPage fileUrl includes cloudinary:', fileUrl.includes('res.cloudinary.com'));
    
    // If it's already a full URL (Cloudinary), use our proxy route
    if (fileUrl.startsWith('http') && fileUrl.includes('res.cloudinary.com')) {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      // Extract the full path including cloud name, resource type, upload type, version, and public ID
      const cloudinaryRelativePath = fileUrl.split('https://res.cloudinary.com/')[1];
      console.log('🔍 OrganizationStatusPage cloudinaryRelativePath:', cloudinaryRelativePath);
      if (cloudinaryRelativePath) {
        const finalUrl = `${apiBaseUrl}/uploads/cloudinary/${cloudinaryRelativePath}?t=${Date.now()}`;
        console.log('🔍 OrganizationStatusPage Generated Cloudinary URL:', finalUrl);
        return finalUrl;
      }
      // Fallback if split fails or URL is malformed
      console.log('🔍 OrganizationStatusPage Using fallback URL:', fileUrl);
      return fileUrl; 
    }
    
    // If it's a local file, construct the API URL
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const finalUrl = `${apiBaseUrl}/uploads/verification/${encodeURIComponent(fileUrl)}`;
    console.log('🔍 OrganizationStatusPage Generated local file URL:', finalUrl);
    return finalUrl;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center">
            <img src="/image copy copy.png" alt="OneAU Logo" className="h-16 w-auto" />
          </div>
          <h1 className="mt-6 text-3xl font-bold text-gray-900">Organization Registration Status</h1>
          <p className="mt-2 text-gray-600">Complete tracking and feedback for your application</p>
        </div>

        {/* Status Overview */}
        <div className={`rounded-lg border p-6 mb-6 ${getStatusBg()}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {getStatusIcon()}
              <div className="ml-4">
                <h2 className={`text-2xl font-bold ${getStatusColor()}`}>
                  {pendingApproval.status === 'pending' && 'Application Under Review'}
                  {pendingApproval.status === 'approved' && 'Application Approved!'}
                  {pendingApproval.status === 'rejected' && 'Application Requires Revision'}
                  {pendingApproval.status === 'suspended' && 'Organization Suspended'}
                </h2>
                <p className="mt-1 text-gray-600">
                  {pendingApproval.status === 'pending' && 'Your application is being carefully reviewed by our administrative team.'}
                  {pendingApproval.status === 'approved' && 'Congratulations! Your organization has been approved and is now active.'}
                  {pendingApproval.status === 'rejected' && 'Your application needs some revisions before it can be approved.'}
                  {pendingApproval.status === 'suspended' && 'Your organization has been suspended. Please update your information and wait for admin approval to reactivate.'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Application ID</p>
              <p className="text-lg font-semibold text-gray-900">#{pendingApproval.id.toString().padStart(4, '0')}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Application Timeline */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-blue-500" />
                Application Timeline
              </h3>
              <div className="space-y-4">
                {timeline.map((event, index) => (
                  <div key={index} className="flex items-start">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      event.status === 'submitted' ? 'bg-blue-100 text-blue-600' :
                      event.status === 'under_review' ? 'bg-yellow-100 text-yellow-600' :
                      event.status === 'rejected' ? 'bg-red-100 text-red-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      {event.status === 'submitted' && <Upload className="h-5 w-5" />}
                      {event.status === 'under_review' && <Clock className="h-5 w-5" />}
                      {event.status === 'rejected' && <XCircle className="h-5 w-5" />}
                      {event.status === 'approved' && <CheckCircle className="h-5 w-5" />}
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{event.description}</p>
                        <p className="text-sm text-gray-500">{new Date(event.date).toLocaleDateString()}</p>
                      </div>
                      {event.actor && (
                        <p className="text-sm text-gray-600">by {event.actor}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Organization Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-500" />
                  Application Details
                </h3>
                {(pendingApproval?.status === 'rejected' && pendingApproval?.rejectionDetails?.allowResubmission) || pendingApproval?.status === 'suspended' && (
                  <div className="flex space-x-2">
                    {!isEditing ? (
                      <button
                        onClick={handleEdit}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                      >
                        Edit Details
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handleSave}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                        >
                          Save Details
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Organization Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedData?.name || ''}
                        onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    ) : (
                      <p className="mt-1 text-gray-900">{pendingApproval.registrationData.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Organization Type</label>
                    {isEditing ? (
                      <select
                        value={editedData?.orgType || ''}
                        onChange={(e) => setEditedData({ ...editedData, orgType: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="">Select organization type</option>
                        <option value="Academic Club">Academic Club</option>
                        <option value="Sports Club">Sports Club</option>
                        <option value="Cultural Club">Cultural Club</option>
                        <option value="Religious Club">Religious Club</option>
                        <option value="Volunteer Group">Volunteer Group</option>
                        <option value="Student Government">Student Government</option>
                        <option value="Faculty Community">Faculty Community</option>
                        <option value="Department Association">Department Association</option>
                        <option value="Professional Society">Professional Society</option>
                        <option value="Research Group">Research Group</option>
                        <option value="Debate Society">Debate Society</option>
                        <option value="Model United Nations">Model United Nations</option>
                        <option value="Entrepreneurship Club">Entrepreneurship Club</option>
                        <option value="Technology Club">Technology Club</option>
                        <option value="Art Society">Art Society</option>
                        <option value="Music Club">Music Club</option>
                        <option value="Dance Club">Dance Club</option>
                        <option value="Theater Group">Theater Group</option>
                        <option value="Photography Club">Photography Club</option>
                        <option value="Film Society">Film Society</option>
                        <option value="Language Exchange">Language Exchange</option>
                        <option value="International Students Association">International Students Association</option>
                        <option value="Environmental Club">Environmental Club</option>
                        <option value="Health and Wellness Club">Health and Wellness Club</option>
                        <option value="Mental Health Support Group">Mental Health Support Group</option>
                        <option value="LGBTQ+ Alliance">LGBTQ+ Alliance</option>
                        <option value="Women's Society">Women's Society</option>
                        <option value="Alumni Association">Alumni Association</option>
                        <option value="Career Development Club">Career Development Club</option>
                        <option value="Investment Club">Investment Club</option>
                        <option value="Gaming Club">Gaming Club</option>
                        <option value="Book Club">Book Club</option>
                        <option value="Cooking Club">Cooking Club</option>
                        <option value="Travel Club">Travel Club</option>
                        <option value="Chess Club">Chess Club</option>
                        <option value="Robotics Club">Robotics Club</option>
                        <option value="AI and Machine Learning Club">AI and Machine Learning Club</option>
                        <option value="Cybersecurity Club">Cybersecurity Club</option>
                        <option value="Data Science Society">Data Science Society</option>
                        <option value="Blockchain Club">Blockchain Club</option>
                        <option value="Startup Incubator">Startup Incubator</option>
                        <option value="Social Impact Organization">Social Impact Organization</option>
                        <option value="Community Service Group">Community Service Group</option>
                        <option value="Disaster Relief Organization">Disaster Relief Organization</option>
                        <option value="Animal Welfare Group">Animal Welfare Group</option>
                        <option value="Children's Support Group">Children's Support Group</option>
                        <option value="Elderly Care Group">Elderly Care Group</option>
                        <option value="Disability Support Group">Disability Support Group</option>
                        <option value="Other">Other</option>
                      </select>
                    ) : (
                      <p className="mt-1 text-gray-900">{pendingApproval.registrationData.orgType}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">President</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedData?.president || ''}
                        onChange={(e) => setEditedData({ ...editedData, president: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Full name of the organization president"
                      />
                    ) : (
                      <p className="mt-1 text-gray-900 flex items-center">
                        <User className="h-4 w-4 mr-2 text-gray-400" />
                        {pendingApproval.registrationData.president}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Founded Year</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedData?.founded || ''}
                        onChange={(e) => setEditedData({ ...editedData, founded: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., 2020"
                      />
                    ) : (
                      <p className="mt-1 text-gray-900 flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {pendingApproval.registrationData.founded}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Member Count</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editedData?.members || ''}
                        onChange={(e) => setEditedData({ ...editedData, members: parseInt(e.target.value) || 0 })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Number of members"
                        min="1"
                      />
                    ) : (
                      <p className="mt-1 text-gray-900">{pendingApproval.registrationData.members} members</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Application Date</label>
                    <p className="mt-1 text-gray-900">{new Date(pendingApproval.date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contact Email</label>
                    <p className="mt-1 text-gray-900 flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      {pendingApproval.registrationData.email}
                    </p>
                  </div>
                  {pendingApproval.registrationData.website && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Website</label>
                      <a
                        href={pendingApproval.registrationData.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {pendingApproval.registrationData.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                {isEditing ? (
                  <textarea
                    value={editedData?.description || ''}
                    onChange={(e) => setEditedData({ ...editedData, description: e.target.value })}
                    rows={3}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Brief description of your organization..."
                  />
                ) : (
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-md">{pendingApproval.registrationData.description}</p>
                )}
              </div>

            </div>

            {/* Document Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Upload className="h-5 w-5 mr-2 text-blue-500" />
                  Submitted Documents
                </h3>
                {pendingApproval?.status === 'rejected' && pendingApproval?.rejectionDetails?.allowResubmission && !isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    Edit Document
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {documents.length > 0 ? (
                  documents.map((doc, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-md">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                            <p className="text-xs text-gray-600">{doc.type}</p>
                            {doc.fileSize && (
                              <p className="text-xs text-gray-500">
                                {(doc.fileSize / 1024).toFixed(1)} KB • {doc.mimeType}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <Upload className="h-3 w-3 mr-1" />
                            Submitted
                          </span>
                          {doc.fileUrl && (
                            <a
                              href={getFileUrl(doc.fileUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => {
                                const url = getFileUrl(doc.fileUrl);
                                console.log('🔍 View button clicked! URL:', url);
                                console.log('🔍 View button clicked! Original fileUrl:', doc.fileUrl);
                                console.log('🔍 View button clicked! Event target href:', e.currentTarget.href);
                              }}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              View
                            </a>
                          )}
                        </div>
                      </div>

                      {/* File Upload Section - Only show in edit mode */}
                      {isEditing && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Replace Verification Document</label>
                          <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                onChange={handleFileChange}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                              />
                            </div>
                            {filePreview && (
                              <div className="flex items-center space-x-2 text-sm text-green-600">
                                <Upload className="h-4 w-4" />
                                <span>New file selected: {filePreview}</span>
                              </div>
                            )}
                            <div className="text-sm text-gray-500">
                              <p className="text-xs">Select a new file to replace the current verification document, or leave empty to keep the current file.</p>
                            </div>
                            <div className="flex space-x-2 pt-2">
                              <button
                                onClick={handleSave}
                                disabled={!hasChanges}
                                className={`px-3 py-1 text-white rounded-md text-sm ${
                                  hasChanges
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-gray-400 cursor-not-allowed'
                                }`}
                              >
                                {hasChanges ? 'Save Changes' : 'No Changes'}
                              </button>
                              <button
                                onClick={handleCancel}
                                className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Resubmit Application Button - Show after document is saved */}
                      {documentSaved && !isEditing && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="bg-green-50 border border-green-200 rounded-md p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-sm font-medium text-green-800">Document Updated Successfully</h4>
                                <p className="text-sm text-green-700 mt-1">Your verification document has been saved. Click below to resubmit your application for review.</p>
                              </div>
                              <button
                                onClick={handleResubmitApplication}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                              >
                                Resubmit Application
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No documents submitted</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Rejection Details */}
            {pendingApproval.status === 'rejected' && pendingApproval.rejectionDetails && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-start mb-4">
                  <AlertTriangle className="h-6 w-6 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-lg font-semibold text-red-900">Application Feedback</h4>
                    <p className="text-red-800 mt-1">{pendingApproval.rejectionDetails.reason}</p>
                  </div>
                </div>

                {/* Show rejection details if available */}
                {pendingApproval.rejectionDetails && (
                  <div className="bg-white rounded-lg p-4 mb-4">
                    <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                      <Info className="h-4 w-4 mr-2 text-blue-500" />
                      Rejection Details
                    </h5>
                    <div className="space-y-2 text-sm">
                      <p><strong>Reason:</strong> {pendingApproval.rejectionDetails.reason}</p>
                      <p><strong>Rejected By:</strong> {pendingApproval.rejectionDetails.rejectedBy}</p>
                      <p><strong>Rejected At:</strong> {new Date(pendingApproval.rejectionDetails.rejectedAt).toLocaleString()}</p>
                      {pendingApproval.rejectionDetails.resubmissionDeadline && (
                        <p><strong>Resubmission Deadline:</strong> {new Date(pendingApproval.rejectionDetails.resubmissionDeadline).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Resubmission Info */}
                {pendingApproval.rejectionDetails.allowResubmission ? (
                  <div className="bg-white rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-gray-900">Resubmission Available</h5>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Allowed
                      </span>
                    </div>
                    {pendingApproval.rejectionDetails.resubmissionDeadline && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-1">Deadline:</p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(pendingApproval.rejectionDetails.resubmissionDeadline).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {Math.ceil((new Date(pendingApproval.rejectionDetails.resubmissionDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days remaining
                        </p>
                      </div>
                    )}
                    <button
                      onClick={handleResubmit}
                      className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Resubmit Application
                    </button>
                  </div>
                ) : (
                  <div className="bg-gray-100 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-2">Resubmission Not Available</h5>
                    <p className="text-sm text-gray-600 mb-3">
                      This application cannot be resubmitted at this time.
                    </p>
                    <div className="text-center">
                      <button className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Contact Support
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Contact Support */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <HelpCircle className="h-5 w-5 mr-2 text-blue-500" />
                Need Help?
              </h3>
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <Mail className="h-4 w-4 text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Email Support</p>
                    <p className="text-gray-600">auso@au.edu</p>
                  </div>
                </div>
                <div className="flex items-center text-sm">
                  <Phone className="h-4 w-4 text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Phone Support</p>
                    <p className="text-gray-600">+66 2 723 2323</p>
                  </div>
                </div>
                <div className="flex items-center text-sm">
                  <Clock className="h-4 w-4 text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Office Hours</p>
                    <p className="text-gray-600">Mon-Fri 9:00-17:00</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {pendingApproval.status === 'approved' && (
                  <Link
                    to="/login"
                    className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Access Dashboard
                  </Link>
                )}

                {pendingApproval.status === 'pending' && (
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Status
                  </button>
                )}

                {pendingApproval.status === 'rejected' && pendingApproval.rejectionDetails?.allowResubmission && (
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Data
                  </button>
                )}

                {pendingApproval?.status === 'rejected' && !pendingApproval?.rejectionDetails?.allowResubmission && (
                  <Link
                    to="/register"
                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Back to Register Page
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationStatusPage;