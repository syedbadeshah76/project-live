// ============= Admin Analytics Service =============
// Backend-ready service for the Admin Analytics dashboard.
// When the Java Spring Boot backend is live, set MOCK_MODE = false.
//
// Expected endpoints (all GET, prefixed by BASE):
//   /overview?period=month|quarter|year        -> AnalyticsOverview
//   /revenue-trend?period=...                  -> RevenueTrendPoint[]
//   /enrollments?period=...                    -> EnrollmentPoint[]
//   /revenue-by-category?period=...            -> CategoryRevenue[]
//   /acquisition-sources?period=...            -> AcquisitionSource[]
//   /top-instructors?period=...                -> TopInstructor[]
//   /top-courses?period=...                    -> TopCourseRevenue[]
//   /payment-methods?period=...                -> PaymentMethodBreakdown[]
//   /revenue-by-region?period=...              -> RegionRevenue[]
//   /refund-reasons?period=...                 -> RefundReason[]

import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api.types";

const MOCK_MODE = false;
const BASE = "/admin/analytics";
const delay = <T>(v: T, ms = 250) => new Promise<T>((r) => setTimeout(() => r(v), ms));

// ============= Types =============
export type AnalyticsPeriod = "month" | "quarter" | "year";

export interface AnalyticsOverview {
  totalRevenue: number;
  totalRevenueChangePct: number;
  platformFeeEarned: number;
  platformFeeChangePct: number;
  totalStudents: number;
  totalStudentsChangePct: number;
  activeCourses: number;
  activeCoursesChangePct: number;
  totalInstructors: number;
  totalInstructorsChangePct: number;
  avgCourseRating: number;
  avgCourseRatingChangePct: number;
  completionRate: number;
  completionRateChangePct: number;
  refundRate: number;
  refundRateChangePct: number;
}

export interface AnalyticsMetricDelta {
  current: number;
  deltaPercent: number | null;
}

export interface AnalyticsDashboardResponse {
  from: string;
  to: string;
  totalRevenue: number;
  platformFeeEarned: number;
  totalStudents: number;
  activeCourses: number;
  totalInstructors: AnalyticsMetricDelta;
  avgCourseRating: AnalyticsMetricDelta;
  completionRate: AnalyticsMetricDelta;
  refundRate: AnalyticsMetricDelta;
  revenueTrend: RevenueTrendPoint[];
  enrollmentTrend: EnrollmentPoint[];
  revenueByCategory: CategoryRevenue[];
  topInstructorsLeaderboard: TopInstructor[];
  topCoursesByRevenue: TopCourseRevenue[];
}

function getDateRange(period: AnalyticsPeriod) {
  const to = new Date();
  const from = new Date(to);
  switch (period) {
    case "month":
      from.setMonth(from.getMonth() - 1);
      break;
    case "quarter":
      from.setMonth(from.getMonth() - 3);
      break;
    case "year":
      from.setFullYear(from.getFullYear() - 1);
      break;
  }
  const normalize = (date: Date) => date.toISOString().replace(/\.\d{3}Z$/, "");
  return { from: normalize(from), to: normalize(to) };
}

export interface RevenueTrendPoint {
  month: string;
  grossRevenue: number;
  platformFee: number;
}

export interface EnrollmentPoint {
  month: string;
  paid: number;
  free: number;
}

export interface CategoryRevenue {
  category: string;
  revenue: number;
}

export interface AcquisitionSource {
  source: string;
  percentage: number;
  students: number;
  color: string;
}

export interface TopInstructor {
  id: string;
  instructorId?: string;
  rank: number;
  name: string;
  instructorName?: string;
  revenue: number;
  courses: number;
  students: number;
  rating: number;
}

export interface TopCourseRevenue {
  id: string;
  rank: number;
  title: string;
  instructor: string;
  instructorName?: string;
  students: number;
  revenue: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  percentage: number;
  amount: number;
  color: string;
}

export interface RegionRevenue {
  region: string;
  percentage: number;
  revenue: number;
  students: number;
}

export interface RefundReason {
  reason: string;
  percentage: number;
  color: string;
}

// ============= Mocks =============
const mockOverview: AnalyticsOverview = {
  totalRevenue: 725000, totalRevenueChangePct: 12.5,
  platformFeeEarned: 217500, platformFeeChangePct: 12.5,
  totalStudents: 18450, totalStudentsChangePct: 18.2,
  activeCourses: 284, activeCoursesChangePct: 5.3,
  totalInstructors: 89, totalInstructorsChangePct: 8.1,
  avgCourseRating: 4.7, avgCourseRatingChangePct: 2.1,
  completionRate: 78.5, completionRateChangePct: -2.3,
  refundRate: 4.2, refundRateChangePct: -1.8,
};

const mockRevenueTrend: RevenueTrendPoint[] = [
  { month: "Jan", grossRevenue: 3400, platformFee: 1000 },
  { month: "Feb", grossRevenue: 3600, platformFee: 1100 },
  { month: "Mar", grossRevenue: 4100, platformFee: 1500 },
  { month: "Apr", grossRevenue: 4500, platformFee: 1600 },
  { month: "May", grossRevenue: 5200, platformFee: 1700 },
  { month: "Jun", grossRevenue: 7500, platformFee: 4200 },
  { month: "Jul", grossRevenue: 7500, platformFee: 5500 },
  { month: "Aug", grossRevenue: 7600, platformFee: 6700 },
  { month: "Sep", grossRevenue: 7900, platformFee: 7800 },
  { month: "Oct", grossRevenue: 9500, platformFee: 9200 },
];

const mockEnrollments: EnrollmentPoint[] = [
  { month: "Jan", paid: 90, free: 25 },
  { month: "Feb", paid: 160, free: 30 },
  { month: "Mar", paid: 140, free: 45 },
  { month: "Apr", paid: 170, free: 30 },
  { month: "May", paid: 195, free: 55 },
  { month: "Jun", paid: 180, free: 70 },
  { month: "Jul", paid: 245, free: 45 },
  { month: "Aug", paid: 220, free: 50 },
  { month: "Sep", paid: 180, free: 60 },
  { month: "Oct", paid: 195, free: 65 },
  { month: "Nov", paid: 250, free: 40 },
  { month: "Dec", paid: 265, free: 35 },
];

const mockCategories: CategoryRevenue[] = [
  { category: "Programming", revenue: 14000 },
  { category: "Data Science", revenue: 17500 },
  { category: "Design", revenue: 20500 },
  { category: "Business", revenue: 18500 },
  { category: "Marketing", revenue: 13500 },
];

const mockSources: AcquisitionSource[] = [
  { source: "Organic Search", percentage: 35, students: 6458, color: "#3b82f6" },
  { source: "Direct", percentage: 25, students: 4613, color: "#14b8a6" },
  { source: "Paid Ads", percentage: 20, students: 3690, color: "#facc15" },
  { source: "Social Media", percentage: 12, students: 2214, color: "#f97316" },
  { source: "Referral", percentage: 8, students: 1476, color: "#ef4444" },
];

const mockInstructors: TopInstructor[] = [
  { id: "i1", rank: 1, name: "Dr. James Wilson", revenue: 49.99, courses: 8, students: 2540, rating: 4.8 },
  { id: "i2", rank: 2, name: "Sarah Johnson", revenue: 49.99, courses: 5, students: 2180, rating: 4.7 },
  { id: "i3", rank: 3, name: "Michael Chen", revenue: 99.99, courses: 9, students: 1920, rating: 4.6 },
  { id: "i4", rank: 4, name: "Emma Thompson", revenue: 39.99, courses: 6, students: 1650, rating: 4.9 },
  { id: "i5", rank: 5, name: "Dr. James Wilson", revenue: 59.99, courses: 4, students: 1450, rating: 4.8 },
];

const mockCourses: TopCourseRevenue[] = [
  { id: "c1", rank: 1, title: "Advanced React Patterns", instructor: "James Wilson", students: 580, revenue: 34200 },
  { id: "c2", rank: 2, title: "Machine Learning Mastery", instructor: "Dr. Sarah Chen", students: 520, revenue: 32100 },
  { id: "c3", rank: 3, title: "UX Design Fundamentals", instructor: "Maria Garcia", students: 480, revenue: 28800 },
  { id: "c4", rank: 4, title: "Python for Data Analysis", instructor: "Alex Kumar", students: 450, revenue: 27000 },
  { id: "c5", rank: 5, title: "Digital Marketing Strategy", instructor: "Emma Thompson", students: 420, revenue: 25200 },
];

const mockPayments: PaymentMethodBreakdown[] = [
  { method: "Credit Card", percentage: 58.6, amount: 425000, color: "#f97316" },
  { method: "PayPal", percentage: 30, amount: 217500, color: "#facc15" },
  { method: "Net Banking", percentage: 8, amount: 58500, color: "#ef4444" },
  { method: "Apple Pay", percentage: 2, amount: 14500, color: "#14b8a6" },
  { method: "Debit Card", percentage: 1.4, amount: 9500, color: "#3b82f6" },
];

const mockRegions: RegionRevenue[] = [
  { region: "United States", percentage: 50, revenue: 362500, students: 7380 },
  { region: "Europe", percentage: 30, revenue: 217500, students: 3690 },
  { region: "Asia Pacific", percentage: 12, revenue: 87000, students: 1850 },
  { region: "Latin America", percentage: 4, revenue: 29250, students: 740 },
  { region: "Middle East & Africa", percentage: 4, revenue: 29250, students: 790 },
];

const mockRefunds: RefundReason[] = [
  { reason: "Technical Issues", percentage: 42, color: "#dc2626" },
  { reason: "Course Content Unfit", percentage: 28, color: "#f87171" },
  { reason: "Accidental Purchase", percentage: 18, color: "#fecaca" },
  { reason: "Other", percentage: 12, color: "#e5e7eb" },
];

// ============= Service =============
export const adminAnalyticsService = {
  async getOverview(period: AnalyticsPeriod = "month"): Promise<ApiResponse<AnalyticsOverview>> {
    if (MOCK_MODE) return delay({ success: true, data: mockOverview });
    try {
      const res = await this.getAnalytics(period);
      if (res.success && res.data) {
        return {
          success: true,
          data: {
            totalRevenue: res.data.totalRevenue,
            totalRevenueChangePct: 0,
            platformFeeEarned: res.data.platformFeeEarned,
            platformFeeChangePct: 0,
            totalStudents: res.data.totalStudents,
            totalStudentsChangePct: 0,
            activeCourses: res.data.activeCourses,
            activeCoursesChangePct: 0,
            totalInstructors: res.data.totalInstructors.current,
            totalInstructorsChangePct: res.data.totalInstructors.deltaPercent ?? 0,
            avgCourseRating: res.data.avgCourseRating.current,
            avgCourseRatingChangePct: res.data.avgCourseRating.deltaPercent ?? 0,
            completionRate: res.data.completionRate.current,
            completionRateChangePct: res.data.completionRate.deltaPercent ?? 0,
            refundRate: res.data.refundRate.current,
            refundRateChangePct: res.data.refundRate.deltaPercent ?? 0,
          },
        };
      }
      return { success: false, data: mockOverview };
    } catch {
      return { success: false, data: mockOverview };
    }
  },

  async getAnalytics(period: AnalyticsPeriod = "month"): Promise<ApiResponse<AnalyticsDashboardResponse>> {
    const { from, to } = getDateRange(period);
    try {
      const response = await apiClient.get<any>(BASE, { params: { from, to } });

      const normalizeAnalyticsData = (data: any) => {
        if (!data) return data;

        if (Array.isArray(data.enrollmentTrend)) {
          data.enrollmentTrend = data.enrollmentTrend.map((e: any) => ({
            ...e,
            paid: e.paidCount ?? e.paid ?? 0,
            free: e.freeCount ?? e.free ?? 0,
          }));
        }

        if (Array.isArray(data.revenueByCategory)) {
          data.revenueByCategory = data.revenueByCategory.map((c: any) => ({
            ...c,
            category: c.categoryName ?? c.category ?? "Uncategorized",
            revenue: c.revenue ?? 0,
          }));
        }

        if (Array.isArray(data.topInstructorsLeaderboard)) {
          data.topInstructorsLeaderboard = data.topInstructorsLeaderboard.map((i: any) => ({
            ...i,
            id: i.instructorId ?? i.id,
            name: i.instructorName ?? i.name,
            instructorId: i.instructorId ?? i.id,
            instructorName: i.instructorName ?? i.name,
            courses: i.courseCount ?? i.courses ?? 0,
            students: i.studentCount ?? i.students ?? 0,
            rating: i.avgRating ?? i.rating ?? 0,
          }));
        }

        if (Array.isArray(data.topCoursesByRevenue)) {
          data.topCoursesByRevenue = data.topCoursesByRevenue.map((c: any) => ({
            ...c,
            id: c.courseId ?? c.id,
            title: c.courseName ?? c.title,
            instructor: c.instructorName ?? c.instructor ?? "—",
            instructorName: c.instructorName ?? c.instructor ?? "—",
            students: c.purchaseCount ?? c.students ?? 0,
            revenue: c.revenue ?? 0,
          }));
        }

        const fix2 = (val: any) => (typeof val === "number" ? Number(val.toFixed(2)) : val);

        if (typeof data.totalRevenue === "number") data.totalRevenue = fix2(data.totalRevenue);
        if (typeof data.platformFeeEarned === "number") data.platformFeeEarned = fix2(data.platformFeeEarned);

        if (data.totalInstructors) {
          data.totalInstructors.current = fix2(data.totalInstructors.current);
          if (data.totalInstructors.deltaPercent != null) {
            data.totalInstructors.deltaPercent = fix2(data.totalInstructors.deltaPercent);
          }
        }
        if (data.avgCourseRating) {
          data.avgCourseRating.current = fix2(data.avgCourseRating.current);
          if (data.avgCourseRating.deltaPercent != null) {
            data.avgCourseRating.deltaPercent = fix2(data.avgCourseRating.deltaPercent);
          }
        }
        if (data.completionRate) {
          data.completionRate.current = fix2(data.completionRate.current);
          if (data.completionRate.deltaPercent != null) {
            data.completionRate.deltaPercent = fix2(data.completionRate.deltaPercent);
          }
        }
        if (data.refundRate) {
          data.refundRate.current = fix2(data.refundRate.current);
          if (data.refundRate.deltaPercent != null) {
            data.refundRate.deltaPercent = fix2(data.refundRate.deltaPercent);
          }
        }

        return data;
      };

      // If the response is already in { success, data } format, return it
      if (response && typeof response === "object" && "success" in response && "data" in response) {
        response.data = normalizeAnalyticsData(response.data);
        return response as ApiResponse<AnalyticsDashboardResponse>;
      }
      // Otherwise, wrap the bare response in the standard ApiResponse envelope
      const normalizedData = normalizeAnalyticsData(response);
      return {
        success: true,
        data: normalizedData as AnalyticsDashboardResponse,
      };
    } catch (err: any) {
      console.error("Failed to fetch admin analytics:", err);
      return {
        success: false,
        data: null as any,
        message: err.message || "Failed to fetch analytics",
      };
    }
  },

  async getRevenueTrend(period: AnalyticsPeriod = "month"): Promise<ApiResponse<RevenueTrendPoint[]>> {
    if (MOCK_MODE) return delay({ success: true, data: mockRevenueTrend });
    return apiClient.get<ApiResponse<RevenueTrendPoint[]>>(`${BASE}/revenue-trend`, { params: { period } });
  },

  async getEnrollments(period: AnalyticsPeriod = "month"): Promise<ApiResponse<EnrollmentPoint[]>> {
    if (MOCK_MODE) return delay({ success: true, data: mockEnrollments });
    return apiClient.get<ApiResponse<EnrollmentPoint[]>>(`${BASE}/enrollments`, { params: { period } });
  },

  async getRevenueByCategory(period: AnalyticsPeriod = "month"): Promise<ApiResponse<CategoryRevenue[]>> {
    if (MOCK_MODE) return delay({ success: true, data: mockCategories });
    return apiClient.get<ApiResponse<CategoryRevenue[]>>(`${BASE}/revenue-by-category`, { params: { period } });
  },

  async getAcquisitionSources(period: AnalyticsPeriod = "month"): Promise<ApiResponse<AcquisitionSource[]>> {
    // This data is not available in the single backend API response, so we load it from mock data
    return delay({ success: true, data: mockSources });
  },

  async getTopInstructors(period: AnalyticsPeriod = "month"): Promise<ApiResponse<TopInstructor[]>> {
    if (MOCK_MODE) return delay({ success: true, data: mockInstructors });
    return apiClient.get<ApiResponse<TopInstructor[]>>(`${BASE}/top-instructors`, { params: { period } });
  },

  async getTopCourses(period: AnalyticsPeriod = "month"): Promise<ApiResponse<TopCourseRevenue[]>> {
    if (MOCK_MODE) return delay({ success: true, data: mockCourses });
    return apiClient.get<ApiResponse<TopCourseRevenue[]>>(`${BASE}/top-courses`, { params: { period } });
  },

  async getPaymentMethods(period: AnalyticsPeriod = "month"): Promise<ApiResponse<PaymentMethodBreakdown[]>> {
    // This data is not available in the single backend API response, so we load it from mock data
    return delay({ success: true, data: mockPayments });
  },

  async getRevenueByRegion(period: AnalyticsPeriod = "month"): Promise<ApiResponse<RegionRevenue[]>> {
    // This data is not available in the single backend API response, so we load it from mock data
    return delay({ success: true, data: mockRegions });
  },

  async getRefundReasons(period: AnalyticsPeriod = "month"): Promise<ApiResponse<RefundReason[]>> {
    // This data is not available in the single backend API response, so we load it from mock data
    return delay({ success: true, data: mockRefunds });
  },
};

export default adminAnalyticsService;
