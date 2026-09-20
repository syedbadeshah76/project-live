// ============= Analytics Service =============
import { apiClient } from '@/lib/api-client';
import type { ApiResponse, UserAnalytics, AdminAnalytics } from '@/types/api.types';

const MOCK_MODE = true;

const mockUserAnalytics: UserAnalytics = {
  userId: '1',
  period: 'month',
  totalWatchTime: 4820,
  coursesEnrolled: 8,
  coursesCompleted: 5,
  lessonsCompleted: 156,
  averageQuizScore: 87,
  streak: 12,
  weeklyActivity: [
    { day: 'Mon', hours: 2.5, lessonsCompleted: 4 },
    { day: 'Tue', hours: 1.8, lessonsCompleted: 3 },
    { day: 'Wed', hours: 3.2, lessonsCompleted: 5 },
    { day: 'Thu', hours: 2.0, lessonsCompleted: 3 },
    { day: 'Fri', hours: 1.5, lessonsCompleted: 2 },
    { day: 'Sat', hours: 4.0, lessonsCompleted: 6 },
    { day: 'Sun', hours: 3.5, lessonsCompleted: 5 },
  ],
  monthlyProgress: [
    { month: 'Jan', coursesCompleted: 1, hoursSpent: 45 },
    { month: 'Feb', coursesCompleted: 2, hoursSpent: 62 },
    { month: 'Mar', coursesCompleted: 1, hoursSpent: 38 },
    { month: 'Apr', coursesCompleted: 1, hoursSpent: 52 },
    { month: 'May', coursesCompleted: 0, hoursSpent: 28 },
    { month: 'Jun', coursesCompleted: 2, hoursSpent: 71 },
  ],
  categoryDistribution: [
    { category: 'Web Development', count: 3, percentage: 35 },
    { category: 'Data Science', count: 2, percentage: 25 },
    { category: 'UI/UX Design', count: 2, percentage: 20 },
    { category: 'Cloud Computing', count: 1, percentage: 12 },
    { category: 'DevOps', count: 1, percentage: 8 },
  ],
};

const mockAdminAnalytics: AdminAnalytics = {
  overview: {
    totalUsers: 52450,
    totalCourses: 248,
    totalEnrollments: 128500,
    totalRevenue: 1245000,
    activeUsers: 18320,
    completionRate: 67.5,
  },
  userGrowth: [
    { date: '2024-01', users: 42000 },
    { date: '2024-02', users: 44500 },
    { date: '2024-03', users: 46200 },
    { date: '2024-04', users: 48100 },
    { date: '2024-05', users: 50300 },
    { date: '2024-06', users: 52450 },
  ],
  enrollmentTrends: [
    { date: '2024-01', enrollments: 8500 },
    { date: '2024-02', enrollments: 9200 },
    { date: '2024-03', enrollments: 10100 },
    { date: '2024-04', enrollments: 11500 },
    { date: '2024-05', enrollments: 12800 },
    { date: '2024-06', enrollments: 14200 },
  ],
  revenueByMonth: [
    { month: 'Jan', revenue: 185000 },
    { month: 'Feb', revenue: 198000 },
    { month: 'Mar', revenue: 212000 },
    { month: 'Apr', revenue: 225000 },
    { month: 'May', revenue: 245000 },
    { month: 'Jun', revenue: 268000 },
  ],
  topCourses: [],
  categoryStats: [
    { category: 'Web Development', courses: 45, enrollments: 28500 },
    { category: 'Data Science', courses: 38, enrollments: 24200 },
    { category: 'UI/UX Design', courses: 28, enrollments: 18400 },
    { category: 'Cloud Computing', courses: 35, enrollments: 16800 },
    { category: 'Cyber Security', courses: 22, enrollments: 12500 },
    { category: 'DevOps', courses: 20, enrollments: 10200 },
  ],
};

export const analyticsService = {
  // Get user learning analytics
  async getUserAnalytics(
    period: 'week' | 'month' | 'year' | 'all' = 'month'
  ): Promise<ApiResponse<UserAnalytics>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return { success: true, data: { ...mockUserAnalytics, period } };
    }

    return apiClient.get<ApiResponse<UserAnalytics>>('/analytics/user', {
      params: { period },
    });
  },

  // Get learning streak
  async getStreak(): Promise<ApiResponse<{ currentStreak: number; longestStreak: number }>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      return {
        success: true,
        data: { currentStreak: 12, longestStreak: 28 },
      };
    }

    return apiClient.get<ApiResponse<{ currentStreak: number; longestStreak: number }>>('/analytics/streak');
  },

  // Get achievements
  async getAchievements(): Promise<ApiResponse<{ earned: number; total: number; recent: string[] }>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return {
        success: true,
        data: {
          earned: 12,
          total: 25,
          recent: ['First Course', 'Quick Learner', '7-Day Streak'],
        },
      };
    }

    return apiClient.get<ApiResponse<{ earned: number; total: number; recent: string[] }>>('/analytics/achievements');
  },

  // Admin: Get platform analytics
  async getAdminAnalytics(
    period: 'week' | 'month' | 'quarter' | 'year' = 'month'
  ): Promise<ApiResponse<AdminAnalytics>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      return { success: true, data: mockAdminAnalytics };
    }

    return apiClient.get<ApiResponse<AdminAnalytics>>('/admin/analytics', {
      params: { period },
    });
  },

  // Admin: Get revenue analytics
  async getRevenueAnalytics(
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<{ total: number; byMonth: { month: string; revenue: number }[] }>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return {
        success: true,
        data: {
          total: 1245000,
          byMonth: mockAdminAnalytics.revenueByMonth,
        },
      };
    }

    return apiClient.get<ApiResponse<{ total: number; byMonth: { month: string; revenue: number }[] }>>(
      '/admin/analytics/revenue',
      { params: { startDate, endDate } }
    );
  },

  // Admin: Get user activity stats
  async getUserActivityStats(): Promise<ApiResponse<{ dailyActive: number; weeklyActive: number; monthlyActive: number }>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return {
        success: true,
        data: {
          dailyActive: 5420,
          weeklyActive: 12800,
          monthlyActive: 18320,
        },
      };
    }

    return apiClient.get<ApiResponse<{ dailyActive: number; weeklyActive: number; monthlyActive: number }>>(
      '/admin/analytics/activity'
    );
  },

  // Admin: Get course performance
  async getCoursePerformance(
    courseId?: string
  ): Promise<ApiResponse<{ enrollments: number; completions: number; revenue: number; rating: number }[]>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return {
        success: true,
        data: [
          { enrollments: 12450, completions: 8200, revenue: 125000, rating: 4.9 },
          { enrollments: 8320, completions: 5100, revenue: 89000, rating: 4.8 },
          { enrollments: 6780, completions: 4200, revenue: 72000, rating: 4.7 },
        ],
      };
    }

    return apiClient.get<ApiResponse<{ enrollments: number; completions: number; revenue: number; rating: number }[]>>(
      '/admin/analytics/courses',
      { params: { courseId } }
    );
  },

  // Admin: Export analytics report
  async exportReport(
    type: 'users' | 'courses' | 'revenue' | 'all',
    format: 'csv' | 'pdf' = 'csv'
  ): Promise<ApiResponse<{ downloadUrl: string }>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return {
        success: true,
        data: { downloadUrl: `/reports/analytics-${type}-${Date.now()}.${format}` },
      };
    }

    return apiClient.post<ApiResponse<{ downloadUrl: string }>>('/admin/analytics/export', { type, format });
  },
};
