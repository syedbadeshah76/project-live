import { motion } from "framer-motion";
import { Video, Radio, CalendarClock, CheckCircle2 } from "lucide-react";
import type { MeetingStatistics } from "@/types/meeting.types";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  stats?: MeetingStatistics;
  loading?: boolean;
}

const items = (s?: MeetingStatistics) => [
  {
    key: "total",
    label: "Total Classes",
    value: s?.totalClasses ?? 0,
    Icon: Video,
  },
  { key: "live", label: "Live Now", value: s?.liveNow ?? 0, Icon: Radio },
  {
    key: "upcoming",
    label: "Upcoming",
    value: s?.upcoming ?? 0,
    Icon: CalendarClock,
  },
  {
    key: "completed",
    label: "Completed",
    value: s?.completed ?? 0,
    Icon: CheckCircle2,
  },
];

export const LiveStatsCards = ({ stats, loading }: Props) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items(stats).map(({ key, label, value, Icon }, idx) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          className="relative overflow-hidden rounded-xl bg-white border border-blue-100 p-5 shadow-sm"
        >
          <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-blue-50" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-3xl font-bold text-blue-600">{value}</p>
              <p className="text-sm font-medium text-gray-600 mt-1">{label}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
