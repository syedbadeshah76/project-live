// ============= Instructor Analytics Types =============
// Shared DTOs mirroring the Spring Boot response payloads.

export interface RevenueTrendPoint {
  month: string;      // "Jan", "Feb", ...
  revenue: number;
}

export interface EnrollmentTrendPoint {
  month: string;
  enrollments: number;
}

export interface CourseEngagement {
  courseId: string;
  courseName: string;
  engagement: number; // 0-100 (%)
}

export interface RatingDistributionItem {
  stars: 1 | 2 | 3 | 4 | 5;
  count: number;
  percentage: number; // 0-100
}

export interface TopCourse {
  courseId: string;
  name: string;
  students: number;
  revenue: number;
  averageRating: number;
  completionRate: number; // 0-100
}

export interface RevenueBreakdown {
  totalEarned: number;   // gross
  platformFee: number;   // positive number (displayed as negative in UI)
  yourEarnings: number;  // net to instructor
  platformFeePercentage: number; // e.g. 30
}

export interface StudentGrowth {
  totalStudents: number;
  activeLearners: number;
  activeLearnersPercentage: number; // 0-100
  growthPercentage: number;         // vs previous month
}

export interface TopPerformingCourseSummary {
  courseId: string;
  name: string;
  studentsEnrolled: number;
  averageRating: number;
  completionRate: number;
  monthlyGrowthPercentage: number;
}

export interface InstructorAnalyticsData {
  // KPI cards
  totalRevenue: number;
  totalStudents: number;
  averageRating: number;
  completionRate: number; // 0-100 combined across courses

  // Growth deltas (vs previous period)
  revenueGrowth: number;
  studentsGrowth: number;
  ratingGrowth: number;
  completionRateGrowth: number;

  // Sections
  revenueTrend: RevenueTrendPoint[];             // last 6 months
  enrollmentsTrend: EnrollmentTrendPoint[];      // last 6 months
  engagementByCourse: CourseEngagement[];
  ratingDistribution: RatingDistributionItem[];  // 5..1
  topPerformingCourses: TopCourse[];
  revenueBreakdown: RevenueBreakdown;
  studentGrowth: StudentGrowth;
  topPerformingCourse: TopPerformingCourseSummary;
}

export type AnalyticsPeriod = "week" | "month" | "quarter" | "year";
