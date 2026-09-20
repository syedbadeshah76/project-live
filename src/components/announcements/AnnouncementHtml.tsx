// src/components/announcements/AnnouncementHtml.tsx
import { useMemo } from "react";
import { sanitizeHtml } from "@/lib/announcement.utils";

interface Props {
  html: string;
  className?: string;
}

export const AnnouncementHtml = ({ html, className }: Props) => {
  const safe = useMemo(() => sanitizeHtml(html), [html]);
  return (
    <div
      className={
        className ??
        "prose prose-sm max-w-none text-gray-700 [&_a]:text-blue-600 [&_a]:underline [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-gray-900 [&_p]:my-1"
      }
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
};
