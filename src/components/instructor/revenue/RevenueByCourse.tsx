import type { CourseRevenue } from "@/types/revenue.types";

interface Props {
  data: CourseRevenue[];
}

export function RevenueByCourse({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground">Revenue by Course</h3>
        <div className="py-12 text-center text-sm text-muted-foreground">
          No course revenue data available yet.
        </div>
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-foreground">Revenue by Course</h3>
      <div className="mt-5 space-y-5">
        {data.map((c) => {
          const width = Math.max(6, (c.revenue / max) * 100);
          return (
            <div key={c.courseId}>
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">
                    {c.courseTitle}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {c.sales.toLocaleString()} sales
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-2 flex-1 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-blue-600 transition-all"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <div className="w-20 text-right text-sm font-semibold text-foreground">
                  ${c.revenue.toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
