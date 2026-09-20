import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { Meeting } from "@/types/meeting.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Video, ExternalLink } from "lucide-react";

interface MeetingCardProps {
  meeting: Meeting;
  index?: number;
  variant?: "compact" | "full";
  showJoin?: boolean;
}

const statusBadge: Record<string, { className: string; label: string }> = {
  pending: { className: "bg-amber-100 text-amber-700", label: "Pending" },
  approved: { className: "bg-green-100 text-green-700", label: "Scheduled" },
  rejected: { className: "bg-red-100 text-red-700", label: "Rejected" },
  cancelled: { className: "bg-muted text-muted-foreground", label: "Cancelled" },
};

const meetingTypeBadge: Record<string, { className: string; label: string }> = {
  zoom: { className: "bg-blue-100 text-blue-700", label: "Zoom" },
  google_meet: { className: "bg-green-100 text-green-700", label: "Google Meet" },
  internal: { className: "bg-purple-100 text-purple-700", label: "Internal" },
};

export const MeetingCard = React.forwardRef<HTMLDivElement, MeetingCardProps>(({ meeting, index = 0, variant = "full", showJoin = true }, _ref) => {
  const navigate = useNavigate();
  const badge = statusBadge[meeting.status];
  const typeBadge = meetingTypeBadge[meeting.meetingType];

  const isLive = () => {
    const start = new Date(`${meeting.date}T${meeting.startTime}:00`);
    const end = new Date(start.getTime() + meeting.duration * 60000);
    const now = new Date();
    return now >= start && now <= end;
  };

  const live = isLive();

  const formatDate = (dateStr: string) =>
    new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      month: "short", day: "numeric",
    });

  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        className={`flex items-center gap-3 p-3 rounded-xl bg-card border transition-all hover:shadow-card-hover cursor-pointer ${live ? "border-green-400 ring-1 ring-green-400/20" : "border-border"}`}
        onClick={() => navigate(`/meeting-room/${meeting.id}`)}
      >
        {live && (
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-card-foreground truncate">{meeting.title}</p>
          <p className="text-xs text-muted-foreground">{formatDate(meeting.date)} • {meeting.startTime}</p>
        </div>
        {showJoin && meeting.status === "approved" && (
          <Button size="sm" variant={live ? "default" : "outline"} className={`shrink-0 text-xs ${live ? "bg-green-600 hover:bg-green-700" : ""}`}>
            {live ? "Join" : "View"}
          </Button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`bg-card rounded-xl shadow-card border overflow-hidden ${live ? "border-green-400 ring-2 ring-green-400/20" : "border-border"}`}
    >
      {live && (
        <div className="bg-green-500 text-white text-xs font-bold px-4 py-1.5 flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
          </span>
          LIVE NOW
        </div>
      )}

      <div className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-card-foreground leading-tight">{meeting.title}</h3>
          <div className="flex gap-1 shrink-0">
            <Badge variant="outline" className={`text-[10px] ${badge.className}`}>{badge.label}</Badge>
            {typeBadge && <Badge variant="outline" className={`text-[10px] ${typeBadge.className}`}>{typeBadge.label}</Badge>}
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{meeting.description}</p>

        <div className="space-y-1.5 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-primary" />{formatDate(meeting.date)}</div>
          <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-primary" />{meeting.startTime} • {meeting.duration} min</div>
          <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-primary" />{meeting.instructorName}</div>
          <div className="flex items-center gap-2"><Video className="h-3.5 w-3.5 text-primary" />{meeting.courseName}</div>
        </div>

        {showJoin && meeting.status === "approved" && (
          <Button
            className={`w-full ${live ? "bg-green-600 hover:bg-green-700" : ""}`}
            variant={live ? "default" : "gradient"}
            onClick={() => navigate(`/meeting-room/${meeting.id}`)}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            {live ? "Join Now" : "Join Meeting"}
          </Button>
        )}
      </div>
    </motion.div>
  );
});
MeetingCard.displayName = "MeetingCard";
