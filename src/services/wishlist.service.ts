// src/services/wishlist.service.ts
// ============= Wishlist Service =============
// Backend contract (Java Spring Boot, via API gateway):
//   GET    /wishlist?page=0&size=10          -> { content: [...], totalElements, totalPages, number, size }
//   GET    /wishlist                          -> same paged shape (defaults) or plain array
//   POST   /wishlist/toggle  { courseId }     -> { wishlisted: boolean, message: string }
//   GET    /wishlist/{courseId}/status        -> { wishlisted: boolean }
import { apiClient } from "@/lib/api-client";

/** Raw item shape returned by the backend wishlist endpoints */
export interface WishlistItemDTO {
  id?: string;
  wishlistId?: string;
  courseId: string;

  // title variants
  title?: string;
  courseTitle?: string;

  // thumbnail variants
  thumbnailUrl?: string;
  thumbnail?: string;

  // instructor variants
  instructor?: string;
  instructorName?: string;

  // price variants
  price?: number;
  basePrice?: number;
  discountedPrice?: number;
  effectivePrice?: number;

  // rating variants
  rating?: number;
  avgRating?: number;

  // counts
  students?: number;
  enrollmentCount?: number;
  totalStudents?: number;
  reviewsCount?: number;
  totalReviews?: number;
  lessons?: number;
  totalLessons?: number;

  level?: string;

  category?: string;
  categoryId?: string;
  categoryName?: string;

  addedAt?: string;
  createdAt?: string;
}

export interface WishlistPage {
  items: WishlistItemDTO[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface WishlistToggleResponse {
  courseId: string;
  wishlisted: boolean;
  message?: string;
}

/** apiClient may return either the axios-style envelope or the raw payload */
const unwrap = <T>(res: any): T => {
  const first = res?.data ?? res;
  // handles { success, data: {...} } envelopes as well
  if (first && typeof first === "object" && !Array.isArray(first) && "data" in first && !("content" in first)) {
    return (first.data ?? first) as T;
  }
  return first as T;
};

const toItems = (data: any): WishlistItemDTO[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.wishlist)) return data.wishlist;
  return [];
};

const toNum = (v: unknown, fallback = 0): number => {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? (n as number) : fallback;
};

export const wishlistService = {
  /** Full (first page, large size) list of the current user's wishlist */
  async list(): Promise<WishlistItemDTO[]> {
    const res = await apiClient.get("/wishlist", { params: { page: 0, size: 100 } });
    return toItems(unwrap<any>(res));
  },

  /** Paginated list */
  async listPaged(page = 0, size = 10): Promise<WishlistPage> {
    const res = await apiClient.get("/wishlist", { params: { page, size } });
    const data = unwrap<any>(res);
    const items = toItems(data);
    return {
      items,
      page: toNum(data?.number, page),
      size: toNum(data?.size, size),
      totalElements: toNum(data?.totalElements, items.length),
      totalPages: toNum(data?.totalPages, 1),
    };
  },

  /** Toggle add/remove. Returns the resulting wishlist state for the course. */
  async toggle(courseId: string): Promise<WishlistToggleResponse> {
    const payload = { courseId: String(courseId) };
    const res = await apiClient.post("/wishlist/toggle", payload);
    const data = unwrap<any>(res);
    console.log("wishlistService.toggle", payload);
    return {
      courseId: String(courseId),
      wishlisted: !!(data?.wishlisted ?? data?.inWishlist ?? false),
      message: data?.message,
    };
  },

  /** Explicit add — toggles only when not already wishlisted */
  async add(courseId: string): Promise<boolean> {
    const already = await this.status(courseId).catch(() => false);
    if (already) return true;
    const res = await this.toggle(courseId);
    return res.wishlisted;
  },

  /** Remove via toggle-only backend contract */
  async remove(courseId: string): Promise<WishlistToggleResponse> {
    return this.toggle(courseId);
  },

  /** Wishlist status for a single course */
  async status(courseId: string): Promise<boolean> {
    const res = await apiClient.get(`/wishlist/${courseId}/status`);
    const data = unwrap<any>(res);
    if (typeof data === "boolean") return data;
    return !!(data?.wishlisted ?? data?.inWishlist ?? false);
  },
};

export const normalizeWishlistNumbers = { toNum };
