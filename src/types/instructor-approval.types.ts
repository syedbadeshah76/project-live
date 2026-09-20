// ============= Admin Instructor Approval Types =============

export type InstructorStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "pending"
  | "approved"
  | "rejected";

export interface PendingInstructor {
  userId: string;
  id?: string;
  profileId?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email: string;
  country: string | null;
  city: string | null;
  resumeUrl: string | null;
  introVideoUrl: string | null;
  registeredAt: string;
  status?: string;
  approvalStatus?: string;
  appliedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  submissionTimestamp?: string;
  createdAt?: string;
  pending?: number;
  approved?: number;
  rejected?: number;
  avgTime?: string | number;
}

export type InstructorApprovalAction = "approve" | "reject";

export type InstructorApprovalUser = PendingInstructor;

export interface InstructorStatistics {
  pending?: number;
  approved?: number;
  rejected?: number;
  total?: number;
  avgTime?: string | number;
  [key: string]: unknown;
}

export interface InstructorApprovalResult {
  message: string;
}

/** Navigation state passed from the list page to the detail page. */
export interface InstructorApprovalNavState {
  instructor?: InstructorApprovalUser;
  activeFilter?: "all" | "pending" | "approved" | "rejected";
  refreshTimestamp?: number;
}


