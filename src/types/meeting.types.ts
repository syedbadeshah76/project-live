// src/types/instructor-analytics-types.ts
export type AnalyticsPeriod = "week" | "month" | "quarter" | "year";

/** ---- Raw backend shapes (Spring Boot) ---- */
export interface DashboardTrendPointApi {
  dayLabel: string;
  enrolledCount: number;
  completedCount: number;
}

export interface InstructorDashboardApi {
  totalStudents: number;
  totalCourses: number;
  totalRevenue: number;
  avgRating: number;
  enrollmentTrend: DashboardTrendPointApi[];
  coursePerformance?: CoursePerformanceApi[];
  recentActivity?: { message: string; createdAt: string }[];
  upcomingSessions?: UpcomingSessionApi[];
}

export interface UpcomingSessionApi {
  id: string;
  title: string;
  courseId: string;
  courseTitle?: string;
  description?: string;
  startTime: string;
  endTime?: string;
  enrolledCount?: number;
  status?: string;
}

export interface CoursePerformanceApi {
  courseId?: string;
  title: string;
  enrolledCount: number;
  avgRating: number;
  completionRatePercent: number;
  revenue?: number;
}

export interface RevenueBreakdownApi {
  totalEarned: number;
  platformFee: number;
  yourEarnings: number;
}

export interface StudentGrowthApi {
  totalStudents: number;
  newThisMonth: number;
  growthPercent: number;
}

export interface InstructorAnalyticsApi {
  totalRevenue?: number;
  totalStudents?: number;
  avgRating?: number;
  completionRatePercent?: number;
  enrollmentTrend?: DashboardTrendPointApi[];
  revenueTrend?: { label?: string; month?: string; revenue: number }[];
  ratingDistribution?: { stars: number; count: number; percentage?: number }[];
  coursePerformance?: CoursePerformanceApi[];
  revenueBreakdown?: RevenueBreakdownApi;
  studentGrowth?: StudentGrowthApi;
}

/** ---- UI shapes (unchanged contract used by components) ---- */
export interface RevenueTrendPoint { month: string; revenue: number }
export interface EnrollmentTrendPoint { month: string; enrollments: number }
export interface CourseEngagement { courseId: string; courseName: string; engagement: number }
export interface RatingDistributionItem { stars: number; count: number; percentage: number }
export interface TopCourse {
  courseId: string; name: string; students: number;
  revenue: number; averageRating: number; completionRate: number;
}
export interface RevenueBreakdown {
  totalEarned: number; platformFee: number; yourEarnings: number; platformFeePercentage: number;
}
export interface StudentGrowth {
  totalStudents: number; activeLearners: number; activeLearnersPercentage: number; growthPercentage: number;
}
export interface TopPerformingCourseSummary {
  courseId: string; name: string; studentsEnrolled: number;
  averageRating: number; completionRate: number; monthlyGrowthPercentage: number;
}

export interface InstructorAnalyticsData {
  totalRevenue: number;
  totalStudents: number;
  averageRating: number;
  completionRate: number;
  revenueGrowth: number;
  studentsGrowth: number;
  ratingGrowth: number;
  completionRateGrowth: number;
  revenueTrend: RevenueTrendPoint[];
  enrollmentsTrend: EnrollmentTrendPoint[];
  engagementByCourse: CourseEngagement[];
  ratingDistribution: RatingDistributionItem[];
  topPerformingCourses: TopCourse[];
  revenueBreakdown: RevenueBreakdown;
  studentGrowth: StudentGrowth;
  topPerformingCourse: TopPerformingCourseSummary;
}

/** Dashboard UI shape */
export interface InstructorDashboardData {
  totalStudents: number;
  totalCourses: number;
  totalRevenue: number;
  averageRating: number;
  enrollmentTrend: { label: string; enrollments: number; completions: number }[];
  coursePerformance: { courseId: string; courseName: string; score: number; students: number }[];
  recentActivity: { message: string; createdAt: string }[];
  upcomingSessions: {
    id: string; title: string; courseId: string; courseName: string; description?: string;
    date: string; startTime: string; endTime: string; enrolledCount: number;
    status: "Upcoming" | "Live" | "Completed";
  }[];
}

// ============= Meeting Management Types =============
export type MeetingStatus = "pending" | "approved" | "rejected" | "cancelled";
export type MeetingPlatform = "zoom" | "google_meet" | "internal" | "microsoft_teams" | "ZOOM" | "GOOGLE_MEET";

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  courseId?: string;
  courseName?: string;
  instructorId?: string;
  instructorName?: string;
  instructorEmail?: string;
  instructorPhone?: string;
  date: string;
  startTime: string;
  duration?: number;
  status: MeetingStatus | string;
  meetingType?: string;
  zoomJoinUrl?: string;
  zoomStartUrl?: string;
  enrolledStudents?: number;
  createdAt?: string;
  updatedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  adminNote?: string;
  [key: string]: any;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface CreateMeetingRequest {
  title: string;
  description?: string;
  courseId: string;
  date: string;
  startTime: string;
  duration: number;
  meetingType?: string;
}

export interface ApproveMeetingRequest {
  meetingId: string;
  adminId: string;
  zoomJoinUrl?: string;
  zoomStartUrl?: string;
}

export interface RejectMeetingRequest {
  meetingId: string;
  adminId: string;
  reason: string;
}

export interface RescheduleMeetingRequest {
  meetingId: string;
  adminId: string;
  date: string;
  startTime: string;
  duration?: number;
  adminNote?: string;
}

export interface AttendanceRecord {
  id: string;
  meetingId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  status: "present" | "absent" | "late";
  joinedAt?: string;
  durationMinutes?: number;
}

export interface RecordAttendanceRequest {
  meetingId: string;
  records: {
    studentId: string;
    status: "present" | "absent" | "late";
    durationMinutes?: number;
  }[];
}

export interface MeetingStatistics {
  totalRequests: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
  scheduledThisWeek?: number;
  confirmedThisMonth?: number;
  pendingResponses?: number;
}

export interface MeetingFilters {
  status?: string;
  search?: string;
  courseId?: string;
  instructorId?: string;
  meetingType?: string;
  startDate?: string;
  endDate?: string;
}

export interface DraftMeetingPayload {
  id?: string;
  title: string;
  description?: string;
  courseId?: string;
  date?: string;
  startTime?: string;
  duration?: number;
  meetingType?: string;
}

export interface InstructorCourseOption {
  id: string;
  title: string;
}

export interface MeetingAnnouncement {
  id: string;
  meetingId: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface MeetingResource {
  id: string;
  meetingId: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  fileType?: string;
  uploadedAt: string;
}

export interface AnnouncementSummary {
  total: number;
  recent: MeetingAnnouncement[];
}

export interface ResourceUploadPayload {
  meetingId: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  fileType?: string;
}

