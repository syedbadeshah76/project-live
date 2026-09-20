// src/types/liveClass.ts

export type LiveClassStatus = "PENDING_APPROVAL" | "SCHEDULED" | "REJECTED" | "COMPLETED" | "CANCELLED" | "LIVE_NOW";
export type LiveClassProvider = "ZOOM";

/** Payload for POST /api/live-classes */
export interface CreateLiveClassReq {
  liveCourseId: string;
  title: string;
  description: string;
  provider: LiveClassProvider;
  scheduledAt: string; // ISO string e.g. "2026-08-15T17:40:00"
}

/** Response from backend for Live Class item */
export interface LiveClassItem {
  id: string;
  liveCourseId: string;
  hostInstructorId?: string;
  title: string;
  description?: string;
  scheduledStartAt?: string;
  scheduledAt?: string;
  status: LiveClassStatus;
  provider: LiveClassProvider;
  platform?: LiveClassProvider | string;
  courseTitle?: string;
  startUrl?: string;
  joinUrl?: string;
  meetingId?: string;
  meetingPassword?: string;
  recordingAvailable?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Response for GET /api/live-classes/instructor-dashboard */
export interface InstructorDashboardLiveClassesResponse {
  totalClasses: number;
  liveNow: number;
  upcoming: number;
  completed: number;
  liveClasses: LiveClassItem[];
}

/** Response for Admin Live Classes review / pending list */
export interface AdminLiveClassesDashboardResponse {
  totalRequests?: number;
  pendingApproval?: number;
  approved?: number;
  rejected?: number;
  liveClasses?: LiveClassItem[];
}

/** Payload for POST /api/live-classes/{id}/reschedule-approve */
export interface RescheduleLiveClassReq {
  scheduledAt: string; // ISO string for new date/time
}

/** Response payload when starting a live class or error LIV_006 */
export interface StartLiveClassResponse {
  id?: string;
  startUrl?: string;
  joinUrl?: string;
  status?: string;
  code?: string;
  message?: string;
}
