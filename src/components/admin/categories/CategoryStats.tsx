import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CategoryStats as Stats } from "@/types/api.types";

import { FiLayers, FiTrendingUp, FiBookOpen, FiUsers } from "react-icons/fi";

interface Props {
  stats: Stats | null;
  loading: boolean;
}

const items = (s: Stats) => [
  {
    label: "Total Categories",
    value: s.totalCategories,
    Icon: FiLayers,
    badgeStyle: {
      background: "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)",
      color: "#ffffff",
    },
  },
  {
    label: "Active Categories",
    value: s.activeCategories,
    Icon: FiTrendingUp,
    badgeStyle: {
      background: "linear-gradient(135deg, #059669 0%, #22C55E 100%)",
      color: "#ffffff",
    },
  },
  {
    label: "Total Courses",
    value: s.totalCourses,
    Icon: FiBookOpen,
    badgeStyle: {
      background: "linear-gradient(135deg, #DB2777 0%, #A855F7 100%)",
      color: "#ffffff",
    },
  },
  {
    label: "Total Students",
    value: s.totalStudents,
    Icon: FiUsers,
    badgeStyle: {
      background: "linear-gradient(135deg, #EA580C 0%, #F59E0B 100%)",
      color: "#ffffff",
    },
  },
];

export function CategoryStats({ stats, loading }: Props) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border/60">
            <CardContent className="flex items-start justify-between gap-4 p-5">
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-3 h-8 w-16" />
              </div>
              <Skeleton className="h-10 w-10 rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items(stats).map(({ label, value, Icon, badgeStyle }) => (
        <Card key={label} className="border-border/60">
          <CardContent className="flex items-start justify-between gap-4 p-5">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                {value.toLocaleString()}
              </p>
            </div>

            <div
              style={badgeStyle}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            >
              <Icon className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
