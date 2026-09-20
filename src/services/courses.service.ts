  // ============================================================
  // Courses Service — Spring Boot backend contract
  // ============================================================
  // apiClient baseURL is `${VITE_API_URL}` (e.g. https://.../api).
  // All paths here are RELATIVE to that base — do NOT prefix with /api.
  //
  //  COURSES
  //   POST   /courses                       create   (admin sends instructorId)
  //   GET    /courses                       list
  //   GET    /courses/:courseId             detail
  //   PUT    /courses/:courseId             update
  //   DELETE /courses/:courseId             delete
  //
  //  MODULES
  //   POST   /modules                       create   { courseId, title, order }
  //   PUT    /modules/:moduleId             update
  //   GET    /modules/:moduleId
  //   GET    /modules/course/:courseId
  //   DELETE /modules/:moduleId
  //
  //  LESSONS
  //   POST   /lessons                       create   { moduleId, ... }
  //   PUT    /lessons/:lessonId             update
  //   GET    /lessons/:lessonId
  //   GET    /lessons/modules/:moduleId
  //   DELETE /lessons/:lessonId
  //
  //  UPLOADS (AWS S3 via presigned URL)
  //   POST   /uploads/presigned-url  { fileName, contentType, uploadType, resourceId, language? }
  //                                  -> { url, key, publicUrl?, headers? }
  //   PUT    <presigned url>         raw bytes to S3
  //   POST   /uploads/confirm        { objectKey }  -> { url }
  // ============================================================
  import { apiClient } from "@/lib/api-client";
  import type { ApiResponse, PaginationMeta } from "@/lib/api-client";
  import type {
    Course, Section, Lesson, Review, CreateReviewRequest,
    SearchFilters, PaginationParams,
  } from "@/types/api.types";
  import { instructorsService } from "@/services/instructors.service";
  import { categoriesService } from "@/services/categories.service";
  import { isApprovedPublishedCourse, isApprovedPublishedLiveCourse } from "@/services/search.service";
  /* ==================== Types ==================== */
  export type UploadType =
    | "COURSE_THUMBNAIL"
    | "MODULE_THUMBNAIL"
    | "LESSON_VIDEO"
    | "LESSON_CAPTION"
    | "LESSON_THUMBNAIL"
    | "QUIZ_QUESTIONS";

  export interface PresignedUrlRequest {
    fileName: string;
    contentType: string;
    uploadType: UploadType;
    resourceId: string;
    language?: string;
  }
  export interface PresignedUrlResponse {
    presignedUrl: string;
    objectUrl: string;
    objectKey: string;
    expiresAt: string;
  }
  export interface ConfirmUploadResponse {
    url: string;
    key?: string;
  }

  export interface CreateCoursePayload {
    title: string;
    slug: string;
    description: string;
    thumbnailUrl?: string | null;
    /** Auth user id; supplied only when an admin assigns an instructor. */
    instructorId?: string | null;
    categoryId: string;
    subcategoryId?: string;
    language: string;
    basePrice: number;
    strikeOutPrice?: number;
    level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  }

  export interface CreateModulePayload {
    courseId: string;
    title: string;
    order: number;
    description?: string;
    thumbnailUrl?: string;
  }

  export interface CreateLessonPayload {
    moduleId: string;
    title: string;
    description?: string;
    order: number;
    videoDurationSeconds?: number;
    videoUrl?: string;
    thumbnailUrl?: string;
    previewEnabled?: boolean;
  }

  export interface QuizPayload {
    moduleId: string;
    title: string;
    description?: string;
    durationMinutes?: number;
    passingPercentage?: number;
    maxAttempts?: number;
    questionCount?: number;
    randomizeQuestions?: boolean;
    showResultImmediately?: boolean;
    showCorrectAnswers?: boolean;
  }
  /* ==================== Student Progress Types ==================== */
  export type StudentProgressStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

  export interface StudentCourseDetails {
    courseId: string;
    title: string;
    description: string;
    thumbnailUrl: string | null;
    totalModules: number;
    completedModules: number;
    totalLessons: number;
    completedLessons: number;
    completedQuizzes: number | null;
    totalQuizzes: number | null;
    progressPercentage: number;
    status: StudentProgressStatus;
  }

  export interface CourseProgress {
    courseId: string;
    status: StudentProgressStatus;
    progressPercentage: number;
    completedModules: number;
    totalModules: number;
    completedLessons: number;
    totalLessons: number;
    completedQuizzes: number;
    totalQuizzes: number;
    startedAt: string | null;
    completedAt: string | null;
  }

  export interface LessonSession {
    lessonId: string;
    watchedSeconds: number;
    lastPositionSeconds: number;
    progressPercentage: number;
    completed: boolean;
  }

  export interface SaveLessonSessionPayload {
    watchedSeconds: number;
    lastPositionSeconds: number;
    progressPercentage: number;
    completed: boolean;
  }

  /** Backend may answer with a bare object or an ApiResponse envelope. */
  const unwrap = <T,>(res: any): T => (res && typeof res === "object" && "data" in res ? res.data : res) as T;

  /* MIME/size limits mirrored from backend enum. */
  export const UPLOAD_LIMITS: Record<UploadType, { mime: string[]; maxBytes: number }> = {
    COURSE_THUMBNAIL:      { mime: ["image/jpeg", "image/png", "image/webp"], maxBytes: 5 * 1024 * 1024 },
    COURSE_PDF:            { mime: ["application/pdf"], maxBytes: 20 * 1024 * 1024 },
    MODULE_THUMBNAIL:      { mime: ["image/jpeg", "image/png", "image/webp"], maxBytes: 5 * 1024 * 1024 },
    LESSON_THUMBNAIL:      { mime: ["image/jpeg", "image/png", "image/webp"], maxBytes: 5 * 1024 * 1024 },
    LESSON_VIDEO:          { mime: ["video/mp4", "video/webm", "video/quicktime"], maxBytes: 500 * 1024 * 1024 },
    LESSON_CAPTION:        { mime: ["text/vtt", "application/x-subrip", "text/srt", "text/plain"], maxBytes: 10 * 1024 * 1024 },
    LESSON_PDF:            { mime: ["application/pdf"], maxBytes: 20 * 1024 * 1024 },
    QUIZ_QUESTIONS:        {
      mime: [
        "text/csv",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ],
      maxBytes: 20 * 1024 * 1024,
    },
    LIVE_COURSE_THUMBNAIL: { mime: ["image/jpeg", "image/png", "image/webp"], maxBytes: 5 * 1024 * 1024 },
    LIVE_COURSE_PDF:       { mime: ["application/pdf"], maxBytes: 20 * 1024 * 1024 },
    LIVE_PROMO_VIDEO:      { mime: ["video/mp4", "video/webm", "video/quicktime"], maxBytes: 500 * 1024 * 1024 },
  };

  function assertFile(file: File, uploadType: UploadType) {
    const rule = UPLOAD_LIMITS[uploadType];
    if (file.size > rule.maxBytes) {
      throw new Error(`File exceeds max size ${(rule.maxBytes / 1024 / 1024).toFixed(0)}MB`);
    }
    if (file.type && !rule.mime.includes(file.type)) {
      throw new Error(`Unsupported file type "${file.type}" for ${uploadType}`);
    }
  }

  const contentTypeForFile = (file: File, uploadType: UploadType) => {
    if (file.type) return file.type;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (uploadType === "LESSON_VIDEO" || uploadType === "LIVE_PROMO_VIDEO") {
      if (ext === "mp4" || ext === "m4v") return "video/mp4";
      if (ext === "webm") return "video/webm";
      if (ext === "mov" || ext === "qt") return "video/quicktime";
    }
    if (uploadType === "LESSON_CAPTION") {
      if (ext === "vtt") return "text/vtt";
      if (ext === "srt") return "application/x-subrip";
    }
    if (["COURSE_THUMBNAIL", "MODULE_THUMBNAIL", "LESSON_THUMBNAIL", "LIVE_COURSE_THUMBNAIL"].includes(uploadType)) {
      if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
      if (ext === "png") return "image/png";
      if (ext === "webp") return "image/webp";
    }
    if (["COURSE_PDF", "LESSON_PDF", "LIVE_COURSE_PDF"].includes(uploadType)) {
      if (ext === "pdf") return "application/pdf";
    }
    return "application/octet-stream";
  };

  /* ==================== Service ==================== */
  export const coursesService = {
    /* ---------- Public / read ---------- */
    async getCourses(filters?: SearchFilters, pagination?: PaginationParams) {
      let recordedRows: any[] = [];
      try {
        const coursesRes = await apiClient.get<any>("/courses", { params: { ...filters, ...pagination } });
        const fbData = unwrap<any>(coursesRes) ?? coursesRes;
        recordedRows = Array.isArray(fbData)
          ? fbData
          : (fbData?.courses ?? fbData?.content ?? fbData?.items ?? fbData?.data ?? []);
      } catch {
        recordedRows = [];
      }

      let instructors = [] as Awaited<ReturnType<typeof instructorsService.list>>;
      try {
        instructors = await instructorsService.list();
      } catch {
        // Course rows remain usable without the display-name enrichment.
      }

      const instructorMap = new Map(
        instructors.flatMap((i) => [[i.id, i.name], [i.userId, i.name]])
      );

      const merged = recordedRows.map((course: any) => ({
        ...course,
        productId: course.productId ? String(course.productId) : undefined,
        instructorName:
          course.instructorName ||
          instructorMap.get(course.instructor) ||
          instructorMap.get(course.instructorId) ||
          (typeof course.instructor === "object"
            ? course.instructor?.name
            : "Instructor"),
      }));

      return {
        success: true,
        data: merged,
      };
    },
  async getCourse(idOrSlug: string, isLiveHint?: boolean) {
    const unwrapCourse = (res: any): any => {
      if (!res || typeof res !== "object") return null;

      if (res.id || res.title || res.courseId) {
        return res;
      }

      if (res.data && typeof res.data === "object") {
        return unwrapCourse(res.data);
      }

      if (res.course && typeof res.course === "object") {
        return unwrapCourse(res.course);
      }

      if (res.result && typeof res.result === "object") {
        return unwrapCourse(res.result);
      }

      return null;
    };

    // LIVE COURSE
    try {
      const liveRes = await apiClient.get<any>(
        `/live-courses/${idOrSlug}`
      );

      const liveData = unwrapCourse(liveRes);

      if (liveData?.id || liveData?.title) {
        return {
          success: true,
          data: this.normalizeLiveCourse(
            liveData,
            liveData.id || idOrSlug
          ),
        };
      }
    } catch (error: any) {
      // Live course not found, fallback to recorded course
    }

    // RECORDED COURSE
    try {
      const recRes = await apiClient.get<any>(
        `/courses/${idOrSlug}`
      );

      const recData = unwrapCourse(recRes);

      if (recData?.id || recData?.title) {
        return {
          success: true,
          data: recData,
        };
      }
    } catch (error: any) {
      // Recorded course not found
    }

    return {
      success: false,
      data: null,
    };
  },
      // const findLiveInList = async (targetId: string) => {
      //   try {
      //     const liveList = await liveCoursesService.list();
      //     const rawLive = liveList?.data ?? liveList;
      //     const list = Array.isArray(rawLive)
      //       ? rawLive
      //       : (rawLive?.content ?? rawLive?.items ?? rawLive?.liveCourses?.content ?? rawLive?.data ?? []);
      //     const match = list.find(
      //       (item: any) =>
      //         String(item.id) === targetId ||
      //         String(item.slug) === targetId ||
      //         String(item.productId || item.product_id) === targetId
      //     );
      //     if (match) {
      //       return this.normalizeLiveCourse(match, match.id || targetId);
      //     }
      //   } catch {
      //     /* ignore fallback errors */
      //   }
      //   return null;
      // };

      // const findRecInList = async (targetId: string) => {
      //   try {
      //     const fullRec = await apiClient.get<any>("/courses").catch(() => null);
      //     const b = unwrap<any>(fullRec) ?? fullRec;
      //     const list: any[] = Array.isArray(b) ? b : (b?.courses ?? b?.content ?? b?.items ?? b?.data ?? []);
      //     const match = list.find(
      //       (item: any) =>
      //         String(item.id) === targetId ||
      //         String(item.slug) === targetId ||
      //         String(item.productId || item.product_id) === targetId
      //     );
      //     if (match) {
      //       return match;
      //     }
      //   } catch {
      //     /* ignore */
      //   }
      //   return null;
      // };

      // 1. If isLiveHint is true, try GET /api/live-courses/{id} FIRST
      // if (isLiveHint) {
      //   try {
      //     const liveRes: any = await liveCoursesService.getById(idOrSlug);
      //     const data = unwrapCourse(liveRes);
      //     if (data && (data.id || data.title)) {
      //       return { success: true, data: this.normalizeLiveCourse(data, data.id || idOrSlug) };
      //     }
      //   } catch {
      //     /* ignore */
      //   }

      //   const listMatch = await findLiveInList(idOrSlug);
      //   if (listMatch) {
      //     return { success: true, data: listMatch };
      //   }
      // }

      // // 2. Try Recorded Course single endpoint GET /api/courses/{id}
      // try {
      //   const recRes: any = await apiClient.get<ApiResponse<Course>>(`/courses/${idOrSlug}`);
      //   const data = unwrapCourse(recRes);
      //   if (data && (data.id || data.title)) {
      //     if (data.schedule || data.isLive || data.courseType === "LIVE" || data.courseType === "Live Course") {
      //       return { success: true, data: this.normalizeLiveCourse(data, data.id || idOrSlug) };
      //     }
      //     return { success: true, data };
      //   }
      // } catch {
      //   /* ignore */
      // }

      // // 3. Fallback: try live course endpoints if not already tried
      // if (!isLiveHint) {
      //   try {
      //     const liveRes: any = await liveCoursesService.getById(idOrSlug);
      //     const data = unwrapCourse(liveRes);
      //     if (data && (data.id || data.title)) {
      //       return { success: true, data: this.normalizeLiveCourse(data, data.id || idOrSlug) };
      //     }
      //   } catch {
      //     /* ignore */
      //   }

      //   const listMatch = await findLiveInList(idOrSlug);
      //   if (listMatch) {
      //     return { success: true, data: listMatch };
      //   }

      //   const recMatch = await findRecInList(idOrSlug);
      //   if (recMatch) {
      //     return { success: true, data: recMatch };
      //   }
      // }

      // return { success: false, data: null };
    // },

    normalizeLiveCourse(data: any, idOrSlug: string) {
      if (!data) return null;
      const daysOfWeek = data.schedule?.daysOfWeek || data.schedule?.sessionDays || [];
      const daysStr = Array.isArray(daysOfWeek)
        ? typeof daysOfWeek === "string"
          ? daysOfWeek
          : daysOfWeek.join(", ")
        : data.schedule?.sessionDays || "MONDAY, WEDNESDAY, FRIDAY";

      const hasDiscount = data.discountedPrice != null && Number(data.discountedPrice) > 0 && Number(data.discountedPrice) < Number(data.basePrice ?? 0);
      const price = hasDiscount ? Number(data.discountedPrice) : Number(data.basePrice ?? data.pricing?.basePrice ?? data.price ?? 0);
      const originalPrice = hasDiscount
        ? Number(data.basePrice ?? 0)
        : Number(
            data.strikeOutPrice ?? data.pricing?.strikeOutPrice ?? Math.round(Number(data.basePrice ?? data.price ?? 0) * 1.2)
          );

      const sessionMins = Number(data.schedule?.sessionDurationMinutes ?? data.totalDurationMinutes ?? 90);

      return {
        ...data,
        id: String(data.id ?? idOrSlug),
        productId: String(data.productId || data.product_id || data.id || idOrSlug),
        title: data.title ?? "Untitled Live Course",
        description: data.description ?? "",
        thumbnailUrl: data.thumbnailUrl ?? data.thumbnail ?? "",
        thumbnail: data.thumbnailUrl ?? data.thumbnail ?? "",
        promoVideoUrl: data.promoVideoUrl ?? data.previewVideo ?? "",
        pdfUrl: data.pdfUrl ?? "",
        courseType: "Live Course",
        type: "LIVE",
        isLive: true,
        occurrence: data.occurrence ?? (data.schedule?.sessionDays ? `${data.schedule.sessionDays}` : daysStr),
        certificate: "After Completion",
        basePrice: Number(data.basePrice ?? price),
        price: price,
        originalPrice: originalPrice,
        strikeOutPrice: originalPrice,
        totalDurationMinutes: sessionMins,
        durationMinutes: sessionMins,
        instructorName:
          typeof data.instructor === "object"
            ? data.instructor?.name
            : data.instructorName ?? "Instructor",
        instructorAvatar:
          typeof data.instructor === "object"
            ? data.instructor?.avatar
            : data.instructorAvatar,
        instructorId:
          data.instructorId ??
          (typeof data.instructor === "object" ? data.instructor?.id || data.instructor?.userId : undefined),
        students: Number(data.enrolledCount ?? data.students ?? 0),
        rating: Number(data.rating ?? 0),
      };
    },
    getFeaturedCourses() {
      return apiClient.get<ApiResponse<Course[]>>("/courses/featured");
    },
    getCourseCurriculum(courseId: string) {
      return apiClient.get<ApiResponse<Section[]>>(`/modules/course/${courseId}`);
    },
    getLesson(_courseId: string, lessonId: string) {
      return apiClient.get<ApiResponse<Lesson>>(`/lessons/${lessonId}`);
    },
    getCourseReviews(courseId: string, pagination?: PaginationParams) {
      return apiClient.get<ApiResponse<Review[]> & { meta: PaginationMeta }>(
        `/user_reviews`, { params: pagination });
    },
    createReview(req: CreateReviewRequest) {
      return apiClient.post<ApiResponse<Review>>(`/user_reviews`, req);
    },
    getRelatedCourses(courseId: string) {
      return apiClient.get<ApiResponse<Course[]>>(`/courses/${courseId}/related`);
    },
  getMyCourses(filter: "ALL" | "IN_PROGRESS" | "COMPLETED", page = 0, size = 10) {
    return apiClient.get("/student/courses", {
      params: {
        filter,
        page,
        size,
      },
    });
  },
    /* ---------- Course CRUD ---------- */
    createCourse(payload: CreateCoursePayload) {
      return apiClient.post<ApiResponse<Course>>("/courses", payload);
    },
    updateCourse(courseId: string, payload: Partial<CreateCoursePayload>) {
      return apiClient.put<ApiResponse<Course>>(`/courses/${courseId}`, payload);
    },
    getCourseDetails(courseId: string) {
      return apiClient.get<ApiResponse<Course>>(`/courses/${courseId}`);
    },
    publishCourse(courseId: string) {
      return apiClient.post<ApiResponse<Course>>(`/courses/${courseId}/publish`, {});
    },
    getAdminCourses(page = 0, size = 20) {
      return apiClient.get<any>("/admin/courses", {
        params: { page, size },
      });
    },
    getPendingCourses(page = 0, size = 20) {
      return apiClient.get<any>("/courses/pending", {
        params: { page, size },
      });
    },
    getApprovedCourses() {
      return apiClient.get<any>("/courses/approved");
    },
    getRejectedCourses() {
      return apiClient.get<any>("/courses/rejected");
    },
    approveCourse(courseId: string) {
      const cid = String(courseId || "").trim();
      return apiClient.post<ApiResponse<Course>>(`/courses/${cid}/approve`, {});
    },
    rejectCourse(courseId: string, rejectionReason: string) {
      const cid = String(courseId || "").trim();
      return apiClient.post<ApiResponse<Course>>(`/courses/${cid}/reject`, {
        rejectionReason,
        reason: rejectionReason,
      });
    },
    deleteCourse(courseId: string) {
      return apiClient.delete<ApiResponse<{ message: string }>>(`/courses/${courseId}`);
    },
    toggleCourseStatus(courseId: string, status: "Published" | "Draft") {
      return apiClient.patch<ApiResponse<Course>>(`/courses/${courseId}/status`, { status });
    },

    /* ---------- Modules ---------- */
    createModule(payload: CreateModulePayload) {
      return apiClient.post<ApiResponse<{ id: string; title: string; order: number }>>(
        "/modules", payload);
    },
    updateModule(moduleId: string, payload: Partial<CreateModulePayload>) {
      return apiClient.put<ApiResponse<{ id: string }>>(`/modules/${moduleId}`, payload);
    },
    getModule(moduleId: string) {
      return apiClient.get<ApiResponse<any>>(`/modules/${moduleId}`);
    },
    getModulesByCourse(courseId: string) {
      return apiClient.get<ApiResponse<any[]>>(`/modules/course/${courseId}`);
    },
    deleteModule(moduleId: string) {
      return apiClient.delete<ApiResponse<{ message: string }>>(`/modules/${moduleId}`);
    },

    /* ---------- Lessons ---------- */
  createLesson(payload: CreateLessonPayload) {
    const safePayload = {
      ...payload,
      videoDurationSeconds: Number(payload.videoDurationSeconds ?? 0),
    };
    return apiClient.post<ApiResponse<{ id: string }>>(
      `/lessons/modules/${payload.moduleId}`,
      safePayload,
    );
  },
    updateLesson(lessonId: string, payload: Partial<CreateLessonPayload>) {
      return apiClient.put<ApiResponse<{ id: string }>>(`/lessons/${lessonId}`, payload);
    },
    getLessonsByModule(moduleId: string) {
      return apiClient.get<ApiResponse<any[]>>(`/lessons/modules/${moduleId}`);
    },
    deleteLesson(lessonId: string) {
      return apiClient.delete<ApiResponse<{ message: string }>>(`/lessons/${lessonId}`);
    },

    /* ---------- Student Progress ---------- */
    async getStudentCourseDetails(courseId: string): Promise<any> {
      try {
        const res = await apiClient.get<any>(`/student/courses/${courseId}`);
        const data = unwrap<any>(res);
        if (data && (data.id || data.courseId || data.title)) return data;
      } catch {
        // non-fatal, try live course endpoint
      }

      try {
        const liveRes = await liveCoursesService.get(courseId);
        const liveData = unwrap<any>(liveRes);
        if (liveData && (liveData.id || liveData.title)) {
          return {
            id: String(liveData.id),
            courseId: String(liveData.id),
            title: liveData.title,
            slug: liveData.slug,
            description: liveData.description,
            thumbnailUrl: liveData.thumbnailUrl,
            promoVideoUrl: liveData.promoVideoUrl,
            pdfUrl: liveData.pdfUrl,
            price: liveData.accessType === "FREE" ? 0 : Number(liveData.basePrice ?? liveData.pricing?.basePrice ?? 0),
            basePrice: Number(liveData.basePrice ?? liveData.pricing?.basePrice ?? 0),
            discountedPrice: liveData.discountedPrice ?? liveData.pricing?.discountedPrice,
            level: liveData.level,
            language: liveData.language,
            courseType: "LIVE",
            type: "LIVE",
            isLive: true,
            status: liveData.status,
            instructorId: liveData.instructorId,
            schedule: liveData.schedule,
            ...liveData,
          };
        }
      } catch {
        // non-fatal, try public course endpoint
      }

      try {
        const recRes = await apiClient.get<any>(`/courses/${courseId}`);
        const recData = unwrap<any>(recRes);
        if (recData && (recData.id || recData.title)) return recData;
      } catch {
        // non-fatal
      }

      return { id: courseId, courseId, title: "Course Details" };
    },

    async getCourseProgress(courseId: string): Promise<CourseProgress> {
      try {
        const res = await apiClient.get<CourseProgress>(`/student/courses/${courseId}/progress`);
        const data = unwrap<any>(res) ?? {};

        const completedArr = Array.isArray(data.completedLessons)
          ? data.completedLessons
          : Array.isArray(data.completedLessonIds)
          ? data.completedLessonIds
          : Array.isArray(data.completedLessonIdsList)
          ? data.completedLessonIdsList
          : [];

        const completedCount =
          typeof data.completedLessons === "number"
            ? data.completedLessons
            : typeof data.completedLessonCount === "number"
            ? data.completedLessonCount
            : completedArr.length;

        const totalCount = Number(data.totalLessons ?? data.totalLessonCount ?? 0);
        const rawPct = Number(data.progressPercentage ?? data.progress ?? data.percentage ?? 0);

        const calculatedPct = totalCount > 0 ? Math.min(100, Math.round((completedCount / totalCount) * 100)) : 0;
        const finalPct = Math.max(rawPct, calculatedPct);
        const calculatedStatus = finalPct >= 100 ? "COMPLETED" : finalPct > 0 ? "IN_PROGRESS" : "NOT_STARTED";
        const status = data.status === "NOT_STARTED" && finalPct > 0 ? "IN_PROGRESS" : data.status ?? calculatedStatus;

        return {
          ...data,
          courseId: String(data.courseId ?? courseId),
          status,
          progressPercentage: finalPct,
          completedModules: Number(data.completedModules ?? 0),
          totalModules: Number(data.totalModules ?? 0),
          completedLessons: completedCount,
          totalLessons: totalCount,
          completedQuizzes: Number(data.completedQuizzes ?? 0),
          totalQuizzes: Number(data.totalQuizzes ?? 0),
          startedAt: data.startedAt ?? null,
          completedAt: data.completedAt ?? null,
          lastLessonId: data.lastLessonId ?? data.lastWatchedLessonId ?? data.currentLessonId ?? data.lessonId ?? null,
          lastPositionSeconds: Number(data.lastPositionSeconds ?? data.lastWatchedPositionSeconds ?? data.positionSeconds ?? 0),
          watchedSeconds: Number(data.watchedSeconds ?? 0),
          completedLessonIds: completedArr.map(String),
        } as any;
      } catch {
        // 404 or missing progress: return clean initial state without throwing error
        return {
          courseId,
          status: "NOT_STARTED",
          progressPercentage: 0,
          completedModules: 0,
          totalModules: 0,
          completedLessons: 0,
          totalLessons: 0,
          completedQuizzes: 0,
          totalQuizzes: 0,
          startedAt: null,
          completedAt: null,
          completedLessonIds: [],
          lastLessonId: null,
          lastPositionSeconds: 0,
          watchedSeconds: 0,
        } as any;
      }
    },

    async getContinueLearning(): Promise<any> {
      return null;
    },

    async markCourseComplete(courseId: string): Promise<any> {
      const endpoints = [
        { method: "put", path: `/student/courses/${courseId}/complete` },
        { method: "post", path: `/student/courses/${courseId}/complete` },
      ];

      for (const ep of endpoints) {
        try {
          const res =
            ep.method === "put"
              ? await apiClient.put<any>(ep.path)
              : await apiClient.post<any>(ep.path);
          if (res) return unwrap<any>(res);
        } catch {
          // try next endpoint
        }
      }
      return { success: true };
    },

    async getLessonSession(lessonId: string, signal?: AbortSignal): Promise<LessonSession | null> {
      try {
        const res = await apiClient.get<LessonSession>(`/student/lessons/${lessonId}/session`, {
          signal,
        });
        const data = unwrap<any>(res) ?? {};
        const completedFlag = Boolean(
          data.completedLesson ?? data.completed ?? data.isCompleted ?? (Number(data.progressPercentage ?? 0) >= 80)
        );
        return {
          lessonId: String(data.lessonId ?? lessonId),
          watchedSeconds: Number(data.watchedSeconds ?? data.lastPositionSeconds ?? 0),
          lastPositionSeconds: Number(data.lastPositionSeconds ?? 0),
          progressPercentage: Number(data.progressPercentage ?? 0),
          completed: completedFlag,
        };
      } catch (err: any) {
        if (err?.name === "CanceledError" || err?.name === "AbortError") {
          throw err;
        }
        return {
          lessonId,
          watchedSeconds: 0,
          lastPositionSeconds: 0,
          progressPercentage: 0,
          completed: false,
        };
      }
    },

    async saveLessonSession(lessonId: string, payload: SaveLessonSessionPayload | any): Promise<LessonSession> {
      const lastPositionSeconds = Math.max(0, Math.round(Number(payload.lastPositionSeconds ?? 0)));
      const watchedSeconds = Math.max(lastPositionSeconds, Math.round(Number(payload.watchedSeconds ?? lastPositionSeconds)));
      const playbackRate = Number(payload.playbackRate ?? 1.0) || 1.0;
      const rawPct = Number(payload.progressPercentage ?? 0);
      const isCompletedFlag = Boolean(payload.completed || payload.completedLesson || payload.isCompleted || rawPct >= 80);

      const body = {
        lastPositionSeconds,
        watchedSeconds,
        playbackRate,
        progressPercentage: Math.min(100, Math.max(0, Math.round(rawPct))),
        completed: isCompletedFlag,
        completedLesson: isCompletedFlag,
        isCompleted: isCompletedFlag,
      };

      const res = await apiClient.put<LessonSession>(`/student/lessons/${lessonId}/session`, body);
      const data = unwrap<any>(res) ?? {};
      const completedFlag = Boolean(
        data.completedLesson ?? data.completed ?? data.isCompleted ?? isCompletedFlag
      );
      return {
        lessonId: String(data.lessonId ?? lessonId),
        watchedSeconds: Number(data.watchedSeconds ?? watchedSeconds),
        lastPositionSeconds: Number(data.lastPositionSeconds ?? lastPositionSeconds),
        progressPercentage: Number(data.progressPercentage ?? body.progressPercentage),
        completed: completedFlag,
      };
    },




    /* =========================================================
      S3 UPLOAD PIPELINE
      1) presign  ->  2) PUT raw bytes to S3  ->  3) confirm
      Returns canonical { url, key } to persist in the DB.
      ========================================================= */
    requestPresignedUrl(req: PresignedUrlRequest) {
      return apiClient.post<PresignedUrlResponse | ApiResponse<PresignedUrlResponse>>(
        "/uploads/presigned-url",
        req
      ).then((res) => unwrap<PresignedUrlResponse>(res));
    },

    confirmUpload(payload: { objectKey: string }) {
      return apiClient.post<ConfirmUploadResponse | ApiResponse<ConfirmUploadResponse>>(
        "/uploads/confirm",
        payload
      ).then((res) => unwrap<ConfirmUploadResponse>(res));
    },

    async uploadFileToS3(
      file: File,
      uploadType: UploadType,
      resourceId?: string,
      opts?: { language?: string; onProgress?: (pct: number) => void }
    ): Promise<{ url: string; key: string }> {
      const presignPayload: PresignedUrlRequest = {
        fileName: file.name,
        contentType: contentTypeForFile(file, uploadType),
        uploadType,
      };
      if (resourceId) {
        presignPayload.resourceId = resourceId;
      }
      if (opts?.language) {
        presignPayload.language = opts.language;
      }

      // 1. Presign
      const presignRes = await coursesService.requestPresignedUrl(presignPayload);

      const {
        presignedUrl: signedUrl,
        objectKey,
        objectUrl,
      } = presignRes;

      // 2. PUT the raw bytes directly to S3 with upload progress tracking (bypass axios so we don't add JWT headers).
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", signedUrl, true);
        xhr.setRequestHeader("Content-Type", contentTypeForFile(file, uploadType));

        if (xhr.upload && opts?.onProgress) {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && e.total > 0) {
              const pct = Math.min(99, Math.round((e.loaded / e.total) * 100));
              opts.onProgress!(pct);
            }
          };
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            if (opts?.onProgress) opts.onProgress(100);
            resolve();
          } else {
            reject(new Error(`S3 upload failed [${xhr.status}]: ${xhr.responseText || xhr.statusText}`));
          }
        };

        xhr.onerror = () => {
          reject(new Error("Network error during S3 upload"));
        };

        xhr.send(file);
      });

      // 3. Confirm — backend expects { objectKey }
      const confirmRes = await coursesService.confirmUpload({ objectKey });

      return {
        url: confirmRes?.url || objectUrl || "",
        key: confirmRes?.key || objectKey || "",
      };
    },

    async getHandPickedCourses(): Promise<NormalizedCourse[]> {
      if (handPickedCache && handPickedCache.length > 0) {
        return handPickedCache;
      }

      try {
        // 1. Fetch courses, live courses, instructors, and categories in parallel
        const [coursesRes, liveRes, instructorsList, categoriesRes] = await Promise.all([
          apiClient.get<any>("/courses").catch(() => null),
          apiClient.get<any>("/live-courses").catch(() => null),
          instructorsService.list().catch(() => []),
          categoriesService.getCategories().catch(() => ({ data: [] } as any)),
        ]);

        // 2. Build instructor lookup: id / userId -> display name
        const instructorLookup = new Map<string, string>();
        if (Array.isArray(instructorsList)) {
          instructorsList.forEach((i: any) => {
            if (i.id && i.name) instructorLookup.set(String(i.id), String(i.name));
            if (i.userId && i.name) instructorLookup.set(String(i.userId), String(i.name));
          });
        }

        // 3. Build category lookup: id -> name
        const categoryLookup = new Map<string, string>();
        const rawCats = Array.isArray(categoriesRes)
          ? categoriesRes
          : (categoriesRes as any)?.data ?? [];
        const walkCategories = (nodes: any[]) => {
          for (const n of nodes || []) {
            if (n.id && n.name) {
              categoryLookup.set(String(n.id), String(n.name));
            }
            if (n.subcategories?.length) walkCategories(n.subcategories);
            if (n.children?.length) walkCategories(n.children);
          }
        };
        walkCategories(rawCats);

        // 4. Combine recorded courses and live courses
        const recordedList: any[] = Array.isArray(coursesRes)
          ? coursesRes
          : Array.isArray(coursesRes?.data)
          ? coursesRes.data
          : Array.isArray(coursesRes?.content)
          ? coursesRes.content
          : [];

        const liveList: any[] = Array.isArray(liveRes)
          ? liveRes
          : Array.isArray(liveRes?.data)
          ? liveRes.data
          : Array.isArray(liveRes?.content)
          ? liveRes.content
          : [];

        const rawCombined = [
          ...recordedList.map((item) => ({ ...item, _isLive: false })),
          ...liveList.map((item) => ({ ...item, _isLive: true })),
        ];

        // 5. Filter for approved & published learner-facing courses only
        const publishedList = rawCombined.filter((item: any) => {
          if (!item) return false;
          return item._isLive ? isApprovedPublishedLiveCourse(item) : isApprovedPublishedCourse(item);
        });

        // 6. Normalize each course object dynamically from backend data
        const normalized: NormalizedCourse[] = publishedList.map((item: any) => {
          const id = String(item.id ?? item.courseId ?? "");

          const explicitPid = item.productId
            ? String(item.productId)
            : item.product_id
            ? String(item.product_id)
            : item.product?.id
            ? String(item.product.id)
            : item.catalogProductId
            ? String(item.catalogProductId)
            : item.liveCourseProductId
            ? String(item.liveCourseProductId)
            : undefined;

          const pId = explicitPid || id;

          const title = String(item.title ?? "Untitled Course");
          const description = item.description ? String(item.description) : "";

          // Category resolution
          const categoryId = item.categoryId ? String(item.categoryId) : item.category?.id ? String(item.category.id) : undefined;
          const categoryName = String(
            (categoryId ? categoryLookup.get(categoryId) : undefined) ||
            (typeof item.category === "object" ? item.category?.name : item.category) ||
            item.categoryName ||
            ""
          );

          const thumbnailUrl = String(item.thumbnailUrl ?? item.thumbnail ?? item.coverImage ?? "");

          // Instructor resolution via instructorId / instructorUserId / instructorsService
          const instId = String(
            item.instructorId ??
            item.instructorUserId ??
            (typeof item.instructor === "object" ? item.instructor?.id ?? item.instructor?.userId : "") ??
            ""
          );

          const directName = String(
            item.instructorName ||
            (typeof item.instructor === "object" ? item.instructor?.name : item.instructor) ||
            ""
          );

          const resolvedInstructorName =
            (instId ? instructorLookup.get(instId) : undefined) ||
            (directName && directName.toLowerCase() !== "instructor" ? directName : "") ||
            "";

          const avgRating = Number(item.avgRating ?? item.rating ?? 0);
          const totalReviews = Number(item.totalReviews ?? item.reviewCount ?? item.reviewsCount ?? 0);
          const totalLessons = Number(item.totalLessons ?? item.lessonsCount ?? item.lessons?.length ?? 0);
          const totalDurationMinutes = Number(item.totalDurationMinutes ?? item.durationMinutes ?? 0);
          const basePrice = Number(item.basePrice ?? item.price ?? 0);
          const strikeOutPrice = item.strikeOutPrice != null ? Number(item.strikeOutPrice) : undefined;
          const language = item.language ? String(item.language) : "English";
          const level = item.level ? String(item.level) : "BEGINNER";
          const isLive = !!(item._isLive || item.isLive || item.courseType === "LIVE" || item.type === "LIVE");

          return {
            id,
            productId: pId,
            product_id: pId,
            title,
            description,
            categoryId,
            categoryName,
            category: categoryName,
            thumbnailUrl,
            instructorId: instId || undefined,
            instructorName: resolvedInstructorName,
            avgRating,
            totalReviews,
            reviewCount: totalReviews,
            totalLessons,
            totalDurationMinutes,
            price: basePrice,
            basePrice,
            strikeOutPrice,
            language,
            level,
            isLive,
            courseType: isLive ? "LIVE" : "RECORDED",
            status: item.status || "PUBLISHED",
            isPublished: true,
          };
        });

        if (normalized.length > 0) {
          handPickedCache = normalized;
        }
        return normalized;
      } catch {
        return [];
      }
    },

    clearHandPickedCache() {
      handPickedCache = null;
    },
  };

  let handPickedCache: NormalizedCourse[] | null = null;

  export interface NormalizedCourse {
    id: string;
    productId?: string;
    product_id?: string;
    title: string;
    description?: string;
    categoryId?: string;
    categoryName?: string;
    category?: string;
    thumbnailUrl: string;
    instructorId?: string;
    instructorName: string;
    avgRating: number;
    totalReviews: number;
    reviewCount: number;
    totalLessons: number;
    totalDurationMinutes: number;
    price: number;
    basePrice?: number;
    strikeOutPrice?: number;
    language?: string;
    level?: string;
    status?: string;
    isPublished?: boolean;
    isLive?: boolean;
    courseType?: string;
  }

