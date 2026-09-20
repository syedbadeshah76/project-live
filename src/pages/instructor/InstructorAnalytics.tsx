import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Users, CheckSquare, Star, TrendingUp, GraduationCap,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Cell, Tooltip,
} from "recharts";
import { instructorService } from "@/services/instructor.service";
import type { InstructorAnalyticsData } from "@/types/instructor-analytics-types";

const PRIMARY = "hsl(221 83% 53%)";
const PRIMARY_MUTED = "hsl(221 83% 95%)";

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <Card className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.03)] rounded-[20px]">
      {/* Background Decorative Organic Wave */}
      <div className="absolute inset-y-0 right-0 w-[55%] pointer-events-none overflow-hidden">
        <svg
          className="h-full w-full"
          viewBox="0 0 160 100"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M 45 0 C 15 35, 65 65, 30 100 L 160 100 L 160 0 Z"
            fill="#EEF4FF"
            className="dark:fill-blue-950/30"
          />
        </svg>
      </div>

      <CardContent className="relative z-10 p-5 sm:p-6 flex items-center justify-between min-h-[105px]">
        {/* Left Side: Value & Title */}
        <div className="flex flex-col justify-center pr-2">
          <span className="text-2xl sm:text-[26px] font-bold text-blue-600 dark:text-blue-400 tracking-tight leading-none mb-1.5">
            {value}
          </span>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">
            {title}
          </span>
        </div>

        {/* Right Side: Circular Icon Badge */}
        <div className="h-12 w-12 rounded-full bg-[#1D4ED8] dark:bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0 ml-3 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:stroke-[2.2]">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

const InstructorAnalytics = () => {
const [data, setData] = useState<InstructorAnalyticsData | null>(null);
const [loading, setLoading] = useState(true);

  useEffect(() => {
  let alive = true;
  (async () => {
    setLoading(true);
    try {
      const res = await instructorService.getAnalyticsOverview("month");
      if (alive) setData(res.data);
    } catch (e) {
      console.error("Failed to load analytics", e);
      if (alive) setData(null);
    } finally {
      if (alive) setLoading(false);
    }
  })();
  return () => { alive = false; };
}, []);

  if (loading || !data) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72" /><Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  const kpis = [
    { title: "Total Revenue",   value: `$${data.totalRevenue.toLocaleString()}`, icon: GraduationCap },
    { title: "Total Students",  value: data.totalStudents.toLocaleString(),      icon: CheckSquare },
    { title: "Avg. Rating",     value: data.averageRating.toFixed(1),            icon: Star },
    { title: "Completion Rate", value: `${data.completionRate}%`,                icon: TrendingUp },
  ];

  const maxRevenue = Math.max(...data.revenueTrend.map(d => d.revenue), 1);
  const maxEnroll  = Math.max(...data.enrollmentsTrend.map(d => d.enrollments), 1);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Analytics</h1>
        <p className="text-slate-500 mt-1">Here you can see your referrals status</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ title, value, icon: Icon }) => (
          <StatCard key={title} title={title} value={value} icon={Icon} />
        ))}
      </div>

      {/* Revenue + Enrollments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Revenue Trend (6 Months)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.revenueTrend}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <YAxis hide />
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} cursor={{ fill: "transparent" }} />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {data.revenueTrend.map((d, i) => (
                    <Cell key={i} fill={d.revenue === maxRevenue ? PRIMARY : PRIMARY_MUTED} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="text-xs text-blue-600 mt-2">← Revenue synced with Admin payout dashboard</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Student Enrollments</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.enrollmentsTrend}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <YAxis hide />
                <Tooltip formatter={(v: number) => [v.toLocaleString(), "Enrollments"]} cursor={{ fill: "transparent" }} />
                <Bar dataKey="enrollments" radius={[6, 6, 0, 0]}>
                  {data.enrollmentsTrend.map((d, i) => (
                    <Cell key={i} fill={d.enrollments === maxEnroll ? PRIMARY : PRIMARY_MUTED} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="text-xs text-blue-600 mt-2">← Enrollment data mirrors Student Portal activity</div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement + Rating Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Engagement by Course</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {data.engagementByCourse.map((c) => (
              <div key={c.courseId}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700">{c.courseName}</span>
                  <span className="text-blue-600 font-medium">{c.engagement} %</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${c.engagement}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Rating Distribution</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.ratingDistribution.map((r) => (
              <div key={r.stars} className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1 w-8 text-slate-600">
                  {r.stars} <Star className="h-3 w-3 fill-slate-400 text-slate-400" />
                </div>
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${r.percentage}%` }} />
                </div>
                <div className="w-10 text-right text-blue-600 font-medium">{r.percentage} %</div>
                <div className="w-14 text-right text-slate-400">( {r.count} )</div>
              </div>
            ))}
            <div className="text-xs text-blue-600 pt-2 border-t border-slate-100">← Ratings submitted from Student Portal</div>
          </CardContent>
        </Card>
      </div>

      {/* Top Course + Revenue Breakdown + Student Growth */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Top Performing Course</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="text-lg font-semibold text-slate-900">{data.topPerformingCourse.name}</div>
            <div className="text-sm text-slate-500">{data.topPerformingCourse.studentsEnrolled} students enrolled</div>
            <div className="text-sm text-slate-500 flex items-center gap-1">
              <Star className="h-3 w-3 fill-slate-400 text-slate-400" />
              {data.topPerformingCourse.averageRating} average rating
            </div>
            <div className="text-sm text-slate-500">{data.topPerformingCourse.completionRate}% completion rate</div>
            <div className="pt-3 border-t border-slate-100">
              <Badge variant="secondary" className="bg-blue-50 text-blue-600 hover:bg-blue-50">
                +{data.topPerformingCourse.monthlyGrowthPercentage}% this month
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Revenue Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Total Earned</span>
              <span className="text-green-600 font-semibold">${data.revenueBreakdown.totalEarned.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Platform Fee</span>
              <span className="text-red-500 font-semibold">-${data.revenueBreakdown.platformFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-slate-100">
              <span className="text-slate-900 font-medium">Your Earnings</span>
              <span className="text-green-600 font-bold">${data.revenueBreakdown.yourEarnings.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Student Growth</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-bold text-slate-900">{data.studentGrowth.totalStudents.toLocaleString()}</div>
            <div className="text-sm text-slate-500">Total students</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${data.studentGrowth.activeLearnersPercentage}%` }} />
              </div>
              <span className="text-sm text-blue-600 font-medium">{data.studentGrowth.activeLearnersPercentage}%</span>
            </div>
            <div className="text-sm text-slate-500 pt-1 border-t border-slate-100">Active learners</div>
            <Badge variant="secondary" className="bg-blue-50 text-blue-600 hover:bg-blue-50">
              ↑ +{data.studentGrowth.growthPercentage}% this month
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InstructorAnalytics;
