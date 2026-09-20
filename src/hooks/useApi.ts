// ============= React Query Hooks for LMS =============
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { coursesService } from '@/services/courses.service';
import { enrollmentService } from '@/services/enrollment.service';
import { usersService } from '@/services/users.service';
import { categoriesService } from '@/services/categories.service';
import { analyticsService } from '@/services/analytics.service';
import { notificationsService } from '@/services/notifications.service';
import { paymentsService } from '@/services/payments.service';
import type {
  Course,
  Enrollment,
  UserProfile,
  UserSettings,
  Category,
  UserAnalytics,
  AdminAnalytics,
  Notification,
  SearchFilters,
  PaginationParams,
  CreateReviewRequest,
} from '@/types/api.types';
import { toast } from 'sonner';

// ============= Query Keys =============
export const queryKeys = {
  // Courses
  courses: ['courses'] as const,
  coursesList: (filters?: SearchFilters, pagination?: PaginationParams) =>
    [...queryKeys.courses, 'list', filters, pagination] as const,
  course: (id: string) => [...queryKeys.courses, id] as const,
  courseCurriculum: (id: string) => [...queryKeys.courses, id, 'curriculum'] as const,
  courseReviews: (id: string) => [...queryKeys.courses, id, 'reviews'] as const,
  featuredCourses: () => [...queryKeys.courses, 'featured'] as const,
  relatedCourses: (id: string) => [...queryKeys.courses, id, 'related'] as const,

  // Enrollments
  enrollments: ['enrollments'] as const,
  enrollment: (courseId: string) => [...queryKeys.enrollments, courseId] as const,
  enrollmentCheck: (courseId: string) => [...queryKeys.enrollments, 'check', courseId] as const,
  progress: (courseId: string) => [...queryKeys.enrollments, courseId, 'progress'] as const,

  // Users
  users: ['users'] as const,
  userProfile: () => [...queryKeys.users, 'profile'] as const,
  userSettings: () => [...queryKeys.users, 'settings'] as const,
  adminUsers: (filters?: Record<string, unknown>) => [...queryKeys.users, 'admin', filters] as const,

  // Categories
  categories: ['categories'] as const,
  category: (id: string) => [...queryKeys.categories, id] as const,
  popularCategories: () => [...queryKeys.categories, 'popular'] as const,

  // Analytics
  analytics: ['analytics'] as const,
  userAnalytics: (period?: string) => [...queryKeys.analytics, 'user', period] as const,
  adminAnalytics: (period?: string) => [...queryKeys.analytics, 'admin', period] as const,
  streak: () => [...queryKeys.analytics, 'streak'] as const,

  // Notifications
  notifications: ['notifications'] as const,
  unreadCount: () => [...queryKeys.notifications, 'unread'] as const,

  // Payments
  payments: ['payments'] as const,
  orders: () => [...queryKeys.payments, 'orders'] as const,
  order: (id: string) => [...queryKeys.payments, 'order', id] as const,
};

// ============= Course Hooks =============
export function useCourses(filters?: SearchFilters, pagination?: PaginationParams) {
  return useQuery({
    queryKey: queryKeys.coursesList(filters, pagination),
    queryFn: () => coursesService.getCourses(filters, pagination),
  });
}

export function useCourse(id: string) {
  return useQuery({
    queryKey: queryKeys.course(id),
    queryFn: () => coursesService.getCourse(id),
    enabled: !!id,
  });
}

export function useFeaturedCourses() {
  return useQuery({
    queryKey: queryKeys.featuredCourses(),
    queryFn: () => coursesService.getFeaturedCourses(),
  });
}

export function useCourseCurriculum(courseId: string) {
  return useQuery({
    queryKey: queryKeys.courseCurriculum(courseId),
    queryFn: () => coursesService.getCourseCurriculum(courseId),
    enabled: !!courseId,
  });
}

export function useCourseReviews(courseId: string, pagination?: PaginationParams) {
  return useQuery({
    queryKey: queryKeys.courseReviews(courseId),
    queryFn: () => coursesService.getCourseReviews(courseId, pagination),
    enabled: !!courseId,
  });
}

export function useRelatedCourses(courseId: string) {
  return useQuery({
    queryKey: queryKeys.relatedCourses(courseId),
    queryFn: () => coursesService.getRelatedCourses(courseId),
    enabled: !!courseId,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReviewRequest) => coursesService.createReview(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courseReviews(variables.courseId) });
      toast.success('Review submitted successfully!');
    },
    onError: () => {
      toast.error('Failed to submit review');
    },
  });
}

// ============= Enrollment Hooks =============
export function useMyEnrollments(status?: 'active' | 'completed' | 'all') {
  return useQuery({
    queryKey: [...queryKeys.enrollments, status],
    queryFn: () => enrollmentService.getMyEnrollments(undefined, status),
  });
}

export function useEnrollment(courseId: string) {
  return useQuery({
    queryKey: queryKeys.enrollment(courseId),
    queryFn: () => enrollmentService.getEnrollment(courseId),
    enabled: !!courseId,
  });
}

export function useEnrollmentCheck(courseId: string) {
  return useQuery({
    queryKey: queryKeys.enrollmentCheck(courseId),
    queryFn: () => enrollmentService.checkEnrollment(courseId),
    enabled: !!courseId,
  });
}

export function useCourseProgress(courseId: string) {
  return useQuery({
    queryKey: queryKeys.progress(courseId),
    queryFn: () => enrollmentService.getCourseProgress(courseId),
    enabled: !!courseId,
  });
}

export function useEnrollInCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ courseId, paymentId }: { courseId: string; paymentId?: string }) =>
      enrollmentService.enrollInCourse(courseId, paymentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollments });
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollmentCheck(variables.courseId) });
      toast.success('Successfully enrolled in the course!');
    },
    onError: () => {
      toast.error('Failed to enroll in course');
    },
  });
}

export function useMarkLessonComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ courseId, lessonId }: { courseId: string; lessonId: string }) =>
      enrollmentService.markLessonComplete(courseId, lessonId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progress(variables.courseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollment(variables.courseId) });
    },
  });
}

// ============= User Hooks =============
export function useUserProfile() {
  return useQuery({
    queryKey: queryKeys.userProfile(),
    queryFn: () => usersService.getProfile(),
  });
}

export function useUserSettings() {
  return useQuery({
    queryKey: queryKeys.userSettings(),
    queryFn: () => usersService.getSettings(),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<UserProfile>) => usersService.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userProfile() });
      toast.success('Profile updated successfully!');
    },
    onError: () => {
      toast.error('Failed to update profile');
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<UserSettings>) => usersService.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userSettings() });
      toast.success('Settings saved!');
    },
    onError: () => {
      toast.error('Failed to save settings');
    },
  });
}

// ============= Category Hooks =============
export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => categoriesService.getCategories(),
  });
}

export function usePopularCategories(limit = 6) {
  return useQuery({
    queryKey: queryKeys.popularCategories(),
    queryFn: () => (categoriesService as any).getPopularCategories?.(limit) ?? categoriesService.getCategories(),
  });
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: queryKeys.category(id),
    queryFn: () => (categoriesService as any).getCategory?.(id) ?? categoriesService.getCategories(),
    enabled: !!id,
  });
}

// ============= Analytics Hooks =============
export function useUserAnalytics(period: 'week' | 'month' | 'year' | 'all' = 'month') {
  return useQuery({
    queryKey: queryKeys.userAnalytics(period),
    queryFn: () => analyticsService.getUserAnalytics(period),
  });
}

export function useStreak() {
  return useQuery({
    queryKey: queryKeys.streak(),
    queryFn: () => analyticsService.getStreak(),
  });
}

export function useAdminAnalytics(period: 'week' | 'month' | 'quarter' | 'year' = 'month') {
  return useQuery({
    queryKey: queryKeys.adminAnalytics(period),
    queryFn: () => analyticsService.getAdminAnalytics(period),
  });
}

// ============= Notification Hooks =============
export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => notificationsService.getNotifications(),
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: queryKeys.unreadCount(),
    queryFn: () => notificationsService.getUnreadCount(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => notificationsService.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount() });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount() });
    },
  });
}

// ============= Payment Hooks =============
export function useOrders() {
  return useQuery({
    queryKey: queryKeys.orders(),
    queryFn: () => paymentsService.getOrders(),
  });
}

export function useOrder(orderId: string) {
  return useQuery({
    queryKey: queryKeys.order(orderId),
    queryFn: () => paymentsService.getOrder(orderId),
    enabled: !!orderId,
  });
}

export function useCreatePaymentIntent() {
  return useMutation({
    mutationFn: ({ courseId, couponCode }: { courseId: string; couponCode?: string }) =>
      paymentsService.createPaymentIntent(courseId, couponCode),
    onError: () => {
      toast.error('Failed to initialize payment');
    },
  });
}

export function useApplyCoupon() {
  return useMutation({
    mutationFn: ({ courseId, couponCode }: { courseId: string; couponCode: string }) =>
      paymentsService.applyCoupon(courseId, couponCode),
    onSuccess: (data) => {
      toast.success(`Coupon applied! ${data.data.discount}% off`);
    },
    onError: () => {
      toast.error('Invalid coupon code');
    },
  });
}
