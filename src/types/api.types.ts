// ============= API Types for LMS Platform =============

// Base response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
  statusCode: number;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  [key: string]: string | number | boolean | undefined | null;
}

// ============= User Types =============

export interface User {
  id: string;
  name: string;
  email: string;
  role: "student" | "admin" | "instructor";

  avatar?: string;
  phone?: string;
  bio?: string;

  country?: string;
  city?: string;

  enrolledCourses?: string[];
  completedCourses?: string[];
  certificates?: string[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  lastLogin?: string;
}
export interface UserProfile extends User {
  totalWatchTime: number;
  coursesInProgress: number;
  coursesCompleted: number;
  certificatesEarned: number;
  achievements: Achievement[];
  /**
   * Streak summary (student-only). Backend should omit this for admin/instructor profiles.
   * Full streak data is fetched separately via streakService.getStreakData().
   */
  streak?: {
    currentStreak: number;
    longestStreak: number;
    coins: number;
  };
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: string;
  type: "badge" | "certificate" | "milestone";
}

// ============= Auth Types =============
// ------------new-------------------------------------------------
// ── OTP / Registration (Edvanz backend) ──
export interface SendOtpRequest {
  email: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp?: string;
  code?: string;
  purpose?: "email_verification";
}

export interface VerifyOtpResponse {
  token: string;
  refreshToken: string;
  role: string;
  email: string;
}

export interface RegisterUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  country: string;
  city: string;
  role: "student" | "instructor" | "admin";
  referralCode?: string;
}

export interface MessageResponse {
  message: string;
}

export interface ResendOtpRequest {
  email: string;
  purpose: string;
}

// -----------------------------------------------------

export interface LoginRequest {
  email: string;
}

// -----------------------------------------------------------
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}
// ------------------------------------------------------------
export interface BackendSkill {
  id?: string;
  skill: string;
}
export interface BackendInterest {
  id?: string;
  interest: string;
}
export interface BackendEducation {
  educationId?: string;
  institutionName?: string;
  degree?: string;
  fieldOfStudy?: string;
  startYear?: number;
  endYear?: number;
  gradeOrCgpa?: string;
  description?: string;
}
export interface BackendSocialLink {
  linkId?: string;
  platform?: string;
  url?: string;
}

export interface GetMyProfileResponse {
  id: string;
  email: string;
  role: string;
  skills: BackendSkill[];
  educations: BackendEducation[];
  interests: BackendInterest[];
  socialLinks: BackendSocialLink[];
  emailVerified: boolean;
  isActive: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
  lastLogoutAt: string | null;

  profile: {
    profileId: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    bio: string | null;
    phone: string | null;
    country: string;
    city: string;
    phoneVerified: boolean;
    language: string;
    timezone: string;
    dateOfBirth: string | null;
    occupation: string | null;
    headline?: string | null;
    expertise?: string | null;
    highestQualification?: string | null;
    payoutEmail?: string | null;
    resumeUrl?: string | null;
  };
}

export interface UpdateMyProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  bio?: string;
  country?: string;
  city?: string;
  headline?: string;
  expertise?: string;
  highestQualification?: string;
  payoutEmail?: string;
  resumeUrl?: string;
  socials?: Array<{ socialMedia: string; url: string }>;
  skills?: Array<{ id?: string; skill: string }>;
  educations?: BackendEducation[];
  interests?: Array<{ id?: string; interest: string }>;
}

// ---------------------------------------------------------------------

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordUpdateRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// ============= Course Types =============
export interface Course {
  id: string;
  productId?: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  category: Category;
  categoryId: string;
  thumbnail: string;
  previewVideo?: string;
  instructor: Instructor;
  instructorId: string;
  duration: string;
  totalDuration: number; // in minutes
  lessons: number;
  students: number;
  rating: number;
  reviewCount: number;
  price: number;
  discountPrice?: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  status: "Published" | "Draft" | "Archived";
  featured: boolean;
  tags: string[];
  requirements: string[];
  whatYouWillLearn: string[];
  curriculum: Section[];
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  title: string;
  description?: string;
  type: "video" | "article" | "quiz" | "assignment";
  duration: number; // in minutes
  videoUrl?: string;
  content?: string;
  resources: Resource[];
  order: number;
  isFree: boolean;
  isCompleted?: boolean;
}

export interface Resource {
  id: string;
  title: string;
  type: "pdf" | "doc" | "zip" | "link";
  url: string;
  size?: number;
}

export interface Instructor {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  title: string;
  rating: number;
  students: number;
  courses: number;
  socialLinks?: {
    website?: string;
    linkedin?: string;
    twitter?: string;
  };
}

// ============= Category Types =============

export type CategoryStatus = "active" | "archived";

export interface CategoryCourseItem {
  id: string;
  title: string;
}

export interface CategoryMetadata {
  featured?: boolean;
  categoryType?: "MAIN" | "SUB" | string;
  [key: string]: unknown;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconUrl?: string;
  color: string;
  parentId: string | null;
  sortOrder: number;
  metadata?: CategoryMetadata;

  /** Populated when fetched from /categories/tree or /categories/:id/subcategories */
  subcategories?: Category[];

  /** UI-only derived fields (backend may or may not return these) */
  courseCount: number;
  studentCount: number;
  totalCourses?: number;
  totalStudents?: number;
  isActive?: boolean;
  status: CategoryStatus;
  courses?: CategoryCourseItem[];

  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCategoryRequest {
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  color?: string;
  parentId?: string | null;
  sortOrder?: number;
  metadata?: CategoryMetadata;
}

export interface UpdateCategoryRequest {
  name?: string;
  slug?: string;
  description?: string;
  iconUrl?: string;
  color?: string;
  parentId?: string | null;
  sortOrder?: number;
  metadata?: CategoryMetadata;
  status?: CategoryStatus;
}

export interface CategoryStats {
  totalCategories: number;
  activeCategories: number;
  totalCourses: number;
  totalStudents: number;
}


// ============= Enrollment Types =============
export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  course: Course;
  enrolledAt: string;
  expiresAt?: string;
  status: "active" | "expired" | "cancelled" | "completed";
  progress: CourseProgress;
  certificateId?: string;
}

export interface CourseProgress {
  courseId: string;
  userId: string;
  completedLessons: string[];
  totalLessons: number;
  progressPercentage: number;
  lastAccessedAt: string;
  lastLessonId?: string;
  watchTime: number; // in minutes
  quizScores: QuizScore[];
  notes: Note[];
}

export interface QuizScore {
  quizId: string;
  lessonId: string;
  score: number;
  maxScore: number;
  attempts: number;
  completedAt: string;
}

export interface Note {
  id: string;
  lessonId: string;
  content: string;
  timestamp?: number; // video timestamp in seconds
  createdAt: string;
  updatedAt: string;
}

// ============= Review Types =============
export interface Review {
  id: string;
  userId: string;
  user: Pick<User, "id" | "name" | "avatar">;
  courseId: string;
  rating: number;
  title: string;
  content: string;
  isVerified: boolean;
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewRequest {
  courseId: string;
  rating: number;
  title: string;
  content: string;
}

// ============= Analytics Types =============
export interface UserAnalyticsSummary {
  coursesEnrolled: number;
  coursesInProgress: number;
  hoursLearned: number;
  hoursLearnedPrevPeriod: number;
  lecturesCompleted: number;
  lecturesRemaining: number;
}

export interface ActivityBreakdownItem {
  label: string;
  minutesWatched: number;
}

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  color?: string;
  minutesWatched: number;
  percentage: number;
}

export interface WeeklyTrendItem {
  weekLabel: string;
  minutesWatched: number;
  percentageOfBest: number;
}

export interface UserAnalytics {
  userId: string;
  period: "week" | "month" | "year" | "all";
  summary?: UserAnalyticsSummary;
  activityBreakdown?: ActivityBreakdownItem[];
  categoryBreakdown?: CategoryBreakdownItem[];
  weeklyTrend?: WeeklyTrendItem[];
  totalWatchTime: number;
  coursesEnrolled: number;
  coursesCompleted: number;
  lessonsCompleted: number;
  averageQuizScore: number;
  streak: number;
  weeklyActivity: WeeklyActivity[];
  monthlyProgress: MonthlyProgress[];
  categoryDistribution: CategoryDistribution[];
}

export interface WeeklyActivity {
  day: string;
  hours: number;
  lessonsCompleted: number;
}

export interface MonthlyProgress {
  month: string;
  coursesCompleted: number;
  hoursSpent: number;
}

export interface CategoryDistribution {
  category: string;
  count: number;
  percentage: number;
}

export interface AdminAnalytics {
  overview: {
    totalUsers: number;
    totalCourses: number;
    totalEnrollments: number;
    totalRevenue: number;
    activeUsers: number;
    completionRate: number;
  };
  userGrowth: { date: string; users: number }[];
  enrollmentTrends: { date: string; enrollments: number }[];
  revenueByMonth: { month: string; revenue: number }[];
  topCourses: { course: Course; enrollments: number; revenue: number }[];
  categoryStats: { category: string; courses: number; enrollments: number }[];
}

// ============= Notification Types =============
export interface Notification {
  id: string;
  userId: string;
  type: "course" | "achievement" | "system" | "promo";
  title: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

// ============= Payment Types =============
export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed" | "refunded";
  courseId: string;
  userId: string;
  paymentMethod: string;
  createdAt: string;
}

export interface Order {
  id: string;
  userId: string;
  courseId: string;
  course: Course;
  amount: number;
  discount?: number;
  tax?: number;
  total: number;
  status: "pending" | "completed" | "failed" | "refunded";
  paymentId?: string;
  createdAt: string;
}

// ============= Search Types =============
export interface SearchFilters {
  query?: string;
  category?: string;
  level?: string;
  priceMin?: number;
  priceMax?: number;
  rating?: number;
  duration?: string;
  sortBy?:
    | "relevance"
    | "popularity"
    | "rating"
    | "newest"
    | "price-low"
    | "price-high";
}

export interface SearchResults {
  courses: Course[];
  categories: Category[];
  instructors: Instructor[];
  totalResults: number;
}

// ============= Settings Types =============
export interface UserSettings {
  userId: string;
  notifications: {
    email: boolean;
    push: boolean;
    courseUpdates: boolean;
    promotions: boolean;
    achievements: boolean;
  };
  privacy: {
    showProfile: boolean;
    showProgress: boolean;
    showCertificates: boolean;
  };
  preferences: {
    language: string;
    timezone: string;
    autoplayVideos: boolean;
    videoQuality: "auto" | "360p" | "480p" | "720p" | "1080p";
    playbackSpeed: number;
    subtitles: boolean;
  };
}

export interface PlatformSettings {
  siteName: string;
  siteDescription: string;
  logo: string;
  favicon: string;
  primaryColor: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  emailVerificationRequired: boolean;
  twoFactorEnabled: boolean;
  paymentGateways: {
    stripe: { enabled: boolean; publicKey: string };
    paypal: { enabled: boolean; clientId: string };
  };
  socialAuth: {
    google: { enabled: boolean; clientId: string };
    github: { enabled: boolean; clientId: string };
  };
}

// ============= Certificate Types =============
export interface Certificate {
  id: string;
  userId?: string;
  courseId?: string;
  course: {
    id: string;
    title: string;
    thumbnail?: string;
    category?: string;
  };
  instructor: {
    id?: string;
    name: string;
  };
  issueDate: string;
  completedDate?: string;
  expiryDate?: string;
  certificateNumber: string;
  downloadUrl: string;
  verificationUrl: string;
  status?: "completed" | "in_progress";
  category?: string;
  instructorName?: string;
  courseTitle?: string;
  courseThumbnail?: string;
}

export interface VerifyCertificateRequest {
  certificateNumber: string;
}

export interface VerifyCertificateResponse {
  valid: boolean;
  studentName?: string;
  courseTitle?: string;
  completedDate?: string;
  message?: string;
  certificate?: Certificate;
}

