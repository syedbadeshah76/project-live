// ============= Instructor Revenue Service =============

import apiClient from "@/lib/api-client";
import type { ApiResponse, PaginationMeta } from "@/types/api.types";
import type {
  RevenueStats,
  CourseRevenue,
  PayoutBreakdown,
  RevenueTransaction,
  RevenueTrendPoint,
  RevenueOverview,
  TransactionQueryParams,
} from "@/types/revenue.types";

const BASE = "/instructor/revenue";

const emptyStats: RevenueStats = {
  totalRevenue: 0,
  pendingPayout: 0,
  thisMonthRevenue: 0,
  transactions: 0,
};

const emptyBreakdown: PayoutBreakdown = {
  totalRevenue: 0,
  platformFee: 0,
  platformFeePercent: 30,
  instructorEarnings: 0,
  completedPayouts: 0,
  pendingPayout: 0,
  nextPayoutDate: new Date().toISOString().slice(0, 10),
  payoutCycleDays: 15,
};

const unwrap = <T>(res: any): T => {
  if (res && typeof res === "object" && "data" in res && res.data !== undefined) {
    return res.data as T;
  }
  return res as T;
};

export const revenueService = {
  async getOverview(): Promise<RevenueOverview> {
    try {
      const res = await apiClient.get<any>(`${BASE}/overview`);
      const data = unwrap<any>(res);
      if (data && typeof data === "object") {
        return {
          stats: {
            totalRevenue: Number(data.stats?.totalRevenue ?? data.totalRevenue ?? 0),
            pendingPayout: Number(data.stats?.pendingPayout ?? data.pendingPayout ?? 0),
            thisMonthRevenue: Number(data.stats?.thisMonthRevenue ?? data.thisMonthRevenue ?? 0),
            transactions: Number(data.stats?.transactions ?? data.transactions ?? 0),
          },
          breakdown: {
            totalRevenue: Number(data.breakdown?.totalRevenue ?? data.totalRevenue ?? 0),
            platformFee: Number(data.breakdown?.platformFee ?? data.platformFee ?? 0),
            platformFeePercent: Number(data.breakdown?.platformFeePercent ?? 30),
            instructorEarnings: Number(data.breakdown?.instructorEarnings ?? data.yourEarnings ?? 0),
            completedPayouts: Number(data.breakdown?.completedPayouts ?? 0),
            pendingPayout: Number(data.breakdown?.pendingPayout ?? 0),
            nextPayoutDate: data.breakdown?.nextPayoutDate || new Date().toISOString().slice(0, 10),
            payoutCycleDays: Number(data.breakdown?.payoutCycleDays ?? 15),
          },
          revenueByCourse: Array.isArray(data.revenueByCourse)
            ? data.revenueByCourse.map((c: any) => ({
                courseId: String(c.courseId || c.id || ""),
                courseTitle: String(c.courseTitle || c.title || "Course"),
                sales: Number(c.sales ?? c.enrolledCount ?? 0),
                revenue: Number(c.revenue ?? 0),
              }))
            : [],
          trend: Array.isArray(data.trend ?? data.revenueTrend)
            ? (data.trend ?? data.revenueTrend).map((t: any) => ({
                month: String(t.month || t.label || ""),
                revenue: Number(t.revenue ?? t.amount ?? 0),
              }))
            : [],
        };
      }
    } catch (err) {
      console.error("Failed to load revenue overview from API, defaulting to empty:", err);
    }
    return {
      stats: emptyStats,
      breakdown: emptyBreakdown,
      revenueByCourse: [],
      trend: [],
    };
  },

  async getStats(): Promise<RevenueStats> {
    try {
      const res = await apiClient.get<any>(`${BASE}/stats`);
      const data = unwrap<any>(res);
      if (data && typeof data === "object") {
        return {
          totalRevenue: Number(data.totalRevenue ?? 0),
          pendingPayout: Number(data.pendingPayout ?? 0),
          thisMonthRevenue: Number(data.thisMonthRevenue ?? 0),
          transactions: Number(data.transactions ?? 0),
        };
      }
    } catch {
      /* non-fatal */
    }
    return emptyStats;
  },

  async getRevenueByCourse(): Promise<CourseRevenue[]> {
    try {
      const res = await apiClient.get<any>(`${BASE}/by-course`);
      const data = unwrap<any>(res);
      if (Array.isArray(data)) {
        return data.map((c: any) => ({
          courseId: String(c.courseId || c.id || ""),
          courseTitle: String(c.courseTitle || c.title || "Course"),
          sales: Number(c.sales ?? c.enrolledCount ?? 0),
          revenue: Number(c.revenue ?? 0),
        }));
      }
    } catch {
      /* non-fatal */
    }
    return [];
  },

  async getPayoutBreakdown(): Promise<PayoutBreakdown> {
    try {
      const res = await apiClient.get<any>(`${BASE}/payout-breakdown`);
      const data = unwrap<any>(res);
      if (data && typeof data === "object") {
        return {
          totalRevenue: Number(data.totalRevenue ?? 0),
          platformFee: Number(data.platformFee ?? 0),
          platformFeePercent: Number(data.platformFeePercent ?? 30),
          instructorEarnings: Number(data.instructorEarnings ?? 0),
          completedPayouts: Number(data.completedPayouts ?? 0),
          pendingPayout: Number(data.pendingPayout ?? 0),
          nextPayoutDate: data.nextPayoutDate || new Date().toISOString().slice(0, 10),
          payoutCycleDays: Number(data.payoutCycleDays ?? 15),
        };
      }
    } catch {
      /* non-fatal */
    }
    return emptyBreakdown;
  },

  async getRevenueTrend(period: "6m" | "12m" = "6m"): Promise<RevenueTrendPoint[]> {
    try {
      const res = await apiClient.get<any>(`${BASE}/trend`, { params: { period } });
      const data = unwrap<any>(res);
      if (Array.isArray(data)) {
        return data.map((t: any) => ({
          month: String(t.month || t.label || ""),
          revenue: Number(t.revenue ?? t.amount ?? 0),
        }));
      }
    } catch {
      /* non-fatal */
    }
    return [];
  },

  async getTransactions(
    params: TransactionQueryParams = {},
  ): Promise<{ items: RevenueTransaction[]; meta?: PaginationMeta }> {
    try {
      const res = await apiClient.get<any>(`${BASE}/transactions`, { params });
      const data = unwrap<any>(res);
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.content)
        ? data.content
        : [];
      return {
        items: items.map((t: any) => ({
          id: String(t.id || ""),
          studentId: String(t.studentId || t.userId || ""),
          studentName: String(t.studentName || t.name || t.userName || "Student"),
          courseId: String(t.courseId || ""),
          courseTitle: String(t.courseTitle || t.courseName || "Course"),
          amount: Number(t.amount ?? 0),
          date: String(t.date || t.createdAt || new Date().toISOString().slice(0, 10)),
          status: t.status || "completed",
        })),
        meta: (res as any)?.meta,
      };
    } catch {
      /* non-fatal */
    }
    return {
      items: [],
      meta: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 10,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  },
};

export default revenueService;
