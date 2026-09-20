// ============= Search Service =============
// Backend contract (Spring Boot):
//   GET /courses/searchfilters   (body: JSON)
//     Body shapes accepted by backend:
//       { keyword, page, size, sortBy }
//       { categoryIds: string[], subCategoryIds?: string[], page, size, sortBy }
//       (both can be combined)
//   Response:
//     {
//       courses: BackendCourse[],
//       page, size, totalElements, totalPages, first, last
//     }

import { apiClient } from "@/lib/api-client";
import type {
  ApiResponse, Course, SearchResults, SearchFilters,
} from "@/types/api.types";
import { liveCoursesService } from "@/services/liveCourses.service";
import { instructorsService } from "@/services/instructors.service";

export interface SearchFiltersRequest {
  keyword?: string;
  q?: string;              // alias -> keyword
  query?: string;          // alias -> keyword
  categoryId?: string;
  categoryIds?: string[];
  subcategoryId?: string;
  subCategoryIds?: string[];
  level?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;         // "latest" | "popular" | "priceAsc" | "priceDesc" | ...
  page?: number;           // 0-based
  size?: number;
}

export interface PagedCourses {
  courses: Course[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

const unwrap = <T,>(res: any): T => (res?.data ?? res) as T;

const resolveProductId = (item: any): string | undefined =>
  item.productId
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

const resolveDisplayedPrice = (item: any): number => {
  const dp = item.discountedPrice != null && !Number.isNaN(Number(item.discountedPrice)) ? Number(item.discountedPrice) : (item.discountPrice != null && !Number.isNaN(Number(item.discountPrice)) ? Number(item.discountPrice) : 0);
  if (dp > 0) return dp;

  const p = item.price != null && !Number.isNaN(Number(item.price)) ? Number(item.price) : 0;
  if (p > 0) return p;

  const bp = item.basePrice != null && !Number.isNaN(Number(item.basePrice)) ? Number(item.basePrice) : 0;
  if (bp > 0) return bp;

  return 0;
};

const resolveOriginalPrice = (item: any, price: number): number | undefined => {
  const original = item.strikeOutPrice ?? item.originalPrice ?? item.basePrice;
  const parsed = original != null && !Number.isNaN(Number(original)) ? Number(original) : undefined;
  return parsed != null && parsed > 0 ? parsed : (price > 0 ? price : undefined);
};

export function normalizeLiveCourseToCourse(live: any): Course {
  const isFree = live.accessType === "FREE" || (Number(live.basePrice ?? 0) === 0 && !live.discountedPrice && !live.price);
  const price = isFree ? 0 : resolveDisplayedPrice(live);
  const rawDisc = live.discountedPrice ?? live.discountPrice;
  const discountPrice = rawDisc != null && !Number.isNaN(Number(rawDisc)) && Number(rawDisc) > 0 ? Number(rawDisc) : undefined;
  const pId = resolveProductId(live);
  const originalPrice = resolveOriginalPrice(live, price);
  const basePrice = Number(live.basePrice ?? live.price ?? price);

  return {
   id: String(
  live.liveCourseId ??
  live.live_course_id ??
  live.id ??
  ""
),
    productId: pId,
    product_id: pId,
    title: live.title ?? "Untitled Live Course",
    slug: live.slug ?? (live.title ? String(live.title).toLowerCase().replace(/\s+/g, "-") : ""),
    description: live.description ?? "",
    shortDescription: live.description ? String(live.description).substring(0, 100) : "",
    thumbnail: live.thumbnailUrl ?? live.thumbnail ?? "/placeholder.svg",
    previewVideo: live.promoVideoUrl ?? live.promoVideo,
    categoryId: live.categoryId ?? live.category?.id ?? "",
    category: live.category?.name ?? live.categoryName ?? live.category ?? "",
    instructorId: live.instructorId ?? live.instructor?.id ?? "",
    instructor: live.instructorName ?? live.instructor?.name ?? live.instructor ?? "Instructor",
    duration: live.duration ?? "Live Sessions",
    totalDuration: Number(live.totalDurationMinutes ?? live.sessionDurationMinutes ?? 0),
    lessons: Number(live.lessonsCount ?? live.totalSessions ?? 0),
    students: Number(live.enrolledStudents ?? live.maxSeats ?? 0),
    rating: Number(live.rating ?? 4.8),
    reviewCount: Number(live.reviewCount ?? 12),
    price: price,
    discountPrice: discountPrice,
    discountedPrice: discountPrice ?? (price > 0 ? price : undefined),
    basePrice: basePrice > 0 ? basePrice : price,
    originalPrice,
    strikeOutPrice: originalPrice,
    level: (live.level === "BEGINNER" ? "Beginner"
          : live.level === "INTERMEDIATE" ? "Intermediate"
          : live.level === "ADVANCED" ? "Advanced"
          : live.level) ?? "Intermediate",
    status: live.status ?? "PUBLISHED",
    featured: !!live.featured,
    tags: live.tags ?? [],
    requirements: live.requirements ?? [],
    whatYouWillLearn: live.whatYouWillLearn ?? [],
    curriculum: live.curriculum ?? [],
    createdAt: live.createdAt ?? new Date().toISOString(),
    updatedAt: live.updatedAt ?? new Date().toISOString(),
    courseType: "LIVE",
    type: "LIVE",
    isLive: true,
  } as any;
}

function toCourse(c: any): Course {
  const pId = resolveProductId(c);
  const price = resolveDisplayedPrice(c);
  const rawDisc = c.discountedPrice ?? c.discountPrice;
  const discountPrice = rawDisc != null && !Number.isNaN(Number(rawDisc)) && Number(rawDisc) > 0 ? Number(rawDisc) : undefined;
  const originalPrice = resolveOriginalPrice(c, price);
  const basePrice = Number(c.basePrice ?? c.price ?? price);
  return {
    id: String(c.id ?? c.courseId ?? ""),
    productId: pId,
    product_id: pId,
    title: c.title ?? "",
    slug: c.slug ?? (c.title ? String(c.title).toLowerCase().replace(/\s+/g, "-") : ""),
    description: c.description ?? "",
    shortDescription: c.shortDescription ?? (c.description?.substring?.(0, 100) ?? ""),
    thumbnail: c.thumbnailUrl || c.thumbnail || "/placeholder.svg",
    previewVideo: c.previewVideoUrl ?? c.previewVideo,
    categoryId: c.categoryId ?? c.category?.id ?? "",
    category: c.category?.name ?? c.categoryName ?? c.category ?? "General",
    instructorId: c.instructorId ?? c.instructor?.id ?? "",
    instructor: c.instructor?.name ?? c.instructorName ?? c.instructor ?? "Instructor",
    duration: String(c.duration ?? c.totalDurationMinutes ?? ""),
    totalDuration: Number(c.totalDurationMinutes ?? c.totalDuration ?? 0),
    lessons: Number(c.totalLessons ?? c.lessons ?? c.lessonCount ?? 0),
    students: Number(c.students ?? c.studentCount ?? c.enrolledCount ?? 0),
    rating: Number(c.avgRating ?? c.rating ?? c.averageRating ?? 0),
    reviewCount: Number(c.reviewCount ?? c.reviewsCount ?? 0),
    price: price,
    discountPrice: discountPrice,
    discountedPrice: discountPrice ?? (price > 0 ? price : undefined),
    basePrice: basePrice > 0 ? basePrice : price,
    originalPrice,
    strikeOutPrice: originalPrice,
    level: (c.level === "BEGINNER" ? "Beginner"
          : c.level === "INTERMEDIATE" ? "Intermediate"
          : c.level === "ADVANCED" ? "Advanced"
          : c.level) ?? "Beginner",
    status: c.status ?? "Published",
    featured: !!c.featured,
    tags: c.tags ?? [],
    requirements: c.requirements ?? [],
    whatYouWillLearn: c.whatYouWillLearn ?? [],
    curriculum: c.curriculum ?? [],
    createdAt: c.createdAt ?? "",
    updatedAt: c.updatedAt ?? "",
    courseType: c.courseType ?? c.type ?? (c.isLive ? "LIVE" : "RECORDED"),
    type: c.type ?? c.courseType ?? (c.isLive ? "LIVE" : "RECORDED"),
    isLive: !!(c.isLive || c.courseType === "LIVE" || c.type === "LIVE"),
  } as any;
}

function buildBody(f: SearchFiltersRequest) {
  const keyword = (f.keyword ?? f.q ?? f.query ?? "").trim();

  const categoryIds =
    f.categoryIds && f.categoryIds.length
      ? f.categoryIds
      : f.categoryId
        ? [f.categoryId]
        : undefined;

  const subCategoryIds =
    f.subCategoryIds && f.subCategoryIds.length
      ? f.subCategoryIds
      : f.subcategoryId
        ? [f.subcategoryId]
        : undefined;

  const body: Record<string, any> = {
    page: f.page ?? 0,
    size: f.size ?? 12,
    sortBy: f.sortBy ?? "latest",
  };
  if (keyword) body.keyword = keyword;
  if (categoryIds) body.categoryIds = categoryIds;
  if (subCategoryIds) body.subCategoryIds = subCategoryIds;
  if (f.level) body.level = f.level;
  if (f.minPrice != null) body.minPrice = f.minPrice;
  if (f.maxPrice != null) body.maxPrice = f.maxPrice;

  return body;
}

/** Helper to verify if a recorded course is approved and published for students */
export function isApprovedPublishedCourse(c: any): boolean {
  if (!c) return false;

  const status = String(c.status || "").trim().toUpperCase();
  const approvalStatus = String(c.approvalStatus || c.courseApprovalStatus || "").trim().toUpperCase();

  // 1. Exclude drafts
  if (status === "DRAFT" || approvalStatus === "DRAFT" || c.isPublished === false) {
    return false;
  }

  // 2. Exclude rejected courses
  if (
    approvalStatus === "REJECTED" ||
    approvalStatus === "REJECTED_BY_ADMIN" ||
    status === "REJECTED" ||
    c.isRejected === true ||
    Boolean(c.rejectedAt)
  ) {
    return false;
  }

  // 3. Exclude pending review courses
  if (
    approvalStatus === "PENDING" ||
    approvalStatus === "PENDING_REVIEW" ||
    approvalStatus === "IN_REVIEW" ||
    approvalStatus === "SUBMITTED" ||
    status === "PENDING" ||
    status === "SUBMITTED"
  ) {
    return false;
  }

  // 4. Must be confirmed approved
  if (approvalStatus === "APPROVED" || c.isApproved === true || c.approved === true || Boolean(c.approvedAt)) {
    return true;
  }

  // Non-approved courses are strictly excluded
  return false;
}

/** Helper to verify if a live course is approved and published for students */
export function isApprovedPublishedLiveCourse(l: any): boolean {
  if (!l) return false;

  const status = String(l.status || "").trim().toUpperCase();
  const approvalStatus = String(l.approvalStatus || l.courseApprovalStatus || "").trim().toUpperCase();

  // Exclude drafts
  if (status === "DRAFT" || approvalStatus === "DRAFT" || l.isPublished === false) {
    return false;
  }

  // Exclude rejected
  if (
    approvalStatus === "REJECTED" ||
    approvalStatus === "REJECTED_BY_ADMIN" ||
    status === "REJECTED" ||
    l.isRejected === true
  ) {
    return false;
  }

  // Exclude pending
  if (
    approvalStatus === "PENDING" ||
    approvalStatus === "PENDING_REVIEW" ||
    approvalStatus === "IN_REVIEW" ||
    approvalStatus === "SUBMITTED" ||
    status === "PENDING"
  ) {
    return false;
  }

  // If explicit approvalStatus exists
  if (approvalStatus) {
    return approvalStatus === "APPROVED";
  }

  if (l.isApproved !== undefined) return Boolean(l.isApproved);
  if (l.approved !== undefined) return Boolean(l.approved);

  return status === "PUBLISHED" || l.isPublished === true;
}

export const searchService = {
  async searchFilters(filters: SearchFiltersRequest = {}): Promise<PagedCourses> {
    const body = buildBody(filters);
    const reqType = String((filters as any).type ?? (filters as any).courseType ?? "all").toLowerCase();

    let combined: Course[] = [];

    if (reqType === "live") {
      // 1. Fetch live courses only when specifically filtered to live
      try {
        const liveRes = await liveCoursesService.list();
        const rawLive = unwrap<any>(liveRes) ?? [];
        const liveList = Array.isArray(rawLive)
          ? rawLive
          : (rawLive?.content ?? rawLive?.items ?? rawLive?.liveCourses?.content ?? rawLive?.data ?? []);
        combined = liveList.map(normalizeLiveCourseToCourse);
      } catch {
        combined = [];
      }
    } else {
      // 2. Fetch approved courses from GET /courses (the List Courses API)
      let recordedList: any[] = [];
      try {
        const res = await apiClient.get<any>("/courses");
        const b = unwrap<any>(res) ?? res;
        recordedList = Array.isArray(b)
          ? b
          : (b?.courses ?? b?.content ?? b?.items ?? b?.data ?? []);
      } catch {
        try {
          const res = await apiClient.request({
            url: "/courses/searchfilters",
            method: "POST",
            data: body,
            headers: { "Content-Type": "application/json" },
          });
          const b = unwrap<any>(res) ?? {};
          recordedList = b.courses ?? b.content ?? b.items ?? b.data ?? (Array.isArray(b) ? b : []);
        } catch {
          recordedList = [];
        }
      }

      combined = recordedList.map(toCourse);
    }

    // Enrich combined list with instructor names via instructorsService
    try {
      const instructors = await instructorsService.list();
      const instructorMap = new Map(
        instructors.flatMap((i) => [
          [String(i.id), i.name],
          [String(i.userId), i.name],
        ])
      );
      combined = combined.map((c: any) => {
        const instId = String(c.instructorId ?? c.instructorUserId ?? (typeof c.instructor === "object" ? c.instructor?.id || c.instructor?.userId : c.instructor) ?? "");
        const resolvedName =
          instructorMap.get(instId) ||
          instructorMap.get(String(c.instructorId)) ||
          instructorMap.get(String(c.instructorUserId)) ||
          (typeof c.instructor === "object" ? c.instructor?.name : c.instructorName) ||
          (typeof c.instructor === "string" && !c.instructor.startsWith("inst-") && !c.instructor.startsWith("user-") && !c.instructor.match(/^[0-9a-fA-F]{8}/) ? c.instructor : "");

        return {
          ...c,
          instructor: resolvedName || c.instructor || "Instructor",
          instructorName: resolvedName || c.instructorName || "Instructor",
          instructorId: instId || c.instructorId,
        };
      });
    } catch {
      // Ignore enrichment errors
    }

    // Enrich combined list with productId fallback if missing
    try {
      const missingProductId = combined.some((c: any) => !c.productId);
      if (missingProductId) {
        const fullCoursesRes = await apiClient.get<any>("/courses").catch(() => null);
        const fullCourses = unwrap<any>(fullCoursesRes) ?? [];
        const recList = Array.isArray(fullCourses) ? fullCourses : (fullCourses?.data ?? fullCourses?.content ?? []);
        const map = new Map<string, string>();
        if (Array.isArray(recList)) {
          recList.forEach((fc: any) => {
            const productId = resolveProductId(fc);
            if (fc.id && productId) {
              map.set(String(fc.id), productId);
            }
          });
        }
        combined = combined.map((c: any) => ({
          ...c,
          productId: c.productId || map.get(String(c.id)) || undefined,
          product_id: c.product_id || c.productId || map.get(String(c.id)) || undefined,
        }));
      }
    } catch {
      // Ignore fallback errors
    }

    const seen = new Set<string>();
    combined = combined.filter((c) => {
      if (!c.id || seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });

    // 3. Apply keyword, category, level, and course type search filters across results
    const keyword = (filters.keyword ?? filters.q ?? filters.query ?? "").trim().toLowerCase();
    if (keyword) {
      combined = combined.filter(
        (c) =>
          c.title?.toLowerCase().includes(keyword) ||
          c.description?.toLowerCase().includes(keyword) ||
          (typeof c.category === "string" && c.category.toLowerCase().includes(keyword)) ||
          (typeof c.category === "object" && (c.category as any)?.name?.toLowerCase().includes(keyword)) ||
          (typeof c.instructor === "string" && c.instructor.toLowerCase().includes(keyword)) ||
          (typeof c.instructorName === "string" && c.instructorName.toLowerCase().includes(keyword))
      );
    }

    if (filters.categoryIds && filters.categoryIds.length) {
      combined = combined.filter((c) => filters.categoryIds!.includes(c.categoryId));
    } else if (filters.categoryId) {
      combined = combined.filter((c) => c.categoryId === filters.categoryId);
    }

    if (filters.level) {
      combined = combined.filter((c) => c.level?.toLowerCase() === filters.level?.toLowerCase());
    }

    if (reqType !== "all") {
      combined = combined.filter((c: any) => {
        const t = String(c.courseType ?? c.type ?? (c.isLive ? "live" : "recorded")).toLowerCase();
        return t.includes(reqType);
      });
    }

    // Sort combined list
    const sort = filters.sortBy ?? "latest";
    if (sort === "latest") {
      combined.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } else if (sort === "priceAsc") {
      combined.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === "priceDesc") {
      combined.sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    const page = filters.page ?? 0;
    const size = filters.size ?? 12;
    const totalElements = combined.length;
    const totalPages = Math.ceil(totalElements / size) || 1;
    const pagedCourses = combined.slice(page * size, (page + 1) * size);

    return {
      courses: pagedCourses,
      page,
      size,
      totalElements,
      totalPages,
      first: page === 0,
      last: page >= totalPages - 1,
    };
  },

  async search(query: string, filters?: SearchFilters): Promise<ApiResponse<SearchResults>> {
    const paged = await searchService.searchFilters({ keyword: query, ...(filters as any) });
    return {
      success: true,
      data: {
        courses: paged.courses,
        categories: [],
        instructors: [],
        totalResults: paged.totalElements,
      } as SearchResults,
    };
  },

  async getSuggestions(query: string) {
    try {
      const paged = await searchService.searchFilters({ keyword: query, size: 5, page: 0 });
      return {
        success: true,
        data: {
          suggestions: paged.courses.map((c) => c.title).slice(0, 5),
          popularSearches: ["React", "Python", "Machine Learning", "UI/UX Design", "AWS"],
        },
      };
    } catch {
      return { success: true, data: { suggestions: [], popularSearches: [] as string[] } };
    }
  },

  async recordSearch(_query: string, _resultCount: number): Promise<void> {
    return;
  },

  async getTrending(): Promise<ApiResponse<{ term: string; count: number }[]>> {
    try {
      return await apiClient.get<ApiResponse<{ term: string; count: number }[]>>("/search/trending");
    } catch {
      return { success: true, data: [] };
    }
  },
};
