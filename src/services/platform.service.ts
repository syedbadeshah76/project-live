// ============================================================
// src/services/platform.service.ts
// Admin Dashboard API layer (Spring Boot)
//   GET    /admin/dashboard?from=...&to=...
//   PATCH  /admin/users/instructors/{userId}/approve (via authService)
//   PATCH  /admin/users/instructors/{userId}/reject (via authService)
//   GET    /admin/meetings   (optional, safe-fallback)
// Uses shared apiClient (fetch + JWT from localStorage).
// ============================================================
import { apiClient, unwrapData, unwrapArray } from "@/lib/api-client";
import { authService } from "./auth.service";

/* ---------------- Raw backend shapes ---------------- */

export type BackendRole = "STUDENT" | "INSTRUCTOR" | "ADMIN" | string;

export interface RawRecentActivity {
  type: string;
  userId: string;
  userName: string;
  userRole: BackendRole;
  courseId: string | null;
  courseTitle: string | null;
  description: string;
  occurredAt: string;
}

export interface RawPendingApproval {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  requestedAt: string;
}

export interface RawSignup {
  userId: string;
  fullName: string;
  role: BackendRole;
  createdAt: string;
}

export interface RawNewSignups {
  count: number;
  studentCount: number;
  instructorCount: number;
  signups: RawSignup[];
}

export interface RawPerformanceMetrics {
  platformUptime: { value: number; percentage: number };
  courseCompletionRate: { value: number; percentage: number };
  studentRatings: { value: number; maxRating: number };
  instructorRatings: { value: number; maxRating: number };
}

export interface RawAdminDashboard {
  from: string;
  to: string;
  totalStudents: number;
  totalInstructors: number;
  activeCourses: number;
  totalEnrollments: number;
  totalRevenue?: number;
  recentActivity: RawRecentActivity[];
  pendingApprovals: RawPendingApproval[];
  newSignups: RawNewSignups;
  performanceMetrics: RawPerformanceMetrics;
}

/* ---------------- UI shapes ---------------- */

export type UiRole = "student" | "instructor" | "admin";

export interface PlatformOverview {
  totalStudents: number;
  totalInstructors: number;
  totalCourses: number;
  totalEnrollments: number;
  totalRevenue: number;
  studentsChangePct: number;
  instructorsChangePct: number;
  coursesChangePct: number;
  enrollmentsChangePct: number;
  revenueChangePct: number;
}

export interface RecentActivity {
  id: string;
  userName: string;
  userInitials: string;
  role: UiRole;
  action: string;
  createdAt: string;
}

export interface PerformanceMetrics {
  platformUptimePct: number;
  courseCompletionPct: number;
  studentRating: number;
  instructorRating: number;
}

export interface PendingApproval {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  requestedAt: string;
}

export interface NewSignup {
  id: string;
  name: string;
  initials: string;
  role: UiRole;
  joinedAt: string;
}

export interface SignupSummary {
  count: number;
  studentCount: number;
  instructorCount: number;
}

export interface AdminDashboardVm {
  range: string;
  overview: PlatformOverview;
  activity: RecentActivity[];
  metrics: PerformanceMetrics;
  approvals: PendingApproval[];
  signups: NewSignup[];
  signupSummary: SignupSummary;
}

export interface AdminMeeting {
  id: string;
  title: string;
  date: string;
  startTime: string;
  status: string;
}

/* ---------------- Helpers ---------------- */

export const normalizeRole = (role: string): UiRole => {
  const r = String(role || "").trim().toLowerCase();
  if (r === "instructor") return "instructor";
  if (r === "admin") return "admin";
  return "student";
};

export const initialsOf = (name: string) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .map((p) => p[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

export function timeAgo(iso: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Math.max(0, Date.now() - then);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk} week${wk === 1 ? "" : "s"} ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? "" : "s"} ago`;
  return `${Math.floor(day / 365)} year(s) ago`;
}

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
};

const qs = (params: Record<string, string | number | undefined | null>) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.append(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
};

/* ---------------- Mapper ---------------- */

function mapDashboard(raw: RawAdminDashboard): AdminDashboardVm {
  const pm = raw.performanceMetrics ?? ({} as RawPerformanceMetrics);
  const ns = raw.newSignups ?? { count: 0, studentCount: 0, instructorCount: 0, signups: [] };

  return {
    range: raw.from && raw.to ? `${fmtDate(raw.from)} - ${fmtDate(raw.to)}` : "",
    overview: {
      totalStudents: Number(raw.totalStudents || 0),
      totalInstructors: Number(raw.totalInstructors || 0),
      totalCourses: Number(raw.activeCourses || 0),
      totalEnrollments: Number(raw.totalEnrollments || 0),
      totalRevenue: Number(raw.totalRevenue || 0),
      studentsChangePct: 0,
      instructorsChangePct: 0,
      coursesChangePct: 0,
      enrollmentsChangePct: 0,
      revenueChangePct: 0,
    },
    activity: (raw.recentActivity ?? []).map((item) => ({
      id: `${item.userId}-${item.occurredAt}-${item.type}`,
      userName: item.userName,
      userInitials: initialsOf(item.userName),
      role: normalizeRole(item.userRole),
      action: item.description,
      createdAt: item.occurredAt,
    })),
    metrics: {
      platformUptimePct: Number(Number(pm.platformUptime?.percentage ?? 0).toFixed(2)),
      courseCompletionPct: Number(Number(pm.courseCompletionRate?.percentage ?? 0).toFixed(2)),
      studentRating: Number(Number(pm.studentRatings?.value ?? 0).toFixed(2)),
      instructorRating: Number(Number(pm.instructorRatings?.value ?? 0).toFixed(2)),
    },
    approvals: (raw.pendingApprovals ?? []).map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      subtitle: a.subtitle,
      requestedAt: a.requestedAt,
    })),
    signups: (ns.signups ?? []).map((s) => ({
      id: s.userId,
      name: s.fullName?.trim() || "Unknown",
      initials: initialsOf(s.fullName),
      role: normalizeRole(s.role),
      joinedAt: s.createdAt,
    })),
    signupSummary: {
      count: Number(ns.count || 0),
      studentCount: Number(ns.studentCount || 0),
      instructorCount: Number(ns.instructorCount || 0),
    },
  };
}

/* ---------------- Service ---------------- */

export const platformService = {
  /** GET /admin/dashboard?from&to — returns mapped, UI-ready data. */
  async getDashboard(from?: string, to?: string): Promise<AdminDashboardVm> {
    const response = await apiClient.get<unknown>(`/admin/dashboard${qs({ from, to })}`);
    const raw = unwrapData<RawAdminDashboard>(response);
    return mapDashboard(raw);
  },

  /** GET /admin/dashboard raw (if you need untouched backend payload). */
  async getDashboardRaw(from?: string, to?: string): Promise<RawAdminDashboard> {
    const response = await apiClient.get<unknown>(`/admin/dashboard${qs({ from, to })}`);
    return unwrapData<RawAdminDashboard>(response);
  },

  /** Upcoming admin meetings — non-blocking, returns [] if endpoint is absent. */
  async getUpcomingMeetings(limit = 3): Promise<AdminMeeting[]> {
    try {
      const response = await apiClient.get<unknown>("/admin/meetings");
      return unwrapArray<any>(response)
        .map((m) => ({
          id: String(m.id ?? m.meetingId ?? ""),
          title: m.title ?? m.name ?? "Meeting",
          date: m.date ?? m.startDate ?? m.scheduledAt ?? "",
          startTime: m.startTime ?? m.time ?? "",
          status: String(m.status ?? "").toLowerCase(),
        }))
        .filter((m) => m.id && (m.status === "approved" || m.status === "pending" || !m.status))
        .slice(0, limit);
    } catch {
      return [];
    }
  },

  /**
   * @deprecated Use authService.approveInstructor instead.
   * Redirects to PATCH /admin/users/instructors/{userId}/approve via authService.
   */
  async approveInstructor(instructorId: string) {
    return authService.approveInstructor(instructorId);
  },

  /**
   * @deprecated Use authService.rejectInstructor instead.
   * Redirects to PATCH /admin/users/instructors/{userId}/reject via authService.
   */
  async rejectInstructor(instructorId: string, reason?: string) {
    return authService.rejectInstructor(
      instructorId,
      reason || "Application rejected",
    );
  },
};

export default platformService;
