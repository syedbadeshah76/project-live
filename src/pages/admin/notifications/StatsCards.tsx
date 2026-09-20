import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatNumber } from "./notification-utils";
import type { NotificationStats } from "@/types/admin-notification.types";
import { FiBell, FiCheckCircle, FiClock, FiUsers } from "react-icons/fi";

interface StatsCardsProps {
  stats: NotificationStats;
  loading?: boolean;
}

const buildItems = (stats: NotificationStats) => [
  {
    label: "Total Sent",
    value: formatNumber(stats.totalSent),
    Icon: FiCheckCircle,
    badgeStyle: {
      background: "linear-gradient(135deg, #059669 0%, #22C55E 100%)",
      color: "#ffffff",
    },
  },
  {
    label: "To Students",
    value: formatNumber(stats.studentNotifications),
    Icon: FiUsers,
    badgeStyle: {
      background: "linear-gradient(135deg, #0891B2 0%, #3B82F6 100%)",
      color: "#ffffff",
    },
  },
  {
    label: "To Instructors",
    value: formatNumber(stats.instructorNotifications),
    Icon: FiBell,
    badgeStyle: {
      background: "linear-gradient(135deg, #DB2777 0%, #A855F7 100%)",
      color: "#ffffff",
    },
  },
  {
    label: "Last Sent",
    value: formatDate(stats.lastSentAt),
    Icon: FiClock,
    badgeStyle: {
      background: "linear-gradient(135deg, #EA580C 0%, #F59E0B 100%)",
      color: "#ffffff",
    },
  },
];

export function StatsCards({ stats, loading }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {buildItems(stats).map(({ label, value, Icon, badgeStyle }) => (
        <Card key={label}>
          <CardContent className="flex items-center justify-between p-5">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-1 truncate text-xl font-semibold">
                {loading ? "—" : value}
              </p>
            </div>
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={badgeStyle}
            >
              <Icon size={20} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default StatsCards;
