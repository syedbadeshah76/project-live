// src/services/invite-students.service.ts
// ============= Student Invitation Service =============
// Backend contract (Java Spring Boot, via API gateway):
//   POST /api/admin/invitations/single   body: { emails: string[], courseId: string|null, htmlBody: string }
//   POST /api/admin/invitations/bulk     body: { emails: string[], courseId: string|null, htmlBody: string }
//   POST /api/admin/invitations/csv      multipart: { file, courseId?, htmlBody }
//   GET  /api/invitations/validate/{token}   (public)
// Headers on admin writes: Authorization: Bearer <admin_auth_token>, X-User-Id: <admin id>
// Backend generates the invite token and appends the invite link to htmlBody.
// ======================================================
import { apiClient } from "@/lib/api-client";

export interface InviteResponse {
  success: boolean;
  message: string;
  invited?: number;
  failed?: string[];
}

export interface InvitationValidation {
  valid: boolean;
  email?: string;
  courseId?: string | null;
  invitedBy?: string;
  expiresAt?: string;
  message?: string;
}

/** Local-only scheduling helper (no backend schedule endpoint exists yet). */
export interface InviteSchedule {
  id: string;
  courseTitle: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  recipientsCount: number;
  status: "scheduled" | "sent" | "cancelled";
}

const SCHEDULES_KEY = "edvanz.invite.schedules";

/** Backend requires X-User-Id: <admin-id> on invitation writes */
function adminHeaders(): Record<string, string> {
  let userId = "";
  try {
    userId =
      localStorage.getItem("userId") ||
      localStorage.getItem("user_id") ||
      (JSON.parse(localStorage.getItem("user") || "{}")?.id ?? "") ||
      "";
  } catch {
    userId = "";
  }
  return userId ? { "X-User-Id": String(userId) } : {};
}

function unwrap<T = unknown>(res: unknown): T {
  if (res && typeof res === "object" && "data" in (res as Record<string, unknown>)) {
    const inner = (res as Record<string, unknown>).data;
    if (inner && typeof inner === "object") return inner as T;
  }
  return res as T;
}

function toInviteResponse(res: unknown, fallbackCount: number): InviteResponse {
  const r = (res ?? {}) as Record<string, unknown>;
  return {
    success: r.success !== false,
    message: (r.message as string) ?? "Invitation sent successfully",
    invited: typeof r.invited === "number" ? (r.invited as number) : fallbackCount,
    failed: Array.isArray(r.failedEmails)
      ? (r.failedEmails as string[])
      : Array.isArray(r.failed)
        ? (r.failed as string[])
        : undefined,
  };
}

function readSchedules(): InviteSchedule[] {
  try {
    const raw = localStorage.getItem(SCHEDULES_KEY);
    return raw ? (JSON.parse(raw) as InviteSchedule[]) : [];
  } catch {
    return [];
  }
}

function writeSchedules(list: InviteSchedule[]) {
  try {
    localStorage.setItem(SCHEDULES_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable — ignore */
  }
}

export const inviteStudentsService = {
  /** POST /api/admin/invitations/single */
  async sendSingle(payload: {
    email: string;
    courseId?: string | null;
    htmlMessage: string;
    subject?: string;
  }): Promise<InviteResponse> {
    const body = {
      emails: [payload.email.trim()],
      courseId: payload.courseId ?? null,
      htmlBody: payload.htmlMessage,
      ...(payload.subject ? { subject: payload.subject } : {}),
    };
    const res = await apiClient.post<unknown>("/admin/invitations/single", body, {
      headers: adminHeaders(),
    });
    return toInviteResponse(res, 1);
  },

  /** POST /api/admin/invitations/bulk */
  async sendBulk(payload: {
    emails: string[];
    courseId?: string | null;
    htmlMessage: string;
    subject?: string;
  }): Promise<InviteResponse> {
    const emails = payload.emails.map((e) => e.trim()).filter(Boolean);
    if (emails.length === 0) throw new Error("Add at least one email address.");
    const body = {
      emails,
      courseId: payload.courseId ?? null,
      htmlBody: payload.htmlMessage,
      ...(payload.subject ? { subject: payload.subject } : {}),
    };
    const res = await apiClient.post<unknown>("/admin/invitations/bulk", body, {
      headers: adminHeaders(),
    });
    return toInviteResponse(res, emails.length);
  },

  /** POST /api/admin/invitations/csv (multipart/form-data) */
  async sendCsv(payload: {
    file: File;
    courseId?: string | null;
    htmlMessage: string;
    subject?: string;
  }): Promise<InviteResponse> {
    const form = new FormData();
    form.append("file", payload.file);
    form.append("htmlBody", payload.htmlMessage);
    if (payload.courseId) form.append("courseId", payload.courseId);
    if (payload.subject) form.append("subject", payload.subject);

    const res = await apiClient.post<unknown>("/admin/invitations/csv", form, {
      headers: { ...adminHeaders() },
    });
    return toInviteResponse(res, 0);
  },

  /** GET /api/invitations/validate/{token} — public endpoint */
  async validateToken(token: string): Promise<InvitationValidation> {
    try {
      const res = await apiClient.get<unknown>(`/invitations/validate/${encodeURIComponent(token)}`);
      const data = unwrap<Record<string, unknown>>(res);
      return {
        valid: data?.valid !== false,
        email: data?.email as string | undefined,
        courseId: (data?.courseId as string | null | undefined) ?? null,
        invitedBy: data?.invitedBy as string | undefined,
        expiresAt: data?.expiresAt as string | undefined,
        message: data?.message as string | undefined,
      };
    } catch (e) {
      return { valid: false, message: (e as Error).message };
    }
  },

  /* -------- Local schedule helpers (frontend only) -------- */
  async listSchedules(): Promise<InviteSchedule[]> {
    return readSchedules();
  },

  async createSchedule(input: {
    courseTitle: string;
    date: string;
    time: string;
    recipientsCount?: number;
  }): Promise<InviteSchedule> {
    const s: InviteSchedule = {
      id: `sch_${Date.now()}`,
      courseTitle: input.courseTitle,
      date: input.date,
      time: input.time,
      recipientsCount: input.recipientsCount ?? 0,
      status: "scheduled",
    };
    const next = [...readSchedules(), s];
    writeSchedules(next);
    return s;
  },

  async deleteSchedule(id: string): Promise<{ success: boolean }> {
    writeSchedules(readSchedules().filter((s) => s.id !== id));
    return { success: true };
  },
};

/* -------- Utilities -------- */
export const parseEmailList = (text: string): string[] =>
  text
    .split(/[\s,;]+/)
    .map((e) => e.trim())
    .filter(Boolean);

export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
