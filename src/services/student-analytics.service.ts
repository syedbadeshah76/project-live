// src/services/student-analytics.service.ts
// ============= Student Analytics Service (backend-integrated) =============
// Backend contract (Spring Boot gateway) — from Postman:
//   GET /api/student/analytics?range=WEEK|MONTH|YEAR
//   GET /api/student/courses?filter=ALL|IN_PROGRESS|COMPLETED&page=0&size=10
//   GET /api/student/courses/search?keyword=...&page=0&size=10
//   GET /api/student/courses/{courseId}

import { apiClient } from '@/lib/api-client';
import type {
  ApiResponse,
  UserAnalytics,
  UserAnalyticsSummary,
  ActivityBreakdownItem,
  CategoryBreakdownItem,
  WeeklyTrendItem,
  WeeklyActivity,
  MonthlyProgress,
  CategoryDistribution,
  Course,
  Enrollment,
  CourseProgress,
} from '@/types/api.types';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type AnalyticsRange = 'WEEK' | 'MONTH' | 'YEAR';
export type UiPeriod = 'week' | 'month' | 'year';
export type MyCoursesFilter = 'ALL' | 'IN_PROGRESS' | 'COMPLETED';

export interface PagedResult<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface MyCoursesParams {
  filter?: MyCoursesFilter;
  page?: number;
  size?: number;
  keyword?: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const toRange = (p: UiPeriod): AnalyticsRange =>
  p === 'month' ? 'MONTH' : p === 'year' ? 'YEAR' : 'WEEK';

/** Unwrap `{success,data}` envelopes, Spring `Page`, or a raw payload. */
const unwrap = <T>(raw: unknown): T => {
  const r = raw as Record<string, unknown> | null | undefined;
  if (r && typeof r === 'object' && 'data' in r && !('content' in r)) {
    return (r as { data: T }).data;
  }
  return raw as T;
};

const asArray = <T>(raw: unknown): T[] => {
  const r = unwrap<unknown>(raw) as Record<string, unknown> | unknown[] | null;
  if (Array.isArray(r)) return r as T[];
  if (r && typeof r === 'object') {
    for (const key of ['content', 'items', 'courses', 'results', 'rows']) {
      const v = (r as Record<string, unknown>)[key];
      if (Array.isArray(v)) return v as T[];
    }
  }
  return [];
};

const num = (...vals: unknown[]): number => {
  for (const v of vals) {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) {
      return Number(v);
    }
  }
  return 0;
};

const str = (...vals: unknown[]): string => {
  for (const v of vals) if (typeof v === 'string' && v) return v;
  return '';
};

/** Backend may send minutes OR hours; normalize to hours. */
const toHours = (src: Record<string, unknown>): number => {
  if (typeof src.hours === 'number') return src.hours;
  if (typeof src.hoursSpent === 'number') return src.hoursSpent;
  const minutes = num(src.minutes, src.watchMinutes, src.watchTime, src.timeSpent);
  if (minutes > 0) return Math.round((minutes / 60) * 100) / 100;
  const seconds = num(src.seconds, src.watchSeconds);
  return seconds > 0 ? Math.round((seconds / 3600) * 100) / 100 : 0;
};

const safeIsoDate = (value?: string): string => {
  if (!value) return new Date().toISOString();
  const normalized = /Z|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

const labelForDay = (src: Record<string, unknown>, index: number): string => {
  const explicit = str(src.day, src.label, src.dayName, src.shortName);
  if (explicit) return explicit.slice(0, 3);
  const dateStr = str(src.date, src.activityDate);
  if (dateStr) {
    const d = new Date(safeIsoDate(dateStr));
    if (!Number.isNaN(d.getTime())) return DAY_LABELS[d.getDay()];
  }
  return DAY_LABELS[index % 7];
};

const labelForMonth = (src: Record<string, unknown>, index: number): string => {
  const explicit = str(src.month, src.label, src.monthName, src.period);
  if (explicit) return explicit.slice(0, 3);
  const monthNo = num(src.monthNumber, src.monthIndex);
  if (monthNo >= 1 && monthNo <= 12) return MONTH_LABELS[monthNo - 1];
  const dateStr = str(src.date, str(src.startDate));
  if (dateStr) {
    const d = new Date(safeIsoDate(dateStr));
    if (!Number.isNaN(d.getTime())) return MONTH_LABELS[d.getMonth()];
  }
  return MONTH_LABELS[index % 12];
};

/* ------------------------------------------------------------------ */
/* Normalizers                                                         */
/* ------------------------------------------------------------------ */

const normalizeWeekly = (raw: unknown): WeeklyActivity[] =>
  asArray<Record<string, unknown>>(raw).map((d, i) => ({
    day: labelForDay(d, i),
    hours: toHours(d),
    lessonsCompleted: num(d.lessonsCompleted, d.completedLessons, d.lessons),
  }));

const normalizeMonthly = (raw: unknown): MonthlyProgress[] =>
  asArray<Record<string, unknown>>(raw).map((m, i) => ({
    month: labelForMonth(m, i),
    coursesCompleted: num(m.coursesCompleted, m.completedCourses, m.courses),
    hoursSpent: toHours(m),
  }));

const normalizeCategories = (raw: unknown): CategoryDistribution[] => {
  const list = asArray<Record<string, unknown>>(raw).map((c) => ({
    category: str(c.category, c.categoryName, c.name) || 'Other',
    count: num(c.count, c.courseCount, c.total, c.value),
    percentage: num(c.percentage, c.percent, c.share),
  }));
  const totalCount = list.reduce((s, c) => s + c.count, 0);
  if (totalCount > 0 && list.every((c) => c.percentage === 0)) {
    return list.map((c) => ({
      ...c,
      percentage: Math.round((c.count / totalCount) * 100),
    }));
  }
  return list;
};

const normalizeAnalytics = (
  raw: unknown,
  period: UiPeriod,
  userId: string,
): UserAnalytics => {
  const d = (unwrap<Record<string, unknown>>(raw) ?? {}) as Record<string, unknown>;

  const summaryObj = (d.summary ?? d.overview ?? (typeof d.coursesEnrolled === 'number' ? d : {})) as Record<string, unknown>;

  const summary: UserAnalyticsSummary = {
    coursesEnrolled: num(summaryObj.coursesEnrolled, summaryObj.enrolledCourses, d.coursesEnrolled),
    coursesInProgress: num(summaryObj.coursesInProgress, summaryObj.inProgressCourses, d.coursesInProgress),
    hoursLearned: num(summaryObj.hoursLearned, summaryObj.hoursSpent, d.hoursLearned),
    hoursLearnedPrevPeriod: num(summaryObj.hoursLearnedPrevPeriod, summaryObj.prevPeriodHours, d.hoursLearnedPrevPeriod),
    lecturesCompleted: num(summaryObj.lecturesCompleted, summaryObj.completedLectures, d.lecturesCompleted),
    lecturesRemaining: num(summaryObj.lecturesRemaining, summaryObj.remainingLectures, d.lecturesRemaining),
  };

  const activityRaw = (d.activityBreakdown ?? d.weeklyActivity ?? d.dailyActivity ?? d.activity ?? []) as unknown[];
  const activityBreakdown: ActivityBreakdownItem[] = asArray<Record<string, unknown>>(activityRaw).map((item, i) => ({
    label: str(item.label, item.day, item.dayName) || labelForDay(item, i),
    minutesWatched: num(item.minutesWatched, item.watchMinutes, item.minutes, Math.round(num(item.hours) * 60)),
  }));

  const catRaw = (d.categoryBreakdown ?? d.categoryDistribution ?? d.categories ?? d.byCategory ?? []) as unknown[];
  const categoryBreakdown: CategoryBreakdownItem[] = asArray<Record<string, unknown>>(catRaw).map((item) => ({
    categoryId: str(item.categoryId, item.id),
    categoryName: str(item.categoryName, item.category, item.name) || 'Other',
    color: str(item.color) || '#2563EB',
    minutesWatched: num(item.minutesWatched, item.watchMinutes, item.minutes),
    percentage: num(item.percentage, item.percent, item.share),
  }));

  const trendRaw = (d.weeklyTrend ?? d.monthlyProgress ?? d.trend ?? []) as unknown[];
  const weeklyTrend: WeeklyTrendItem[] = asArray<Record<string, unknown>>(trendRaw).map((item, i) => ({
    weekLabel: str(item.weekLabel, item.label, item.month) || `Week ${i + 1}`,
    minutesWatched: num(item.minutesWatched, item.watchMinutes, item.minutes, Math.round(num(item.hoursSpent) * 60)),
    percentageOfBest: num(item.percentageOfBest, item.percentage, item.percent),
  }));

  // Legacy fallback lists
  const weeklyActivity: WeeklyActivity[] = activityBreakdown.map((a) => ({
    day: a.label,
    hours: Math.round((a.minutesWatched / 60) * 100) / 100,
    lessonsCompleted: 0,
  }));

  const monthlyProgress: MonthlyProgress[] = weeklyTrend.map((t) => ({
    month: t.weekLabel,
    coursesCompleted: 0,
    hoursSpent: Math.round((t.minutesWatched / 60) * 100) / 100,
  }));

  const categoryDistribution: CategoryDistribution[] = categoryBreakdown.map((c) => ({
    category: c.categoryName,
    count: c.minutesWatched,
    percentage: c.percentage,
  }));

  const totalWatchTime = Math.round((summary.hoursLearned || 0) * 60) || num(summaryObj.totalWatchTime, summaryObj.totalWatchMinutes);

  return {
    userId: str(d.userId, d.studentId, userId),
    period,
    summary,
    activityBreakdown,
    categoryBreakdown,
    weeklyTrend,
    totalWatchTime,
    coursesEnrolled: summary.coursesEnrolled,
    coursesCompleted: num(summaryObj.coursesCompleted),
    lessonsCompleted: summary.lecturesCompleted,
    averageQuizScore: num(summaryObj.averageQuizScore, d.averageQuizScore),
    streak: num(summaryObj.streak, d.streak),
    weeklyActivity,
    monthlyProgress,
    categoryDistribution,
  };
};

const normalizeCourse = (raw: Record<string, unknown>): Course => {
  const course = (raw.course ?? raw) as Record<string, unknown>;
  const categoryRaw = course.category as Record<string, unknown> | string | undefined;

  const category =
    categoryRaw && typeof categoryRaw === 'object'
      ? (categoryRaw as unknown as Course['category'])
      : ({
          id: str(course.categoryId),
          name: typeof categoryRaw === 'string' ? categoryRaw : str(course.categoryName) || 'Other',
          slug: '',
          description: '',
          color: '',
          parentId: null,
          sortOrder: 0,
          courseCount: 0,
          studentCount: 0,
          status: 'active',
        } as unknown as Course['category']);

  return {
    id: str(course.id, course.courseId, raw.courseId),
    title: str(course.title, course.courseTitle, course.name) || 'Untitled course',
    slug: str(course.slug),
    description: str(course.description),
    shortDescription: str(course.shortDescription),
    category,
    categoryId: str(course.categoryId, (categoryRaw as Record<string, unknown>)?.id as string),
    thumbnail: str(course.thumbnailUrl, course.thumbnail, course.imageUrl),
    previewVideo: str(course.previewVideoUrl, course.previewVideo) || undefined,
    instructor: (course.instructor as Course['instructor']) ?? {
      id: str(course.instructorId),
      name: str(course.instructorName) || 'Instructor',
      avatar: '',
      bio: '',
      title: '',
      rating: 0,
      students: 0,
      courses: 0,
    },
    instructorId: str(course.instructorId),
    duration: str(course.duration) || `${num(course.totalDuration)} min`,
    totalDuration: num(course.totalDuration, course.durationMinutes),
    lessons: num(course.totalLessons, course.lessons, course.lessonCount),
    students: num(course.totalStudents, course.students, course.enrollmentCount),
    rating: num(course.avgRating, course.rating),
    reviewCount: num(course.reviewCount, course.totalReviews),
    price: num(course.basePrice, course.price),
    discountPrice: typeof course.discountPrice === 'number' ? course.discountPrice : undefined,
    level: (str(course.level) as Course['level']) || 'Beginner',
    status: (str(course.status) as Course['status']) || 'Published',
    featured: Boolean(course.featured),
    tags: Array.isArray(course.tags) ? (course.tags as string[]) : [],
    requirements: Array.isArray(course.requirements) ? (course.requirements as string[]) : [],
    whatYouWillLearn: Array.isArray(course.whatYouWillLearn)
      ? (course.whatYouWillLearn as string[])
      : [],
    curriculum: Array.isArray(course.curriculum) ? (course.curriculum as Course['curriculum']) : [],
    createdAt: safeIsoDate(str(course.createdAt)),
    updatedAt: safeIsoDate(str(course.updatedAt)),
  };
};

/** `/api/student/courses` rows already carry progress → map straight to Enrollment. */
const normalizeMyCourse = (raw: Record<string, unknown>, userId: string): Enrollment => {
  const course = normalizeCourse(raw);
  const progressRaw = (raw.progress ?? {}) as Record<string, unknown>;

  const completedLessonIds = Array.isArray(progressRaw.completedLessons)
    ? (progressRaw.completedLessons as string[])
    : Array.isArray(raw.completedLessons)
      ? (raw.completedLessons as string[])
      : [];

  const completedCount = completedLessonIds.length
    ? completedLessonIds.length
    : num(raw.completedLessons, progressRaw.completedLessonsCount, raw.lessonsCompleted);

  const totalLessons = num(
    progressRaw.totalLessons,
    raw.totalLessons,
    course.lessons,
  );

  const percentage = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        num(
          raw.progressPercentage,
          progressRaw.progressPercentage,
          raw.progress as number,
          raw.completionPercentage,
        ) || (totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0),
      ),
    ),
  );

  const backendStatus = str(raw.status, raw.enrollmentStatus, raw.filter).toUpperCase();
  const status: Enrollment['status'] =
    backendStatus === 'COMPLETED' || percentage >= 100
      ? 'completed'
      : backendStatus === 'EXPIRED'
        ? 'expired'
        : backendStatus === 'CANCELLED'
          ? 'cancelled'
          : 'active';

  const progress: CourseProgress = {
    courseId: course.id,
    userId,
    completedLessons: completedLessonIds.length
      ? completedLessonIds
      : Array.from({ length: completedCount }, (_, i) => `${course.id}-lesson-${i + 1}`),
    totalLessons,
    progressPercentage: percentage,
    lastAccessedAt: safeIsoDate(
      str(raw.lastAccessedAt, progressRaw.lastAccessedAt, raw.updatedAt),
    ),
    lastLessonId: str(raw.lastLessonId, progressRaw.lastLessonId) || undefined,
    watchTime: num(raw.watchTime, progressRaw.watchTime, raw.watchMinutes),
    quizScores: [],
    notes: [],
  };

  return {
    id: str(raw.enrollmentId, raw.id) || `enr-${course.id}`,
    userId,
    courseId: course.id,
    course,
    enrolledAt: safeIsoDate(str(raw.enrolledAt, raw.grantedAt, raw.createdAt)),
    expiresAt: str(raw.expiresAt) || undefined,
    status,
    progress,
    certificateId: str(raw.certificateId) || undefined,
  };
};

const toPaged = <T>(raw: unknown, items: T[], fallbackSize: number): PagedResult<T> => {
  const p = (unwrap<Record<string, unknown>>(raw) ?? {}) as Record<string, unknown>;
  const page = num(p.number, p.page, p.currentPage);
  const size = num(p.size, p.pageSize, p.itemsPerPage) || fallbackSize || items.length;
  const totalElements = num(p.totalElements, p.totalItems, p.total) || items.length;
  const totalPages =
    num(p.totalPages) || (size > 0 ? Math.max(1, Math.ceil(totalElements / size)) : 1);

  return {
    items,
    page,
    size,
    totalElements,
    totalPages,
    first: typeof p.first === 'boolean' ? p.first : page === 0,
    last: typeof p.last === 'boolean' ? p.last : page >= totalPages - 1,
  };
};

const ok = <T>(data: T, message?: string): ApiResponse<T> => ({
  success: true,
  data,
  message,
});

/* ------------------------------------------------------------------ */
/* Service                                                             */
/* ------------------------------------------------------------------ */

export const studentAnalyticsService = {
  /** GET /api/student/analytics?range=WEEK|MONTH|YEAR */
  async getAnalytics(
    period: UiPeriod = 'week',
    userId = '',
  ): Promise<ApiResponse<UserAnalytics>> {
    const raw = await apiClient.get<unknown>('/student/analytics', {
      params: { range: toRange(period) },
    });
    return ok(normalizeAnalytics(raw, period, userId));
  },

  /** GET /api/student/courses?filter=ALL|IN_PROGRESS|COMPLETED&search=&page=&size= */
  async getStudentCourses(
    params: { filter?: 'ALL' | 'IN_PROGRESS' | 'COMPLETED'; search?: string; page?: number; size?: number } = {},
  ): Promise<{
    summary: { enrolled: number; inProgress: number; completed: number; hoursLearned: number };
    courses: PagedResult<Record<string, any>>;
  }> {
    const { filter = 'ALL', search, page = 0, size = 10 } = params;
    const queryParams: Record<string, any> = { filter, page, size };
    if (search) queryParams.search = search;

    const raw: any = await apiClient.get<unknown>('/student/courses', { params: queryParams });
    const payload = unwrap<any>(raw) ?? {};
    const summary = payload.summary ?? { enrolled: 0, inProgress: 0, completed: 0, hoursLearned: 0 };
    const coursesObj = payload.courses ?? {};
    const content = Array.isArray(coursesObj.content) ? coursesObj.content : asArray<Record<string, any>>(raw);
    const paged = toPaged(coursesObj, content, size);

    return { summary, courses: paged };
  },

  /** GET /api/student/my-courses?search=&page=&size= (Combined Recorded + Live Courses) */
  async getCombinedMyCourses(
    params: { search?: string; page?: number; size?: number } = {},
  ): Promise<{
    summary: { totalEnrolled: number; courseCount: number; liveCourseCount: number };
    courses: PagedResult<Record<string, any>>;
  }> {
    const { search, page = 0, size = 10 } = params;
    const queryParams: Record<string, any> = { page, size };
    if (search) queryParams.search = search;

    const raw: any = await apiClient.get<unknown>('/student/my-courses', { params: queryParams });
    const payload = unwrap<any>(raw) ?? {};
    const summary = payload.summary ?? { totalEnrolled: 0, courseCount: 0, liveCourseCount: 0 };
    const coursesObj = payload.courses ?? {};
    const content = Array.isArray(coursesObj.content) ? coursesObj.content : asArray<Record<string, any>>(raw);
    const paged = toPaged(coursesObj, content, size);

    return { summary, courses: paged };
  },

  /** GET /api/student/live-courses?filter=ALL|UPCOMING|ONGOING|COMPLETED&search=&page=&size= */
  async getStudentLiveCourses(
    params: { filter?: 'ALL' | 'UPCOMING' | 'ONGOING' | 'COMPLETED'; search?: string; page?: number; size?: number } = {},
  ): Promise<{
    summary: { enrolled: number; upcoming: number; ongoing: number; completed: number };
    liveCourses: PagedResult<Record<string, any>>;
  }> {
    const { filter = 'ALL', search, page = 0, size = 10 } = params;
    const queryParams: Record<string, any> = { filter, page, size };
    if (search) queryParams.search = search;

    const raw: any = await apiClient.get<unknown>('/student/live-courses', { params: queryParams });
    const payload = unwrap<any>(raw) ?? {};
    const summary = payload.summary ?? { enrolled: 0, upcoming: 0, ongoing: 0, completed: 0 };
    const liveObj = payload.liveCourses ?? payload.courses ?? {};
    const content = Array.isArray(liveObj.content) ? liveObj.content : asArray<Record<string, any>>(raw);
    const paged = toPaged(liveObj, content, size);

    return { summary, liveCourses: paged };
  },

  /** GET /api/student/courses?filter=&page=&size= (Normalized to Enrollment[]) */
  async getMyCourses(
    params: MyCoursesParams = {},
    userId = '',
  ): Promise<ApiResponse<PagedResult<Enrollment>> & { summary?: any }> {
    const { filter = 'ALL', keyword, page = 0, size = 10 } = params;
    try {
      // Try combined /student/my-courses first
      const combinedRes = await this.getCombinedMyCourses({ search: keyword, page, size });
      const items = combinedRes.courses.items.map((r) => normalizeMyCourse(r, userId));
      const res = ok(toPaged(combinedRes.courses, items, size));
      (res as any).summary = combinedRes.summary;
      return res;
    } catch {
      // Fallback to /student/courses
      const studentRes = await this.getStudentCourses({ filter, search: keyword, page, size });
      const items = studentRes.courses.items.map((r) => normalizeMyCourse(r, userId));
      const res = ok(toPaged(studentRes.courses, items, size));
      (res as any).summary = studentRes.summary;
      return res;
    }
  },

  /** Convenience: every enrolled course across pages (used by the analytics page). */
  async getAllMyCourses(userId = ''): Promise<ApiResponse<Enrollment[]>> {
    const first = await this.getMyCourses({ filter: 'ALL', page: 0, size: 50 }, userId);
    const all = [...first.data.items];
    for (let p = 1; p < first.data.totalPages && p < 20; p += 1) {
      const next = await this.getMyCourses({ filter: 'ALL', page: p, size: 50 }, userId);
      all.push(...next.data.items);
    }
    return ok(all);
  },

  /** GET /api/student/courses?filter=IN_PROGRESS */
  getInProgressCourses(page = 0, size = 10, userId = '') {
    return this.getMyCourses({ filter: 'IN_PROGRESS', page, size }, userId);
  },

  /** GET /api/student/courses?filter=COMPLETED */
  getCompletedCourses(page = 0, size = 10, userId = '') {
    return this.getMyCourses({ filter: 'COMPLETED', page, size }, userId);
  },

  /** GET /api/student/courses/search?keyword=&page=&size= */
  async searchMyCourses(
    keyword: string,
    page = 0,
    size = 10,
    userId = '',
  ): Promise<ApiResponse<PagedResult<Enrollment>>> {
    return this.getMyCourses({ keyword, page, size }, userId);
  },

  /** GET /api/student/courses/{courseId} */
  async getCourseDetails(
    courseId: string,
    userId = '',
  ): Promise<ApiResponse<Enrollment>> {
    const raw = await apiClient.get<unknown>(`/student/courses/${courseId}`);
    const payload = (unwrap<Record<string, unknown>>(raw) ?? {}) as Record<string, unknown>;
    return ok(normalizeMyCourse(payload, userId));
  },

  /** GET /api/student/courses/{courseId}/progress */
  async getCourseProgress(courseId: string): Promise<ApiResponse<any>> {
    const raw = await apiClient.get<unknown>(`/student/courses/${courseId}/progress`);
    return ok(unwrap<any>(raw));
  },
};

export default studentAnalyticsService;
