// src/types/announcement.types.ts
export type CourseType = "live" | "recorded";
export type AnnouncementStatus = "active" | "inactive";

export interface EligibleCourseOption {
  courseId: string;
  courseName: string;
  courseType: CourseType;
  studentCount: number;
}

/** Raw backend shape — HTML only, no title/course meta */
export interface AnnouncementApiResponse {
  id: string;
  courseId: string;
  createdBy: string;
  htmlContent: string;
  totalStudents?: number;
  total_students?: number;
  studentCount?: number;
  studentsCount?: number;
  createdAt: string;
  updatedAt?: string;
}

/** UI shape — backend fields + course meta resolved client-side */
export interface Announcement {
  id: string;
  title: string;
  htmlContent: string;
  courseId: string;
  courseName: string;
  courseType: CourseType;
  studentCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  status: AnnouncementStatus;
}

export interface CreateAnnouncementRequest {
  courseId: string;
  htmlContent: string;
}

export interface UpdateAnnouncementRequest {
  htmlContent: string;
}
