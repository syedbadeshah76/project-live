// ============= Users Service =============
import { apiClient } from '@/lib/api-client';
import type {
  ApiResponse,
  User,
  UserProfile,
  UserSettings,
  PaginationParams,
  PaginationMeta,
} from '@/types/api.types';

const MOCK_MODE = true;

const mockUsers: User[] = [
  {
    id: '1',
    name: 'John Student',
    email: 'student@Edvanz.com',
    role: 'student',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    phone: '+1 234 567 890',
    bio: 'Passionate learner interested in web development and AI.',
    enrolledCourses: ['1', '2', '3'],
    completedCourses: ['4'],
    certificates: ['cert-1'],
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15',
    isActive: true,
    lastLogin: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Admin User',
    email: 'admin@Edvanz.com',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    createdAt: '2023-06-01',
    updatedAt: '2023-06-01',
    isActive: true,
  },
  {
    id: '3',
    name: 'Sarah Johnson',
    email: 'sarah@Edvanz.com',
    role: 'instructor',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    bio: 'Senior React Developer with 10+ years of experience.',
    createdAt: '2023-08-15',
    updatedAt: '2023-08-15',
    isActive: true,
  },
];

// Student-only profile (includes streak)
const mockStudentProfile: UserProfile = {
  ...mockUsers[0],
  totalWatchTime: 4820,
  coursesInProgress: 3,
  coursesCompleted: 5,
  certificatesEarned: 4,
  streak: {
    currentStreak: 7,
    longestStreak: 14,
    coins: 120,
  },
  achievements: [
    { id: '1', title: 'First Course', description: 'Completed your first course', icon: 'trophy', earnedAt: '2024-01-20', type: 'badge' },
    { id: '2', title: 'Quick Learner', description: 'Completed 5 lessons in one day', icon: 'zap', earnedAt: '2024-01-22', type: 'badge' },
    { id: '3', title: '7-Day Streak', description: 'Learned for 7 consecutive days', icon: 'flame', earnedAt: '2024-01-25', type: 'milestone' },
  ],
};

// Admin profile — no streak, focused on platform stewardship
const mockAdminProfile: UserProfile = {
  ...mockUsers[1],
  totalWatchTime: 0,
  coursesInProgress: 0,
  coursesCompleted: 0,
  certificatesEarned: 0,
  achievements: [
    { id: 'a1', title: 'Platform Steward', description: 'Approved 100+ instructors', icon: 'shield', earnedAt: '2024-03-10', type: 'milestone' },
  ],
};

// Instructor profile — no streak, focused on teaching metrics
const mockInstructorProfile: UserProfile = {
  ...mockUsers[2],
  totalWatchTime: 0,
  coursesInProgress: 0,
  coursesCompleted: 14, // courses authored
  certificatesEarned: 0,
  achievements: [
    { id: 'i1', title: 'Top Instructor', description: 'Maintained 4.8+ rating across 10 courses', icon: 'award', earnedAt: '2024-02-15', type: 'badge' },
    { id: 'i2', title: '1000 Students', description: 'Reached 1,000+ enrolled students', icon: 'users', earnedAt: '2024-04-01', type: 'milestone' },
  ],
};

// Default for legacy callers (returns student profile)
const mockUserProfile: UserProfile = mockStudentProfile;

const mockUserSettings: UserSettings = {
  userId: '1',
  notifications: {
    email: true,
    push: true,
    courseUpdates: true,
    promotions: false,
    achievements: true,
  },
  privacy: {
    showProfile: true,
    showProgress: true,
    showCertificates: true,
  },
  preferences: {
    language: 'en',
    timezone: 'America/New_York',
    autoplayVideos: true,
    videoQuality: 'auto',
    playbackSpeed: 1,
    subtitles: false,
  },
};

// In-memory OTP store for mock mode (key = phone or email)
const mockOtpStore: Record<string, string> = {};

export const usersService = {
  // ============= OTP Verification =============
  // Backend: POST /users/verify/phone/send  body: { phone }
  async sendPhoneOtp(phone: string): Promise<ApiResponse<{ sent: boolean }>> {
    if (MOCK_MODE) {
      await new Promise((r) => setTimeout(r, 400));
      mockOtpStore[phone] = "1234"; // mock fixed OTP
      return { success: true, data: { sent: true } };
    }
    return apiClient.post<ApiResponse<{ sent: boolean }>>('/users/verify/phone/send', { phone });
  },

  // Backend: POST /users/verify/phone/confirm  body: { phone, otp }
  async verifyPhoneOtp(phone: string, otp: string): Promise<ApiResponse<{ verified: boolean }>> {
    if (MOCK_MODE) {
      await new Promise((r) => setTimeout(r, 500));
      const ok = mockOtpStore[phone] === otp || otp === "1234";
      return { success: ok, data: { verified: ok }, message: ok ? undefined : "Invalid OTP" };
    }
    return apiClient.post<ApiResponse<{ verified: boolean }>>('/users/verify/phone/confirm', { phone, otp });
  },

  // Backend: POST /users/verify/email/send  body: { email }
  async sendEmailOtp(email: string): Promise<ApiResponse<{ sent: boolean }>> {
    if (MOCK_MODE) {
      await new Promise((r) => setTimeout(r, 400));
      mockOtpStore[email] = "1234";
      return { success: true, data: { sent: true } };
    }
    return apiClient.post<ApiResponse<{ sent: boolean }>>('/users/verify/email/send', { email });
  },

  // Backend: POST /users/verify/email/confirm  body: { email, otp }
  async verifyEmailOtp(email: string, otp: string): Promise<ApiResponse<{ verified: boolean }>> {
    if (MOCK_MODE) {
      await new Promise((r) => setTimeout(r, 500));
      const ok = mockOtpStore[email] === otp || otp === "1234";
      return { success: ok, data: { verified: ok }, message: ok ? undefined : "Invalid OTP" };
    }
    return apiClient.post<ApiResponse<{ verified: boolean }>>('/users/verify/email/confirm', { email, otp });
  },


  // Get current user profile (role-aware in mock mode)
  async getProfile(): Promise<ApiResponse<UserProfile>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      // Resolve role from persisted auth so the right profile flavor is returned
      try {
        const stored = localStorage.getItem('Edvanz_user');
        const role = stored ? (JSON.parse(stored)?.role as 'student' | 'admin' | 'instructor') : 'student';
        if (role === 'admin') return { success: true, data: mockAdminProfile };
        if (role === 'instructor') return { success: true, data: mockInstructorProfile };
        return { success: true, data: mockStudentProfile };
      } catch {
        return { success: true, data: mockStudentProfile };
      }
    }

    return apiClient.get<ApiResponse<UserProfile>>('/users/profile');
  },

  // Update user profile
  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return {
        success: true,
        data: { ...mockUsers[0], ...data },
      };
    }

    return apiClient.put<ApiResponse<User>>('/users/profile', data);
  },

  // Upload avatar
  async uploadAvatar(file: File): Promise<ApiResponse<{ avatarUrl: string }>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return {
        success: true,
        data: { avatarUrl: URL.createObjectURL(file) },
      };
    }

    return apiClient.uploadFile<ApiResponse<{ avatarUrl: string }>>('/users/avatar', file, 'avatar');
  },

  // Get user settings
  async getSettings(): Promise<ApiResponse<UserSettings>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return { success: true, data: mockUserSettings };
    }

    return apiClient.get<ApiResponse<UserSettings>>('/users/settings');
  },

  // Update user settings
  async updateSettings(data: Partial<UserSettings>): Promise<ApiResponse<UserSettings>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return {
        success: true,
        data: { ...mockUserSettings, ...data },
      };
    }

    return apiClient.put<ApiResponse<UserSettings>>('/users/settings', data);
  },

  // Delete account
  async deleteAccount(password?: string, reason?: string): Promise<ApiResponse<{ message: string }>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { success: true, data: { message: 'Account deleted successfully' } };
    }

    const payload: Record<string, string> = {};
    if (reason) payload.reason = reason;
    if (password) payload.password = password;

    return apiClient.delete<ApiResponse<{ message: string }>>('/users/me', {
      data: payload,
    });
  },

  // Admin: Get all users
  async getAllUsers(
    pagination?: PaginationParams,
    filters?: { role?: string; status?: string; search?: string }
  ): Promise<ApiResponse<User[]> & { meta: PaginationMeta }> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      let filtered = [...mockUsers];
      
      if (filters?.role) {
        filtered = filtered.filter((u) => u.role === filters.role);
      }
      
      if (filters?.status) {
        filtered = filtered.filter((u) => 
          filters.status === 'active' ? u.isActive : !u.isActive
        );
      }
      
      if (filters?.search) {
        const search = filters.search.toLowerCase();
        filtered = filtered.filter((u) =>
          u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search)
        );
      }

      return {
        success: true,
        data: filtered,
        meta: {
          currentPage: 1,
          totalPages: 1,
          totalItems: filtered.length,
          itemsPerPage: 10,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }

    return apiClient.get<ApiResponse<User[]> & { meta: PaginationMeta }>('/admin/users', {
      params: { ...pagination, ...filters },
    });
  },

  // Admin: Get single user
  async getUser(userId: string): Promise<ApiResponse<UserProfile>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const user = mockUsers.find((u) => u.id === userId);
      if (!user) {
        throw { success: false, message: 'User not found', statusCode: 404 };
      }
      return { success: true, data: { ...mockUserProfile, ...user } };
    }

    return apiClient.get<ApiResponse<UserProfile>>(`/admin/users/${userId}`);
  },

  // Admin: Update user status
  async updateUserStatus(userId: string, isActive: boolean): Promise<ApiResponse<User>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const user = mockUsers.find((u) => u.id === userId);
      if (!user) {
        throw { success: false, message: 'User not found', statusCode: 404 };
      }
      return { success: true, data: { ...user, isActive } };
    }

    return apiClient.patch<ApiResponse<User>>(`/admin/users/${userId}/status`, { isActive });
  },

  // Admin: Update user role
  async updateUserRole(userId: string, role: 'student' | 'admin' | 'instructor'): Promise<ApiResponse<User>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const user = mockUsers.find((u) => u.id === userId);
      if (!user) {
        throw { success: false, message: 'User not found', statusCode: 404 };
      }
      return { success: true, data: { ...user, role } };
    }

    return apiClient.patch<ApiResponse<User>>(`/admin/users/${userId}/role`, { role });
  },

  // Admin: Delete user
  async deleteUser(userId: string): Promise<ApiResponse<{ message: string }>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { success: true, data: { message: 'User deleted successfully' } };
    }

    return apiClient.delete<ApiResponse<{ message: string }>>(`/admin/users/${userId}`);
  },
};
