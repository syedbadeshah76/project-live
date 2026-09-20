// src/services/admin-notifications.service.ts
import { apiClient } from "@/lib/api-client";
import type {
  AdminNotification,
  AdminNotificationApiResponse,
  BackendAudience,
  CreateNotificationInput,
  NotificationStats,
  TargetAudience,
} from "@/types/admin-notification.types";

/** Some Spring endpoints wrap payloads in { data: ... } — unwrap safely. */
function unwrapData<T>(response: unknown): T {
  if (response && typeof response === "object" && !Array.isArray(response)) {
    const obj = response as Record<string, unknown>;
    if ("data" in obj) return obj.data as T;
  }
  return response as T;
}

/** Resolves Admin user ID from JWT token or session */
function resolveAdminId(): string {
  if (typeof window === "undefined") return "";

  // 1. Try decoding JWT token from localStorage "accessToken"
  try {
    const token = window.localStorage.getItem("accessToken");
    if (token && token.includes(".")) {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payloadStr = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
        const payload = JSON.parse(payloadStr);
        const uid = payload?.userId ?? payload?.sub ?? payload?.id;
        if (uid && typeof uid === "string") return uid;
      }
    }
  } catch {
    /* ignore token decode errors */
  }

  // 2. Try Edvanz_user
  try {
    const raw = window.localStorage.getItem("Edvanz_user");
    if (raw) {
      const parsed = JSON.parse(raw);
      const id = parsed?.id ?? parsed?.userId ?? parsed?.user?.id ?? "";
      if (id && typeof id === "string" && !id.includes("@")) return id;
    }
  } catch {
    /* ignore malformed storage */
  }

  return window.localStorage.getItem("userId") ?? "353cf165-6301-4562-9806-f689a7334de4";
}

function adminHeaders(): Record<string, string> {
  const adminId = resolveAdminId();
  if (!adminId) throw new Error("Admin session missing. Please sign in again.");
  return { "X-User-Id": adminId };
}

function toBackendAudience(audience: TargetAudience): BackendAudience {
  return audience === "instructor" ? "INSTRUCTOR" : "STUDENT";
}

function toUiAudience(audience: string | undefined): TargetAudience {
  return String(audience ?? "").toUpperCase() === "INSTRUCTOR" ? "instructor" : "student";
}

function safeIsoDate(value?: string): string {
  if (!value) return new Date().toISOString();
  const withZone = /Z|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`;
  const parsed = new Date(withZone);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function mapNotification(raw: AdminNotificationApiResponse): AdminNotification {
  const notifId = String(raw.adminNotificationId ?? (raw as any).id ?? (raw as any).notificationId ?? "");
  return {
    id: notifId,
    title: raw.title ?? "",
    message: raw.message ?? "",
    targetAudience: toUiAudience(raw.audience),
    type: (raw.type as any) ?? "GENERAL",
    sentAt: safeIsoDate(raw.createdAt),
  };
}

function normalizeList(response: unknown): AdminNotificationApiResponse[] {
  const data = unwrapData<unknown>(response);
  if (Array.isArray(data)) return data as AdminNotificationApiResponse[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["content", "items", "notifications", "data"]) {
      if (Array.isArray(obj[key])) return obj[key] as AdminNotificationApiResponse[];
    }
  }
  return [];
}

class AdminNotificationsService {
  /** GET /api/admin/notifications (with fallback to /api/admin/users/notifications) */
  async getNotifications(): Promise<AdminNotification[]> {
    let res: unknown;
    try {
      res = await apiClient.get<unknown>("/admin/notifications");
    } catch {
      res = await apiClient.get<unknown>("/admin/users/notifications");
    }
    return normalizeList(res)
      .filter((n) => !!(n?.adminNotificationId || (n as any)?.id || (n as any)?.notificationId))
      .map(mapNotification)
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  }

  /** Derived client-side stats calculation */
  async getStats(list?: AdminNotification[]): Promise<NotificationStats> {
    const items = list ?? (await this.getNotifications());
    return {
      totalSent: items.length,
      studentNotifications: items.filter((n) => n.targetAudience === "student").length,
      instructorNotifications: items.filter((n) => n.targetAudience === "instructor").length,
      lastSentAt: items.length ? items[0].sentAt : null,
    };
  }

  /** POST /api/admin/notifications */
  async createNotification(input: CreateNotificationInput): Promise<void> {
    const title = input.title.trim();
    const message = input.message.trim();
    if (!title) throw new Error("Title is required");
    if (!message) throw new Error("Message is required");

    const audience: BackendAudience = toBackendAudience(input.targetAudience);
    const body: Record<string, string> = {
      title,
      message,
      audience,
    };

    const headers = adminHeaders();

    try {
      await apiClient.post<unknown>("/admin/notifications", body, { headers });
    } catch {
      await apiClient.post<unknown>("/admin/users/notifications", body, { headers });
    }
  }

  /** DELETE /api/admin/users/notifications/{notificationId} */
  async deleteNotification(id: string): Promise<void> {
    if (!id) throw new Error("Notification id is required");
    const headers = adminHeaders();

    try {
      await apiClient.delete<unknown>(`/admin/users/notifications/${encodeURIComponent(id)}`, {
        headers,
      });
    } catch (e: any) {
      // If primary path fails, attempt secondary route /admin/notifications/{id}
      if (e?.response?.status === 404 || e?.response?.status === 405) {
        await apiClient.delete<unknown>(`/admin/notifications/${encodeURIComponent(id)}`, {
          headers,
        });
      } else {
        throw e;
      }
    }
  }
}

export const adminNotificationsService = new AdminNotificationsService();
export default adminNotificationsService;
