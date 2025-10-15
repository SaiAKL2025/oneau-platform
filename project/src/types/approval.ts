// Shared interfaces for approval system - ensures consistency between frontend pages and backend

export interface PendingApproval {
  _id?: string;
  id: number;
  type: string;
  name: string;
  applicant: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  orgId?: number;
  registrationData: {
    name: string;
    email: string;
    password?: string; // For organizations - stored during registration
    orgType: string;
    description: string;
    president: string;
    founded: string;
    website?: string;
    members: number;
    socialMedia: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
    };
  };
  verificationFile?: {
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    path: string;
    url: string;
  };
  rejectionDetails?: {
    reason: string;
    allowResubmission: boolean;
    resubmissionDeadline?: string | Date;
    rejectedAt: string | Date;
    rejectedBy: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

// API request/response types
export interface RejectOrganizationRequest {
  rejectionReason: string;
  allowResubmission: boolean;
  resubmissionDeadline?: string;
}

export interface RejectOrganizationResponse {
  success: boolean;
  message: string;
  rejectionDetails?: {
    reason: string;
    allowResubmission: boolean;
    resubmissionDeadline?: string;
    rejectedAt: string;
    rejectedBy: string;
  };
}

export interface ApproveOrganizationResponse {
  success: boolean;
  message: string;
  organization?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface PendingApprovalsResponse {
  success: boolean;
  pendingApprovals: PendingApproval[];
}