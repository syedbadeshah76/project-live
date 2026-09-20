// ============= Revenue Service =============
// Endpoints: GET /admin/revenue, GET /admin/revenue/breakdown,
//            GET /admin/revenue/instructor/:id, PUT /admin/revenue/config
import { apiClient } from '@/lib/api-client';
import type { ApiResponse } from '@/lib/api-client';

const MOCK_MODE = true;

// ============= Revenue Types =============
export interface RevenueOverview {
  totalRevenue: number;
  platformShare: number;
  instructorEarnings: number;
  refunds: number;
  netRevenue: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  growthPercentage: number;
}

export interface CourseRevenue {
  courseId: string;
  courseTitle: string;
  instructor: string;
  totalRevenue: number;
  platformShare: number;
  instructorShare: number;
  enrollments: number;
  refunds: number;
}

export interface InstructorRevenue {
  instructorId: string;
  instructorName: string;
  avatar: string;
  totalEarnings: number;
  platformFee: number;
  netEarnings: number;
  courses: number;
  students: number;
  pendingPayout: number;
}

export interface RevenueConfig {
  platformPercentage: number;
  instructorPercentage: number;
  minPayout: number;
  payoutFrequency: 'weekly' | 'biweekly' | 'monthly';
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  platformShare: number;
  instructorShare: number;
}

// ============= Mock Data =============
const mockOverview: RevenueOverview = {
  totalRevenue: 1245000, platformShare: 373500, instructorEarnings: 871500,
  refunds: 12450, netRevenue: 1232550, revenueThisMonth: 89500,
  revenueLastMonth: 76200, growthPercentage: 17.5,
};

const mockCourseRevenue: CourseRevenue[] = [
  { courseId: '1', courseTitle: 'Complete React Developer Course 2024', instructor: 'Sarah Johnson', totalRevenue: 325000, platformShare: 97500, instructorShare: 227500, enrollments: 3612, refunds: 45 },
  { courseId: '2', courseTitle: 'Python for Data Science & ML', instructor: 'Michael Chen', totalRevenue: 285000, platformShare: 85500, instructorShare: 199500, enrollments: 3000, refunds: 32 },
  { courseId: '3', courseTitle: 'UI/UX Design Masterclass', instructor: 'Emma Williams', totalRevenue: 198000, platformShare: 59400, instructorShare: 138600, enrollments: 2475, refunds: 18 },
  { courseId: '4', courseTitle: 'AWS Certified Solutions Architect', instructor: 'David Kumar', totalRevenue: 175000, platformShare: 52500, instructorShare: 122500, enrollments: 1750, refunds: 22 },
  { courseId: '5', courseTitle: 'Node.js Complete Guide', instructor: 'Alex Rodriguez', totalRevenue: 142000, platformShare: 42600, instructorShare: 99400, enrollments: 1671, refunds: 15 },
];

const mockInstructorRevenue: InstructorRevenue[] = [
  { instructorId: '3', instructorName: 'Sarah Johnson', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', totalEarnings: 425000, platformFee: 127500, netEarnings: 297500, courses: 5, students: 8420, pendingPayout: 12500 },
  { instructorId: '4', instructorName: 'Michael Chen', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', totalEarnings: 350000, platformFee: 105000, netEarnings: 245000, courses: 4, students: 6800, pendingPayout: 9800 },
  { instructorId: '5', instructorName: 'Emma Williams', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100', totalEarnings: 280000, platformFee: 84000, netEarnings: 196000, courses: 3, students: 5200, pendingPayout: 8200 },
  { instructorId: '6', instructorName: 'David Kumar', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100', totalEarnings: 190000, platformFee: 57000, netEarnings: 133000, courses: 2, students: 3500, pendingPayout: 5600 },
];

const mockMonthlyRevenue: MonthlyRevenue[] = [
  { month: 'Jan', revenue: 85000, platformShare: 25500, instructorShare: 59500 },
  { month: 'Feb', revenue: 92000, platformShare: 27600, instructorShare: 64400 },
  { month: 'Mar', revenue: 78000, platformShare: 23400, instructorShare: 54600 },
  { month: 'Apr', revenue: 110000, platformShare: 33000, instructorShare: 77000 },
  { month: 'May', revenue: 125000, platformShare: 37500, instructorShare: 87500 },
  { month: 'Jun', revenue: 142000, platformShare: 42600, instructorShare: 99400 },
  { month: 'Jul', revenue: 135000, platformShare: 40500, instructorShare: 94500 },
  { month: 'Aug', revenue: 148000, platformShare: 44400, instructorShare: 103600 },
  { month: 'Sep', revenue: 156000, platformShare: 46800, instructorShare: 109200 },
  { month: 'Oct', revenue: 162000, platformShare: 48600, instructorShare: 113400 },
  { month: 'Nov', revenue: 89500, platformShare: 26850, instructorShare: 62650 },
  { month: 'Dec', revenue: 95000, platformShare: 28500, instructorShare: 66500 },
];

const mockConfig: RevenueConfig = {
  platformPercentage: 30, instructorPercentage: 70, minPayout: 50, payoutFrequency: 'monthly',
};

export const revenueService = {
  async getOverview(): Promise<ApiResponse<RevenueOverview>> {
    if (MOCK_MODE) {
      await new Promise((r) => setTimeout(r, 300));
      return { success: true, data: mockOverview };
    }
    return apiClient.get<ApiResponse<RevenueOverview>>('/admin/revenue');
  },

  async getCourseBreakdown(): Promise<ApiResponse<CourseRevenue[]>> {
    if (MOCK_MODE) {
      await new Promise((r) => setTimeout(r, 300));
      return { success: true, data: mockCourseRevenue };
    }
    return apiClient.get<ApiResponse<CourseRevenue[]>>('/admin/revenue/courses');
  },

  async getInstructorRevenue(): Promise<ApiResponse<InstructorRevenue[]>> {
    if (MOCK_MODE) {
      await new Promise((r) => setTimeout(r, 300));
      return { success: true, data: mockInstructorRevenue };
    }
    return apiClient.get<ApiResponse<InstructorRevenue[]>>('/admin/revenue/instructors');
  },

  async getMonthlyRevenue(): Promise<ApiResponse<MonthlyRevenue[]>> {
    if (MOCK_MODE) {
      await new Promise((r) => setTimeout(r, 200));
      return { success: true, data: mockMonthlyRevenue };
    }
    return apiClient.get<ApiResponse<MonthlyRevenue[]>>('/admin/revenue/monthly');
  },

  async getConfig(): Promise<ApiResponse<RevenueConfig>> {
    if (MOCK_MODE) {
      await new Promise((r) => setTimeout(r, 200));
      return { success: true, data: mockConfig };
    }
    return apiClient.get<ApiResponse<RevenueConfig>>('/admin/revenue/config');
  },

  async updateConfig(data: Partial<RevenueConfig>): Promise<ApiResponse<RevenueConfig>> {
    if (MOCK_MODE) {
      await new Promise((r) => setTimeout(r, 400));
      return { success: true, data: { ...mockConfig, ...data } };
    }
    return apiClient.put<ApiResponse<RevenueConfig>>('/admin/revenue/config', data);
  },
};
