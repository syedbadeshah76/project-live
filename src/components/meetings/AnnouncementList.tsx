import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import type { AnnouncementSummary } from "@/types/meeting.types";
import { AnnouncementSummaryCard } from "./AnnouncementSummaryCard";

interface Props {
  items: AnnouncementSummary[];
}

export const AnnouncementList = ({ items }: Props) => {
  const navigate = useNavigate();
  return (
    <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Announcements</h3>
        <Button
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => navigate("/instructor/announcements")}
        >
          Create Announcement
        </Button>
      </div>
      <div className="space-y-3">
        {items.map((a) => (
          <AnnouncementSummaryCard key={a.id} item={a} />
        ))}
      </div>
    </div>
  );
};
