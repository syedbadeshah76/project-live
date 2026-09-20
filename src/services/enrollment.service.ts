// src/services/enrollment.service.ts
// ============= Enrollment Service (backend-integrated) =============
import { apiClient } from '@/lib/api-client';
import type {
  ApiResponse,
  Enrollment,
  CourseProgress,
  Note,
  PaginationParams,
  PaginationMeta,
  Course,
} from '@/types/api.types';
import { notesService } from '@/services/notes.service';

/* ---------- Backend response shapes ---------- */

interface AccessCourseDTO {
  courseId: string;
  accessType: string;            // "PURCHASED" | "FREE" | ...
  grantedAt: string;             // ISO-ish timestamp
  orderId?: string | null;
}

interface BackendCourseDTO {
  id: string;
  tenantId?: string;
  title: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  thumbnailUrl?: string;
  thumbnail?: string;
  instructorId?: string;
  instructor?: any;
  categoryId?: string;
  category?: any;
  subcategoryId?: string | null;
  language?: string;
  status?: string;
  basePrice?: number;
  price?: number;
  avgRating?: number;
  rating?: number;
  totalLessons?: number;
  lessons?: number;
  totalDuration?: number;        // minutes
  duration?: string | number;
  totalStudents?: number;
  students?: number;
  reviewCount?: number;
  tags?: string[];
  requirements?: string[];
  whatYouWillLearn?: string[];
  curriculum?: any[];
  createdAt?: string;
  updatedAt?: string;
  [k: string]: any;
}

/* ---------- Helpers ---------- */

const safeIsoDate = (value?: string): string => {
  if (!value) return new Date().toISOString();
  // Some backends send fractional seconds without Z; make it a valid ISO.
  const normalized = /Z|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

const toCourse = (dto: BackendCourseDTO | undefined, courseId: string): Course => {
  const d: BackendCourseDTO = dto ?? { id: courseId, title: 'Untitled course' };

  const lessons =
    typeof d.totalLessons === 'number'
      ? d.totalLessons
      : typeof d.lessons === 'number'
        ? d.lessons
        : 0;

  const rating =
    typeof d.avgRating === 'number' ? d.avgRating : typeof d.rating === 'number' ? d.rating : 0;

  const price =
    typeof d.basePrice === 'number' ? d.basePrice : typeof d.price === 'number' ? d.price : 0;

  const students =
    typeof d.totalStudents === 'number'
      ? d.totalStudents
      : typeof d.students === 'number'
        ? d.students
        : 0;

  const totalDuration =
    typeof d.totalDuration === 'number'
      ? d.totalDuration
      : typeof d.duration === 'number'
        ? d.duration
        : typeof d.duration === 'string'
          ? parseInt(d.duration, 10) || 0
          : 0;

  const category =
    d.category && typeof d.category === 'object'
      ? d.category
      : {
          id: d.categoryId ?? 'general',
          name: typeof d.category === 'string' ? d.category : 'General',
          slug: (typeof d.category === 'string' ? d.category : 'general')
            .toLowerCase()
            .replace(/\s+/g, '-'),
          description: '',
          icon: 'BookOpen',
          color: 'from-blue-500 to-cyan-500',
          courseCount: 0,
          isActive: true,
        };

  const instructor =
    d.instructor && typeof d.instructor === 'object'
      ? d.instructor
      : {
          id: d.instructorId ?? 'unknown',
          name: typeof d.instructor === 'string' ? d.instructor : 'Instructor',
          avatar: '',
          bio: '',
          title: '',
          rating: 0,
          students: 0,
          courses: 0,
        };

  return {
    id: d.id ?? courseId,
    title: d.title ?? 'Untitled course',
    slug: d.slug ?? (d.title ?? 'course').toLowerCase().replace(/\s+/g, '-'),
    description: d.description ?? '',
    shortDescription: d.shortDescription ?? (d.description ?? '').substring(0, 120),
    thumbnail: d.thumbnailUrl ?? d.thumbnail ?? '',
    price,
    rating,
    students,
    lessons,
    totalDuration,
    duration: typeof d.duration === 'string' ? d.duration : `${totalDuration}m`,
    reviewCount: d.reviewCount ?? 0,
    category,
    categoryId: d.categoryId ?? category.id,
    instructor,
    instructorId: d.instructorId ?? instructor.id,
    instructorAvatar: instructor.avatar ?? '',
    tags: d.tags ?? [],
    requirements: d.requirements ?? [],
    whatYouWillLearn: d.whatYouWillLearn ?? [],
    curriculum: d.curriculum ?? [],
    createdAt: d.createdAt ?? new Date().toISOString(),
    updatedAt: d.updatedAt ?? new Date().toISOString(),
  } as unknown as Course;
};

const buildEnrollment = (
  access: AccessCourseDTO,
  courseDto: BackendCourseDTO | undefined,
  progress?: Partial<CourseProgress>,
): Enrollment => {
  const course = toCourse(courseDto, access.courseId);
  const totalLessons = (course as any).lessons ?? 0;
  const completedLessons = progress?.completedLessons ?? [];
  const progressPercentage =
    progress?.progressPercentage ??
    (totalLessons > 0
      ? Math.min(100, Math.round((completedLessons.length / totalLessons) * 100))
      : 0);

  return {
    id: `enrollment-${access.courseId}`,
    userId: '',
    courseId: access.courseId,
    course,
    enrolledAt: safeIsoDate(access.grantedAt),
    status: progressPercentage === 100 ? 'completed' : 'active',
    orderId: access.orderId ?? undefined,
    accessType: access.accessType,
    progress: {
      courseId: access.courseId,
      userId: '',
      completedLessons,
      totalLessons,
      progressPercentage,
      lastAccessedAt: progress?.lastAccessedAt ?? safeIsoDate(access.grantedAt),
      lastLessonId: progress?.lastLessonId,
      watchTime: progress?.watchTime ?? 0,
      quizScores: progress?.quizScores ?? [],
      notes: progress?.notes ?? [],
    },
  } as unknown as Enrollment;
};

/**
 * Fetch course details for an access row. Never throws — a failed lookup
 * still returns a minimal Enrollment so the dashboard doesn't blank out.
 */
const fetchCourseSafe = async (courseId: string): Promise<BackendCourseDTO | undefined> => {
  try {
    const res = await apiClient.get<BackendCourseDTO | ApiResponse<BackendCourseDTO>>(
      `/courses/${courseId}`,
    );
    // Support both raw and { success, data } envelopes.
    if (res && typeof res === 'object' && 'data' in res && (res as any).data) {
      return (res as ApiResponse<BackendCourseDTO>).data;
    }
    return res as BackendCourseDTO;
  } catch {
    return undefined;
  }
};

/* ---------- Service ---------- */

/* ---------- Service ---------- */

export const enrollmentService = {
  // Get user's enrollments (backed by GET /api/student/my-courses with fallback)
  async getMyEnrollments(
    _pagination?: PaginationParams,
    status?: 'active' | 'completed' | 'all',
  ): Promise<ApiResponse<Enrollment[]> & { meta: PaginationMeta; summary?: any }> {
    try {
      const raw: any = await apiClient.get('/student/my-courses', { params: { productType: 'COURSE', page: 0, size: 100 } });
      const payload = (raw && typeof raw === 'object' && 'data' in raw && !( 'courses' in raw )) ? raw.data : raw;
      const coursesObj = payload?.courses ?? payload?.data?.courses ?? {};
      const content: any[] = Array.isArray(coursesObj.content)
        ? coursesObj.content
        : Array.isArray(payload?.content)
        ? payload.content
        : Array.isArray(raw)
        ? raw
        : [];

      if (content.length > 0) {
        // Exclude LIVE_COURSE items from My Courses
        const recordedContent = content.filter((item: any) => item.productType !== 'LIVE_COURSE' && !item.isLive);
        let enrollments: Enrollment[] = recordedContent.map((item: any) => {
          const courseId = String(item.id || item.courseId || item.liveCourseId || '');
          const isLive = item.productType === 'LIVE_COURSE' || item.liveCourseStatus != null;
          const courseObj: BackendCourseDTO = {
            id: courseId,
            title: item.title || 'Untitled Course',
            thumbnailUrl: item.thumbnailUrl || item.thumbnail || '',
            totalLessons: item.totalLessons ?? 0,
            lessons: item.totalLessons ?? 0,
            status: item.courseStatus || item.status || 'PUBLISHED',
            isLive,
            productType: item.productType,
            liveCourseStatus: item.liveCourseStatus,
            meetingPlatform: item.meetingPlatform,
            meetingLink: item.meetingLink,
            timezone: item.timezone,
            startDate: item.startDate,
            endDate: item.endDate,
            sessionDays: item.sessionDays,
            sessionStartTime: item.sessionStartTime,
            sessionEndTime: item.sessionEndTime,
            sessionDurationMinutes: item.sessionDurationMinutes,
            maxSeats: item.maxSeats,
            instructorId: item.instructorId,
          };

          const progressPct = Number(item.progressPercentage ?? 0);
          const compLessons = Number(item.completedLessons ?? 0);
          const totLessons = Number(item.totalLessons ?? 0);
          const isCompleted = (item.courseStatus || item.status) === 'COMPLETED' || progressPct >= 100;

          return buildEnrollment(
            { courseId, accessType: 'PURCHASED', grantedAt: new Date().toISOString() },
            courseObj,
            {
              progressPercentage: progressPct,
              completedLessons: Array.from({ length: compLessons }, (_, i) => `${courseId}-lesson-${i + 1}`),
              totalLessons: totLessons,
            },
          );
        });

        if (status && status !== 'all') {
          enrollments = enrollments.filter((e) => e.status === status);
        }

        return {
          success: true,
          data: enrollments,
          summary: payload?.summary,
          meta: {
            currentPage: 1,
            totalPages: 1,
            totalItems: enrollments.length,
            itemsPerPage: enrollments.length,
            hasNextPage: false,
            hasPrevPage: false,
          },
        };
      }
    } catch {
      /* fallback to GET /student/courses or /access/courses */
    }

    try {
      const rawStudent: any = await apiClient.get('/student/courses', { params: { filter: 'ALL', page: 0, size: 100 } });
      const payload = (rawStudent && typeof rawStudent === 'object' && 'data' in rawStudent && !( 'courses' in rawStudent )) ? rawStudent.data : rawStudent;
      const coursesObj = payload?.courses ?? {};
      const content: any[] = Array.isArray(coursesObj.content) ? coursesObj.content : [];

      if (content.length > 0) {
        let enrollments: Enrollment[] = content.map((item: any) => {
          const courseId = String(item.courseId || item.id || '');
          const courseObj: BackendCourseDTO = {
            id: courseId,
            title: item.title || 'Untitled Course',
            thumbnailUrl: item.thumbnailUrl || item.thumbnail || '',
            totalLessons: item.totalLessons ?? 0,
            lessons: item.totalLessons ?? 0,
            status: item.status || 'PUBLISHED',
          };
          const progressPct = Number(item.progressPercentage ?? 0);
          const compLessons = Number(item.completedLessons ?? 0);
          const totLessons = Number(item.totalLessons ?? 0);

          return buildEnrollment(
            { courseId, accessType: 'PURCHASED', grantedAt: new Date().toISOString() },
            courseObj,
            {
              progressPercentage: progressPct,
              completedLessons: Array.from({ length: compLessons }, (_, i) => `${courseId}-lesson-${i + 1}`),
              totalLessons: totLessons,
            },
          );
        });

        if (status && status !== 'all') {
          enrollments = enrollments.filter((e) => e.status === status);
        }

        return {
          success: true,
          data: enrollments,
          summary: payload?.summary,
          meta: {
            currentPage: 1,
            totalPages: 1,
            totalItems: enrollments.length,
            itemsPerPage: enrollments.length,
            hasNextPage: false,
            hasPrevPage: false,
          },
        };
      }
    } catch {
      /* fallback to /access/products */
    }

    let accessList: AccessCourseDTO[] = [];
    try {
      const rawAccess: any = await apiClient.get('/access/products');
      const payload = (rawAccess && typeof rawAccess === 'object' && 'data' in rawAccess)
        ? rawAccess.data
        : rawAccess;
      const items: any[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.products)
        ? payload.products
        : Array.isArray(payload?.content)
        ? payload.content
        : Array.isArray(rawAccess)
        ? rawAccess
        : [];

      accessList = items
        .map((item: any) => ({
          courseId: String(item.courseId || item.productId || item.id || ''),
          accessType: item.accessType || item.type || 'PURCHASED',
          grantedAt: safeIsoDate(item.grantedAt || item.createdAt),
          orderId: item.orderId ?? null,
        }))
        .filter((a) => Boolean(a.courseId));
    } catch {
      accessList = [];
    }

    const courseDtos = await Promise.all(accessList.map((a) => fetchCourseSafe(a.courseId)));
    let enrollments = accessList.map((a, i) => buildEnrollment(a, courseDtos[i]));

    if (status && status !== 'all') {
      enrollments = enrollments.filter((e) => e.status === status);
    }

    return {
      success: true,
      data: enrollments,
      meta: {
        currentPage: 1,
        totalPages: 1,
        totalItems: enrollments.length,
        itemsPerPage: enrollments.length,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  },

  // Get single enrollment (uses GET /student/courses/{courseId} or fallback)
  async getEnrollment(courseId: string): Promise<ApiResponse<Enrollment>> {
    try {
      const res: any = await apiClient.get(`/student/courses/${courseId}`);
      const data = (res && typeof res === 'object' && 'data' in res && !( 'courseId' in res )) ? res.data : res;
      if (data && (data.courseId || data.id || data.title)) {
        const cId = String(data.courseId || data.id || courseId);
        const courseObj: BackendCourseDTO = {
          id: cId,
          title: data.title || 'Untitled Course',
          description: data.description,
          thumbnailUrl: data.thumbnailUrl,
          totalLessons: data.totalLessons ?? 0,
          lessons: data.totalLessons ?? 0,
          status: data.status || 'PUBLISHED',
        };
        const progressPct = Number(data.progressPercentage ?? 0);
        const compLessons = Number(data.completedLessons ?? 0);
        const totLessons = Number(data.totalLessons ?? 0);

        const enrollment = buildEnrollment(
          { courseId: cId, accessType: 'PURCHASED', grantedAt: new Date().toISOString() },
          courseObj,
          {
            progressPercentage: progressPct,
            completedLessons: Array.from({ length: compLessons }, (_, i) => `${cId}-lesson-${i + 1}`),
            totalLessons: totLessons,
          },
        );
        return { success: true, data: enrollment };
      }
    } catch {
      /* fallback */
    }

    let row: AccessCourseDTO | undefined;
    try {
      const rawAccess: any = await apiClient.get('/access/products');
      const payload = (rawAccess && typeof rawAccess === 'object' && 'data' in rawAccess)
        ? rawAccess.data
        : rawAccess;
      const items: any[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.products)
        ? payload.products
        : Array.isArray(payload?.content)
        ? payload.content
        : Array.isArray(rawAccess)
        ? rawAccess
        : [];

      const matched = items.find(
        (item: any) => String(item.courseId || item.productId || item.id || '') === String(courseId),
      );
      if (matched) {
        row = {
          courseId: String(matched.courseId || matched.productId || matched.id || courseId),
          accessType: matched.accessType || matched.type || 'PURCHASED',
          grantedAt: safeIsoDate(matched.grantedAt || matched.createdAt),
          orderId: matched.orderId ?? null,
        };
      }
    } catch {
      /* fallback */
    }

    const courseDto = await fetchCourseSafe(courseId);
    return {
      success: true,
      data: buildEnrollment(
        row || { courseId, accessType: 'PURCHASED', grantedAt: new Date().toISOString() },
        courseDto,
      ),
    };
  },

  // Enroll in a course (payment-initiated flow is handled server-side after order)
  async enrollInCourse(courseId: string, paymentId?: string): Promise<ApiResponse<Enrollment>> {
    try {
      await apiClient.post(`/access/products`, { courseId, productId: courseId, paymentId });
    } catch {
      await apiClient.post(`/access/courses`, { courseId, paymentId }).catch(() => {});
    }
    return this.getEnrollment(courseId);
  },

  // Check if user has access to a course — checks GET /access/check/{productId}, Recorded Courses, and Live Courses
  async checkEnrollment(
    product_id: string,
  ): Promise<ApiResponse<{ isEnrolled: boolean; enrollment?: Enrollment }>> {
    if (!product_id) return { success: true, data: { isEnrolled: false } };

    try {
      const res: any = await apiClient.get(`/access/check/${product_id}`);
      const payload = (res && typeof res === 'object' && 'data' in res && typeof res.data === 'object')
        ? res.data
        : res;

      const hasAccess = Boolean(
        payload === true ||
        payload?.hasAccess === true ||
        payload?.access === true ||
        payload?.isEnrolled === true ||
        payload?.granted === true ||
        payload?.courseId ||
        payload?.productId,
      );

      if (hasAccess) {
        const enrollment = await this.getEnrollment(product_id).then((r) => r.data).catch(() => undefined);
        return { success: true, data: { isEnrolled: true, enrollment } };
      }
    } catch {
      /* fallback to Recorded & Live enrollments check */
    }

    try {
      const myEnr = await this.getMyEnrollments();
      const match = myEnr.data.find((e) => String(e.courseId || e.course?.id) === String(product_id));
      if (match) {
        return { success: true, data: { isEnrolled: true, enrollment: match } };
      }
    } catch {
      /* ignore */
    }

    try {
      const liveRes: any = await apiClient.get('/student/my-courses', { params: { productType: 'LIVE_COURSE', page: 0, size: 100 } });
      const payload = (liveRes && typeof liveRes === 'object' && 'data' in liveRes && !('courses' in liveRes)) ? liveRes.data : liveRes;
      const content = payload?.courses?.content ?? payload?.content ?? (Array.isArray(payload) ? payload : []);
      if (Array.isArray(content)) {
        const matchLive = content.find((item: any) => String(item.id || item.courseId || item.liveCourseId || '') === String(product_id));
        if (matchLive) {
          return { success: true, data: { isEnrolled: true } };
        }
      }
    } catch {
      /* ignore */
    }

    return { success: true, data: { isEnrolled: false } };
  },

  /**
   * Lightweight helper: returns the Set of courseIds (both Recorded & Live) the current user has access to.
   */
  async getEnrolledCourseIds(): Promise<Set<string>> {
    const set = new Set<string>();
    try {
      const myEnr = await this.getMyEnrollments();
      myEnr.data.forEach((e) => {
        const id = String(e.courseId || e.course?.id || '');
        if (id) set.add(id);
      });
    } catch {
      /* ignore */
    }

    try {
      const liveRes: any = await apiClient.get('/student/my-courses', { params: { productType: 'LIVE_COURSE', page: 0, size: 100 } });
      const payload = (liveRes && typeof liveRes === 'object' && 'data' in liveRes && !('courses' in liveRes)) ? liveRes.data : liveRes;
      const content = payload?.courses?.content ?? payload?.content ?? (Array.isArray(payload) ? payload : []);
      if (Array.isArray(content)) {
        content.forEach((item: any) => {
          const id = String(item.id || item.courseId || item.liveCourseId || '');
          if (id) set.add(id);
        });
      }
    } catch {
      /* ignore */
    }

    return set;
  },

  // Fetch total enrollment count for a specific course (supports Recorded and Live courses)
  async getCourseEnrollmentCount(courseId: string): Promise<ApiResponse<{ count: number }>> {
    if (!courseId) {
      return { success: true, data: { count: 0 } };
    }

    // 1. Try Live Course enrolled-count endpoint
    try {
      const res = await apiClient.get<any>(`/live-courses/${courseId}/enrolled-count`);
      const data = res?.data !== undefined ? res.data : res;
      if (typeof data === 'number') return { success: true, data: { count: data } };
      if (data && typeof data === 'object') {
        const c = Number(data.enrolledStudentCount ?? data.enrolledCount ?? data.count ?? data.totalStudents ?? 0);
        if (c > 0) return { success: true, data: { count: c } };
      }
    } catch {
      // Not a live course or endpoint failed
    }

    // 2. Fetch course metadata safely
    try {
      const courseDto = await fetchCourseSafe(courseId);
      if (courseDto) {
        const count = Number(
          courseDto.enrolledStudentCount ??
          courseDto.enrolledCount ??
          courseDto.totalStudents ??
          courseDto.students ??
          0
        );
        return { success: true, data: { count } };
      }
    } catch {
      // Fallback
    }

    return { success: true, data: { count: 0 } };
  },

  // Get course progress
  async getCourseProgress(courseId: string): Promise<ApiResponse<CourseProgress>> {
    return apiClient.get<ApiResponse<CourseProgress>>(`/courses/${courseId}/progress`);
  },

  // Update lesson progress (mark as complete)
  async markLessonComplete(
    _courseId: string,
    lessonId: string,
  ): Promise<ApiResponse<any>> {
    const res = await apiClient.put<any>(`/student/lessons/${lessonId}/session`, {
      watchedSeconds: 0,
      lastPositionSeconds: 0,
      progressPercentage: 100,
      completed: true,
    });
    return { success: true, data: res?.data ?? res };
  },

  // Update watch time
  async updateWatchTime(
    courseId: string,
    lessonId: string,
    seconds: number,
  ): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.post<ApiResponse<{ success: boolean }>>(
      `/enrollments/${courseId}/watch-time`,
      { lessonId, seconds },
    );
  },

  // Save lesson note
  // Save lesson note
  async saveNote(
    courseId: string,
    lessonId: string,
    content: string,
    timestamp?: number,
  ): Promise<ApiResponse<Note>> {
    return notesService.create({
      courseId,
      lessonId,
      title: 'Note',
      content,
      timestamp,
    });
  },

  // Get course notes
 // Get course notes
  async getNotes(courseId: string): Promise<ApiResponse<Note[]>> {
    return notesService.listByCourse(courseId);
  },

  // Update a note
  async updateNote(
    noteId: string,
    content: string,
    title?: string,
    timestamp?: number,
  ): Promise<ApiResponse<Note>> {
    return notesService.update(noteId, { content, title, timestamp });
  },

  // Delete note
  async deleteNote(
    _courseId: string,
    noteId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return notesService.remove(noteId);
  },

  // Submit quiz
  async submitQuiz(
    courseId: string,
    lessonId: string,
    answers: Record<string, string>,
  ): Promise<ApiResponse<{ score: number; maxScore: number; passed: boolean }>> {
    return apiClient.post<ApiResponse<{ score: number; maxScore: number; passed: boolean }>>(
      `/enrollments/${courseId}/lessons/${lessonId}/quiz`,
      { answers },
    );
  },

  // Request certificate
  async requestCertificate(
    courseId: string,
  ): Promise<ApiResponse<{ certificateId: string; downloadUrl: string }>> {
    return apiClient.post<ApiResponse<{ certificateId: string; downloadUrl: string }>>(
      `/enrollments/${courseId}/certificate`,
    );
  },
};
