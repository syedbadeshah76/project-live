// ============= Admin Users Service =============
// Backend-ready CRUD service for managing platform users.
//
// Java Spring Boot gateway endpoints (per API collection):
//   GET    /api/admin/users?page=0&size=20        -> Page<UserResponse>
//   GET    /api/admin/users/{userId}              -> UserResponse
//   POST   /api/admin/users                       -> UserResponse
//          body: { firstName, lastName, email, password, role, status, sendInvitation }
//   PUT    /api/admin/users/{userId}              -> UserResponse (role / profile update)
//   PATCH  /api/admin/users/{userId}/role         -> UserResponse { role }
//   PATCH  /api/admin/users/{userId}/status       -> UserResponse { status }
//   DELETE /api/admin/users/{userId}              -> void
//
// Required headers (handled here):
//   Authorization: Bearer <admin_token>
//   X-User-Id: <acting admin user id>
//   Content-Type: application/json

import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api.types";

/* ---------------- Domain types (UI) ---------------- */

export type AdminUserRole = "admin" | "instructor" | "student";
export type AdminUserStatus = string;

export interface AdminUser {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  role: AdminUserRole;
  status: string; // Exact backend status string (ACTIVE, INACTIVE, PENDING_APPROVAL, REJECTED, etc.)
  statusLabel?: string;
  coursesCount: number;
  joinedDate: string; // ISO
  avatarUrl?: string;
}

export interface CreateAdminUserDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: AdminUserRole;
  status: string;
  sendInvitation: boolean;
}

export interface UpdateAdminUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: AdminUserRole;
  status?: string;
}

export interface ListUsersParams {
  search?: string;
  role?: AdminUserRole | "all";
  status?: string;
  page?: number;
  size?: number;
}

export interface PagedUsers {
  items: AdminUser[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/* ---------------- Backend DTO shape ---------------- */

interface BackendUser {
  id?: string | number;
  userId?: string | number;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;
  email: string;
  role?: string;
  roles?: string[];
  status?: string;
  statusLabel?: string;
  userStatus?: string;
  coursesCount?: number;
  totalCourses?: number;
  createdAt?: string;
  joinedDate?: string;
  avatarUrl?: string;
}

interface SpringPage<T> {
  content: T[];
  number?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
}

/* ---------------- Helpers ---------------- */

const TOKEN_KEY = "admin_token";
const USER_ID_KEY = "user_id";

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const headers: Record<string, string> = {};
  const token = window.localStorage.getItem(TOKEN_KEY);
  const userId = window.localStorage.getItem(USER_ID_KEY);
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (userId) headers["X-User-Id"] = userId;
  return headers;
}

const initials = (name: string) =>
  (name || "")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export const splitName = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") || "-" };
};

const toRole = (value?: string): AdminUserRole => {
  const v = (value ?? "").toUpperCase();
  if (v.includes("ADMIN")) return "admin";
  if (v.includes("INSTRUCTOR") || v.includes("TEACHER")) return "instructor";
  return "student";
};

/** Backend expects uppercase enum values. */
export const toBackendRole = (role: AdminUserRole) => role.toUpperCase();
export const toBackendStatus = (status: string) => status.toUpperCase();

function mapUser(raw: BackendUser): AdminUser {
  const firstName = raw.firstName ?? (raw.fullName ?? raw.name ?? "").split(" ")[0] ?? "";
  const lastName =
    raw.lastName ?? (raw.fullName ?? raw.name ?? "").split(" ").slice(1).join(" ") ?? "";
  const name = (raw.fullName ?? raw.name ?? `${firstName} ${lastName}`).trim() || raw.email;
  const status = String(raw.status ?? raw.userStatus ?? "ACTIVE").toUpperCase();

  return {
    id: String(raw.id ?? raw.userId ?? ""),
    name,
    firstName,
    lastName,
    email: raw.email,
    role: toRole(raw.role ?? raw.roles?.[0]),
    status,
    statusLabel: raw.statusLabel,
    coursesCount: raw.coursesCount ?? raw.totalCourses ?? 0,
    joinedDate: raw.createdAt ?? raw.joinedDate ?? new Date().toISOString(),
    avatarUrl: raw.avatarUrl,
  };
}

/** Backend may answer with a bare payload, a Page, or an ApiResponse wrapper. */
function unwrap<T>(payload: unknown): T {
  const p = payload as { data?: T } | T;
  if (p && typeof p === "object" && "data" in (p as Record<string, unknown>)) {
    return (p as { data: T }).data;
  }
  return p as T;
}

/* ---------------- Service ---------------- */

export const adminUsersService = {
  /**
   * GET /api/admin/users?page=0&size=20
   */
  async list(params: ListUsersParams = {}): Promise<ApiResponse<AdminUser[]> & { meta: PagedUsers }> {
    const page = params.page ?? 0;
    const size = params.size ?? 20;

    const raw = await apiClient.get<unknown>("/admin/users", {
      params: {
        page,
        size,
        search: params.search || undefined,
        role: params.role && params.role !== "all" ? toBackendRole(params.role) : undefined,
        status: params.status && params.status !== "all" ? toBackendStatus(params.status) : undefined,
      },
      headers: authHeaders(),
    });

    const body = unwrap<SpringPage<BackendUser> | BackendUser[]>(raw);
    const content = Array.isArray(body) ? body : (body?.content ?? []);
    let items = content.map(mapUser);

    if (params.search) {
      const s = params.search.toLowerCase();
      items = items.filter(
        (u) => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s),
      );
    }
    if (params.role && params.role !== "all") items = items.filter((u) => u.role === params.role);
    if (params.status && params.status !== "all") {
      const target = params.status.toUpperCase();
      items = items.filter((u) => u.status.toUpperCase() === target);
    }

    const meta: PagedUsers = {
      items,
      page: Array.isArray(body) ? page : (body?.number ?? page),
      size: Array.isArray(body) ? items.length : (body?.size ?? size),
      totalElements: Array.isArray(body) ? items.length : (body?.totalElements ?? items.length),
      totalPages: Array.isArray(body) ? 1 : (body?.totalPages ?? 1),
    };

    return { success: true, data: items, meta };
  },

  /** GET /api/admin/users/{userId} */
  async getById(id: string): Promise<ApiResponse<AdminUser>> {
    const raw = await apiClient.get<unknown>(`/admin/users/${id}`, { headers: authHeaders() });
    return { success: true, data: mapUser(unwrap<BackendUser>(raw)) };
  },

  /**
   * POST /api/admin/users
   * body: { firstName, lastName, email, password, role, status, sendInvitation }
   */
  async create(dto: CreateAdminUserDto): Promise<ApiResponse<AdminUser>> {
    const raw = await apiClient.post<unknown>(
      "/admin/users",
      {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email: dto.email.trim(),
        password: dto.password,
        role: toBackendRole(dto.role),
        status: toBackendStatus(dto.status),
        sendInvitation: dto.sendInvitation,
      },
      { headers: authHeaders() },
    );
    return { success: true, data: mapUser(unwrap<BackendUser>(raw)) };
  },

  /** PUT /api/admin/users/{userId} */
  async update(id: string, dto: UpdateAdminUserDto): Promise<ApiResponse<AdminUser>> {
    const raw = await apiClient.put<unknown>(
      `/admin/users/${id}`,
      {
        ...(dto.firstName !== undefined ? { firstName: dto.firstName.trim() } : {}),
        ...(dto.lastName !== undefined ? { lastName: dto.lastName.trim() } : {}),
        ...(dto.email !== undefined ? { email: dto.email.trim() } : {}),
        ...(dto.role !== undefined ? { role: toBackendRole(dto.role) } : {}),
        ...(dto.status !== undefined ? { status: toBackendStatus(dto.status) } : {}),
      },
      { headers: authHeaders() },
    );
    return { success: true, data: mapUser(unwrap<BackendUser>(raw)) };
  },

  /** PATCH /api/admin/users/{userId}/role — role assignment */
  async assignRole(id: string, role: AdminUserRole): Promise<ApiResponse<AdminUser>> {
    const raw = await apiClient.patch<unknown>(
      `/admin/users/${id}/role`,
      { role: toBackendRole(role) },
      { headers: authHeaders() },
    );
    return { success: true, data: mapUser(unwrap<BackendUser>(raw)) };
  },

  /** PATCH /api/admin/users/{userId}/status */
  async updateStatus(id: string, status: AdminUserStatus): Promise<ApiResponse<AdminUser>> {
    const raw = await apiClient.patch<unknown>(
      `/admin/users/${id}/status`,
      { status: toBackendStatus(status) },
      { headers: authHeaders() },
    );
    return { success: true, data: mapUser(unwrap<BackendUser>(raw)) };
  },

  /** DELETE /api/admin/users/{userId} */
  async delete(id: string): Promise<ApiResponse<{ success: boolean }>> {
    await apiClient.delete<unknown>(`/admin/users/${id}`, { headers: authHeaders() });
    return { success: true, data: { success: true } };
  },

  initials,
};
