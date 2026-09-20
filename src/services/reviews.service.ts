// ============= Reviews Service =============
// apiClient baseURL already ends with /api → paths here are relative.
//
//  USER REVIEWS (backend contract)
//   GET    /user_reviews                          list my reviews (auth)
//   GET    /user_reviews/course/{courseId}        my review for a course (auth)
//   GET    /user_reviews/course/{courseId}/all    all approved reviews (public)
//   GET    /user_reviews/course/{courseId}/summary review summary (public)
//   POST   /user_reviews                          create review (auth)
//   PUT    /user_reviews/course/{courseId}        update my review (auth)
//   DELETE /user_reviews/course/{courseId}        delete my review (auth)
//   POST   /user_reviews/{reviewId}/vote          { voteType: HELPFUL | NOT_HELPFUL }
import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api.types";
import { coursesService } from "@/services/courses.service";
import { liveCoursesService } from "@/services/liveCourses.service";

export type ReviewScope = "course" | "website";
export type ReviewStatus = "pending" | "approved" | "rejected";
export type VoteType = "HELPFUL" | "NOT_HELPFUL";
export type UserCurrentVote = "HELPFUL" | "NOT_HELPFUL" | "NONE";

export interface CourseReview {
  id: string;
  scope: ReviewScope;
  courseId?: string;
  courseName?: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userAvatar?: string;
  rating: number;
  reviewText: string;
  /** alias kept for legacy UI code */
  text?: string;
  status: ReviewStatus;
  createdAt: string;
  updatedAt?: string;
  helpfulCount: number;
  notHelpfulCount: number;
  userCurrentVote: UserCurrentVote;
  /** alias kept for legacy UI code */
  helpful?: number;
}

export interface ReviewSummary {
  courseId: string;
  avgRating: number;
  totalReviews: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface VoteResponseData {
  reviewId: string;
  userCurrentVote: UserCurrentVote;
  voteType: VoteType | null;
  helpfulCount: number;
  notHelpfulCount: number;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** apiClient sometimes returns the raw entity, sometimes { success, data }. */
const unwrap = <T,>(res: any): T => {
  if (res == null) return res as T;
  if (Array.isArray(res)) return res as unknown as T;
  if (typeof res === "object" && "data" in res) {
    const inner: any = (res as any).data;
    // Spring Page → { content: [...] }
    if (inner && typeof inner === "object" && Array.isArray(inner.content)) {
      return inner.content as unknown as T;
    }
    return inner as T;
  }
  if (typeof res === "object" && Array.isArray((res as any).content)) {
    return (res as any).content as unknown as T;
  }
  return res as T;
};

const ok = <T,>(data: T, message?: string): ApiResponse<T> => ({
  success: true,
  data,
  message,
});

const toIso = (v: any): string => {
  if (!v) return new Date().toISOString();
  if (typeof v === "number") return new Date(v).toISOString();
  const s = String(v);
  // Spring can emit "2026-07-22T19:58:44.35308" (no timezone, 5-digit micros)
  const cleaned = /Z|[+-]\d{2}:?\d{2}$/.test(s)
    ? s
    : `${s.replace(/(\.\d{3})\d+$/, "$1")}Z`;
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

const normalizeStatus = (v: any): ReviewStatus => {
  const s = String(v ?? "approved").toLowerCase();
  if (s === "pending" || s === "rejected") return s;
  return "approved";
};

const normalizeVote = (v: any): UserCurrentVote => {
  const s = String(v ?? "NONE").toUpperCase();
  return s === "HELPFUL" || s === "NOT_HELPFUL" ? (s as UserCurrentVote) : "NONE";
};

export const normalizeReview = (r: any): CourseReview => {
  const reviewText = r?.reviewText ?? r?.text ?? r?.comment ?? "";
  const helpfulCount = Number(r?.helpfulCount ?? r?.helpful ?? 0);
  const userName =
    r?.studentName ??
    r?.student_name ??
    r?.userName ??
    r?.user_name ??
    r?.name ??
    r?.user?.name ??
    r?.student?.name ??
    r?.studentDetails?.name ??
    r?.studentDetails?.studentName ??
    r?.studentDetails?.fullName ??
    r?.user?.fullName ??
    r?.student?.fullName ??
    r?.authorName ??
    ([r?.firstName, r?.lastName].filter(Boolean).join(" ").trim() || "Student");

  const courseName =
    r?.courseName ??
    r?.course_name ??
    r?.courseTitle ??
    r?.course_title ??
    r?.course?.title ??
    r?.course?.name ??
    "Course";

  return {
    id: String(r?.id ?? r?.reviewId ?? r?.review_id ?? r?._id ?? ""),
    scope: r?.courseId || r?.course?.id ? "course" : (r?.scope ?? "course"),
    courseId:
      r?.courseId != null
        ? String(r.courseId)
        : r?.course?.id != null
          ? String(r.course.id)
          : undefined,
    courseName,
    userId: String(r?.userId ?? r?.studentId ?? r?.student_id ?? r?.user?.id ?? r?.student?.id ?? ""),
    userName,
    userEmail: r?.userEmail ?? r?.studentEmail ?? r?.user?.email ?? r?.student?.email,
    userAvatar: r?.userAvatar ?? r?.studentAvatar ?? r?.user?.avatar ?? r?.student?.avatar ?? r?.profileImageUrl,
    rating: Number(r?.rating ?? 0),
    reviewText,
    text: reviewText,
    status: normalizeStatus(r?.status),
    createdAt: toIso(r?.createdAt ?? r?.created_at),
    updatedAt: r?.updatedAt ? toIso(r.updatedAt) : undefined,
    helpfulCount,
    notHelpfulCount: Number(r?.notHelpfulCount ?? r?.notHelpful ?? 0),
    userCurrentVote: normalizeVote(r?.userCurrentVote ?? r?.myVote),
    helpful: helpfulCount,
  };
};

const normalizeList = (raw: any): CourseReview[] => {
  const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return arr
    .filter(Boolean)
    .map(normalizeReview)
    .filter((r) => r.id !== "")
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
};

const normalizeSummary = (raw: any, courseId: string): ReviewSummary => {
  const d = raw?.data !== undefined ? raw.data : (raw ?? {});
  const dist = d.distribution ?? d.ratingDistribution ?? {};
  const reviewsArr = Array.isArray(d.reviews) ? d.reviews : Array.isArray(d) ? d : [];
  const total = Number(
    d.totalReviews ?? d.total ?? d.count ?? d.reviewCount ?? reviewsArr.length ?? 0
  );
  const rawAvg = Number(
    d.averageRating ?? d.avgRating ?? d.average ?? d.avg ?? d.rating ?? 0
  );
  const avg = Math.round(rawAvg * 10) / 10;
  return {
    courseId: String(d.courseId ?? courseId),
    avgRating: avg,
    totalReviews: total,
    distribution: {
      1: Number(dist[1] ?? dist.one ?? 0),
      2: Number(dist[2] ?? dist.two ?? 0),
      3: Number(dist[3] ?? dist.three ?? 0),
      4: Number(dist[4] ?? dist.four ?? 0),
      5: Number(dist[5] ?? dist.five ?? 0),
    },
  };
};

const normalizeVoteResponse = (raw: any, reviewId: string): VoteResponseData => {
  const d = raw ?? {};
  const current = normalizeVote(d.userCurrentVote ?? d.voteType);
  return {
    reviewId: String(d.reviewId ?? d.id ?? reviewId),
    userCurrentVote: current,
    voteType: current === "NONE" ? null : (current as VoteType),
    helpfulCount: Number(d.helpfulCount ?? d.helpful ?? 0),
    notHelpfulCount: Number(d.notHelpfulCount ?? d.notHelpful ?? 0),
  };
};

/* ------------------------------------------------------------------ */
/* Service                                                             */
/* ------------------------------------------------------------------ */

export const reviewsService = {
  /* ---------- Public / course storefront ---------- */

  async getByCourse(courseId: string): Promise<ApiResponse<CourseReview[]>> {
    const endpoints = [
      `/public/course-reviews/course/${courseId}/all`,
      // `/user_reviews/course/${courseId}/all`,
      // `/user_reviews/course/${courseId}`,
    ];
    for (const ep of endpoints) {
      try {
        const res = await apiClient.get<any>(ep);
        const data = unwrap<any>(res);
        const list = Array.isArray(data)
          ? data
          : data && typeof data === "object" && Array.isArray(data.reviews)
            ? data.reviews
            : data
              ? [data]
              : [];
        if (list.length > 0) {
          return ok(normalizeList(list));
        }
      } catch {
        // try next endpoint
      }
    }
    return ok([]);
  },

  /** Aggregate rating + distribution for a course (no auth required). */
  async getReviewSummary(courseId: string): Promise<ApiResponse<ReviewSummary>> {
    const endpoints = [
      `/public/course-reviews/course/${courseId}/summary`,
      `/public/course-reviews/course/${courseId}/all`,
      // `/user_reviews/course/${courseId}/all`,
      `/user_reviews/course/${courseId}`,
    ];

    for (const ep of endpoints) {
      try {
        const res = await apiClient.get<any>(ep);
        if (res) {
          const summary = normalizeSummary(res, courseId);
          if (summary.totalReviews > 0 || summary.avgRating > 0) {
            return ok(summary);
          }
        }
      } catch {
        // try next endpoint
      }
    }

    try {
      const reviewsRes = await this.getByCourse(courseId);
      const list = reviewsRes.data || [];
      const totalReviews = list.length;
      const avgRating =
        totalReviews > 0
          ? Math.round((list.reduce((s, r) => s + r.rating, 0) / totalReviews) * 10) / 10
          : 0;
      return ok({
        courseId,
        avgRating,
        totalReviews,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      });
    } catch {
      return ok({
        courseId,
        avgRating: 0,
        totalReviews: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      });
    }
  },

  /* ---------- Authenticated user ---------- */

  /** Every review written by the logged-in user. */
  async listMyReviews(): Promise<ApiResponse<CourseReview[]>> {
    const res = await apiClient.get<any>(`/user_reviews`);
    return ok(normalizeList(unwrap<any>(res)));
  },

  /** The logged-in user's review for one course (null when none exists). */
  async getMyReview(
    courseId: string,
  ): Promise<ApiResponse<CourseReview | null>> {
    try {
      const res = await apiClient.get<any>(`/user_reviews/course/${courseId}`);
      console.log(courseId, "getMyReview res");
      const data = unwrap<any>(res);
      const item = Array.isArray(data) ? data[0] : data;
      return ok(item ? normalizeReview(item) : null);
    } catch (e: any) {
      // 404 simply means "not reviewed yet"
      if (e?.response?.status === 404 || e?.status === 404) return ok(null);
      throw e;
    }
  },

  /** Create a review. POST /user_reviews */
  async addReview(input: {
    courseId: string;
    rating: number;
    text?: string;
    reviewText?: string;
    // accepted for backwards-compat with existing callers; not sent to backend
    userId?: string;
    userName?: string;
    userAvatar?: string;
  }): Promise<ApiResponse<CourseReview>> {
    const res = await apiClient.post<any>(`/user_reviews`, {
      courseId: input.courseId,
      rating: input.rating,
      reviewText: (input.reviewText ?? input.text ?? "").trim(),
    });
    const data = unwrap<any>(res);
    const created = normalizeReview(
      data ?? {
        courseId: input.courseId,
        rating: input.rating,
        reviewText: input.reviewText ?? input.text,
      },
    );
    return ok(created, res?.message ?? "Review submitted");
  },

  /** Update my review. PUT /user_reviews/course/{courseId} */
  async updateReview(
    courseId: string,
    payload: { rating: number; reviewText: string },
  ): Promise<ApiResponse<CourseReview>> {
    const res = await apiClient.put<any>(`/user_reviews/course/${courseId}`, {
      rating: payload.rating,
      reviewText: payload.reviewText.trim(),
    });
    const data = unwrap<any>(res);
    return ok(
      normalizeReview(data ?? { courseId, ...payload }),
      res?.message ?? "Review updated",
    );
  },

  /** Delete my review. DELETE /user_reviews/course/{courseId} */
  async deleteReview(courseId: string): Promise<ApiResponse<null>> {
    const res = await apiClient.delete<any>(`/user_reviews/course/${courseId}`);
    return ok(null, res?.message ?? "Review deleted");
  },

  /* ---------- Voting ---------- */

  async vote(
    reviewId: string,
    voteType: VoteType,
  ): Promise<ApiResponse<VoteResponseData>> {
    const res = await apiClient.post<any>(`/user_reviews/${reviewId}/vote`, {
      voteType,
    });
    return ok(normalizeVoteResponse(unwrap<any>(res), reviewId));
  },

  voteHelpful(reviewId: string) {
    return reviewsService.vote(reviewId, "HELPFUL");
  },

  voteNotHelpful(reviewId: string) {
    return reviewsService.vote(reviewId, "NOT_HELPFUL");
  },

  /* ---------- Admin moderation (unchanged contract) ---------- */

  async adminList(
    opts: { scope?: "all" | ReviewScope; status?: "all" | ReviewStatus } = {},
  ): Promise<ApiResponse<CourseReview[]>> {
    const qs = new URLSearchParams();
    if (opts.scope) qs.set("scope", opts.scope);
    if (opts.status) qs.set("status", opts.status);
    const res = await apiClient.get<any>(`/admin/reviews?${qs.toString()}`);
    return ok(normalizeList(unwrap<any>(res)));
  },

  async approve(id: string): Promise<ApiResponse<CourseReview>> {
    const res = await apiClient.post<any>(`/admin/reviews/${id}/approve`);
    return ok(normalizeReview(unwrap<any>(res)), "Review approved");
  },

  async reject(id: string, reason?: string): Promise<ApiResponse<CourseReview>> {
    const res = await apiClient.post<any>(`/admin/reviews/${id}/reject`, {
      reason,
    });
    return ok(normalizeReview(unwrap<any>(res)), "Review rejected");
  },

  /** Fetch reviews for courses owned by the logged-in instructor (/instructor/reviews with fallbacks). */
  async getInstructorReviews(
    page = 0,
    size = 50,
    ownedCourseIds?: string[]
  ): Promise<ApiResponse<{ overallRating: number; totalReviews: number; reviews: CourseReview[] }>> {
    const endpoints = [
      `/instructor/reviews`,
      `/user_reviews/instructor`,
      `/user_reviews/instructor/reviews`,
    ];

    for (const ep of endpoints) {
      try {
        const res = await apiClient.get<any>(ep, { params: { page, size } });
        if (res) {
          const d = res && typeof res === "object" && "data" in res && !Array.isArray(res) ? (res as any).data : res;
          const payload = d ?? {};
          const rawReviews = Array.isArray(payload.reviews)
            ? payload.reviews
            : Array.isArray(payload)
            ? payload
            : Array.isArray(payload.content)
            ? payload.content
            : [];

          if (rawReviews.length > 0 || payload.overallRating !== undefined || payload.totalReviews !== undefined) {
            const reviews = normalizeList(rawReviews);
            const totalReviews = Number(payload.totalReviews ?? payload.totalElements ?? reviews.length);
            const rawAvg = Number(
              payload.overallRating ??
                payload.avgRating ??
                (reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0)
            );
            const overallRating = Math.round(rawAvg * 10) / 10;

            return ok({
              overallRating,
              totalReviews,
              reviews,
            });
          }
        }
      } catch {
        // try next endpoint
      }
    }

    // Fallback: fetch reviews for instructor's courses
    try {
      let targetCourseIds = ownedCourseIds || [];
      const courseMap = new Map<string, string>();

      if (!targetCourseIds.length) {
        let recorded: any[] = [];
        try {
          const recRes: any = await coursesService.getCourses(undefined, { page: 0, size: 500 } as any);
          recorded = Array.isArray(recRes?.data) ? recRes.data : Array.isArray(recRes) ? recRes : [];
        } catch {
          recorded = [];
        }

        let live: any[] = [];
        try {
          const liveRes: any = await liveCoursesService.list();
          live = Array.isArray(liveRes?.data) ? liveRes.data : Array.isArray(liveRes) ? liveRes : [];
        } catch {
          live = [];
        }

        const allCourses = [...recorded, ...live];
        allCourses.forEach((c) => {
          const id = String(c.id ?? c.courseId ?? c.liveCourseId ?? "");
          if (id) courseMap.set(id, c.title ?? c.name ?? "Course");
        });
        targetCourseIds = [...courseMap.keys()];
      }

      if (targetCourseIds.length === 0) {
        return ok({ overallRating: 0, totalReviews: 0, reviews: [] });
      }

      const reviewResults = await Promise.all(
        targetCourseIds.map(async (cId) => {
          const revRes = await this.getByCourse(cId);
          return (revRes.data || []).map((r) => ({
            ...r,
            courseId: cId,
            courseName: r.courseName || courseMap.get(cId) || "Course",
          }));
        })
      );

      const allReviews = reviewResults
        .flat()
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

      const totalReviews = allReviews.length;
      const rawAvg =
        totalReviews > 0
          ? allReviews.reduce((s, r) => s + (r.rating || 0), 0) / totalReviews
          : 0;
      const overallRating = Math.round(rawAvg * 10) / 10;

      return ok({
        overallRating,
        totalReviews,
        reviews: allReviews,
      });
    } catch {
      return ok({
        overallRating: 0,
        totalReviews: 0,
        reviews: [],
      });
    }
  },
};
