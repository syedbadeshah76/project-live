import type { CourseType } from "@/types/announcement.types";

interface Props {
  type: CourseType;
}

export const AnnouncementTypeChip = ({ type }: Props) => {
  const label = type === "live" ? "Live" : "Recorded";
  return (
    <span className="inline-flex items-center rounded-full bg-blue-600 px-2.5 py-0.5 text-[11px] font-medium text-white">
      {label}
    </span>
  );
};
