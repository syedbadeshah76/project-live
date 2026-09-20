// src/services/admin-students.service.ts
// ============= Admin Student Monitoring Service =============
// Backend contract (Java Spring Boot, via API gateway):
//   GET    /api/admin/students?page=0&size=20&search=&status=
//   GET    /api/admin/students/{studentId}
//   PATCH  /api/admin/students/{studentId}          body: { status: "ACTIVE" | "INACTIVE" | "SUSPENDED" }
// Auth: Bearer <admin_auth_token> (attached by apiClient)
// ============================================================
import { apiClient } from "@/lib/api-client";

/* ---------------- UI-facing types ---------------- */

export type StudentStatus = "Active" | "Inactive" | "Suspended";
export type BackendStudentStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface AdminStudentRow {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  coursesCount: number;
  /** 0-100, average across all enrolled courses */
  overallProgress: number;
  /** ISO date the student signed up on the platform */
  joinedDate: string;
  status: StudentStatus;
  completedCourses?: number;
  totalSpent?: number;
}

export interface AdminStudentDetail extends AdminStudentRow {
  phone?: string;
  enrolledCourses: { id: string; title: string; progress: number }[];
}

export interface ListStudentsParams {
  search?: string;
  status?: "all" | StudentStatus;
  joinedFrom?: string; // ISO date (client-side filter)
  joinedTo?: string;   // ISO date (client-side filter)
  sortBy?: "joinedDate" | "progress" | "name";
  sortDir?: "asc" | "desc";
  page?: number;
  size?: number;
}

export interface ListStudentsResult {
  data: AdminStudentRow[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

/* ---------------- Raw backend shapes ---------------- */

interface RawEnrolledCourse {
  id?: string | number;
  courseId?: string | number;
  courseTitle?: string;
  title?: string;
  name?: string;
  progress?: number;
  progressPercentage?: number;
  completionPercentage?: number;
}

interface RawStudent {
  id?: string | number;
  userId?: string | number;
  studentId?: string | number;
  name?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  mobile?: string;
  avatar?: string;
  avatarUrl?: string;
  profileImage?: string;
  profilePicture?: string;
  status?: string;
  statusLabel?: string;
  active?: boolean;
  enabled?: boolean;

  coursesCount?: number;
  totalCourses?: number;
  enrolledCoursesCount?: number;
  courseCount?: number;

  completedCourses?: number;
  completedCoursesCount?: number;

  progressPercent?: number;
  overallProgress?: number;
  averageProgress?: number;
  progress?: number;

  totalSpent?: number;
  totalAmountSpent?: number;

  joinedDate?: string;
  joinedAt?: string;
  createdAt?: string;
  registeredAt?: string;
  createdDate?: string;

  enrolledCourses?: RawEnrolledCourse[] | number;
  courses?: RawEnrolledCourse[] | number;
}

/** Spring Data Page / ApiResponse envelope tolerant unwrap */
function unwrap<T = unknown>(res: unknown): T {
  if (res && typeof res === "object" && "data" in (res as Record<string, unknown>)) {
    const inner = (res as Record<string, unknown>).data;
    // Only unwrap ApiResponse-style envelopes, not Spring Page objects
    if (
      inner !== undefined &&
      !("content" in (res as Record<string, unknown>)) &&
      !("totalElements" in (res as Record<string, unknown>))
    ) {
      return inner as T;
    }
  }
  return res as T;
}

function pickArray(payload: unknown): RawStudent[] {
  if (Array.isArray(payload)) return payload as RawStudent[];
  if (payload && typeof payload === "object") {
    const o = payload as Record<string, unknown>;
    for (const key of ["content", "students", "items", "results", "data"]) {
      if (Array.isArray(o[key])) return o[key] as RawStudent[];
    }
  }
  return [];
}

function pickNumber(...values: (number | undefined)[]): number {
  for (const v of values) if (typeof v === "number" && !Number.isNaN(v)) return v;
  return 0;
}

/* ---------------- Mappers ---------------- */

export const toUiStatus = (raw?: string, active?: boolean): StudentStatus => {
  const s = (raw ?? "").toString().toUpperCase();
  if (s === "SUSPENDED" || s === "BLOCKED" || s === "BANNED") return "Suspended";
  if (s === "INACTIVE" || s === "DISABLED" || s === "DEACTIVATED") return "Inactive";
  if (s === "ACTIVE" || s === "ENABLED") return "Active";
  if (typeof active === "boolean") return active ? "Active" : "Inactive";
  return "Active";
};

export const toBackendStatus = (status: StudentStatus): BackendStudentStatus => {
  switch (status) {
    case "Suspended":
      return "SUSPENDED";
    case "Inactive":
      return "INACTIVE";
    default:
      return "ACTIVE";
  }
};

const toIsoDate = (value?: string): string => {
  if (!value) return new Date().toISOString().slice(0, 10);
  // Handles "2026-05-04", "2026-05-04T10:22:11", "2026-05-04T10:22:11.123Z"
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return value.slice(0, 10);
};

const fullName = (r: RawStudent): string => {
  const composed = [r.firstName, r.lastName].filter(Boolean).join(" ").trim();
  return (r.name || r.fullName || composed || r.email || "Unknown").trim();
};

const mapCourse = (c: RawEnrolledCourse, index: number) => ({
  id: String(c.id ?? c.courseId ?? index),
  title: c.courseTitle ?? c.title ?? c.name ?? "Untitled course",
  progress: Math.round(pickNumber(c.progress, c.progressPercentage, c.completionPercentage)),
});

const mapRow = (r: RawStudent): AdminStudentRow => {
  const rawCourses = Array.isArray(r.enrolledCourses)
    ? r.enrolledCourses
    : Array.isArray(r.courses)
    ? r.courses
    : [];
  const mapped = rawCourses.map(mapCourse);

  const enrolledCount =
    typeof r.enrolledCourses === "number"
      ? r.enrolledCourses
      : typeof r.courses === "number"
      ? r.courses
      : pickNumber(r.coursesCount, r.totalCourses, r.enrolledCoursesCount, r.courseCount) ||
        mapped.length;

  const overall =
    pickNumber(r.progressPercent, r.overallProgress, r.averageProgress, r.progress) ||
    (mapped.length
      ? Math.round(mapped.reduce((sum, c) => sum + c.progress, 0) / mapped.length)
      : 0);

  return {
    id: String(r.id ?? r.userId ?? r.studentId ?? ""),
    name: fullName(r),
    email: r.email ?? "",
    avatar: r.avatar ?? r.avatarUrl ?? r.profileImage ?? r.profilePicture,
    coursesCount: enrolledCount,
    overallProgress: Math.max(0, Math.min(100, Math.round(overall))),
    joinedDate: toIsoDate(r.joinedDate ?? r.joinedAt ?? r.createdAt ?? r.registeredAt ?? r.createdDate),
    status: toUiStatus(r.status ?? r.statusLabel, r.active ?? r.enabled),
    completedCourses: pickNumber(r.completedCourses, r.completedCoursesCount),
    totalSpent: pickNumber(r.totalSpent, r.totalAmountSpent),
  };
};

const mapDetail = (r: RawStudent): AdminStudentDetail => {
  const rawCourses = Array.isArray(r.enrolledCourses)
    ? r.enrolledCourses
    : Array.isArray(r.courses)
    ? r.courses
    : [];
  const courses = rawCourses.map(mapCourse);

  return {
    ...mapRow(r),
    phone: r.phone ?? r.phoneNumber ?? r.mobile,
    enrolledCourses: courses,
  };
};

/* ---------------- Service ---------------- */

export const adminStudentsService = {
  async listStudents(params: ListStudentsParams = {}): Promise<ListStudentsResult> {
    const page = params.page ?? 0;
    const size = params.size ?? 20;

    const query: Record<string, string | number> = { page, size };
    if (params.search?.trim()) query.search = params.search.trim();
    if (params.status && params.status !== "all") query.status = toBackendStatus(params.status);

    const res = await apiClient.get<unknown>("/admin/students", { params: query });
    const payload = unwrap(res);
    const rawRows = pickArray(payload);

    let rows = rawRows.map(mapRow).filter((r) => r.id);

    // Client-side refinements the endpoint does not support
    const q = params.search?.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q),
      );
    }
    if (params.status && params.status !== "all") {
      rows = rows.filter((s) => s.status === params.status);
    }
    if (params.joinedFrom) rows = rows.filter((s) => s.joinedDate >= params.joinedFrom!);
    if (params.joinedTo) rows = rows.filter((s) => s.joinedDate <= params.joinedTo!);

    if (params.sortBy) {
      const dir = params.sortDir === "desc" ? -1 : 1;
      const key = params.sortBy === "progress" ? "overallProgress" : params.sortBy;
      rows = [...rows].sort((a, b) => {
        const va = (a as unknown as Record<string, string | number>)[key] ?? "";
        const vb = (b as unknown as Record<string, string | number>)[key] ?? "";
        return va > vb ? dir : va < vb ? -dir : 0;
      });
    }

    const meta = (payload ?? {}) as Record<string, unknown>;
    const total =
      typeof meta.totalElements === "number"
        ? (meta.totalElements as number)
        : typeof meta.total === "number"
          ? (meta.total as number)
          : rows.length;
    const totalPages =
      typeof meta.totalPages === "number" ? (meta.totalPages as number) : Math.max(1, Math.ceil(total / size));

    return { data: rows, total, page, size, totalPages };
  },

  async getStudent(id: string): Promise<AdminStudentDetail | undefined> {
    if (!id) return undefined;
    const res = await apiClient.get<unknown>(`/admin/students/${id}`);
    const payload = unwrap<RawStudent>(res);
    if (!payload || typeof payload !== "object") return undefined;
    return mapDetail(payload);
  },

  /** PATCH /api/admin/students/{id}  body: { status: "ACTIVE" | "INACTIVE" | "SUSPENDED" } */
  async updateStatus(id: string, status: StudentStatus): Promise<AdminStudentDetail | undefined> {
    const res = await apiClient.patch<unknown>(`/admin/students/${id}`, {
      status: toBackendStatus(status),
    });
    const payload = unwrap<RawStudent>(res);
    if (payload && typeof payload === "object" && (payload.id || payload.email)) {
      return mapDetail(payload);
    }
    return this.getStudent(id);
  },
};
