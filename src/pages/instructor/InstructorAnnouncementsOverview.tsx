import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { meetingService } from "@/services/meeting.service";
import type { AnnouncementSummary } from "@/types/meeting.types";
import { AnnouncementEmptyState } from "@/components/meetings/AnnouncementEmptyState";
import { AnnouncementList } from "@/components/meetings/AnnouncementList";
import { AboutLiveClassesBanner } from "@/components/meetings/MeetingBanner";

const InstructorAnnouncementsOverview = () => {
  const [items, setItems] = useState<AnnouncementSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    meetingService.getAnnouncementsSummary().then((r) => {
      if (r.success) setItems(r.data);
      setLoading(false);
    });
  }, []);

  if (loading)
    return (
      <div className="py-16 text-center text-sm text-gray-500">Loading…</div>
    );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {items.length === 0 ? (
        <AnnouncementEmptyState />
      ) : (
        <AnnouncementList items={items} />
      )}
      <AboutLiveClassesBanner />
    </motion.div>
  );
};

export default InstructorAnnouncementsOverview;
