// ============================================================
// src/services/instructor-dashboard.service.ts
// Instructor Dashboard API layer.
// Single source of truth: GET /instructor/dashboard
// Uses the shared apiClient (fetch + JWT from localStorage).
// ============================================================
import { apiClient } from "@/lib/api-client";

function unwrapData<T>(response: unknown): T {
  if (response && typeof response === "object" && !Array.isArray(response)) {
    const obj = response as Record<string, unknown>;
    if ("data" in obj) return obj.data as T;
  }
  return response as T;
}

// ---------- Types ----------
export interface InstructorDashboardStats {
  totalStudents: number;
  totalCourses: number;
  totalRevenue: number;
  averageRating: number;
  liveClasses: number;
}

export type LiveSessionStatus = "Upcoming" | "Live" | "Completed";

export interface LiveSession {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  description?: string;
  date: string; // yyyy-MM-dd
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  enrolledCount: number;
  status: LiveSessionStatus;
}

export interface CreateLiveSessionPayload {
  title: string;
  courseId: string;
  date: string;
  startTime: string;
  endTime: string;
  description?: string;
}

export interface EnrollmentCompletionPoint {
  label: string;
  enrollments: number;
  completions: number;
}

export interface CoursePerformancePoint {
  courseId: string;
  courseName: string;
  score: number; // completion rate %
  enrolledCount: number;
  avgRating: number;
}

export type StudentActivityType =
  | "assignment_submitted"
  | "module_completed"
  | "enrolled";

export interface RecentStudentActivity {
  id: string;
  studentId: string;
  studentName: string;
  type: StudentActivityType;
  detail: string;
  courseName: string;
  createdAt: string;
}

export interface PendingQuestion {
  id: string;
  studentId: string;
  studentName: string;
  question: string;
  courseId: string;
  courseName: string;
  tag: string;
  createdAt: string;
  isAnswered?: boolean;
}

/** Everything the dashboard page renders, from one endpoint. */
export interface InstructorDashboardData {
  stats: InstructorDashboardStats;
  enrollmentTrend: EnrollmentCompletionPoint[];
  coursePerformance: CoursePerformancePoint[];
  recentActivity: RecentStudentActivity[];
  pendingQuestions: PendingQuestion[];
  totalPendingQnA: number;
}

// ---------- Helpers ----------
const num = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const str = (value: unknown, fallback = "") =>
  value === undefined || value === null ? fallback : String(value);

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

/** Spring LocalDateTime ("2026-08-04T16:26:34.293125") has no zone — treat as local. */
function safeIso(value: unknown): string {
  const raw = str(value);
  if (!raw) return "";
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

/** Backend may send "UPCOMING" / "LIVE" / "COMPLETED" / "IN_PROGRESS". */
function normalizeStatus(value: unknown): LiveSessionStatus {
  const raw = str(value).toUpperCase();
  if (raw === "LIVE" || raw === "IN_PROGRESS" || raw === "ONGOING") return "Live";
  if (raw === "COMPLETED" || raw === "ENDED" || raw === "FINISHED") return "Completed";
  return "Upcoming";
}

/** Accepts "2026-08-05T15:00:00" or "15:00:00" or "15:00". */
function toTime(value: unknown, fallback = "00:00"): string {
  const raw = str(value);
  if (!raw) return fallback;
  const match = raw.match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : fallback;
}

function toDate(value: unknown): string {
  const raw = str(value);
  if (!raw) return new Date().toISOString().slice(0, 10);
  const match = raw.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString().slice(0, 10)
    : parsed.toISOString().slice(0, 10);
}

function normalizeSession(raw: any): LiveSession {
  const source = raw ?? {};
  return {
    id: str(source.id ?? source.sessionId ?? source.liveSessionId),
    title: str(source.title ?? source.name, "Live Session"),
    courseId: str(source.courseId ?? source.course?.id),
    courseName: str(
      source.courseName ?? source.course?.title ?? source.course?.name,
      "Course",
    ),
    description: source.description ?? undefined,
    date: toDate(source.date ?? source.sessionDate ?? source.startAt ?? source.startDateTime),
    startTime: toTime(source.startTime ?? source.startAt ?? source.startDateTime),
    endTime: toTime(source.endTime ?? source.endAt ?? source.endDateTime),
    enrolledCount: num(source.enrolledCount ?? source.enrolled ?? source.attendeesCount),
    status: normalizeStatus(source.status),
  };
}

// ---------- Dashboard mappers (single endpoint payload) ----------
function mapStats(source: any): InstructorDashboardStats {
  return {
    totalStudents: num(source?.totalStudents),
    totalCourses: num(source?.totalCourses),
    totalRevenue: num(source?.totalRevenue),
    averageRating: num(source?.avgRating ?? source?.averageRating),
    liveClasses: num(source?.liveClasses ?? source?.totalLiveClasses),
  };
}

function mapTrend(raw: any): EnrollmentCompletionPoint {
  const source = raw ?? {};
  return {
    label: str(
      source.dayLabel ??
        source.label ??
        source.day ??
        source.date ??
        source.month ??
        source.week ??
        source.period ??
        source.name ??
        source.x ??
        "",
    ),
    enrollments: num(
      source.enrolledCount ??
        source.enrollments ??
        source.enrollmentCount ??
        source.totalEnrollments ??
        source.enrolled ??
        source.students ??
        source.count ??
        0,
    ),
    completions: num(
      source.completedCount ??
        source.completions ??
        source.completionCount ??
        source.totalCompletions ??
        source.completed ??
        source.finishers ??
        0,
    ),
  };
}

export function extractTrendArray(source: any, period: string = "weekly"): any[] {
  if (!source) return [];
  if (Array.isArray(source)) return source;

  const pLower = (period || "weekly").toLowerCase();

  // 1. If source.enrollmentTrend (or enrollmentTrends / trend) is an object containing { weekly: [...], monthly: [...], yearly: [...] }
  const trendObj =
    source.enrollmentTrend ?? source.enrollmentTrends ?? source.enrollmentsTrend ?? source.trend;
  if (trendObj && typeof trendObj === "object" && !Array.isArray(trendObj)) {
    if (Array.isArray(trendObj[pLower])) return trendObj[pLower];
    if (pLower === "weekly" && Array.isArray(trendObj.weekly)) return trendObj.weekly;
    if (pLower === "monthly" && Array.isArray(trendObj.monthly)) return trendObj.monthly;
    if (pLower === "yearly" && Array.isArray(trendObj.yearly)) return trendObj.yearly;
  }

  // 2. If source.enrollmentTrend is an array directly
  if (Array.isArray(trendObj)) return trendObj;

  // 3. If source has top-level property matching period e.g. source.weekly, source.weeklyTrend
  if (Array.isArray(source[pLower])) return source[pLower];
  if (Array.isArray(source[`${pLower}Trend`])) return source[`${pLower}Trend`];

  // 4. Fallback checks for weekly / monthly / yearly arrays
  if (pLower === "weekly" && Array.isArray(source.weekly)) return source.weekly;
  if (pLower === "monthly" && Array.isArray(source.monthly)) return source.monthly;
  if (pLower === "yearly" && Array.isArray(source.yearly)) return source.yearly;

  // 5. If source has a data wrapper property
  if (source.data) return extractTrendArray(source.data, period);

  return [];
}

export function parseEnrollmentTrend(
  source: any,
  period: string = "weekly",
): EnrollmentCompletionPoint[] {
  return extractTrendArray(source, period).map(mapTrend);
}

function mapPerformance(raw: any): CoursePerformancePoint {
  const source = raw ?? {};
  return {
    courseId: str(source.courseId ?? source.id),
    courseName: str(source.title ?? source.courseName ?? source.name, "Course"),
    score: num(source.completionRatePercent ?? source.completionRate ?? source.score),
    enrolledCount: num(source.enrolledCount),
    avgRating: num(source.avgRating),
  };
}

function mapActivityType(value: unknown): StudentActivityType {
  const raw = str(value).toUpperCase();
  if (raw.includes("ASSIGNMENT")) return "assignment_submitted";
  if (raw.includes("MODULE") || raw.includes("COMPLET")) return "module_completed";
  return "enrolled";
}

function mapActivity(raw: any): RecentStudentActivity {
  const source = raw ?? {};
  return {
    id: str(source.id ?? source.activityId ?? source.enrollmentId, uid()),
    studentId: str(source.studentId ?? source.userId),
    studentName: str(source.studentName ?? source.name ?? source.fullName, "Student"),
    type: mapActivityType(source.activityType ?? source.type ?? source.action),
    detail: str(source.detail ?? source.description ?? source.lessonTitle ?? source.title),
    courseName: str(source.courseTitle ?? source.courseName, "Course"),
    createdAt: safeIso(source.activityAt ?? source.createdAt ?? source.occurredAt),
  };
}

function mapQuestion(raw: any): PendingQuestion {
  const source = raw ?? {};
  const replies = Array.isArray(source.replies)
    ? source.replies
    : Array.isArray(source.answers)
    ? source.answers
    : [];
  const isAnswered =
    source.isAnswered === true ||
    source.answered === true ||
    str(source.status).toUpperCase() === "ANSWERED" ||
    replies.some((r: any) => {
      const role = String(r.authorRole ?? r.role ?? r.type ?? "").toUpperCase();
      return role.includes("INSTRUCT") || role.includes("TEACHER") || Boolean(r.isInstructor);
    });

  return {
    id: str(source.discussionId ?? source.id ?? source.questionId, uid()),
    studentId: str(source.studentId ?? source.userId),
    studentName: str(source.studentName ?? source.name, "Student"),
    question: str(source.question ?? source.text ?? source.title ?? source.body),
    courseId: str(source.courseId),
    courseName: str(source.courseTitle ?? source.courseName, "Course"),
    tag: str(source.tag ?? source.topic ?? source.category, "Pending"),
    createdAt: safeIso(source.askedAt ?? source.createdAt),
    isAnswered,
  };
}

function mapDashboard(raw: any, period: string = "weekly"): InstructorDashboardData {
  const source = raw ?? {};
  const pending = source.pendingQnA ?? source.pendingQna ?? {};
  const pendingItems = Array.isArray(pending.items) ? pending.items : [];
  const trendList = extractTrendArray(source, period);

  return {
    stats: mapStats(source),
    enrollmentTrend: trendList.map(mapTrend),
    rawEnrollmentTrend: source.enrollmentTrend ?? source.enrollmentTrends ?? source.trend ?? source,
    coursePerformance: (Array.isArray(source.coursePerformance)
      ? source.coursePerformance
      : []
    ).map(mapPerformance),
    recentActivity: (Array.isArray(source.recentStudentActivity)
      ? source.recentStudentActivity
      : []
    ).map(mapActivity),
    pendingQuestions: pendingItems.map(mapQuestion),
    totalPendingQnA: num(pending.totalPending ?? pendingItems.length),
  };
}

// ---------- API methods ----------
export const instructorDashboardService = {
  /** The one and only dashboard endpoint: GET /api/instructor/dashboard */
  async getDashboard(period?: string): Promise<InstructorDashboardData> {
    const response = await apiClient.get<unknown>("/instructor/dashboard", {
      params: period ? { period } : undefined,
    });
    return mapDashboard(unwrapData<any>(response), period);
  },

  /** Dedicated fetch for Enrollment & Completion Trend by period ("weekly" | "monthly" | "yearly") */
  async getEnrollmentTrend(period: string): Promise<EnrollmentCompletionPoint[]> {
    try {
      const response = await apiClient.get<unknown>("/instructor/dashboard", {
        params: { period },
      });
      const data = unwrapData<any>(response);
      const trendPoints = parseEnrollmentTrend(data, period);
      if (trendPoints.length > 0) {
        return trendPoints;
      }
    } catch {
      try {
        const altResponse = await apiClient.get<unknown>("/instructor/analytics", {
          params: { period },
        });
        const altData = unwrapData<any>(altResponse);
        const altPoints = parseEnrollmentTrend(altData, period);
        if (altPoints.length > 0) {
          return altPoints;
        }
      } catch {
        /* ignore error fallback */
      }
    }
    return [];
  },

  // ----- Live sessions (separate feature, unchanged) -----
  async scheduleLiveSession(payload: CreateLiveSessionPayload): Promise<LiveSession> {
    const response = await apiClient.post<unknown>("/instructor/live-sessions", payload);
    return normalizeSession(unwrapData<any>(response));
  },

  async updateLiveSession(
    id: string,
    payload: Partial<CreateLiveSessionPayload>,
  ): Promise<LiveSession> {
    const response = await apiClient.patch<unknown>(`/instructor/live-sessions/${id}`, payload);
    return normalizeSession(unwrapData<any>(response));
  },

  async startLiveSession(id: string): Promise<LiveSession> {
    const response = await apiClient.post<unknown>(`/instructor/live-sessions/${id}/start`, {});
    return normalizeSession(unwrapData<any>(response));
  },
};

export default instructorDashboardService;
