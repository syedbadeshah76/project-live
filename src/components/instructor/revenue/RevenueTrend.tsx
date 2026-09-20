import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RevenueTrendPoint } from "@/types/revenue.types";

interface Props {
  data: RevenueTrendPoint[];
}

export function RevenueTrend({ data }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-foreground">Revenue Trend</h3>
      {!data || data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          No revenue trend data yet.
        </div>
      ) : (
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#94a3b8" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#94a3b8" }}
              />
              <Tooltip
                cursor={{ fill: "rgba(37,99,235,0.08)" }}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="revenue" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
