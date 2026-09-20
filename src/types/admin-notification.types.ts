// src/types/admin-notification.types.ts

export type TargetAudience = "student" | "instructor";
export type BackendAudience = "STUDENT" | "INSTRUCTOR";

/** Backend notification types */
export type NotificationType =
  | "GENERAL"
  | "COURSE_UPDATE"
  | "ANNOUNCEMENT"
  | "EVENT"
  | "SYSTEM";

/** Raw shape returned by GET /api/admin/notifications */
export interface AdminNotificationApiResponse {
  adminNotificationId: string;
  title: string;
  message: string;
  audience: BackendAudience | string;
  type: string; 
  // type?: NotificationType;
  createdAt: string;
}

/** Body for POST /api/admin/notifications */
export interface CreateAdminNotificationRequest {
  title: string;
  message: string;
  audience: BackendAudience;
  type: NotificationType;
}

/** UI model */
export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  targetAudience: TargetAudience;
  type: NotificationType;
  sentAt: string;
}

export interface CreateNotificationInput {
  title: string;
  message: string;
  targetAudience: TargetAudience;
  type: NotificationType;
}

export interface NotificationStats {
  totalSent: number;
  studentNotifications: number;
  instructorNotifications: number;
  lastSentAt: string | null;
}

export interface NotificationFilters {
  search: string;
  audience: "all" | TargetAudience;
  type: "all" | "GENERAL" | "INFO" | "WARNING" | "SUCCESS";
}

/** User-facing notification (GET /api/notifications) */
export interface UserNotification {
  notificationId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}