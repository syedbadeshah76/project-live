// src/pages/admin/notifications/notification-utils.ts
import type { TargetAudience } from "@/types/admin-notification.types";

export const AUDIENCE_LABELS: Record<TargetAudience, string> = {
  student: "Students",
  instructor: "Instructors",
};

export const AUDIENCE_BADGE_CLASSES: Record<TargetAudience, string> = {
  student: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  instructor: "bg-purple-100 text-purple-700 hover:bg-purple-100",
};

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(Number.isFinite(value) ? value : 0);
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
