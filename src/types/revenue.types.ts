// ============= Revenue Types (Instructor) =============

export interface RevenueStats {
  totalRevenue: number;
  pendingPayout: number;
  thisMonthRevenue: number;
  transactions: number;
}

export interface CourseRevenue {
  courseId: string;
  courseTitle: string;
  sales: number;
  revenue: number;
}

export interface PayoutBreakdown {
  totalRevenue: number;
  platformFee: number;          // absolute amount (e.g. 5526)
  platformFeePercent: number;   // e.g. 30
  instructorEarnings: number;
  completedPayouts: number;
  pendingPayout: number;
  nextPayoutDate: string;       // ISO date
  payoutCycleDays: number;      // e.g. 15
}

export type TransactionStatus = "completed" | "pending" | "refunded" | "failed";

export interface RevenueTransaction {
  id: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  amount: number;
  date: string; // ISO
  status: TransactionStatus;
}

export interface RevenueTrendPoint {
  month: string; // "Jan", "Feb", ...
  revenue: number;
}

export interface RevenueOverview {
  stats: RevenueStats;
  breakdown: PayoutBreakdown;
  revenueByCourse: CourseRevenue[];
  trend: RevenueTrendPoint[];
}

export interface TransactionQueryParams {
  page?: number;
  limit?: number;
  status?: TransactionStatus;
  courseId?: string;
  from?: string;
  to?: string;
}
