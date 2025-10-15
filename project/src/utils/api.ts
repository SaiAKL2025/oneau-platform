const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://oneau-backend.onrender.com/api';

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any[];
  code?: string;
  timestamp?: string;
}

class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    console.log('🔍 DEBUG: Checking auth headers');
    console.log('🔍 DEBUG: Token exists in localStorage:', !!token);
    console.log('🔍 DEBUG: User exists in localStorage:', !!user);
    console.log('🔍 DEBUG: API_BASE_URL:', this.baseURL);

    if (token) {
      console.log('🔍 DEBUG: Token length:', token.length);
      console.log('🔍 DEBUG: Token preview:', token.substring(0, 50) + '...');
    }

    if (user) {
      try {
        const userData = JSON.parse(user);
        console.log('🔍 DEBUG: User data:', {
          name: userData.name,
          email: userData.email,
          role: userData.role,
          id: userData.id
        });
      } catch (e) {
        console.log('🔍 DEBUG: Error parsing user data:', (e as Error).message);
      }
    }

    if (token) {
      console.log('🔑 Using auth token for API request');
      return { Authorization: `Bearer ${token}` };
    } else {
      console.log('⚠️ No auth token available - user may need to login');
      return {};
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Don't set Content-Type for FormData - let browser handle it
    const isFormData = options.body instanceof FormData;
    const headers = {
      ...(isFormData ? {} : this.defaultHeaders), // Skip default headers for FormData
      ...this.getAuthHeaders(),
      ...options.headers,
    };

    console.log('🔍 DEBUG: Making request to:', url);
    console.log('🔍 DEBUG: Request method:', options.method || 'GET');
    console.log('🔍 DEBUG: Final headers:', Object.keys(headers));

    // Log Authorization header specifically (without exposing the full token)
    if ((headers as any).Authorization) {
      console.log('🔍 DEBUG: Authorization header present:', (headers as any).Authorization.substring(0, 20) + '...');
    } else {
      console.log('🔍 DEBUG: No Authorization header found!');
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log('🔍 DEBUG: Response status:', response.status);
      console.log('🔍 DEBUG: Response headers:', Object.fromEntries(response.headers.entries()));

      // Get response text first to handle both JSON and potential errors
      const responseText = await response.text();

      let data: ApiResponse<T>;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        // If response is not valid JSON, create an error response
        data = {
          success: false,
          message: responseText || `HTTP error! status: ${response.status}`,
        };
      }


      if (!response.ok) {
        // Handle authentication errors specifically
        if (response.status === 401) {
          console.log('🔐 Authentication failed - clearing stored data');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          // Dispatch logout event
          window.dispatchEvent(new CustomEvent('auth:logout'));
        }
        
        // For 400 errors with valid JSON, return the error data instead of throwing
        if (response.status === 400 && data.success === false && data.message) {
          return data;
        }
        // For other error statuses, throw the error
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication endpoints
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData: any) {
    // Check if userData is FormData
    if (userData instanceof FormData) {
      const authHeaders = this.getAuthHeaders();

      // For FormData, create headers without Content-Type so browser can set it automatically
      const headers: Record<string, string> = { ...authHeaders };

      // Explicitly ensure Content-Type is not set for FormData
      if ('Content-Type' in headers) {
        delete headers['Content-Type'];
      }

      // Create the request manually to ensure proper FormData handling
      const requestOptions: RequestInit = {
        method: 'POST',
        body: userData,
      };

      // Only add headers if there are any (don't add empty headers object)
      if (Object.keys(headers).length > 0) {
        requestOptions.headers = headers;
      }

      const response = await fetch(`${this.baseURL}/auth/register`, requestOptions);

      // Process the response manually
      const responseText = await response.text();

      let data: ApiResponse<any>;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        data = {
          success: false,
          message: responseText || `HTTP error! status: ${response.status}`,
        };
      }

      if (!response.ok) {
        if (response.status === 400 && data.success === false && data.message) {
          return data;
        }
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } else {
      return this.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    }
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  // Student endpoints
  async getStudents(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/students${queryString}`);
  }

  // User endpoints (for admin users)
  async getUsers(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/users${queryString}`);
  }

  async getUserById(id: number) {
    return this.request(`/users/${id}`);
  }

  async updateUser(id: number, userData: any) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async updateProfile(userData: any) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: number) {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Organization endpoints
  async getOrganizations(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/organizations${queryString}`);
  }

  async getOrganizationById(id: number) {
    return this.request(`/organizations/${id}`);
  }

  async createOrganization(orgData: any) {
    return this.request('/organizations', {
      method: 'POST',
      body: JSON.stringify(orgData),
    });
  }

  async updateOrganization(id: number, orgData: any) {
    return this.request(`/organizations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(orgData),
    });
  }

  async deleteOrganization(id: number) {
    return this.request(`/organizations/${id}`, {
      method: 'DELETE',
    });
  }

  async followOrganization(orgId: number) {
    return this.request(`/organizations/${orgId}/follow`, {
      method: 'POST',
    });
  }

  async unfollowOrganization(orgId: number) {
    return this.request(`/organizations/${orgId}/follow`, {
      method: 'DELETE',
    });
  }

  // Event endpoints
  async getEvents(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/events${queryString}`);
  }

  async getEventById(id: number) {
    return this.request(`/events/${id}`);
  }

  async createEvent(eventData: any) {
    // Check if eventData is FormData
    if (eventData instanceof FormData) {
      const authHeaders = this.getAuthHeaders();

      // For FormData, create headers without Content-Type so browser can set it automatically
      const headers: Record<string, string> = { ...authHeaders };

      // Explicitly ensure Content-Type is not set for FormData
      if ('Content-Type' in headers) {
        delete headers['Content-Type'];
      }

      // Create the request manually to ensure proper FormData handling
      const requestOptions: RequestInit = {
        method: 'POST',
        body: eventData,
      };

      // Only add headers if there are any (don't add empty headers object)
      if (Object.keys(headers).length > 0) {
        requestOptions.headers = headers;
      }

      const response = await fetch(`${this.baseURL}/events`, requestOptions);

      // Process the response manually
      const responseText = await response.text();

      let data: ApiResponse<any>;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        data = {
          success: false,
          message: responseText || `HTTP error! status: ${response.status}`,
        };
      }

      if (!response.ok) {
        if (response.status === 400 && data.success === false && data.message) {
          return data;
        }
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } else {
      return this.request('/events', {
        method: 'POST',
        body: JSON.stringify(eventData),
      });
    }
  }

  async updateEvent(id: number, eventData: any) {
    // Check if eventData is FormData
    if (eventData instanceof FormData) {
      const authHeaders = this.getAuthHeaders();

      // For FormData, create headers without Content-Type so browser can set it automatically
      const headers: Record<string, string> = { ...authHeaders };

      // Explicitly ensure Content-Type is not set for FormData
      if ('Content-Type' in headers) {
        delete headers['Content-Type'];
      }

      // Create the request manually to ensure proper FormData handling
      const requestOptions: RequestInit = {
        method: 'PUT',
        body: eventData,
      };

      // Only add headers if there are any (don't add empty headers object)
      if (Object.keys(headers).length > 0) {
        requestOptions.headers = headers;
      }

      const response = await fetch(`${this.baseURL}/events/${id}`, requestOptions);

      // Process the response manually
      const responseText = await response.text();

      let data: ApiResponse<any>;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        data = {
          success: false,
          message: responseText || `HTTP error! status: ${response.status}`,
        };
      }

      if (!response.ok) {
        if (response.status === 400 && data.success === false && data.message) {
          return data;
        }
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } else {
      return this.request(`/events/${id}`, {
        method: 'PUT',
        body: JSON.stringify(eventData),
      });
    }
  }

  async deleteEvent(id: number) {
    return this.request(`/events/${id}`, {
      method: 'DELETE',
    });
  }

  async joinEvent(eventId: number) {
    return this.request(`/events/${eventId}/join`, {
      method: 'POST',
    });
  }

  async leaveEvent(eventId: number) {
    return this.request(`/events/${eventId}/leave`, {
      method: 'DELETE',
    });
  }

  // Admin endpoints
  async getPendingApprovals() {
    console.log('🔍 DEBUG: getPendingApprovals called');
    console.log('🔍 DEBUG: About to make request to /admin/pending-approvals');

    const result = await this.request('/admin/pending-approvals');

    console.log('🔍 DEBUG: getPendingApprovals response:', result);
    return result;
  }

  async getApprovedApprovals() {
    return this.request('/admin/approved-approvals');
  }

  async getRejectedApprovals() {
    return this.request('/admin/rejected-approvals');
  }

  async approveOrganization(id: number) {
    return this.request(`/admin/approve/${id}`, {
      method: 'POST',
    });
  }

  async rejectOrganization(id: number, rejectionData: { rejectionReason: string; allowResubmission: boolean; resubmissionDeadline?: string }) {
    return this.request(`/admin/reject/${id}`, {
      method: 'POST',
      body: JSON.stringify(rejectionData),
    });
  }

  async getOrganizationStatus(email: string): Promise<{ success: boolean; approval?: any; message?: string }> {
    return this.request(`/admin/organization-status/${encodeURIComponent(email)}`);
  }

  async getMyOrganizationStatus(): Promise<{ success: boolean; approval?: any; message?: string }> {
    return this.request('/organizations/my-application/status');
  }

  async getOrganizationStatusById(approvalId: string): Promise<{ success: boolean; approval?: any; message?: string }> {
    return this.request(`/admin/organization-status-by-id/${approvalId}`);
  }

  async updatePendingApproval(id: number, data: any): Promise<{ success: boolean; message?: string }> {
    return this.request(`/admin/update-pending/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updatePendingApprovalWithFile(id: string, updateData: any, file?: File): Promise<{ success: boolean; message?: string; approval?: any }> {
    console.log('🔍 updatePendingApprovalWithFile called with:', { id, updateData, file: file?.name });

    // Determine the correct email based on the signup approach
    const user = localStorage.getItem('user');
    let userEmail = '';
    let signupApproach = '';

    if (user) {
      // Google OAuth approach: User is logged in
      try {
        const userData = JSON.parse(user);
        userEmail = userData.email;
        signupApproach = 'google-oauth';
        console.log('👤 Google OAuth user email for verification:', userEmail);
        
        // Clear any old manual signup data to prevent conflicts
        localStorage.removeItem('pendingOrganization');
        console.log('🧹 Cleared manual signup data to prevent conflicts');
      } catch (e) {
        console.log('❌ Error parsing user data:', (e as Error).message);
      }
    } else {
      // Manual signup approach: No user logged in, use localStorage
      const pendingOrg = localStorage.getItem('pendingOrganization');
      if (pendingOrg) {
        try {
          const pendingData = JSON.parse(pendingOrg);
          userEmail = pendingData.email || userEmail;
          signupApproach = 'manual';
          console.log('🏢 Manual signup email for verification:', userEmail);
        } catch (e) {
          console.log('❌ Error parsing pending organization data:', (e as Error).message);
        }
      } else {
        console.log('❌ No user logged in and no pending organization data found');
        throw new Error('No user authentication found');
      }
    }

    // Add email to data for backend verification
    const requestData = {
      ...updateData,
      email: userEmail
    };

    console.log('📝 Request data with email:', requestData);
    console.log('🔍 Final email being sent:', userEmail);
    console.log('🔍 Signup approach:', signupApproach);
    console.log('🔍 User logged in:', !!user);
    console.log('🔍 Current user email from localStorage:', user ? JSON.parse(user).email : 'No user');

    if (file) {
      // If there's a file, use FormData
      const formData = new FormData();

      console.log('🔍 Building FormData with updateData:', updateData);
      console.log('🔍 updateData.registrationData exists:', !!updateData.registrationData);

      // Add registrationData as JSON string (this is what backend expects)
      if (updateData.registrationData) {
        const registrationDataJson = JSON.stringify(updateData.registrationData);
        formData.append('registrationData', registrationDataJson);
        console.log('✅ Added registrationData to FormData:', registrationDataJson.substring(0, 100) + '...');
      }

      // Add email separately for verification
      formData.append('email', userEmail);
      console.log('✅ Added email to FormData:', userEmail);

      // Add the file
      formData.append('file', file);
      console.log('✅ Added file to FormData:', file.name);

      // Log FormData contents
      console.log('📋 FormData contents:');
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
        } else {
          console.log(`  ${key}: ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}`);
        }
      }

      // Get auth headers if available
      const authHeaders = this.getAuthHeaders();

      console.log('📤 Sending FormData request to:', `/admin/update-pending-file/${id}`);
      console.log('🔑 Auth headers available:', !!Object.keys(authHeaders).length);

      // Create request manually to avoid default headers interfering with FormData
      const url = `${this.baseURL}/admin/update-pending-file/${id}`;
      const requestOptions: RequestInit = {
        method: 'PUT',
        body: formData,
      };

      // Only add auth headers if available
      if (Object.keys(authHeaders).length > 0) {
        requestOptions.headers = authHeaders;
      }

      console.log('🚀 Making direct fetch request (bypassing this.request to avoid Content-Type override)');

      const response = await fetch(url, requestOptions);

      console.log('📥 Response status:', response.status);
      console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

      // Get response text first to handle both JSON and potential errors
      const responseText = await response.text();

      let data: ApiResponse<any>;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        // If response is not valid JSON, create an error response
        data = {
          success: false,
          message: responseText || `HTTP error! status: ${response.status}`,
        };
      }

      if (!response.ok) {
        if (response.status === 400 && data.success === false && data.message) {
          return data;
        }
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } else {
      // If no file, use regular JSON request
      console.log('📤 Sending JSON request to:', `/admin/update-pending/${id}`);
      return this.request(`/admin/update-pending/${id}`, {
        method: 'PUT',
        body: JSON.stringify(requestData),
      });
    }
  }

  // Notification endpoints removed

  // File upload endpoints
  async uploadFile(file: File, orgId?: number) {
    const formData = new FormData();
    formData.append('file', file);
    if (orgId) {
      formData.append('orgId', orgId.toString());
    }

    return this.request('/uploads/single', {
      method: 'POST',
      body: formData,
    });
  }

  async uploadMultipleFiles(files: FileList, orgId?: number) {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });
    if (orgId) {
      formData.append('orgId', orgId.toString());
    }

    const headers = {
      ...this.getAuthHeaders(),
    };
    delete headers['Content-Type'];

    return this.request('/uploads/multiple', {
      method: 'POST',
      headers,
      body: formData,
    });
  }

  async uploadOrgVerificationFiles(files: { [key: string]: File }, orgId: number) {
    const formData = new FormData();

    Object.entries(files).forEach(([fieldName, file]) => {
      formData.append(fieldName, file);
    });
    formData.append('orgId', orgId.toString());

    const headers = {
      ...this.getAuthHeaders(),
    };
    delete headers['Content-Type'];

    return this.request(`/uploads/organization-verification/${orgId}`, {
      method: 'POST',
      headers,
      body: formData,
    });
  }

  async getOrgFiles(orgId: number) {
    return this.request(`/uploads/organization/${orgId}`);
  }

  async deleteFile(filename: string, orgId?: number) {
    const queryString = orgId ? `?orgId=${orgId}` : '';
    return this.request(`/uploads/${filename}${queryString}`, {
      method: 'DELETE',
    });
  }

  // Health check endpoints
  async healthCheck() {
    console.log('🔍 Making health check request to:', this.baseURL + '/health');
    return this.request('/health');
  }

  async detailedHealthCheck() {
    return this.request('/health/detailed');
  }

  async readinessCheck() {
    return this.request('/health/ready');
  }

  async livenessCheck() {
    return this.request('/health/live');
  }

  async getMetrics() {
    return this.request('/health/metrics');
  }

  // Generic GET method for any endpoint
  async get(endpoint: string, params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`${endpoint}${queryString}`);
  }

  // Analytics endpoints
  async getAnalytics() {
    return this.request('/analytics');
  }

  async getActivityStats() {
    return this.request('/activities/stats');
  }

  async getRecentActivities(limit?: number) {
    const params = limit ? { limit: limit.toString() } : undefined;
    return this.get('/activities/recent', params);
  }

  async getSystemActivities(limit?: number) {
    const params = limit ? { limit: limit.toString() } : undefined;
    return this.get('/activities/recent', params);
  }

  // Settings endpoints
  async getSettings() {
    return this.request('/settings');
  }

  async updateSettings(settingsData: any) {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settingsData),
    });
  }

  async getRegistrationStatus() {
    return this.request('/settings/registration-status');
  }

  async getMaintenanceStatus() {
    return this.request('/settings/maintenance-status');
  }

  // Public endpoints
  async getPopularOrganizations(limit?: number) {
    const params = limit ? { limit: limit.toString() } : undefined;
    return this.get('/public/organizations/popular', params);
  }

  // Notification endpoints
  async registerFCMToken(fcmToken: string) {
    return this.request('/notifications/register-token', {
      method: 'POST',
      body: JSON.stringify({ fcmToken })
    });
  }

  async getNotifications(limit?: number) {
    const params = limit ? { limit: limit.toString() } : undefined;
    return this.get('/notifications', params);
  }

  async markNotificationAsRead(notificationId: string) {
    return this.request(`/notifications/${notificationId}/read`, {
      method: 'PUT'
    });
  }

  async markAllNotificationsAsRead() {
    return this.request('/notifications/read-all', {
      method: 'PUT'
    });
  }
}

// Create and export a singleton instance
const apiClient = new ApiClient();

export default apiClient;
export { ApiClient, type ApiResponse };