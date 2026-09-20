// ============= Admin Service =============
import { apiClient } from '@/lib/api-client';
import { authService } from './auth.service';
import type {
  ApiResponse,
  PlatformSettings,
} from '@/types/api.types';

const MOCK_MODE = true;

const mockPlatformSettings: PlatformSettings = {
  siteName: 'Edvanz',
  siteDescription: 'Master Technology Skills with Expert-Led Courses',
  logo: '/logo.png',
  favicon: '/favicon.ico',
  primaryColor: '#6366f1',
  maintenanceMode: false,
  registrationEnabled: true,
  emailVerificationRequired: true,
  twoFactorEnabled: false,
  paymentGateways: {
    stripe: { enabled: true, publicKey: 'pk_test_xxx' },
    paypal: { enabled: false, clientId: '' },
  },
  socialAuth: {
    google: { enabled: true, clientId: 'xxx.apps.googleusercontent.com' },
    github: { enabled: true, clientId: 'xxx' },
  },
};

export const adminService = {
  // Get platform settings
  async getSettings(): Promise<ApiResponse<PlatformSettings>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return { success: true, data: mockPlatformSettings };
    }

    return apiClient.get<ApiResponse<PlatformSettings>>('/admin/settings');
  },

  // Update platform settings
  async updateSettings(data: Partial<PlatformSettings>): Promise<ApiResponse<PlatformSettings>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { success: true, data: { ...mockPlatformSettings, ...data } };
    }

    return apiClient.put<ApiResponse<PlatformSettings>>('/admin/settings', data);
  },

  // Toggle maintenance mode
  async toggleMaintenanceMode(enabled: boolean): Promise<ApiResponse<{ maintenanceMode: boolean }>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return { success: true, data: { maintenanceMode: enabled } };
    }

    return apiClient.post<ApiResponse<{ maintenanceMode: boolean }>>('/admin/maintenance', { enabled });
  },

  // Get dashboard stats
  async getDashboardStats(): Promise<ApiResponse<{
    totalUsers: number;
    newUsersToday: number;
    totalCourses: number;
    activeCourses: number;
    totalEnrollments: number;
    enrollmentsThisMonth: number;
    totalRevenue: number;
    revenueThisMonth: number;
  }>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return {
        success: true,
        data: {
          totalUsers: 52450,
          newUsersToday: 128,
          totalCourses: 248,
          activeCourses: 215,
          totalEnrollments: 128500,
          enrollmentsThisMonth: 4520,
          totalRevenue: 1245000,
          revenueThisMonth: 89500,
        },
      };
    }

    return apiClient.get<ApiResponse<any>>('/admin/dashboard/stats');
  },

  // Backup database
  async createBackup(): Promise<ApiResponse<{ backupId: string; downloadUrl: string }>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return {
        success: true,
        data: {
          backupId: `backup-${Date.now()}`,
          downloadUrl: '/backups/latest.zip',
        },
      };
    }

    return apiClient.post<ApiResponse<{ backupId: string; downloadUrl: string }>>('/admin/backup');
  },

  // Get system logs
  async getLogs(
    type: 'error' | 'access' | 'security' | 'all' = 'all',
    limit = 100
  ): Promise<ApiResponse<{ timestamp: string; level: string; message: string; meta?: Record<string, unknown> }[]>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      return {
        success: true,
        data: [
          { timestamp: new Date().toISOString(), level: 'info', message: 'User logged in', meta: { userId: '1' } },
          { timestamp: new Date(Date.now() - 60000).toISOString(), level: 'warning', message: 'Rate limit reached' },
          { timestamp: new Date(Date.now() - 120000).toISOString(), level: 'error', message: 'Payment failed' },
        ],
      };
    }

    return apiClient.get<ApiResponse<any[]>>('/admin/logs', { params: { type, limit } });
  },

  // Send announcement to all users
  async sendAnnouncement(data: {
    title: string;
    message: string;
    type: 'email' | 'notification' | 'both';
    targetAudience: 'all' | 'students' | 'instructors';
  }): Promise<ApiResponse<{ sent: number }>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return { success: true, data: { sent: 52450 } };
    }

    return apiClient.post<ApiResponse<{ sent: number }>>('/admin/announcements', data);
  },

  // Get pending instructor applications
  async getInstructorApplications(): Promise<ApiResponse<{
    id: string;
    userId: string;
    name: string;
    email: string;
    bio: string;
    expertise: string[];
    portfolio: string;
    status: 'pending' | 'approved' | 'rejected';
    appliedAt: string;
  }[]>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return {
        success: true,
        data: [
          {
            id: '1',
            userId: '3',
            name: 'John Instructor',
            email: 'instructor@example.com',
            bio: 'Experienced developer with 10+ years in the industry',
            expertise: ['React', 'Node.js', 'Python'],
            portfolio: 'https://portfolio.example.com',
            status: 'pending',
            appliedAt: '2024-01-20',
          },
        ],
      };
    }

    return apiClient.get<ApiResponse<any[]>>('/admin/users/instructors/pending');
  },

  // Approve/reject instructor application
  async reviewInstructorApplication(
    applicationId: string,
    decision: 'approved' | 'rejected',
    feedback?: string
  ): Promise<ApiResponse<{ message: string }>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { success: true, data: { message: `Application ${decision}` } };
    }

    if (decision === 'approved') {
      const res = await authService.approveInstructor(applicationId);
      return { success: true, data: { message: res.message } };
    } else {
      const res = await authService.rejectInstructor(applicationId, feedback || 'Application rejected');
      return { success: true, data: { message: res.message } };
    }
  },
};
