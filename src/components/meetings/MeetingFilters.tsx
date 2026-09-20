import { cn } from "@/lib/utils";

export type MeetingTab = "all" | "resources" | "announcements" | "upload";

interface Props {
  value: MeetingTab;
  onChange: (v: MeetingTab) => void;
  showUploadTab?: boolean;
}

export const MeetingFilters = ({
  value,
  onChange,
  showUploadTab = false,
}: Props) => {
  const tabs: { key: MeetingTab; label: string }[] = [
    { key: "all", label: "All Classes" },
    { key: "resources", label: "Resources" },
    { key: "announcements", label: "Announcements" },
  ];

  if (showUploadTab) {
    tabs.push({
      key: "upload",
      label: "Upload",
    });
  }

  return (
    <div className="flex items-center gap-2">
      {tabs.map((t) => {
        const active = value === t.key;

        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
              active
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-blue-700 border-blue-200 hover:bg-blue-50",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
};
