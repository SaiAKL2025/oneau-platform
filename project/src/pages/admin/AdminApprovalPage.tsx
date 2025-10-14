import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, FileText, Download, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import apiClient from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { PendingApproval, RejectOrganizationRequest, RejectOrganizationResponse, ApproveOrganizationResponse, PendingApprovalsResponse } from '../../types/approval';

const AdminApprovalPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [allowResubmission, setAllowResubmission] = useState(true);
  const [resubmissionDays, setResubmissionDays] = useState(7);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [showApprovedList, setShowApprovedList] = useState(false);
  const [showRejectedList, setShowRejectedList] = useState(false);
  const [approvedApprovals, setApprovedApprovals] = useState<PendingApproval[]>([]);
  const [rejectedApprovals, setRejectedApprovals] = useState<PendingApproval[]>([]);

  useEffect(() => {
    console.log('🔍 AdminApprovalPage - Auth status:', { isAuthenticated, user });

    if (!isAuthenticated) {
      console.log('❌ User not authenticated - cannot load admin data');
      setLoading(false);
      return;
    }

    if (user?.role !== 'admin') {
      console.log('❌ User does not have admin role:', user?.role);
      setLoading(false);
      return;
    }

    console.log('✅ User is authenticated as admin, loading data...');
    loadPendingApprovals();

    // Auto-refresh every 30 seconds to catch new applications
    const interval = setInterval(() => {
      loadPendingApprovals();
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  const loadPendingApprovals = async () => {
    try {
      setLoading(true);
      console.log('Loading pending approvals...');
      const response = await apiClient.getPendingApprovals();
      console.log('API Response:', response);

      if (response.success && (response as any).pendingApprovals) {
        const approvals = (response as any).pendingApprovals as PendingApproval[];
        const stats = (response as any).stats || { pending: 0, approved: 0, rejected: 0 };
        console.log('Setting approvals:', approvals.length, 'items');
        console.log('Setting stats:', stats);
        setPendingApprovals(approvals);
        setStats(stats);
        setLastRefresh(new Date());
      } else {
        console.warn('No pending approvals found or invalid response');
        setPendingApprovals([]);
        setStats({ pending: 0, approved: 0, rejected: 0 });
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error('Error loading pending approvals:', error);
      setPendingApprovals([]);
      setStats({ pending: 0, approved: 0, rejected: 0 });
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  };

  const loadApprovedApprovals = async () => {
    try {
      const response = await apiClient.getApprovedApprovals();
      if (response.success && (response as any).approvedApprovals) {
        setApprovedApprovals((response as any).approvedApprovals);
        setShowApprovedList(true);
      }
    } catch (error) {
      console.error('Error loading approved approvals:', error);
    }
  };

  const loadRejectedApprovals = async () => {
    try {
      const response = await apiClient.getRejectedApprovals();
      if (response.success && (response as any).rejectedApprovals) {
        setRejectedApprovals((response as any).rejectedApprovals);
        setShowRejectedList(true);
      }
    } catch (error) {
      console.error('Error loading rejected approvals:', error);
    }
  };

  const handleApprove = async (approvalId: number) => {
    try {
      console.log('Approving organization:', approvalId);
      const response = await apiClient.approveOrganization(approvalId);
      console.log('Approve response:', response);

      if (response.success) {
        // Update local state
        setPendingApprovals(prev =>
          prev.map(approval =>
            approval.id === approvalId
              ? { ...approval, status: 'approved' }
              : approval
          )
        );
        alert('Organization approved successfully!');
        // Reload data to get updated state
        loadPendingApprovals();
      } else {
        alert('Failed to approve organization: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error approving organization:', error);
      alert('Failed to approve organization: ' + (error as Error).message);
    }
  };

  const handleReject = async () => {
    if (!selectedApproval || !rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      console.log('Rejecting organization:', selectedApproval.id);
      const rejectionData = {
        rejectionReason: rejectionReason,
        allowResubmission,
        resubmissionDeadline: allowResubmission
          ? new Date(Date.now() + resubmissionDays * 24 * 60 * 60 * 1000).toISOString()
          : undefined
      };

      console.log('Rejection data:', rejectionData);
      const response = await apiClient.rejectOrganization(selectedApproval.id, rejectionData);
      console.log('Reject response:', response);

      if (response.success) {
        // Update local state
        setPendingApprovals(prev =>
          prev.map(approval =>
            approval.id === selectedApproval.id
              ? {
                  ...approval,
                  status: 'rejected',
                  rejectionDetails: {
                    reason: rejectionReason,
                    allowResubmission,
                    resubmissionDeadline: allowResubmission ? new Date(Date.now() + resubmissionDays * 24 * 60 * 60 * 1000).toISOString() : undefined,
                    rejectedAt: new Date().toISOString(),
                    rejectedBy: 'Admin'
                  }
                }
              : approval
          )
        );
        setShowRejectModal(false);
        setRejectionReason('');
        alert('Organization rejected successfully!');
        // Reload data to get updated state
        loadPendingApprovals();
      } else {
        alert('Failed to reject organization: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error rejecting organization:', error);
      alert('Failed to reject organization: ' + (error as Error).message);
    }
  };

  const openRejectModal = (approval: PendingApproval) => {
    setSelectedApproval(approval);
    setShowRejectModal(true);
    setRejectionReason('');
    setAllowResubmission(true);
    setResubmissionDays(7);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  // Helper function to get the correct file URL
  const getFileUrl = (fileUrl: string) => {
    console.log('🔍 AdminApprovalPage getFileUrl called with:', fileUrl);
    console.log('🔍 AdminApprovalPage fileUrl type:', typeof fileUrl);
    console.log('🔍 AdminApprovalPage fileUrl starts with http:', fileUrl.startsWith('http'));
    console.log('🔍 AdminApprovalPage fileUrl includes cloudinary:', fileUrl.includes('res.cloudinary.com'));
    
    // If it's already a full URL (Cloudinary), use our proxy route
    if (fileUrl.startsWith('http') && fileUrl.includes('res.cloudinary.com')) {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      // Extract the full path including cloud name, resource type, upload type, version, and public ID
      const cloudinaryRelativePath = fileUrl.split('https://res.cloudinary.com/')[1];
      console.log('🔍 AdminApprovalPage cloudinaryRelativePath:', cloudinaryRelativePath);
      if (cloudinaryRelativePath) {
        const finalUrl = `${apiBaseUrl}/uploads/cloudinary/${cloudinaryRelativePath}?t=${Date.now()}`;
        console.log('🔍 AdminApprovalPage Generated Cloudinary URL:', finalUrl);
        return finalUrl;
      }
      console.log('🔍 AdminApprovalPage Using fallback URL:', fileUrl);
      // Fallback if split fails or URL is malformed
      return fileUrl; 
    }
    
    // If it's a local file, construct the API URL
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const finalUrl = `${apiBaseUrl}/uploads/verification/${encodeURIComponent(fileUrl)}`;
    console.log('🔍 AdminApprovalPage Generated local file URL:', finalUrl);
    return finalUrl;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check authentication and permissions
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">You must be logged in to access the admin dashboard.</p>
          <a
            href="/login"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md"
          >
            Login
          </a>
        </div>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto text-center">
          <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to access the admin dashboard.
            Current role: <strong>{user?.role}</strong>
          </p>
          <a
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md"
          >
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">Organization Approvals</h1>
              <p className="mt-2 text-gray-600">Review and manage organization registration applications</p>
              <p className="mt-1 text-sm text-gray-500">
                Last updated: {lastRefresh.toLocaleTimeString()} • Auto-refreshes every 30 seconds
              </p>
              {user && (
                <p className="mt-1 text-xs text-blue-600">
                  👤 Logged in as: {user.name} ({user.email}) - Role: {user.role}
                </p>
              )}
            </div>
            <button
              onClick={loadPendingApprovals}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </div>
          <div
            className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => loadApprovedApprovals()}
          >
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
                <p className="text-xs text-green-600 mt-1">Click to view</p>
              </div>
            </div>
          </div>
          <div
            className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => loadRejectedApprovals()}
          >
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
                <p className="text-xs text-red-600 mt-1">Click to view</p>
              </div>
            </div>
          </div>
        </div>

        {/* Applications List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Pending Applications</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {pendingApprovals.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No pending applications
              </div>
            ) : (
              Array.isArray(pendingApprovals) && pendingApprovals.map((approval) => (
                <div key={approval.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 className="text-lg font-medium text-gray-900">{approval.registrationData?.name || 'Unknown Organization'}</h3>
                        {getStatusBadge(approval.status)}
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        <p>Applicant: {approval.applicant || 'N/A'}</p>
                        <p>Type: {approval.registrationData?.orgType || 'N/A'}</p>
                        <p>Applied: {approval.date || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setSelectedApproval(approval)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </button>
                      {approval.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(approval.id)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </button>
                          <button
                            onClick={() => openRejectModal(approval)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Details Modal */}
        {selectedApproval && !showRejectModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedApproval.registrationData.name}
                  </h3>
                  <button
                    onClick={() => setSelectedApproval(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                     <h4 className="font-medium text-gray-900 mb-3">Organization Details</h4>
                     <div className="space-y-2 text-sm">
                       <p><span className="font-medium">Name:</span> {selectedApproval.registrationData?.name || 'N/A'}</p>
                       <p><span className="font-medium">Type:</span> {selectedApproval.registrationData?.orgType || 'N/A'}</p>
                       <p><span className="font-medium">President:</span> {selectedApproval.registrationData?.president || 'N/A'}</p>
                       <p><span className="font-medium">Founded:</span> {selectedApproval.registrationData?.founded || 'N/A'}</p>
                       <p><span className="font-medium">Members:</span> {selectedApproval.registrationData?.members || 'N/A'}</p>
                       {selectedApproval.registrationData?.website && (
                         <p><span className="font-medium">Website:</span> {selectedApproval.registrationData.website}</p>
                       )}
                     </div>
                   </div>

                   <div>
                     <h4 className="font-medium text-gray-900 mb-3">Contact Information</h4>
                     <div className="space-y-2 text-sm">
                       <p><span className="font-medium">Email:</span> {selectedApproval.registrationData?.email || 'N/A'}</p>
                       {selectedApproval.registrationData?.socialMedia?.facebook && (
                         <p><span className="font-medium">Facebook:</span> {selectedApproval.registrationData.socialMedia.facebook}</p>
                       )}
                       {selectedApproval.registrationData?.socialMedia?.instagram && (
                         <p><span className="font-medium">Instagram:</span> {selectedApproval.registrationData.socialMedia.instagram}</p>
                       )}
                       {selectedApproval.registrationData?.socialMedia?.twitter && (
                         <p><span className="font-medium">Twitter:</span> {selectedApproval.registrationData.socialMedia.twitter}</p>
                       )}
                     </div>
                   </div>
                 </div>

                 <div className="mt-6">
                   <h4 className="font-medium text-gray-900 mb-3">Description</h4>
                   <p className="text-sm text-gray-600">{selectedApproval.registrationData?.description || 'No description available'}</p>
                 </div>

                 {/* Uploaded File */}
                 {selectedApproval.verificationFile && (
                   <div className="mt-6">
                     <h4 className="font-medium text-gray-900 mb-3">Verification Document</h4>
                     <div className="bg-gray-50 p-4 rounded-lg">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center space-x-3">
                           <div className="flex-shrink-0">
                             <svg className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                             </svg>
                           </div>
                           <div>
                             <p className="text-sm font-medium text-gray-900">
                               {selectedApproval.verificationFile.originalName}
                             </p>
                             <p className="text-xs text-gray-500">
                               {(selectedApproval.verificationFile.size / 1024).toFixed(1)} KB • {selectedApproval.verificationFile.mimetype}
                             </p>
                           </div>
                         </div>
                         <div className="flex space-x-2">
                           <a
                             href={getFileUrl(selectedApproval.verificationFile.url)}
                             target="_blank"
                             rel="noopener noreferrer"
                             onClick={(e) => {
                               const url = getFileUrl(selectedApproval.verificationFile.url);
                               console.log('🔍 AdminApprovalPage View button clicked! URL:', url);
                               console.log('🔍 AdminApprovalPage View button clicked! Original fileUrl:', selectedApproval.verificationFile.url);
                               console.log('🔍 AdminApprovalPage View button clicked! Event target href:', e.currentTarget.href);
                             }}
                             className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                           >
                             <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                             </svg>
                             View File
                           </a>
                           <a
                             href={getFileUrl(selectedApproval.verificationFile.url)}
                             download
                             className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                           >
                             <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                             </svg>
                             Download
                           </a>
                         </div>
                       </div>
                     </div>
                   </div>
                 )}

                {/* Rejection Details */}
                {selectedApproval.status === 'rejected' && selectedApproval.rejectionDetails && (
                  <div className="mt-6 p-4 bg-red-50 rounded-lg">
                    <div className="flex items-start">
                      <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
                      <div>
                        <h4 className="font-medium text-red-900">Rejection Reason</h4>
                        <p className="text-red-800 mt-1">{selectedApproval.rejectionDetails.reason}</p>
                        <p className="text-sm text-red-600 mt-2">
                          Resubmission: {selectedApproval.rejectionDetails.allowResubmission ? 'Allowed' : 'Not Allowed'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Approved Applications List */}
        {showApprovedList && (
          <div className="bg-white shadow rounded-lg mt-8">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Approved Applications</h2>
              <button
                onClick={() => setShowApprovedList(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <div className="divide-y divide-gray-200">
              {approvedApprovals.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  No approved applications
                </div>
              ) : (
                approvedApprovals.map((approval) => (
                  <div key={approval.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h3 className="text-lg font-medium text-gray-900">{approval.registrationData?.name || 'Unknown Organization'}</h3>
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Approved
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          <p>Applicant: {approval.applicant || 'N/A'}</p>
                          <p>Type: {approval.registrationData?.orgType || 'N/A'}</p>
                          <p>Approved: {approval.updatedAt ? new Date(approval.updatedAt).toLocaleDateString() : 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => setSelectedApproval(approval)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Rejected Applications List */}
        {showRejectedList && (
          <div className="bg-white shadow rounded-lg mt-8">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Rejected Applications</h2>
              <button
                onClick={() => setShowRejectedList(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <div className="divide-y divide-gray-200">
              {rejectedApprovals.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  No rejected applications
                </div>
              ) : (
                rejectedApprovals.map((approval) => (
                  <div key={approval.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h3 className="text-lg font-medium text-gray-900">{approval.registrationData?.name || 'Unknown Organization'}</h3>
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <XCircle className="w-3 h-3 mr-1" />
                            Rejected
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          <p>Applicant: {approval.applicant || 'N/A'}</p>
                          <p>Type: {approval.registrationData?.orgType || 'N/A'}</p>
                          <p>Rejected: {approval.updatedAt ? new Date(approval.updatedAt).toLocaleDateString() : 'N/A'}</p>
                          {approval.rejectionDetails && (
                            <p className="text-red-600">Reason: {approval.rejectionDetails.reason}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => setSelectedApproval(approval)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Rejection Modal */}
        {showRejectModal && selectedApproval && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Reject Application</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rejection Reason *
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      rows={4}
                      placeholder="Please provide a detailed reason for rejection..."
                      required
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="allowResubmission"
                      checked={allowResubmission}
                      onChange={(e) => setAllowResubmission(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="allowResubmission" className="ml-2 text-sm text-gray-700">
                      Allow resubmission
                    </label>
                  </div>

                  {allowResubmission && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Resubmission Deadline (days)
                      </label>
                      <select
                        value={resubmissionDays}
                        onChange={(e) => setResubmissionDays(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={7}>7 days</option>
                        <option value={14}>14 days</option>
                        <option value={30}>30 days</option>
                        <option value={60}>60 days</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowRejectModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={!rejectionReason.trim()}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reject Application
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminApprovalPage;