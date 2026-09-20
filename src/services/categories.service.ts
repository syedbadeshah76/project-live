// ============= Categories Service =============
// Backed by the Edvanz gateway: /api/categories
//
// Endpoints used:
//   GET    /categories                       → list (flat)
//   GET    /categories/tree                  → tree (parents + subcategories)
//   GET    /categories/:id                   → single
//   GET    /categories/:id/subcategories     → children of a category
//   POST   /categories                       → create
//   PUT    /categories/:id                   → update
//   DELETE /categories/:id                   → delete
//
// The axios response interceptor already unwraps AxiosResponse.data, so what
// we receive here IS the backend body. Backend usually wraps as
// { success, data, message } — we normalize that OR a raw entity.

import { apiClient } from "@/lib/api-client";
import type {
  ApiResponse,
  Category,
  CategoryMetadata,
  CategoryStats,
  CategoryStatus,
  CreateCategoryRequest,
  PaginationMeta,
  UpdateCategoryRequest,
} from "@/types/api.types";

const BASE = "/categories";

// ---------- helpers ----------

type Envelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
  meta?: PaginationMeta;
};

function toApiResponse<T>(raw: unknown, fallbackMessage = ""): ApiResponse<T> {
  if (raw && typeof raw === "object" && "data" in (raw as Envelope<T>)) {
    const env = raw as Envelope<T>;
    return {
      success: env.success ?? true,
      data: env.data as T,
      message: env.message ?? fallbackMessage,
      meta: env.meta,
    };
  }
  return {
    success: true,
    data: raw as T,
    message: fallbackMessage,
  };
}

function pickArray(input: unknown): any[] {
  if (Array.isArray(input)) return input;
  if (input && typeof input === "object") {
    const o = input as Record<string, unknown>;
    if (Array.isArray(o.items)) return o.items as any[];
    if (Array.isArray(o.categories)) return o.categories as any[];
    if (Array.isArray(o.results)) return o.results as any[];
    if (Array.isArray(o.data)) return o.data as any[];
  }
  return [];
}

function normalizeCategory(input: any): Category {
  const children = pickArray(
    input?.subcategories ?? input?.children ?? input?.subCategories,
  );

  const totalCourses = Number(
    input?.totalCourses ??
      input?.total_courses ??
      input?.courseCount ??
      input?.course_count ??
      (Array.isArray(input?.courses) ? input.courses.length : 0),
  );

  const totalStudents = Number(
    input?.totalStudents ??
      input?.total_students ??
      input?.studentCount ??
      input?.student_count ??
      input?.studentsCount ??
      input?.students_count ??
      input?.enrolledStudents ??
      0,
  );

  let status: CategoryStatus = "active";
  if (input?.status) {
    status =
      input.status === "inactive" || input.status === "archived"
        ? "archived"
        : "active";
  } else if (typeof input?.isActive === "boolean") {
    status = input.isActive ? "active" : "archived";
  } else if (typeof input?.is_active === "boolean") {
    status = input.is_active ? "active" : "archived";
  }

  const rawColor = input?.color ?? input?.colorCode ?? input?.colour;
  const color =
    typeof rawColor === "string" && rawColor.trim()
      ? rawColor.trim()
      : "#2563EB";

  return {
    id: String(input?.id ?? input?._id ?? input?.categoryId ?? ""),
    name: input?.name ?? input?.title ?? "",
    slug: input?.slug ?? "",
    description: input?.description ?? "",
    iconUrl: input?.iconUrl ?? input?.icon_url ?? undefined,
    color,
    parentId: input?.parentId ?? input?.parent_id ?? null,
    sortOrder: Number(input?.sortOrder ?? input?.sort_order ?? 0),
    metadata: (input?.metadata ?? undefined) as CategoryMetadata | undefined,

    subcategories: children.length ? children.map(normalizeCategory) : undefined,

    courseCount: totalCourses,
    studentCount: totalStudents,
    totalCourses,
    totalStudents,
    isActive:
      typeof input?.isActive === "boolean"
        ? input.isActive
        : typeof input?.is_active === "boolean"
        ? input.is_active
        : status === "active",
    status,
    courses: Array.isArray(input?.courses)
      ? input.courses.map((c: any) => ({
          id: String(c?.id ?? ""),
          title: c?.title ?? "",
        }))
      : undefined,
    createdAt: input?.createdAt ?? input?.created_at,
    updatedAt: input?.updatedAt ?? input?.updated_at,
  };
}

// ---------- payload mappers ----------

function toCreatePayload(req: CreateCategoryRequest) {
  const payload: Record<string, unknown> = {
    name: req.name.trim(),
    slug: req.slug.trim(),
    description: (req.description ?? "").trim(),
  };
  if (req.iconUrl && req.iconUrl.trim()) payload.iconUrl = req.iconUrl.trim();
  if (req.color) payload.color = req.color;
  if (req.parentId) payload.parentId = req.parentId;
  if (typeof req.sortOrder === "number") payload.sortOrder = req.sortOrder;
  if (req.metadata) payload.metadata = req.metadata;
  return payload;
}

function toUpdatePayload(req: UpdateCategoryRequest) {
  const out: Record<string, unknown> = {};
  if (req.name !== undefined) out.name = req.name.trim();
  if (req.slug !== undefined) out.slug = req.slug.trim();
  if (req.description !== undefined) out.description = req.description.trim();
  if (req.iconUrl !== undefined) out.iconUrl = req.iconUrl?.trim() || null;
  if (req.color !== undefined) out.color = req.color;
  if (req.parentId !== undefined) out.parentId = req.parentId; // null = top-level
  if (req.sortOrder !== undefined) out.sortOrder = req.sortOrder;
  if (req.metadata !== undefined) out.metadata = req.metadata;
  if (req.status !== undefined) out.status = req.status;
  return out;
}

// ---------- service ----------

export interface GetCategoriesParams {
  search?: string;
  status?: CategoryStatus | "all";
  parentId?: string | null;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/** Aggregate stats client-side from the tree (backend has no /stats endpoint). */
function computeStats(tree: Category[]): CategoryStats {
  let total = 0;
  let active = 0;
  let courses = 0;
  let students = 0;

  const walk = (nodes: Category[]) => {
    for (const n of nodes) {
      total += 1;
      if (n.status === "active" || n.isActive) active += 1;
      courses += n.totalCourses ?? n.courseCount ?? 0;
      students += n.totalStudents ?? n.studentCount ?? 0;
      if (n.subcategories?.length) walk(n.subcategories);
    }
  };
  walk(tree);

  return {
    totalCategories: total,
    activeCategories: active,
    totalCourses: courses,
    totalStudents: students,
  };
}

/** Group a flat list into a parent→children tree using parentId. */
function buildTree(flat: Category[]): Category[] {
  const byId = new Map<string, Category>();
  flat.forEach((c) => byId.set(c.id, { ...c, subcategories: [] }));
  const roots: Category[] = [];
  byId.forEach((node) => {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.subcategories!.push(node);
    } else {
      roots.push(node);
    }
  });
  // Sort by sortOrder then name
  const sortRec = (list: Category[]) => {
    list.sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    );
    list.forEach((n) => n.subcategories && sortRec(n.subcategories));
  };
  sortRec(roots);
  return roots;
}

export const categoriesService = {
  /** Flat list from summary or default categories endpoint */
  async getCategories(
    params: GetCategoriesParams = {},
  ): Promise<ApiResponse<Category[]>> {
    const query: Record<string, string | number> = {};
    if (params.search?.trim()) query.search = params.search.trim();
    if (params.status && params.status !== "all") query.status = params.status;
    if (params.parentId !== undefined && params.parentId !== null)
      query.parentId = params.parentId;
    if (params.page) query.page = params.page;
    if (params.limit) query.limit = params.limit;
    if (params.sortBy) query.sortBy = params.sortBy;
    if (params.sortOrder) query.sortOrder = params.sortOrder;

    try {
      const raw = await apiClient.get<unknown>(`${BASE}/summary`, {
        params: query,
      });
      const res = toApiResponse<unknown>(raw);
      const list = pickArray(res.data).map(normalizeCategory);
      if (list.length > 0) {
        return {
          success: res.success,
          data: list,
          message: res.message,
          meta: res.meta,
        };
      }
    } catch {
      // fallback to standard /categories
    }

    const raw = await apiClient.get<unknown>(BASE, { params: query });
    const res = toApiResponse<unknown>(raw);
    const list = pickArray(res.data).map(normalizeCategory);
    return {
      success: res.success,
      data: list,
      message: res.message,
      meta: res.meta,
    };
  },

  /** Direct summary list with course and student counts */
  async getCategoriesSummary(): Promise<ApiResponse<Category[]>> {
    try {
      const raw = await apiClient.get<unknown>(`${BASE}/summary`);
      const res = toApiResponse<unknown>(raw);
      const list = pickArray(res.data).map(normalizeCategory);
      return {
        success: res.success,
        data: list,
        message: res.message,
        meta: res.meta,
      };
    } catch {
      return this.getCategories({ limit: 500 });
    }
  },

  /**
   * Tree view: parents with `subcategories` nested.
   * Prioritizes /summary data for accurate totalCourses and totalStudents.
   */
  async getCategoryTree(): Promise<ApiResponse<Category[]>> {
    try {
      const summaryRes = await this.getCategoriesSummary();
      if (summaryRes.data && summaryRes.data.length > 0) {
        return {
          ...summaryRes,
          data: buildTree(summaryRes.data),
        };
      }
    } catch {
      // fall through
    }

    try {
      const raw = await apiClient.get<unknown>(`${BASE}/tree`);
      const res = toApiResponse<unknown>(raw);
      const nodes = pickArray(res.data).map(normalizeCategory);
      if (nodes.length) {
        return {
          success: res.success,
          data: nodes,
          message: res.message,
          meta: res.meta,
        };
      }
    } catch {
      // fall through to flat list
    }
    const flat = await this.getCategories({ limit: 500 });
    return { ...flat, data: buildTree(flat.data) };
  },

  async getCategoryById(id: string): Promise<ApiResponse<Category>> {
    const raw = await apiClient.get<unknown>(`${BASE}/${id}`);
    const res = toApiResponse<unknown>(raw);
    return { ...res, data: normalizeCategory(res.data) };
  },

  async getSubcategories(parentId: string): Promise<ApiResponse<Category[]>> {
    const raw = await apiClient.get<unknown>(`${BASE}/${parentId}/subcategories`);
    const res = toApiResponse<unknown>(raw);
    return {
      ...res,
      data: pickArray(res.data).map(normalizeCategory),
    };
  },

  /** Client-side aggregate — backend has no /stats endpoint. */
  async getCategoryStats(): Promise<ApiResponse<CategoryStats>> {
    const tree = await this.getCategoryTree();
    return {
      success: true,
      data: computeStats(tree.data),
      message: "",
    };
  },

  async createCategory(
    payload: CreateCategoryRequest,
  ): Promise<ApiResponse<Category>> {
    const raw = await apiClient.post<unknown>(BASE, toCreatePayload(payload));
    const res = toApiResponse<unknown>(raw, "Category created successfully");
    return { ...res, data: normalizeCategory(res.data) };
  },

  async updateCategory(
    id: string,
    payload: UpdateCategoryRequest,
  ): Promise<ApiResponse<Category>> {
    // Backend uses PUT for update.
    const raw = await apiClient.put<unknown>(
      `${BASE}/${id}`,
      toUpdatePayload(payload),
    );
    const res = toApiResponse<unknown>(raw, "Category updated successfully");
    return { ...res, data: normalizeCategory(res.data) };
  },

  async deleteCategory(id: string): Promise<ApiResponse<null>> {
    const raw = await apiClient.delete<unknown>(`${BASE}/${id}`);
    const res = toApiResponse<null>(raw, "Category deleted successfully");
    return { ...res, data: null };
  },

  /** No dedicated /status endpoint — piggyback on PUT. */
  async toggleCategoryStatus(
    id: string,
    status: CategoryStatus,
  ): Promise<ApiResponse<Category>> {
    return this.updateCategory(id, { status });
  },
};

export default categoriesService;
