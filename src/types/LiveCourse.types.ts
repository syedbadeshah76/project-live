// src/types/LiveCourse.types.ts

export type LiveMeetingPlatform = "ZOOM" | "GOOGLE_MEET" | "MICROSOFT_TEAMS" | "CUSTOM";
export type LiveAccessType = "FREE" | "PAID";
export type LiveVisibility = "PUBLIC" | "PRIVATE" | "INVITE_ONLY";
export type LiveDurationUnit = "WEEKS" | "MONTHS";
export type WeekDay = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

export interface LiveCourseBasicInfoDto {
  title: string;
  description: string;
  categoryId: string;
  subcategory?: string;
  subcategoryId?: string;
  language?: string;
  level?: string;
  thumbnailUrl?: string;
  promoVideoUrl?: string;
  resourceUrls?: string[];
}

export interface LiveCourseScheduleDto {
  meetingPlatform: LiveMeetingPlatform;
  customMeetingLink?: string;
  timezone: string;
  startDate: string;   // yyyy-MM-dd
  endDate: string;     // yyyy-MM-dd
  durationValue: number;
  durationUnit: LiveDurationUnit;
  sessionDays: WeekDay[];
  startTime: string;   // HH:mm
  endTime: string;     // HH:mm
  sessionDurationMinutes: number;
  maximumSeats: number;
  enrollmentDeadline?: string; // yyyy-MM-dd
  enableWaitingList: boolean;
  recordSessions: boolean;
  attendanceRequired: boolean;
  enableLiveChat: boolean;
}

export interface LiveCoursePricingDto {
  accessType: LiveAccessType;
  basePrice?: number;
  discountedPrice?: number;
  visibility: LiveVisibility;
}

export interface CreateLiveCourseDto
  extends LiveCourseBasicInfoDto,
    LiveCourseScheduleDto,
    LiveCoursePricingDto {
  courseType: "LIVE";
  status?: "DRAFT" | "PUBLISHED";
  level?: string;
  language?: string;
}

export interface LiveCourse extends CreateLiveCourseDto {
  id: string;
  slug?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TimezoneOption {
  id: string;
  label: string;
  country: string;
  offset: string;
}

/* =========================================================
   Backend API Request Payloads (Matching Postman Collection)
   ========================================================= */

/** POST /api/live-courses */
export interface CreateLiveCourseApiReq {
  title: string;
  slug: string;
  description: string;
  instructorId?: string | null;
  categoryId: string;
  subcategoryId?: string;
  language: string;
  level: string;
}

/** PATCH /api/live-courses/{id}/basic-info */
export interface UpdateLiveCourseBasicInfoApiReq {
  title?: string;
  slug?: string;
  description?: string;
  instructorId?: string | null;
  categoryId?: string;
  subcategoryId?: string;
  language?: string;
  level?: string;
}

/** PATCH /api/live-courses/{id}/schedule */
export interface UpsertLiveCourseScheduleApiReq {
  meetingPlatform: string;
  customMeetingLink?: string;
  timezone: string;
  startDate: string;
  endDate: string;
  sessionDays: string; // e.g. "MONDAY,WEDNESDAY,FRIDAY"
  sessionStartTime: string; // e.g. "10:00:00"
  sessionEndTime: string; // e.g. "11:30:00"
  maxSeats: number;
  enrollmentDeadline?: string;
  enableWaitingList: boolean;
  autoRecordSessions: boolean;
  attendanceRequired: boolean;
  enableLiveChat: boolean;
}

/** PATCH /api/live-courses/{id}/pricing */
export interface UpsertLiveCoursePricingApiReq {
  accessType: string; // "PAID", "FREE"
  basePrice?: number;
  discountedPrice?: number;
  visibility: string; // "PUBLIC", "PRIVATE"
}

/** POST /api/live-courses/{id}/status */
export interface UpdateLiveCourseStatusApiReq {
  status: "DRAFT" | "PUBLISHED" | string;
}
