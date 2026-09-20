import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { meetingService } from "@/services/meeting.service";
import type { Meeting } from "@/types/meeting.types";
import { MeetingCard } from "./MeetingCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Video, ChevronRight } from "lucide-react";

interface UpcomingMeetingsWidgetProps {
  maxItems?: number;
  linkTo?: string;
}

export const UpcomingMeetingsWidget = ({ maxItems = 3, linkTo = "/dashboard/live-classes" }: UpcomingMeetingsWidgetProps) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await meetingService.getUpcomingLiveClasses();
        if (res.success) {
          const sorted = res.data
            .filter((m) => new Date(`${m.date}T${m.startTime}:00`) >= new Date())
            .sort((a, b) => new Date(`${a.date}T${a.startTime}:00`).getTime() - new Date(`${b.date}T${b.startTime}:00`).getTime());
          setMeetings(sorted.slice(0, maxItems));
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [maxItems]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
          <Video className="h-5 w-5 text-primary" /> Upcoming Live Classes
        </h2>
        <Button variant="ghost" size="sm" asChild>
          <Link to={linkTo}>View All <ChevronRight className="h-4 w-4" /></Link>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <div className="text-center py-6 bg-card rounded-xl shadow-card">
          <Video className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No upcoming classes</p>
        </div>
      ) : (
        <div className="space-y-2">
          {meetings.map((meeting, index) => (
            <MeetingCard key={meeting.id} meeting={meeting} index={index} variant="compact" />
          ))}
        </div>
      )}
    </motion.div>
  );
};
