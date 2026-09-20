// src/components/announcements/AnnouncementCard.tsx
import { format, isToday, isYesterday } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import type { Announcement } from "@/types/announcement.types";
import { AnnouncementTypeChip } from "./AnnouncementTypeChip";
import { CourseNameChip } from "./CourseNameChip";
import { StudentCountChip } from "./StudentCountChip";
import { AnnouncementHtml } from "./AnnouncementHtml";

interface Props {
  announcement: Announcement;
  onEdit?: (a: Announcement) => void;
  onDelete?: (a: Announcement) => void;
}

const formatWhen = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
};

export const AnnouncementCard = ({ announcement, onEdit, onDelete }: Props) => {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 transition hover:bg-gray-50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-gray-900">{announcement.title}</h4>
          <AnnouncementTypeChip type={announcement.courseType} />
        </div>
        {(onEdit || onDelete) && (
          <div className="flex shrink-0 items-center gap-1">
            {onEdit && (
              <button
                type="button"
                aria-label="Edit announcement"
                onClick={() => onEdit(announcement)}
                className="rounded-md p-1.5 text-gray-500 transition hover:bg-white hover:text-gray-900"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                aria-label="Delete announcement"
                onClick={() => onDelete(announcement)}
                className="rounded-md p-1.5 text-gray-500 transition hover:bg-white hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <AnnouncementHtml html={announcement.htmlContent} className="prose prose-sm mt-2 max-w-none text-gray-600 [&_a]:text-blue-600 [&_a]:underline [&_p]:my-1 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-sm [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_h1]:text-gray-900 [&_h2]:text-gray-900 [&_h3]:text-gray-900" />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex justify-between gap-2">
          <CourseNameChip name={announcement.courseName} />
          <StudentCountChip count={announcement.studentCount} />
        </div>
        <div className="flex w-1/3 justify-end">
          <span className="shrink-0 text-xs text-gray-500">{formatWhen(announcement.createdAt)}</span>
        </div>
      </div>
    </div>
  );
};
