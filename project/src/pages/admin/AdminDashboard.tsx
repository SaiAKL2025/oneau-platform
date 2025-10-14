import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useData } from '../../contexts/DataContext';
import apiClient from '../../utils/api';
import { Home, Users, Building2, FileText, BarChart3, Settings, CheckCircle, XCircle, Eye, Calendar, Bell, TrendingUp, Shield, Download, Upload, Search, Filter, X } from 'lucide-react';
import AdminApprovalPage from './AdminApprovalPage';
import { getImageUrl, handleImageError } from '../../utils/imageUtils';
import { getEventStatus } from '../../utils/eventStatus';

// Admin Dashboard Components
const AdminHome = () => {
  const {
    organizations,
    events,
    users,
    loadAuthenticatedData
  } = useData();

  const [studentsCount, setStudentsCount] = useState(0);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  // Fetch students count for dashboard
  React.useEffect(() => {
    const fetchStudentsCount = async () => {
      try {
        const response = await apiClient.getStudents();
        if (response.success && response.data) {
          const studentsData = Array.isArray(response.data) ? response.data : [];
          setStudentsCount(studentsData.length);
        }
      } catch (error) {
        console.error('Error fetching students count:', error);
      }
    };

    fetchStudentsCount();
  }, []);

  // Fetch recent activities
  React.useEffect(() => {
    const fetchRecentActivities = async () => {
      try {
        const response = await apiClient.get('/activities/recent?limit=5');
        if (response.success) {
          setRecentActivities(response.activities);
        }
      } catch (error) {
        console.error('Error fetching recent activities:', error);
      }
    };

    fetchRecentActivities();
  }, []);

  // Fetch pending approvals count (including suspended organizations)
  React.useEffect(() => {
    const fetchPendingApprovalsCount = async () => {
      try {
        const response = await apiClient.getPendingApprovals();
        if (response.success && response.pendingApprovals) {
          setPendingApprovalsCount(response.pendingApprovals.length);
        }
      } catch (error) {
        console.error('Error fetching pending approvals count:', error);
      }
    };

    fetchPendingApprovalsCount();
  }, []);

  const stats = {
    totalStudents: studentsCount,
    totalOrganizations: organizations.filter(o => o.status === 'active').length,
    totalEvents: events.filter(e => e.status === 'active').length,
    pendingApprovals: pendingApprovalsCount
  };

  // Format recent activities for display
  const formatActivity = (activity: any) => {
    const timeAgo = new Date(activity.createdAt).toLocaleString();
    return {
      id: activity.id,
      type: activity.type,
      message: activity.description,
      time: timeAgo
    };
  };

  const recentActivity = recentActivities.map(formatActivity);

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Admin Dashboard</h2>
        <p className="text-purple-100">Manage the OneAU platform and community</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          to="/admin/approvals"
          className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Approvals</h3>
              <p className="text-sm text-gray-600">{stats.pendingApprovals} pending applications</p>
            </div>
          </div>
        </Link>
        <Link
          to="/admin/organizations"
          className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <Building2 className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Organizations</h3>
              <p className="text-sm text-gray-600">{stats.totalOrganizations} active organizations</p>
            </div>
          </div>
        </Link>
        <Link
          to="/admin/students"
          className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Students</h3>
              <p className="text-sm text-gray-600">{stats.totalStudents} registered students</p>
            </div>
          </div>
        </Link>
        <Link
          to="/admin/events"
          className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-orange-500" />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Events</h3>
              <p className="text-sm text-gray-600">{stats.totalEvents} active events</p>
            </div>
          </div>
        </Link>
        <Link
          to="/admin/analytics"
          className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <BarChart3 className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Analytics</h3>
              <p className="text-sm text-gray-600">View platform statistics</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-2 w-2 bg-purple-500 rounded-full mt-2"></div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

const AdminApprovals = () => {
  const { users } = useData();
  const navigate = useNavigate();
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectionModal, setRejectionModal] = useState<{
    isOpen: boolean;
    approvalId: number | null;
    rejectionReason: string;
    allowResubmission: boolean;
    resubmissionDeadline: string;
  }>({
    isOpen: false,
    approvalId: null,
    rejectionReason: '',
    allowResubmission: true,
    resubmissionDeadline: ''
  });

  // Fetch pending approvals from API
  React.useEffect(() => {
    const fetchPendingApprovals = async () => {
      try {
        const response = await apiClient.getPendingApprovals();
        if (response.success && (response as any).pendingApprovals) {
          setPendingApprovals((response as any).pendingApprovals as any[]);
        }
      } catch (error) {
        console.error('Error fetching pending approvals:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingApprovals();
  }, []);

  const handleApproval = async (id: number, action: string) => {
    if (action === 'approve') {
      try {
        const response = await apiClient.approveOrganization(id);

        if (response.success) {
          // Update local state to reflect the approval
          setPendingApprovals(prev =>
            prev.map(approval =>
              approval.id === id
                ? { ...approval, status: 'approved' }
                : approval
            )
          );
          alert('Organization approved successfully!');
        } else {
          alert(response.message || 'Failed to approve organization.');
        }
      } catch (error) {
        console.error('Error approving organization:', error);
        alert('Failed to approve organization. Please try again.');
      }
    } else {
      // Open rejection modal instead of immediate rejection
      setRejectionModal({
        isOpen: true,
        approvalId: id,
        rejectionReason: '',
        allowResubmission: true,
        resubmissionDeadline: ''
      });
    }
  };

  const handleRejectApplication = async () => {
    const { approvalId, rejectionReason, allowResubmission, resubmissionDeadline } = rejectionModal;

    if (!approvalId || !rejectionReason.trim()) {
      alert('Please provide a rejection reason.');
      return;
    }

    // Validate deadline if resubmission is allowed
    if (allowResubmission && resubmissionDeadline) {
      const deadline = new Date(resubmissionDeadline);
      const now = new Date();
      if (deadline <= now) {
        alert('Resubmission deadline cannot be in the past.');
        return;
      }
    }

    try {
      const response = await apiClient.rejectOrganization(approvalId, {
        rejectionReason: rejectionReason.trim(),
        allowResubmission,
        resubmissionDeadline: allowResubmission && resubmissionDeadline ? resubmissionDeadline : undefined
      });

      if (response.success) {
        // Update local state to reflect the rejection
        setPendingApprovals(prev =>
          prev.map(approval =>
            approval.id === approvalId
              ? { ...approval, status: 'rejected' }
              : approval
          )
        );

        alert('Application rejected successfully with feedback provided.');
      } else {
        alert(response.message || 'Failed to reject application.');
      }
    } catch (error) {
      console.error('Error rejecting application:', error);
      alert('Failed to reject application. Please try again.');
    }

    // Close modal and reset state
    setRejectionModal({
      isOpen: false,
      approvalId: null,
      rejectionReason: '',
      allowResubmission: true,
      resubmissionDeadline: ''
    });
  };

  const handleViewOrganization = (orgId: number) => {
    navigate(`/student/organization/${orgId}`);
  };

  const closeRejectionModal = () => {
    setRejectionModal({
      isOpen: false,
      approvalId: null,
      rejectionReason: '',
      allowResubmission: true,
      resubmissionDeadline: ''
    });
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <h2 className="text-xl font-semibold text-gray-900">Pending Approvals</h2>
        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading pending approvals...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Pending Approvals</h2>

      <div className="bg-white rounded-lg shadow">
        {pendingApprovals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingApprovals.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        item.type === 'organization' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      {item.orgId && (
                        <button
                          onClick={() => handleViewOrganization(item.orgId!)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          View Details
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.applicant}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(item.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        item.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {item.status === 'pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApproval(item.id, 'approve')}
                            className="text-green-600 hover:text-green-900 flex items-center"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleApproval(item.id, 'reject')}
                            className="text-red-600 hover:text-red-900 flex items-center"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No pending approvals</p>
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {rejectionModal.isOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Reject Application</h3>
                <button
                  onClick={closeRejectionModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Rejection Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectionModal.rejectionReason}
                    onChange={(e) => setRejectionModal(prev => ({
                      ...prev,
                      rejectionReason: e.target.value
                    }))}
                    placeholder="Please provide a detailed reason for rejection..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 resize-none"
                    rows={4}
                    required
                  />
                </div>

                {/* Allow Resubmission Checkbox */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="allowResubmission"
                    checked={rejectionModal.allowResubmission}
                    onChange={(e) => setRejectionModal(prev => ({
                      ...prev,
                      allowResubmission: e.target.checked,
                      resubmissionDeadline: e.target.checked ? prev.resubmissionDeadline : ''
                    }))}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <label htmlFor="allowResubmission" className="ml-2 text-sm text-gray-700">
                    Allow resubmission
                  </label>
                </div>

                {/* Resubmission Deadline */}
                {rejectionModal.allowResubmission && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Resubmission Deadline
                    </label>
                    <input
                      type="date"
                      value={rejectionModal.resubmissionDeadline}
                      onChange={(e) => setRejectionModal(prev => ({
                        ...prev,
                        resubmissionDeadline: e.target.value
                      }))}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Optional: Leave empty to allow resubmission at any time
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={closeRejectionModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectApplication}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                >
                  Reject Application
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminOrganizations = () => {
  const { organizations, updateOrganization } = useData();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('name-asc');
  const [selectedOrganization, setSelectedOrganization] = useState<any>(null);
  const [showOrgModal, setShowOrgModal] = useState(false);

  const handleViewOrganization = (orgId: number) => {
    const organization = organizations.find(o => o.id === orgId);
    if (organization) {
      setSelectedOrganization(organization);
      setShowOrgModal(true);
    }
  };

  const handleSuspendOrganization = (orgId: number) => {
    if (window.confirm('Are you sure you want to suspend this organization?')) {
      updateOrganization(orgId, { status: 'suspended' });
    }
  };

  const handleActivateOrganization = (orgId: number) => {
    updateOrganization(orgId, { status: 'active' });
  };

  // Filter and sort organizations
  const filteredOrganizations = organizations
    .filter(org =>
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.type.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortOrder) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'type-asc':
          return a.type.localeCompare(b.type);
        case 'type-desc':
          return b.type.localeCompare(a.type);
        case 'followers-desc':
          return (b.followers || 0) - (a.followers || 0);
        case 'created-desc':
          return new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime();
        default:
          return 0;
      }
    });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Organizations Management</h2>
        <div className="text-sm text-gray-600">
          Showing: {filteredOrganizations.length} of {organizations.length} organizations
        </div>
      </div>

      {/* Search and Sort Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search organizations by name or type..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="type-asc">Type A-Z</option>
              <option value="type-desc">Type Z-A</option>
              <option value="followers-desc">Most Followers</option>
              <option value="created-desc">Recently Created</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Members</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrganizations.map((org) => (
                <tr key={org.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {org.profileImage ? (
                          <img
                            src={`http://localhost:5000/api/users/images/${org.profileImage}`}
                            alt={org.name}
                            className="h-8 w-8 rounded-full object-cover border-2 border-gray-200"
                            onError={(e) => {
                              // Fallback to gradient background if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `
                                  <div class="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center border-2 border-gray-200">
                                    <span class="text-white text-sm font-medium">${org.name.charAt(0)}</span>
                                  </div>
                                `;
                              }
                            }}
                          />
                        ) : (
                          <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center border-2 border-gray-200">
                            <span className="text-white text-sm font-medium">
                              {org.name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{org.name}</div>
                        <div className="text-sm text-gray-500">{org.followers} followers</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {org.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {org.members || org.followers}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      org.status === 'active' ? 'bg-green-100 text-green-800' : 
                      org.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {org.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {org.created ? new Date(org.created).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleViewOrganization(org.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Organization"
                      >
                        View
                      </button>
                      {org.status === 'active' ? (
                        <button 
                          onClick={() => handleSuspendOrganization(org.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Suspend"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleActivateOrganization(org.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Activate"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Organization Detail Modal */}
      {showOrgModal && selectedOrganization && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Organization Details</h3>
                <button
                  onClick={() => setShowOrgModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Profile Image Section */}
                <div className="flex items-center space-x-4 mb-6">
                  <div className="flex-shrink-0">
                    {selectedOrganization.profileImage ? (
                      <img
                        src={`http://localhost:5000/api/users/images/${selectedOrganization.profileImage}`}
                        alt={selectedOrganization.name}
                        className="h-20 w-20 rounded-full object-cover border-4 border-gray-200"
                        onError={(e) => {
                          // Fallback to gradient background if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-4 border-gray-200">
                                <span class="text-white text-2xl font-bold">${selectedOrganization.name.charAt(0)}</span>
                              </div>
                            `;
                          }
                        }}
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-4 border-gray-200">
                        <span className="text-white text-2xl font-bold">
                          {selectedOrganization.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedOrganization.name}</h2>
                    <p className="text-sm text-gray-600">{selectedOrganization.type}</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-2 ${
                      selectedOrganization.status === 'active' ? 'bg-green-100 text-green-800' : 
                      selectedOrganization.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedOrganization.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Organization Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedOrganization.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedOrganization.type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Organization ID</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedOrganization.id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedOrganization.status === 'active' ? 'bg-green-100 text-green-800' : 
                      selectedOrganization.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedOrganization.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Members</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedOrganization.members || selectedOrganization.followers || 0}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Followers</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedOrganization.followers || 0}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Created Date</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedOrganization.created ? new Date(selectedOrganization.created).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedOrganization.updated ? new Date(selectedOrganization.updated).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Additional Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedOrganization.description || 'No description available'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">President</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedOrganization.president || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Founded</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedOrganization.founded || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Website</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedOrganization.website ? (
                          <a href={selectedOrganization.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                            {selectedOrganization.website}
                          </a>
                        ) : 'Not specified'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Verification Documents */}
                {selectedOrganization.verificationFile && (
                  <div className="border-t pt-4">
                    <h4 className="text-md font-medium text-gray-900 mb-3">Verification Documents</h4>
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
                              {selectedOrganization.verificationFile.includes('.pdf') ? 'Verification Document.pdf' : 'Verification Document'}
                            </p>
                            <p className="text-xs text-gray-500">PDF Document</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <a
                            href={`http://localhost:5000/api/uploads/organization-verification/${selectedOrganization.verificationFile}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View File
                          </a>
                          <a
                            href={`http://localhost:5000/api/uploads/organization-verification/${selectedOrganization.verificationFile}`}
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

                {/* Actions */}
                <div className="border-t pt-4 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowOrgModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Close
                  </button>
                  {selectedOrganization.status === 'active' ? (
                    <button
                      onClick={() => {
                        setShowOrgModal(false);
                        handleSuspendOrganization(selectedOrganization.id);
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                    >
                      Suspend Organization
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setShowOrgModal(false);
                        handleActivateOrganization(selectedOrganization.id);
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
                    >
                      Activate Organization
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

const AdminStudents = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('name-asc');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showStudentModal, setShowStudentModal] = useState(false);

  // Fetch students from students API
  React.useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await apiClient.getStudents();
        if (response.success && response.data) {
          const studentsData = Array.isArray(response.data) ? response.data : [];
          setStudents(studentsData);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  const allStudents = students;

  const handleViewUser = (userId: number) => {
    const student = students.find(s => s.id === userId);
    if (student) {
      setSelectedStudent(student);
      setShowStudentModal(true);
    }
  };

  const handleSuspendUser = (userId: number) => {
    if (window.confirm('Are you sure you want to suspend this user?')) {
      console.log('Suspend user:', userId);
    }
  };

  // Filter and sort students
  const filteredStudents = allStudents
    .filter(student =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.faculty && student.faculty.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (student.studentId && student.studentId.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      switch (sortOrder) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'email-asc':
          return a.email.localeCompare(b.email);
        case 'email-desc':
          return b.email.localeCompare(a.email);
        case 'faculty-asc':
          return (a.faculty || '').localeCompare(b.faculty || '');
        case 'faculty-desc':
          return (b.faculty || '').localeCompare(a.faculty || '');
        case 'joined-desc':
          return new Date(b.joined).getTime() - new Date(a.joined).getTime();
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <h2 className="text-xl font-semibold text-gray-900">Student Management</h2>
        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading students...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Student Management</h2>
        <div className="text-sm text-gray-600">
          Showing: {filteredStudents.length} of {allStudents.length} students
        </div>
      </div>

      {/* Search and Sort Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search students by name, email, faculty, or student ID..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="email-asc">Email A-Z</option>
              <option value="email-desc">Email Z-A</option>
              <option value="faculty-asc">Faculty A-Z</option>
              <option value="faculty-desc">Faculty Z-A</option>
              <option value="joined-desc">Recently Joined</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faculty/Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {student.profileImage ? (
                          <img
                            src={`http://localhost:5000/api/users/images/${student.profileImage}`}
                            alt={student.name}
                            className="h-8 w-8 rounded-full object-cover border-2 border-gray-200"
                            onError={(e) => {
                              // Fallback to gradient background if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `
                                  <div class="h-8 w-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center border-2 border-gray-200">
                                    <span class="text-white text-sm font-medium">${student.name.charAt(0)}</span>
                                  </div>
                                `;
                              }
                            }}
                          />
                        ) : (
                          <div className="h-8 w-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center border-2 border-gray-200">
                            <span className="text-white text-sm font-medium">
                              {student.name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{student.name}</div>
                        {student.studentId && (
                          <div className="text-sm text-gray-500">ID: {student.studentId}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      Student
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.faculty || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(student.joined).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewUser(student.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleSuspendUser(student.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Suspend
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Detail Modal */}
      {showStudentModal && selectedStudent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Student Details</h3>
                <button
                  onClick={() => setShowStudentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Profile Image Section */}
                <div className="flex items-center space-x-4 mb-6">
                  <div className="flex-shrink-0">
                    {selectedStudent.profileImage ? (
                      <img
                        src={`http://localhost:5000/api/users/images/${selectedStudent.profileImage}`}
                        alt={selectedStudent.name}
                        className="h-20 w-20 rounded-full object-cover border-4 border-gray-200"
                        onError={(e) => {
                          // Fallback to gradient background if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="h-20 w-20 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center border-4 border-gray-200">
                                <span class="text-white text-2xl font-bold">${selectedStudent.name.charAt(0)}</span>
                              </div>
                            `;
                          }
                        }}
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center border-4 border-gray-200">
                        <span className="text-white text-2xl font-bold">
                          {selectedStudent.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedStudent.name}</h2>
                    <p className="text-sm text-gray-600">{selectedStudent.email}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {selectedStudent.role}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedStudent.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedStudent.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedStudent.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedStudent.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Student ID</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedStudent.id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Faculty</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedStudent.faculty || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {selectedStudent.role}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedStudent.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedStudent.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Joined Date</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedStudent.joined).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Login</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedStudent.lastLogin ? new Date(selectedStudent.lastLogin).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Additional Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Joined Events</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedStudent.joinedEvents ? selectedStudent.joinedEvents.length : 0} events
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Following Organizations</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedStudent.following ? selectedStudent.following.length : 0} organizations
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t pt-4 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowStudentModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowStudentModal(false);
                      handleSuspendUser(selectedStudent.id);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                  >
                    Suspend Student
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminEvents = () => {
  const { events, organizations } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showEventModal, setShowEventModal] = useState(false);

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.orgName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleViewEvent = (eventId: number) => {
    const event = events.find(e => e.id === eventId);
    if (event) {
      setSelectedEvent(event);
      setShowEventModal(true);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Event Management</h2>
        <div className="flex space-x-4">
          <div className="relative">
            <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{event.title}</div>
                    <div className="text-sm text-gray-500">{event.type}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {event.orgName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{new Date(event.date).toLocaleDateString()}</div>
                    <div className="text-gray-500">{event.startTime} - {event.endTime}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {event.registered}/{event.capacity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      // For active events, use dynamic status
                      if (event.status === 'active') {
                        const eventStatus = getEventStatus(event);
                        return (
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            eventStatus.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                            eventStatus.status === 'started' ? 'bg-orange-100 text-orange-800' :
                            eventStatus.status === 'ended' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {eventStatus.statusText}
                          </span>
                        );
                      } else {
                        // For non-active events, use database status
                        return (
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            event.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                            event.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            event.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {event.status}
                          </span>
                        );
                      }
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleViewEvent(event.id)}
                      className="text-blue-600 hover:text-blue-900"
                      title="View Event"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Event Detail Modal */}
      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Event Details</h3>
                <button
                  onClick={() => setShowEventModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Event Title</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEvent.title}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Event Type</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEvent.type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Organization</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEvent.orgName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    {(() => {
                      // For active events, use dynamic status
                      if (selectedEvent.status === 'active') {
                        const eventStatus = getEventStatus(selectedEvent);
                        return (
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            eventStatus.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                            eventStatus.status === 'started' ? 'bg-orange-100 text-orange-800' :
                            eventStatus.status === 'ended' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {eventStatus.statusText}
                          </span>
                        );
                      } else {
                        // For non-active events, use database status
                        return (
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            selectedEvent.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                            selectedEvent.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            selectedEvent.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {selectedEvent.status}
                          </span>
                        );
                      }
                    })()}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedEvent.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Time</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedEvent.startTime} - {selectedEvent.endTime}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Capacity</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedEvent.registered || 0} / {selectedEvent.capacity}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Event ID</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEvent.id}</p>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Additional Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedEvent.description || 'No description available'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Location</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedEvent.location || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Venue</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedEvent.venue || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Partner</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedEvent.partner || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Responsible Person</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedEvent.responsiblePerson || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Contact Email</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedEvent.responsibleEmail ? (
                          <a href={`mailto:${selectedEvent.responsibleEmail}`} className="text-blue-600 hover:text-blue-800">
                            {selectedEvent.responsibleEmail}
                          </a>
                        ) : 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Contact Phone</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedEvent.responsiblePhone ? (
                          <a href={`tel:${selectedEvent.responsiblePhone}`} className="text-blue-600 hover:text-blue-800">
                            {selectedEvent.responsiblePhone}
                          </a>
                        ) : 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Registration Deadline</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedEvent.registrationDeadline ? 
                          new Date(selectedEvent.registrationDeadline).toLocaleDateString() : 
                          'Not specified'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Event Images */}
                {selectedEvent.media && selectedEvent.media.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-md font-medium text-gray-900 mb-3">Event Images</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedEvent.media.map((media: any, index: number) => (
                        <div key={index} className="relative">
                          <img
                            src={getImageUrl(media.url, 'event')}
                            alt={`Event image ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200"
                            onError={handleImageError}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="border-t pt-4 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowEventModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminAnalytics = () => {
  const { users, organizations, events } = useData();
  const [systemActivities, setSystemActivities] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch analytics data
  React.useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        console.log('🔍 Fetching analytics data...');
        const response = await apiClient.getAnalytics();
        console.log('🔍 Analytics response:', response);
        if (response.success) {
          console.log('🔍 Setting analytics data:', response.analytics);
          setAnalyticsData(response.analytics);
        } else {
          console.error('❌ Analytics API failed:', response.message);
        }
      } catch (error) {
        console.error('❌ Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  // Fetch system activities
  React.useEffect(() => {
    const fetchSystemActivities = async () => {
      try {
        const response = await apiClient.getRecentActivities(10);
        if (response.success) {
          setSystemActivities(response.activities);
        }
      } catch (error) {
        console.error('Error fetching system activities:', error);
      }
    };

    fetchSystemActivities();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  const analytics = analyticsData || {
    totalUsers: users.length,
    totalOrganizations: organizations.length,
    totalEvents: events.length,
    activeEvents: events.filter(e => e.status === 'active').length,
    totalRegistrations: events.reduce((sum, event) => sum + event.registered, 0),
    userGrowth: [],
    eventTypes: [],
    orgTypes: [],
    facultyDistribution: []
  };

  // Debug logging
  console.log('🔍 Current analytics data:', analytics);
  console.log('🔍 Analytics data source:', analyticsData ? 'API' : 'Fallback');
  console.log('🔍 User growth data:', analytics.userGrowth);
  console.log('🔍 Event types data:', analytics.eventTypes);
  console.log('🔍 Organization types data:', analytics.orgTypes);

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Analytics Dashboard</h2>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-2xl font-semibold text-gray-900">{analytics.totalUsers}</p>
              <p className="text-gray-600">Total Users</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Building2 className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-2xl font-semibold text-gray-900">{analytics.totalOrganizations}</p>
              <p className="text-gray-600">Organizations</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-2xl font-semibold text-gray-900">{analytics.totalEvents}</p>
              <p className="text-gray-600">Total Events</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-orange-500" />
            <div className="ml-4">
              <p className="text-2xl font-semibold text-gray-900">{analytics.totalRegistrations}</p>
              <p className="text-gray-600">Registrations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">User Growth</h3>
          <div className="space-y-2">
            {analytics.userGrowth && analytics.userGrowth.length > 0 ? (
              analytics.userGrowth.map((data: any, index: number) => {
                const maxUsers = Math.max(...analytics.userGrowth.map((d: any) => d.users));
                return (
                  <div key={data.month} className="flex items-center">
                    <div className="w-12 text-sm text-gray-600">{data.month}</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-purple-500 h-4 rounded-full transition-all duration-300"
                        style={{ width: `${maxUsers > 0 ? (data.users / maxUsers) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <div className="w-12 text-sm text-gray-900 ml-2">{data.users}</div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4 text-gray-500">No user growth data available</div>
            )}
          </div>
        </div>

        {/* Event Types Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Event Types</h3>
          <div className="space-y-3">
            {analytics.eventTypes && analytics.eventTypes.length > 0 ? (
              analytics.eventTypes.slice(0, 8).map((eventType: any, index: number) => {
                const maxCount = Math.max(...analytics.eventTypes.map((et: any) => et.count));
                return (
                  <div key={eventType.type} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 truncate">{eventType.type}</span>
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${maxCount > 0 ? (eventType.count / maxCount) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{eventType.count}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4 text-gray-500">No event types data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Organization Types */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Organization Types</h3>
          <div className="space-y-3">
            {analytics.orgTypes && analytics.orgTypes.length > 0 ? (
              analytics.orgTypes.slice(0, 6).map((orgType: any, index: number) => {
                const maxCount = Math.max(...analytics.orgTypes.map((ot: any) => ot.count));
                return (
                  <div key={orgType.type} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 truncate">{orgType.type}</span>
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${maxCount > 0 ? (orgType.count / maxCount) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{orgType.count}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4 text-gray-500">No organization types data available</div>
            )}
          </div>
        </div>

        {/* Faculty Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Faculty Distribution</h3>
          <div className="space-y-3">
            {analytics.facultyDistribution && analytics.facultyDistribution.length > 0 ? (
              analytics.facultyDistribution.slice(0, 6).map((faculty: any, index: number) => {
                const maxCount = Math.max(...analytics.facultyDistribution.map((f: any) => f.count));
                return (
                  <div key={faculty.faculty} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 truncate">{faculty.faculty}</span>
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${maxCount > 0 ? (faculty.count / maxCount) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{faculty.count}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4 text-gray-500">No faculty data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Activity</h3>
        <div className="space-y-4">
          {systemActivities.length > 0 ? (
            systemActivities.map((activity, index) => {
              const getActivityColor = (type: string) => {
                switch (type) {
                  case 'organization_registration':
                  case 'organization_approved':
                    return 'bg-green-500';
                  case 'student_registration':
                    return 'bg-blue-500';
                  case 'event_creation':
                    return 'bg-purple-500';
                  case 'event_capacity_reached':
                    return 'bg-orange-500';
                  default:
                    return 'bg-gray-500';
                }
              };

              return (
                <div key={activity.id || index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className={`h-2 w-2 ${getActivityColor(activity.type)} rounded-full mt-2`}></div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(activity.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500">No recent activities</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


const AdminSettings = () => {
  const [settings, setSettings] = useState({
    platformName: 'OneAU',
    allowRegistration: true,
    requireApproval: true,
    maxFileSize: 5242880, // 5MB in bytes
    emailNotifications: true,
    maintenanceMode: false
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Fetch settings on component mount
  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await apiClient.getSettings();
        if (response.success) {
          setSettings(response.settings);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };

    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      setMessage('');
      
      const response = await apiClient.updateSettings(settings);
      if (response.success) {
        setMessage('Settings saved successfully!');
        setSettings(response.settings);
      } else {
        setMessage('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Error saving settings');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb}MB`;
  };

  const handleFileSizeChange = (value: string) => {
    const mb = parseInt(value);
    const bytes = mb * 1024 * 1024;
    setSettings({...settings, maxFileSize: bytes});
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">System Settings</h2>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">General Settings</h3>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Platform Name
            </label>
            <input
              type="text"
              value={settings.platformName}
              onChange={(e) => setSettings({...settings, platformName: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="allowRegistration"
              checked={settings.allowRegistration}
              onChange={(e) => setSettings({...settings, allowRegistration: e.target.checked})}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <label htmlFor="allowRegistration" className="ml-2 text-sm text-gray-700">
              Allow new user registrations
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="requireApproval"
              checked={settings.requireApproval}
              onChange={(e) => setSettings({...settings, requireApproval: e.target.checked})}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <label htmlFor="requireApproval" className="ml-2 text-sm text-gray-700">
              Require admin approval for organizations
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="emailNotifications"
              checked={settings.emailNotifications}
              onChange={(e) => setSettings({...settings, emailNotifications: e.target.checked})}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <label htmlFor="emailNotifications" className="ml-2 text-sm text-gray-700">
              Enable email notifications
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="maintenanceMode"
              checked={settings.maintenanceMode}
              onChange={(e) => setSettings({...settings, maintenanceMode: e.target.checked})}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <label htmlFor="maintenanceMode" className="ml-2 text-sm text-gray-700">
              Maintenance mode (users cannot access the platform)
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">File Upload Settings</h3>
        </div>
        <div className="p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum File Size
            </label>
            <select
              value={Math.round(settings.maxFileSize / (1024 * 1024))}
              onChange={(e) => handleFileSizeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="1">1 MB</option>
              <option value="5">5 MB</option>
              <option value="10">10 MB</option>
              <option value="25">25 MB</option>
              <option value="50">50 MB</option>
            </select>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-md ${
          message.includes('successfully') 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          disabled={loading}
          className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const location = useLocation();
  const currentPath = location.pathname.split('/').pop() || 'admin';

  const sidebarItems = [
    { id: 'admin', label: 'Dashboard', icon: Home, path: '/admin' },
    { id: 'approvals', label: 'Approvals', icon: FileText, path: '/admin/approvals' },
    { id: 'organizations', label: 'Organizations', icon: Building2, path: '/admin/organizations' },
    { id: 'students', label: 'Students', icon: Users, path: '/admin/students' },
    { id: 'events', label: 'Events', icon: Calendar, path: '/admin/events' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/admin/settings' }
  ];

  const sidebarContent = (
    <nav className="mt-6 px-3">
      <div className="space-y-1">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = (item.path === '/admin' && currentPath === 'admin') || 
                          (item.path !== '/admin' && currentPath === item.id);
          
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? 'bg-purple-100 text-purple-700'
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
      case 'approvals': return 'Approvals';
      case 'organizations': return 'Organizations';
      case 'students': return 'Students';
      case 'events': return 'Events';
      case 'analytics': return 'Analytics';
      case 'settings': return 'Settings';
      default: return 'Admin Dashboard';
    }
  };

  return (
    <Layout sidebarContent={sidebarContent} title={getPageTitle()}>
      <Routes>
        <Route path="/" element={<AdminHome />} />
        <Route path="/approvals" element={<AdminApprovalPage />} />
        <Route path="/organizations" element={<AdminOrganizations />} />
        <Route path="/students" element={<AdminStudents />} />
        <Route path="/events" element={<AdminEvents />} />
        <Route path="/analytics" element={<AdminAnalytics />} />
        <Route path="/settings" element={<AdminSettings />} />
      </Routes>
    </Layout>
  );
};

export default AdminDashboard;