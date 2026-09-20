import type { Announcement } from "@/types/announcement.types";
import { AnnouncementCard } from "./AnnouncementCard";

interface Props {
  items: Announcement[];
  onEdit?: (a: Announcement) => void;
  onDelete?: (a: Announcement) => void;
}

export const AnnouncementList = ({ items, onEdit, onDelete }: Props) => (
  <div className="space-y-3">
    {items.map((a) => (
      <AnnouncementCard
        key={a.id}
        announcement={a}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    ))}
  </div>
);
