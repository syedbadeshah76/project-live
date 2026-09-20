// ============= Services Index =============
// Central export for all API services

export { authService } from './auth.service';
export { coursesService } from './courses.service';
export { enrollmentService } from './enrollment.service';
export { usersService } from './users.service';
export { categoriesService } from './categories.service';
export { analyticsService } from './analytics.service';
export { notificationsService } from './notifications.service';
export { paymentsService } from './payments.service';
export { adminService } from './admin.service';
export { uploadService } from './upload.service';
export { searchService } from './search.service';
export { certificatesService } from './certificates.service';
export { quizService } from './quiz.service';
export { couponService } from './coupon.service';
export { revenueService } from './revenue.service';
export { meetingService } from './meeting.service';
export { razorpayService } from './razorpay.service';

// Re-export types for convenience
export type * from '@/types/api.types';
