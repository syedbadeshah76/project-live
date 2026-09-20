// ============= Coupon Service (Java Spring Boot gateway) =============
// Public / Admin-action endpoints:
//   POST   /api/coupons                (Admin only)  -> create
//   PUT    /api/coupons/{couponId}     (Admin only)  -> update
//   DELETE /api/coupons/{couponId}     (Admin only)  -> delete
//   POST   /api/coupons/validate                     -> validate
//   GET    /api/coupons/{couponId}
//   GET    /api/coupons/code/{couponCode}
// Admin read endpoints (paged, 0-based):
//   GET    /api/admin/coupons?page=0&size=20
//   GET    /api/admin/coupons/summary
//   GET    /api/admin/coupons/{couponId}
import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api.types";

// ============= UI Types (unchanged public surface) =============
export type DiscountType = "percentage" | "fixed";
export type ApplicableTo = "all" | "specific";

export interface Coupon {
  id: string;
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  applicableTo: ApplicableTo;
  courseIds?: string[];
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit: number;
  perUserLimit?: number;
  usedCount: number;
  revenue?: number;
  validFrom?: string;   // yyyy-MM-dd (UI friendly)
  expiryDate: string;   // yyyy-MM-dd (UI friendly)
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface CourseLite {
  id: string;
  title: string;
}

export interface CreateCouponPayload {
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  applicableTo: ApplicableTo;
  courseIds?: string[];
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit: number;
  perUserLimit?: number;
  validFrom?: string;
  expiryDate: string;
  isActive?: boolean;
}

export type UpdateCouponPayload = Partial<CreateCouponPayload>;

export interface CouponValidation {
  valid: boolean;
  coupon?: Coupon;
  discount: number;
  finalPrice: number;
  message: string;
}

export interface PaginationMeta {
  page: number;      // 1-based for the UI
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface CouponListResult {
  items: Coupon[];
  meta: PaginationMeta;
}

export interface CouponSummary {
  activeCoupons: number;
  totalRevenue: number;
  totalRedeemed: number;
  avgDiscount: number;
}

// ============= Backend DTO =============
interface CouponDto {
  id?: string | number;
  couponId?: string | number;
  code?: string;
  description?: string;
  discountType?: string;
  discountValue?: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  perUserLimit?: number;
  usedCount?: number;
  usageCount?: number;
  totalRevenue?: number;
  revenue?: number;
  validFrom?: string;
  validUntil?: string;
  active?: boolean;
  isActive?: boolean;
  status?: string;
  courseIds?: Array<string | number>;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

// ============= Mappers =============
/** Spring `LocalDateTime` friendly: "2024-01-01T00:00:00" (never send a Z suffix). */
const toBackendDateTime = (value: string | undefined, endOfDay = false): string | undefined => {
  if (!value) return undefined;
  if (value.includes("T")) return value.replace(/Z$/, "").slice(0, 19);
  return `${value}T${endOfDay ? "23:59:59" : "00:00:00"}`;
};

/** "2024-12-31T23:59:59" -> "2024-12-31" for <input type="date">. */
const toDateInput = (value?: string): string => (value ? String(value).slice(0, 10) : "");

const normalizeDiscountType = (value?: string): DiscountType =>
  String(value ?? "").toUpperCase() === "FIXED" ? "fixed" : "percentage";

const resolveActive = (dto: CouponDto): boolean => {
  if (typeof dto.active === "boolean") return dto.active;
  if (typeof dto.isActive === "boolean") return dto.isActive;
  if (dto.status) return String(dto.status).toUpperCase() === "ACTIVE";
  return true;
};

const mapCoupon = (dto: CouponDto): Coupon => {
  const courseIds = (dto.courseIds ?? []).map(String);
  return {
    id: String(dto.id ?? dto.couponId ?? ""),
    code: dto.code ?? "",
    description: dto.description ?? "",
    discountType: normalizeDiscountType(dto.discountType),
    discountValue: Number(dto.discountValue ?? 0),
    applicableTo: courseIds.length > 0 ? "specific" : "all",
    courseIds,
    minPurchase: dto.minOrderAmount ?? 0,
    maxDiscount: dto.maxDiscountAmount ?? undefined,
    usageLimit: Number(dto.usageLimit ?? 0),
    perUserLimit: dto.perUserLimit ?? 1,
    usedCount: Number(dto.usedCount ?? dto.usageCount ?? 0),
    revenue: Number(dto.totalRevenue ?? dto.revenue ?? 0),
    validFrom: toDateInput(dto.validFrom),
    expiryDate: toDateInput(dto.validUntil),
    isActive: resolveActive(dto),
    createdAt: dto.createdAt ?? "",
    updatedAt: dto.updatedAt ?? "",
    createdBy: dto.createdBy ?? "Admin",
  };
};

/** Exactly the body shape shown in Postman. */
const mapPayload = (payload: CreateCouponPayload | UpdateCouponPayload) => ({
  code: payload.code?.trim().toUpperCase(),
  description: payload.description ?? "",
  discountType: payload.discountType,
  discountValue: Number(payload.discountValue ?? 0),
  minOrderAmount: Number(payload.minPurchase ?? 0),
  maxDiscountAmount:
    payload.maxDiscount === undefined || payload.maxDiscount === null
      ? null
      : Number(payload.maxDiscount),
  usageLimit: Number(payload.usageLimit ?? 0),
  perUserLimit: Number(payload.perUserLimit ?? 1),
  validFrom: toBackendDateTime(payload.validFrom) ?? toBackendDateTime(new Date().toISOString().slice(0, 10)),
  validUntil: toBackendDateTime(payload.expiryDate, true),
  courseIds: payload.applicableTo === "specific" ? (payload.courseIds ?? []) : [],
});

/** Handles raw arrays, Spring `Page`, and `{ success, data }` envelopes. */
const unwrap = <T>(res: unknown): T => {
  const body = res as Record<string, unknown> | null;
  if (body && typeof body === "object" && "data" in body && body.data !== undefined) {
    return body.data as T;
  }
  return res as T;
};

const readList = (raw: unknown): { rows: CouponDto[]; totalItems?: number; totalPages?: number } => {
  const data = unwrap<unknown>(raw) as Record<string, unknown> | CouponDto[];
  if (Array.isArray(data)) return { rows: data as CouponDto[] };
  const container = data as Record<string, unknown>;
  const rows = (container.content ?? container.items ?? container.coupons ?? []) as CouponDto[];
  return {
    rows: Array.isArray(rows) ? rows : [],
    totalItems: container.totalElements as number | undefined,
    totalPages: container.totalPages as number | undefined,
  };
};

// ============= Service =============
export const couponService = {
  /** Admin listing. `page` is 1-based in the UI, converted to the backend's 0-based `page`. */
  async getCoupons(params?: {
    search?: string;
    status?: "all" | "active" | "expired";
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<CouponListResult>> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const query: Record<string, string | number> = {
      page: Math.max(0, page - 1),
      size: pageSize,
    };
    if (params?.search) query.search = params.search;
    if (params?.status && params.status !== "all") query.status = params.status.toUpperCase();

    const res = await apiClient.get<unknown>("/admin/coupons", { params: query });
    const { rows, totalItems, totalPages } = readList(res);
    const items = rows.map(mapCoupon);

    return {
      success: true,
      data: {
        items,
        meta: {
          page,
          pageSize,
          totalItems: totalItems ?? items.length,
          totalPages: totalPages ?? Math.max(1, Math.ceil((totalItems ?? items.length) / pageSize)),
        },
      },
    };
  },

  async getCouponSummary(): Promise<ApiResponse<CouponSummary>> {
    const res = await apiClient.get<unknown>("/admin/coupons/summary");
    const s = (unwrap<Record<string, number>>(res) ?? {}) as Record<string, number>;
    return {
      success: true,
      data: {
        activeCoupons: Number(s.activeCoupons ?? s.active ?? 0),
        totalRevenue: Number(s.totalRevenue ?? s.revenue ?? 0),
        totalRedeemed: Number(s.totalRedeemed ?? s.totalUsed ?? 0),
        avgDiscount: Number(s.avgDiscount ?? s.averageDiscount ?? 0),
      },
    };
  },

  async getCoupon(id: string): Promise<ApiResponse<Coupon>> {
    const res = await apiClient.get<unknown>(`/admin/coupons/${id}`);
    return { success: true, data: mapCoupon(unwrap<CouponDto>(res)) };
  },

  async getCouponByCode(code: string): Promise<ApiResponse<Coupon>> {
    const res = await apiClient.get<unknown>(`/coupons/code/${encodeURIComponent(code)}`);
    return { success: true, data: mapCoupon(unwrap<CouponDto>(res)) };
  },

  async getCourses(): Promise<ApiResponse<CourseLite[]>> {
    const res = await apiClient.get<unknown>("/admin/courses", { params: { page: 0, size: 200 } });
    const { rows } = readList(res);
    const items = (rows as unknown as Array<Record<string, unknown>>).map((c) => ({
      id: String(c.id ?? c.courseId ?? ""),
      title: String(c.title ?? c.name ?? "Untitled course"),
    }));
    return { success: true, data: items };
  },

  // ---- Create (POST /api/coupons — Admin only)
  async createCoupon(payload: CreateCouponPayload): Promise<ApiResponse<Coupon>> {
    const res = await apiClient.post<unknown>("/coupons", mapPayload(payload));
    const dto = unwrap<CouponDto>(res);
    const created = mapCoupon(dto);
    return {
      success: true,
      // fall back to the submitted values when the backend returns a thin response
      data: created.code ? created : { ...created, ...mapCoupon({ ...mapPayload(payload) } as CouponDto) },
    };
  },

  // ---- Update (PUT /api/coupons/{couponId} — Admin only)
  async updateCoupon(id: string, payload: UpdateCouponPayload): Promise<ApiResponse<Coupon>> {
    const res = await apiClient.put<unknown>(`/coupons/${id}`, mapPayload(payload));
    const dto = unwrap<CouponDto>(res);
    const updated = mapCoupon(dto);
    return { success: true, data: updated.id ? updated : { ...updated, id } };
  },

  // ---- Delete (DELETE /api/coupons/{couponId} — Admin only)
  async deleteCoupon(id: string): Promise<ApiResponse<{ message: string }>> {
    await apiClient.delete<unknown>(`/coupons/${id}`);
    return { success: true, data: { message: "Coupon deleted successfully" } };
  },

  async bulkDelete(ids: string[]): Promise<ApiResponse<{ message: string }>> {
    // No bulk endpoint exists in the gateway: delete sequentially so one failure surfaces.
    for (const id of ids) {
      await apiClient.delete<unknown>(`/coupons/${id}`);
    }
    return { success: true, data: { message: `${ids.length} coupons deleted` } };
  },

  async toggleStatus(id: string, isActive: boolean): Promise<ApiResponse<Coupon>> {
    // Gateway has no status route; PUT the coupon with the flipped validUntil/active field.
    const current = await couponService.getCoupon(id);
    const res = await apiClient.put<unknown>(`/coupons/${id}`, {
      ...mapPayload({ ...current.data, isActive }),
      active: isActive,
    });
    return { success: true, data: mapCoupon(unwrap<CouponDto>(res)) };
  },

  // ---- Validate (POST /api/coupons/validate)
  async validateCoupon(
    code: string,
    orderAmount: number,
  ): Promise<ApiResponse<CouponValidation>> {
    const cleanCode = code.trim();
    const numericAmount = Number(orderAmount) || 0;

    try {
      const res = await apiClient.post<unknown>("/coupons/validate", {
        code: cleanCode,
        orderAmount: numericAmount,
      });

      const d = (unwrap<Record<string, unknown>>(res) ?? {}) as Record<string, unknown>;
      const valid = Boolean(d.valid ?? d.isValid ?? false);
      const discount = Number(d.discountAmount ?? d.discount ?? 0);
      const msg = String(
        d.message ?? (valid ? "Coupon applied successfully" : `Invalid coupon: ${cleanCode}`)
      );

      return {
        success: valid,
        data: {
          valid,
          coupon: d.coupon ? mapCoupon(d.coupon as CouponDto) : undefined,
          discount: Math.round(discount * 100) / 100,
          finalPrice: Math.round(Number(d.finalAmount ?? d.finalPrice ?? numericAmount - discount) * 100) / 100,
          message: msg,
        },
        message: msg,
      };
    } catch (err: any) {
      const backendErr = err?.response?.data;
      const msg = backendErr?.message || err?.message || "Failed to validate coupon";
      return {
        success: false,
        data: {
          valid: false,
          discount: 0,
          finalPrice: numericAmount,
          message: msg,
        },
        message: msg,
      };
    }
  },
};
