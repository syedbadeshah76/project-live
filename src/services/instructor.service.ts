// src/services/instructor.service.ts
// ============= Instructor Service =============
// Backend contract (Spring Boot):
//   POST   /instructor/applications
//   GET    /admin/instructor-applications
//   GET    /admin/instructor-applications/:id
//   PATCH  /admin/instructor-applications/:id
//   PATCH  /admin/instructor-applications/:id/checklist
//   GET    /instructor/dashboard
//   GET    /instructor/analytics?from=&to=
//   GET    /instructor/students?page=&size=&courseId=&status=
import { apiClient } from '@/lib/api-client';
import type { ApiResponse, PaginationMeta } from '@/lib/api-client';
import type { Course, PaginationParams, Category, Instructor } from '@/types/api.types';
import type {
  AnalyticsPeriod,
  InstructorAnalyticsApi,
  InstructorAnalyticsData,
  InstructorDashboardApi,
  InstructorDashboardData,
  CoursePerformanceApi,
  RatingDistributionItem,
  TopCourse,
} from '@/types/instructor-analytics-types';

const MOCK_MODE = false;

/* ---------------- helpers ---------------- */
const qs = (params: Record<string, unknown>) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.append(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
};

/** Backend may return the object directly or wrapped in { data } */
const unwrap = <T>(res: any): T => (res && typeof res === 'object' && 'data' in res ? res.data : res) as T;

const num = (v: unknown, fallback = 0) => (typeof v === 'number' && !Number.isNaN(v) ? v : fallback);

const pageContent = <T>(res: any): T[] => {
  const d = unwrap<any>(res);
  if (Array.isArray(d)) return d as T[];
  if (Array.isArray(d?.content)) return d.content as T[];
  if (Array.isArray(d?.items)) return d.items as T[];
  return [];
};

const pageMeta = (res: any, fallbackSize = 20): PaginationMeta => {
  const d = unwrap<any>(res) ?? {};
  const size = num(d.size, fallbackSize) || fallbackSize;
  const number = num(d.number, 0);
  const totalPages = num(d.totalPages, 1);
  const totalItems = num(d.totalElements, Array.isArray(d) ? d.length : 0);
  return {
    currentPage: number + 1,
    totalPages: totalPages || 1,
    totalItems,
    itemsPerPage: size,
    hasNextPage: d.last === undefined ? number + 1 < totalPages : !d.last,
    hasPrevPage: d.first === undefined ? number > 0 : !d.first,
  };
};

const periodRange = (period: AnalyticsPeriod) => {
  const to = new Date();
  const from = new Date(to);
  if (period === 'week') from.setDate(to.getDate() - 7);
  else if (period === 'month') from.setMonth(to.getMonth() - 1);
  else if (period === 'quarter') from.setMonth(to.getMonth() - 3);
  else from.setFullYear(to.getFullYear() - 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 19); // yyyy-MM-ddTHH:mm:ss (no Z — Spring LocalDateTime)
  return { from: fmt(from), to: fmt(to) };
};

/* ---------------- existing types (unchanged) ---------------- */
export interface InstructorCourse extends Omit<Course, 'duration' | 'lessons' | 'students' | 'reviewCount' | 'discountPrice' | 'featured'> {
  enrolledCount: number;
  revenue: number;
  averageRating: number;
  reviewsCount: number;
  lessonsCount: number;
  duration: number;
  discountedPrice?: number;
  isFeatured?: boolean;
}

export type InstructorStudentStatus = "active" | "inactive" | "completed";
export type BackendStudentStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
export interface InstructorStudent {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  enrolledDate: string;
  progress: number;
  lastActive: string;
  courseId: string;
  courseName: string;
  status: InstructorStudentStatus;
}

export interface InstructorStudentDetail extends InstructorStudent {
  lessonsCompleted: number;
  timeSpentHours: number;
  quizScore: number;
  recentActivity: string[];
}

export interface InstructorStudentsStats {
  totalStudents: number;
  activeStudents: number;
  newThisMonth: number;
  avgProgress: number;
}


export interface InstructorAnalytics {
  totalStudents: number; totalCourses: number; totalRevenue: number; averageRating: number;
  enrollmentsThisMonth: number; revenueThisMonth: number; studentsGrowth: number; revenueGrowth: number;
  popularCourses: { name: string; students: number; revenue: number }[];
  revenueByMonth: { month: string; revenue: number }[];
  enrollmentsByMonth: { month: string; enrollments: number }[];
  studentActivity: { day: string; active: number }[];
}

const mockInstructor: Instructor = {
  id: '3', name: 'Sarah Instructor',
  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
  bio: 'Expert developer and educator', title: 'Senior Developer', rating: 4.8, students: 17380, courses: 3,
};
const mockCategory: Category = { id: '1', name: 'Web Development', slug: 'web-development', description: '', icon: 'code', color: '#3B82F6', courseCount: 45, isActive: true } as any;

const mockCourses: InstructorCourse[] = [
  {
    id: '1', title: 'Complete React Developer Course 2024', slug: 'complete-react-developer-course-2024',
    shortDescription: 'Master React from scratch.', description: 'Full React course',
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=450&fit=crop',
    instructor: mockInstructor, instructorId: '3', price: 89.99, discountedPrice: 49.99,
    category: mockCategory, categoryId: '1', level: 'Intermediate', duration: 2400,
    lessonsCount: 120, rating: 4.8, reviewsCount: 1250, enrolledCount: 5420, revenue: 266280,
    averageRating: 4.8, status: 'Published', isFeatured: true, tags: ['react'],
    requirements: ['Basic JavaScript'], whatYouWillLearn: ['React'],
    curriculum: [], totalDuration: 2400, createdAt: '2024-01-10', updatedAt: '2024-02-01',
  } as InstructorCourse,
];

const nowDate = new Date();
const iso = (d: Date) => d.toISOString();
const daysAgo = (n: number) => iso(new Date(nowDate.getTime() - n * 86400000));

const mockStudents: InstructorStudentDetail[] = [
  {
    id: "stu-1", name: "Alex Kumar", email: "alex@email.com",
    courseId: "1", courseName: "UI/UX Mastery", progress: 92,
    enrolledDate: daysAgo(45), lastActive: daysAgo(1), status: "active",
    lessonsCompleted: 44, timeSpentHours: 110, quizScore: 92,
    recentActivity: ["Watched Module 1: Fundamentals", "Completed Quiz 1 with score 85%"],
  },
];
export interface InstructorStudentsResult {
  students: InstructorStudentDetail[];
  stats: InstructorStudentsStats;
  meta: PaginationMeta;
}
const mockAnalytics: InstructorAnalytics = {
  totalStudents: 17380, totalCourses: 3, totalRevenue: 1397124, averageRating: 4.8,
  enrollmentsThisMonth: 1250, revenueThisMonth: 62450, studentsGrowth: 12.5, revenueGrowth: 18.3,
  popularCourses: [], revenueByMonth: [], enrollmentsByMonth: [], studentActivity: [],
};

export interface ReviewChecklist {
  credentialsVerified: boolean;
  backgroundChecked: boolean;
  contentReviewed: boolean;
  paymentVerified: boolean;
}

export interface InstructorApplication {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  specialization: string;
  qualification: string;
  experience: string;
  bio: string;
  linkedin?: string;
  portfolio?: string;
  location?: string;
  tags?: string[];
  resumeUrl?: string;
  resumeFileName?: string;
  introVideoUrl?: string;
  introVideoDuration?: string;
  introVideoQuality?: string;
  documents: string[];
  status: "pending" | "approved" | "rejected";
  checklist: ReviewChecklist;
  submittedAt: string;
  createdAt: string;
  reviewStartedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

const mockApplications: InstructorApplication[] = [];
const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

/* ---------------- normalizers ---------------- */
function toUiStudentStatus(raw: unknown, progress: number): InstructorStudentStatus {
  const s = String(raw ?? '').toUpperCase();
  if (s === 'COMPLETED') return 'completed';
  if (s === 'ACTIVE' || s === 'IN_PROGRESS') return 'active';
  if (s === 'INACTIVE' || s === 'NOT_STARTED') return 'inactive';
  if (progress >= 100) return 'completed';
  return progress > 0 ? 'active' : 'inactive';
}


export function toBackendStudentStatus(status: InstructorStudentStatus): BackendStudentStatus {
  if (status === 'completed') return 'COMPLETED';
  if (status === 'active') return 'IN_PROGRESS';
  return 'NOT_STARTED';
}

function normalizeStudent(raw: any): InstructorStudentDetail {
  const progress = Math.round(
    num(raw?.progressPercentage ?? raw?.progressPercent ?? raw?.progress, 0),
  );
  const first = raw?.firstName ?? raw?.first_name ?? '';
  const last = raw?.lastName ?? raw?.last_name ?? '';
  const studentName =
    raw?.studentName ??
    raw?.student_name ??
    raw?.userName ??
    raw?.user_name ??
    raw?.name ??
    raw?.user?.name ??
    raw?.student?.name ??
    raw?.studentDetails?.name ??
    raw?.studentDetails?.studentName ??
    raw?.studentDetails?.fullName ??
    raw?.user?.fullName ??
    raw?.student?.fullName ??
    (`${first} ${last}`.trim() || raw?.email || 'Student');

  return {
    id: String(raw?.studentId ?? raw?.id ?? raw?.enrollmentId ?? ''),
    name: studentName,
    email: raw?.email ?? raw?.studentEmail ?? raw?.user?.email ?? raw?.student?.email ?? '',
    avatar: raw?.avatar ?? raw?.avatarUrl ?? raw?.studentAvatar ?? raw?.user?.avatar ?? raw?.student?.avatar ?? undefined,
    enrolledDate: raw?.joinedAt ?? raw?.enrolledDate ?? raw?.enrolledAt ?? raw?.createdAt ?? '',
    progress,
    lastActive: raw?.lastActive ?? raw?.lastAccessedAt ?? raw?.updatedAt ?? '',
    courseId: String(raw?.courseId ?? ''),
    courseName: raw?.courseTitle ?? raw?.courseName ?? raw?.course?.title ?? raw?.course?.name ?? '',
    status: toUiStudentStatus(raw?.status, progress),
    lessonsCompleted: num(raw?.lessonsCompleted ?? raw?.completedLessons, 0),
    timeSpentHours: Math.round(
      num(raw?.timeSpentHours ?? num(raw?.timeSpentMinutes, 0) / 60, 0),
    ),
    quizScore: Math.round(num(raw?.quizScore ?? raw?.avgQuizScore, 0)),
    recentActivity: Array.isArray(raw?.recentActivity)
      ? raw.recentActivity
          .map((a: any) => (typeof a === 'string' ? a : a?.message ?? ''))
          .filter(Boolean)
      : [],
  };
}
function normalizeDashboard(raw: InstructorDashboardApi | any): InstructorDashboardData {
  const trend = Array.isArray(raw?.enrollmentTrend) ? raw.enrollmentTrend : [];
  const perf: CoursePerformanceApi[] = Array.isArray(raw?.coursePerformance) ? raw.coursePerformance : [];
  const sessions = Array.isArray(raw?.upcomingSessions) ? raw.upcomingSessions : [];

  return {
    totalStudents: num(raw?.totalStudents),
    totalCourses: num(raw?.totalCourses),
    totalRevenue: num(raw?.totalRevenue),
    averageRating: num(raw?.avgRating ?? raw?.averageRating),
    enrollmentTrend: trend.map((p: any) => ({
      label: p?.dayLabel ?? p?.label ?? '',
      enrollments: num(p?.enrolledCount ?? p?.enrollments),
      completions: num(p?.completedCount ?? p?.completions),
    })),
    coursePerformance: perf.map((c, i) => ({
      courseId: String(c?.courseId ?? i),
      courseName: c?.title ?? '',
      score: Math.round(num(c?.completionRatePercent)),
      students: num(c?.enrolledCount),
    })),
    recentActivity: Array.isArray(raw?.recentActivity)
      ? raw.recentActivity.map((a: any) => ({
          message: typeof a === 'string' ? a : a?.message ?? '',
          createdAt: a?.createdAt ?? '',
        }))
      : [],
    upcomingSessions: sessions.map((s: any) => {
      const start = s?.startTime ? new Date(s.startTime) : null;
      const end = s?.endTime ? new Date(s.endTime) : null;
      const hhmm = (d: Date | null) => (d ? d.toISOString().slice(11, 16) : '');
      const statusRaw = String(s?.status ?? '').toUpperCase();
      return {
        id: String(s?.id ?? ''),
        title: s?.title ?? '',
        courseId: String(s?.courseId ?? ''),
        courseName: s?.courseTitle ?? s?.courseName ?? '',
        description: s?.description ?? '',
        date: start ? start.toISOString().slice(0, 10) : '',
        startTime: hhmm(start),
        endTime: hhmm(end),
        enrolledCount: num(s?.enrolledCount),
        status: statusRaw === 'LIVE' ? 'Live' : statusRaw === 'COMPLETED' ? 'Completed' : 'Upcoming',
      };
    }),
  };
}

function normalizeAnalytics(raw: InstructorAnalyticsApi | any): InstructorAnalyticsData {
  const perf: CoursePerformanceApi[] = Array.isArray(raw?.engagementByCourse)
    ? raw.engagementByCourse
    : Array.isArray(raw?.coursePerformance)
      ? raw.coursePerformance
      : [];

  const trend = Array.isArray(raw?.studentEnrollments)
    ? raw.studentEnrollments
    : Array.isArray(raw?.enrollmentTrend)
      ? raw.enrollmentTrend
      : [];

  const revTrend = Array.isArray(raw?.revenueTrend) ? raw.revenueTrend : [];

  const ratingRaw = Array.isArray(raw?.ratingDistribution) ? raw.ratingDistribution : [];
  const ratingTotal = ratingRaw.reduce((a: number, r: any) => a + num(r?.count), 0);

  const starsMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratingRaw.forEach((r: any) => {
    const starVal = num(r?.rating ?? r?.stars);
    if (starVal >= 1 && starVal <= 5) {
      starsMap[starVal] = num(r?.count);
    }
  });

  const ratingDistribution: RatingDistributionItem[] = [5, 4, 3, 2, 1].map((stars) => {
    const count = starsMap[stars];
    return {
      stars: stars as 1 | 2 | 3 | 4 | 5,
      count,
      percentage: ratingTotal ? Math.round((count / ratingTotal) * 100) : 0,
    };
  });

  const topPerformingCourses: TopCourse[] = perf
    .map((c, i) => ({
      courseId: String(c?.courseId ?? i),
      name: c?.title ?? '',
      students: num(c?.enrolledCount),
      revenue: num(c?.revenue),
      averageRating: num(c?.avgRating),
      completionRate: Math.round(num(c?.completionRatePercent)),
    }))
    .sort((a, b) => b.students - a.students);

  const totalEarned = num(raw?.revenueBreakdown?.totalEarned, num(raw?.totalRevenue));
  const platformFee = num(raw?.revenueBreakdown?.platformFee);
  const yourEarnings = num(raw?.revenueBreakdown?.yourEarnings, Math.max(totalEarned - platformFee, 0));

  const totalStudents = num(raw?.studentGrowth?.totalStudents, num(raw?.totalStudents));
  const growthPercentage = num(raw?.studentGrowth?.growthPercent ?? raw?.studentGrowth?.growthPercentage);
  const completionRate = Math.round(
    num(
      raw?.completionRatePercent,
      perf.length ? perf.reduce((a, c) => a + num(c?.completionRatePercent), 0) / perf.length : 0,
    ),
  );

  const top = topPerformingCourses[0];
  const rawTop = raw?.topPerformingCourse;
  
  const topPerformingCourse = {
    courseId: String(rawTop?.courseId ?? top?.courseId ?? ''),
    name: String(rawTop?.title ?? rawTop?.name ?? top?.name ?? '—'),
    studentsEnrolled: num(rawTop?.enrolledCount ?? rawTop?.students ?? top?.students ?? 0),
    averageRating: num(rawTop?.avgRating ?? rawTop?.averageRating ?? top?.averageRating ?? 0),
    completionRate: Math.round(num(rawTop?.completionRatePercent ?? rawTop?.completionRate ?? top?.completionRate ?? 0)),
    monthlyGrowthPercentage: growthPercentage,
  };

  return {
    totalRevenue: num(raw?.totalRevenue, totalEarned),
    totalStudents,
    averageRating: num(raw?.avgRating ?? raw?.averageRating),
    completionRate,
    revenueGrowth: 0,
    studentsGrowth: growthPercentage,
    ratingGrowth: 0,
    completionRateGrowth: 0,
    revenueTrend: revTrend.map((p: any) => ({
      month: p?.label ?? p?.month ?? '',
      revenue: num(p?.grossRevenue ?? p?.revenue),
    })),
    enrollmentsTrend: trend.map((p: any) => ({
      month: p?.dayLabel ?? p?.label ?? p?.month ?? '',
      enrollments: num(p?.enrolledCount ?? p?.enrollments),
    })),
    engagementByCourse: perf.map((c, i) => ({
      courseId: String(c?.courseId ?? i),
      courseName: c?.title ?? '',
      engagement: Math.round(num(c?.completionRatePercent)),
    })),
    ratingDistribution,
    topPerformingCourses,
    revenueBreakdown: {
      totalEarned,
      platformFee,
      yourEarnings,
      platformFeePercentage: totalEarned ? Math.round((platformFee / totalEarned) * 100) : 0,
    },
    studentGrowth: {
      totalStudents,
      activeLearners: num(raw?.studentGrowth?.newThisMonth),
      activeLearnersPercentage: totalStudents
        ? Math.round((num(raw?.studentGrowth?.newThisMonth) / totalStudents) * 100)
        : 0,
      growthPercentage,
    },
    topPerformingCourse,
  };
}

/* ---------------- service ---------------- */
export const instructorService = {
  /* ---- Courses (unchanged) ---- */
  async getMyCourses(pagination?: PaginationParams) {
    if (MOCK_MODE) { await delay(); return { success: true, data: mockCourses, meta: { currentPage: 1, totalPages: 1, totalItems: mockCourses.length, itemsPerPage: 10, hasNextPage: false, hasPrevPage: false } as PaginationMeta }; }
    return apiClient.get<ApiResponse<InstructorCourse[]> & { meta: PaginationMeta }>(`/instructor/courses${qs({ ...(pagination as any) })}`);
  },
  async getCourse(courseId: string) {
    if (MOCK_MODE) { await delay(200); const c = mockCourses.find(x => x.id === courseId); if (!c) throw { success: false, message: 'Not found', statusCode: 404 }; return { success: true, data: c }; }
    return apiClient.get<ApiResponse<InstructorCourse>>(`/instructor/courses/${courseId}`);
  },
  async createCourse(reqData: Partial<InstructorCourse>) {
    if (MOCK_MODE) { await delay(500); return { success: true, data: { ...mockCourses[0], id: `course-${Date.now()}`, ...reqData } as InstructorCourse }; }
    return apiClient.post<ApiResponse<InstructorCourse>>('/instructor/courses', reqData);
  },
  async updateCourse(courseId: string, reqData: Partial<InstructorCourse>) {
    if (MOCK_MODE) { await delay(400); return { success: true, data: { ...mockCourses[0], ...reqData } as InstructorCourse }; }
    return apiClient.put<ApiResponse<InstructorCourse>>(`/instructor/courses/${courseId}`, reqData);
  },
  async deleteCourse(courseId: string) {
    if (MOCK_MODE) { await delay(); return { success: true, data: undefined }; }
    return apiClient.delete<ApiResponse<void>>(`/instructor/courses/${courseId}`);
  },
  async togglePublish(courseId: string, publish: boolean) {
    if (MOCK_MODE) { await delay(); const c = mockCourses.find(x => x.id === courseId); return { success: true, data: { ...c!, status: publish ? 'Published' : 'Draft' } as InstructorCourse }; }
    return apiClient.patch<ApiResponse<InstructorCourse>>(`/instructor/courses/${courseId}/publish`, { publish });
  },

  /* ---- NEW: Dashboard — GET /instructor/dashboard ---- */
  async getDashboard(): Promise<ApiResponse<InstructorDashboardData>> {
    const res = await apiClient.get<unknown>('/instructor/dashboard');
    return { success: true, data: normalizeDashboard(unwrap<InstructorDashboardApi>(res)) };
  },

  /* ---- NEW: Analytics — GET /instructor/analytics?from=&to= ---- */
  async getAnalyticsOverview(
    period: AnalyticsPeriod = 'month',
    range?: { from?: string; to?: string },
  ): Promise<ApiResponse<InstructorAnalyticsData>> {
    const { from, to } = { ...periodRange(period), ...(range ?? {}) };
    const res = await apiClient.get<unknown>(`/instructor/analytics${qs({ from, to })}`);
    return { success: true, data: normalizeAnalytics(unwrap<InstructorAnalyticsApi>(res)) };
  },

  /** Legacy shape kept for older screens — derived from the same endpoint */
  async getAnalytics(period: AnalyticsPeriod = 'month'): Promise<ApiResponse<InstructorAnalytics>> {
    if (MOCK_MODE) { await delay(400); return { success: true, data: mockAnalytics }; }
    const { data: a } = await this.getAnalyticsOverview(period);
    return {
      success: true,
      data: {
        totalStudents: a.totalStudents,
        totalCourses: a.topPerformingCourses.length,
        totalRevenue: a.totalRevenue,
        averageRating: a.averageRating,
        enrollmentsThisMonth: a.enrollmentsTrend.reduce((s, p) => s + p.enrollments, 0),
        revenueThisMonth: a.revenueTrend.reduce((s, p) => s + p.revenue, 0),
        studentsGrowth: a.studentsGrowth,
        revenueGrowth: a.revenueGrowth,
        popularCourses: a.topPerformingCourses.map(c => ({ name: c.name, students: c.students, revenue: c.revenue })),
        revenueByMonth: a.revenueTrend.map(p => ({ month: p.month, revenue: p.revenue })),
        enrollmentsByMonth: a.enrollmentsTrend.map(p => ({ month: p.month, enrollments: p.enrollments })),
        studentActivity: a.enrollmentsTrend.map(p => ({ day: p.month, active: p.enrollments })),
      },
    };
  },

  /* ---- NEW: Students — GET /instructor/students?page=&size=&courseId=&status= ---- */
  async getStudents(
    courseId?: string,
    pagination?: { page?: number; size?: number },
    status?: InstructorStudentStatus | BackendStudentStatus,
  ): Promise<ApiResponse<InstructorStudentsResult>> {
    const size = pagination?.size ?? 20;
    const page = pagination?.page ?? 0; // backend is 0-based

    const backendStatus = status
      ? (['active', 'inactive', 'completed'].includes(status as string)
          ? toBackendStudentStatus(status as InstructorStudentStatus)
          : (status as BackendStudentStatus))
      : undefined;

    const res = await apiClient.get<unknown>(
      `/instructor/students${qs({ page, size, courseId, status: backendStatus })}`,
    );
    const body = unwrap<any>(res) ?? {};
    const pageObj = body?.students ?? body;

    return {
      success: true,
      data: {
        students: pageContent<any>(pageObj).map(normalizeStudent),
        stats: {
          totalStudents: num(body?.totalStudents, 0),
          activeStudents: num(body?.activeStudents, 0),
          newThisMonth: num(body?.newThisMonth, 0),
          avgProgress: Math.round(num(body?.avgProgress, 0)),
        },
        meta: pageMeta(pageObj, size),
      },
    };
  },

  async getStudent(studentId: string): Promise<ApiResponse<InstructorStudentDetail>> {
    if (MOCK_MODE) {
      await delay(200);
      const s = mockStudents.find(x => x.id === studentId);
      if (!s) throw { success: false, message: 'Not found', statusCode: 404 };
      return { success: true, data: s };
    }
    const res = await apiClient.get<unknown>(`/instructor/students/${studentId}`);
    return { success: true, data: normalizeStudent(unwrap<any>(res)) };
  },

  /** Derived client-side — backend has no /students/stats endpoint yet */
  async getStudentsStats(): Promise<ApiResponse<InstructorStudentsStats>> {
    const { data: students } = await this.getStudents(undefined, { page: 0, size: 200 });
    const total = students.length;
    const active = students.filter(s => s.status === 'active').length;
    const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const newThisMonth = students.filter(s => {
      const t = new Date(s.enrolledDate).getTime();
      return !Number.isNaN(t) && t >= start;
    }).length;
    const averageProgress = total ? Math.round(students.reduce((a, s) => a + s.progress, 0) / total) : 0;
    return { success: true, data: { totalStudents: total, activeStudents: active, newThisMonth, averageProgress } };
  },

  /* ---- Content (unchanged) ---- */
  async addLesson(courseId: string, sectionId: string, reqData: { title: string; videoUrl?: string; duration?: number; isFree?: boolean }) {
    if (MOCK_MODE) { await delay(); return { success: true, data: { id: `lesson-${Date.now()}`, title: reqData.title } }; }
    return apiClient.post<ApiResponse<{ id: string; title: string }>>(`/instructor/courses/${courseId}/sections/${sectionId}/lessons`, reqData);
  },
  async uploadContent(courseId: string, file: File, type: 'video' | 'resource') {
    if (MOCK_MODE) { await delay(1000); return { success: true, data: { url: `https://cdn.edvanz.com/${type}s/${file.name}`, filename: file.name } }; }
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);
    return apiClient.post<ApiResponse<{ url: string; filename: string }>>(`/instructor/courses/${courseId}/upload`, form);
  },

  /* ---- Applications (unchanged) ---- */
  async submitApplication(data: Omit<InstructorApplication, "id" | "status" | "createdAt" | "submittedAt" | "checklist">): Promise<ApiResponse<InstructorApplication>> {
    return apiClient.post<ApiResponse<InstructorApplication>>('/instructor/applications', data);
  },
  async getApplications(): Promise<ApiResponse<InstructorApplication[]>> {
    if (MOCK_MODE) { await delay(); return { success: true, data: [...mockApplications] }; }
    return apiClient.get<ApiResponse<InstructorApplication[]>>('/admin/instructor-applications');
  },
  async getApplication(id: string): Promise<ApiResponse<InstructorApplication>> {
    return apiClient.get<ApiResponse<InstructorApplication>>(`/admin/instructor-applications/${id}`);
  },
  async updateChecklist(id: string, checklist: ReviewChecklist): Promise<ApiResponse<InstructorApplication>> {
    return apiClient.patch<ApiResponse<InstructorApplication>>(`/admin/instructor-applications/${id}/checklist`, checklist);
  },
  async reviewApplication(id: string, status: "approved" | "rejected", rejectionReason?: string): Promise<ApiResponse<InstructorApplication>> {
    return apiClient.patch<ApiResponse<InstructorApplication>>(`/admin/instructor-applications/${id}`, { status, rejectionReason });
  },

  /** GET /courses/instructor/average-completion */
  async getAverageCompletionRate(): Promise<number> {
    if (MOCK_MODE) return 86.18;
    try {
      const res: any = await apiClient.get('/courses/instructor/average-completion');
      const data = unwrap<any>(res);
      if (typeof data === 'number') return data;
      if (data && typeof data.averageCompletionRate === 'number') return data.averageCompletionRate;
      if (data && typeof data.averageCompletion === 'number') return data.averageCompletion;
      if (data && typeof data.rate === 'number') return data.rate;
      return Number(data ?? 0);
    } catch (err) {
      console.error('Failed to fetch average completion rate:', err);
      return 0;
    }
  },

  /** GET /courses/instructor/total-enrollments */
  async getTotalEnrollmentsCount(): Promise<number> {
    if (MOCK_MODE) return 0;
    try {
      const res: any = await apiClient.get('/courses/instructor/total-enrollments');
      const data = unwrap<any>(res);
      if (typeof data === 'number') return data;
      if (data && typeof data.totalEnrollments === 'number') return data.totalEnrollments;
      if (data && typeof data.total === 'number') return data.total;
      if (data && typeof data.count === 'number') return data.count;
      if (data && typeof data.enrollments === 'number') return data.enrollments;
      return Number(data ?? 0);
    } catch (err) {
      console.error('Failed to fetch total enrollments:', err);
      return 0;
    }
  },
};
