// src/services/notifications.service.ts
import { apiClient } from "@/lib/api-client";
import type { UserNotification } from "@/types/admin-notification.types";

const BASE = "/notifications";

function unwrapData<T>(response: unknown): T {
  if (response && typeof response === "object" && !Array.isArray(response)) {
    const obj = response as Record<string, unknown>;
    if ("data" in obj) return obj.data as T;
  }
  return response as T;
}

function safeIsoDate(value?: string): string {
  if (!value) return new Date().toISOString();
  const withZone = /Z|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`;
  const parsed = new Date(withZone);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function normalize(raw: Record<string, unknown>): UserNotification {
  const notifId = String(raw.notificationId ?? raw.id ?? raw.adminNotificationId ?? "");
  const isRead = Boolean(raw.read ?? raw.isRead ?? false);
  return {
    notificationId: notifId,
    title: String(raw.title ?? "Notification"),
    message: String(raw.message ?? ""),
    read: isRead,
    createdAt: safeIsoDate(raw.createdAt as string | undefined),
  };
}

function normalizeList(response: unknown): UserNotification[] {
  const data = unwrapData<unknown>(response);
  const arr = Array.isArray(data)
    ? data
    : data && typeof data === "object"
      ? ((data as Record<string, unknown>).content as unknown[]) ??
        ((data as Record<string, unknown>).items as unknown[]) ??
        ((data as Record<string, unknown>).notifications as unknown[]) ??
        []
      : [];
  return (arr as Record<string, unknown>[])
    .map(normalize)
    .filter((n) => !!n.notificationId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

class NotificationsService {
  /** GET /api/notifications */
  async list(): Promise<UserNotification[]> {
    return normalizeList(await apiClient.get<unknown>(BASE));
  }

  /** Alias: GET /api/notifications */
  async getNotifications(): Promise<{ success: boolean; data: UserNotification[] }> {
    const list = await this.list();
    return { success: true, data: list };
  }

  /** GET /api/notifications/unread */
  async listUnread(): Promise<UserNotification[]> {
    return normalizeList(await apiClient.get<unknown>(`${BASE}/unread`));
  }

  /** GET /api/notifications/count */
  async unreadCount(): Promise<number> {
    try {
      const res = unwrapData<unknown>(await apiClient.get<unknown>(`${BASE}/count`));
      if (typeof res === "number") return res;
      if (res && typeof res === "object") {
        const obj = res as Record<string, unknown>;
        const value = obj.count ?? obj.unreadCount ?? obj.total;
        if (typeof value === "number") return value;
        if (typeof value === "string" && value.trim() !== "") return Number(value) || 0;
      }
      return 0;
    } catch {
      return 0;
    }
  }

  /** Alias: GET /api/notifications/count */
  async getUnreadCount(): Promise<{ success: boolean; data: { count: number } }> {
    const count = await this.unreadCount();
    return { success: true, data: { count } };
  }

  /** PUT /api/notifications/{id}/read */
  async markAsRead(notificationId: string): Promise<void> {
    if (!notificationId) throw new Error("Notification id is required");
    await apiClient.put<unknown>(
      `${BASE}/${encodeURIComponent(notificationId)}/read`,
      {},
    );
  }

  /** PUT /api/notifications/read-all */
  async markAllAsRead(): Promise<void> {
    await apiClient.put<unknown>(`${BASE}/read-all`, {});
  }

  /** Safe deletion from user list */
  async deleteNotification(id: string): Promise<void> {
    if (!id) return;
    try {
      await apiClient.delete<unknown>(`${BASE}/${encodeURIComponent(id)}`);
    } catch {
      // Ignored if backend does not expose individual notification DELETE for user role
    }
  }

  /** Client-side stub for reminders */
  async scheduleReminder(_payload: {
    title: string;
    message: string;
    remindAt: string;
    daysOfWeek: number[];
    actionUrl?: string;
  }): Promise<void> {
    return Promise.resolve();
  }
}

export const notificationsService = new NotificationsService();
export default notificationsService;
