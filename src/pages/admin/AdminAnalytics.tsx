import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp, TrendingDown, Star, CheckCircle2, RotateCcw, Users, GraduationCap,
  BookOpen, Briefcase, DollarSign, CreditCard, Globe,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  adminAnalyticsService,
  type AnalyticsPeriod,
  type AnalyticsOverview,
  type AnalyticsDashboardResponse,
  type RevenueTrendPoint,
  type EnrollmentPoint,
  type CategoryRevenue,
  type AcquisitionSource,
  type TopInstructor,
  type TopCourseRevenue,
  type PaymentMethodBreakdown,
  type RegionRevenue,
  type RefundReason,
} from "@/services/admin-analytics.service";

const PERIOD_KEY = "edvanz_admin_analytics_period";
const ALL_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatDecimals = (val: number | string | null | undefined, decimals = 2): string => {
  if (val === null || val === undefined) return "0";
  const num = typeof val === "number" ? val : parseFloat(String(val));
  if (isNaN(num)) return "0";
  return Number(num.toFixed(decimals)).toString();
};

const fmtMoney = (n: number) =>
  `$ ${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function StatCard({
  icon, label, value, changePct, accent,
}: { icon: React.ReactNode; label: string; value: string; changePct: number; accent: string }) {
  const positive = changePct >= 0;
  return (
    <Card className="shadow-sm border-border/60">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-white ${accent}`}>
            {icon}
          </div>
          <span
            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
              positive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            }`}
          >
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {formatDecimals(Math.abs(changePct), 2)}%
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-1">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function useFetch<T>(fetcher: () => Promise<{ data: T }>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetcher()
      .then((res) => alive && setData(res.data))
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, loading };
}

const AdminAnalytics = () => {
  const [period, setPeriod] = useState<AnalyticsPeriod>(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(PERIOD_KEY) : null;
    return (stored as AnalyticsPeriod) || "month";
  });

  useEffect(() => {
    localStorage.setItem(PERIOD_KEY, period);
  }, [period]);

  const analytics = useFetch<AnalyticsDashboardResponse>(() => adminAnalyticsService.getAnalytics(period), [period]);
  const payments = useFetch<PaymentMethodBreakdown[]>(() => adminAnalyticsService.getPaymentMethods(period), [period]);
  const regions = useFetch<RegionRevenue[]>(() => adminAnalyticsService.getRevenueByRegion(period), [period]);
  const refunds = useFetch<RefundReason[]>(() => adminAnalyticsService.getRefundReasons(period), [period]);

  const revenueTrendData = useMemo(() => {
    const raw = analytics.data?.revenueTrend || [];
    const mapByMonth = new Map<string, { month: string; grossRevenue: number; platformFee: number }>();

    raw.forEach((item: any) => {
      let m = String(item.month || "");
      if (m.includes("-")) {
        const parts = m.split("-");
        const num = parseInt(parts[1], 10);
        if (num >= 1 && num <= 12) m = ALL_MONTHS[num - 1];
      }
      mapByMonth.set(m, {
        month: m,
        grossRevenue: Number(item.grossRevenue ?? item.revenue ?? 0),
        platformFee: Number(item.platformFee ?? 0),
      });
    });

    return ALL_MONTHS.map((m) => {
      const found = mapByMonth.get(m);
      if (found) return found;
      return { month: m, grossRevenue: 0, platformFee: 0 };
    });
  }, [analytics.data?.revenueTrend]);

  const enrollmentTrendData = useMemo(() => {
    const raw = analytics.data?.enrollmentTrend || [];
    const mapByMonth = new Map<string, { month: string; paid: number; free: number }>();

    raw.forEach((item: any) => {
      let m = String(item.month || "");
      if (m.includes("-")) {
        const parts = m.split("-");
        const num = parseInt(parts[1], 10);
        if (num >= 1 && num <= 12) m = ALL_MONTHS[num - 1];
      }
      mapByMonth.set(m, {
        month: m,
        paid: Number(item.paidCount ?? item.paid ?? 0),
        free: Number(item.freeCount ?? item.free ?? 0),
      });
    });

    return ALL_MONTHS.map((m) => {
      const found = mapByMonth.get(m);
      if (found) return found;
      return { month: m, paid: 0, free: 0 };
    });
  }, [analytics.data?.enrollmentTrend]);

  const categoryData = useMemo(() => {
    const raw = analytics.data?.revenueByCategory || [];
    return raw.map((item: any) => ({
      category: item.categoryName || item.category || "Uncategorized",
      revenue: Number(item.revenue ?? 0),
    }));
  }, [analytics.data?.revenueByCategory]);

  const topInstructors = {
    loading: analytics.loading,
    data: analytics.data?.topInstructorsLeaderboard || [],
  };

  const topCourses = {
    loading: analytics.loading,
    data: analytics.data?.topCoursesByRevenue || [],
  };

  const periods: { key: AnalyticsPeriod; label: string }[] = [
    { key: "month", label: "This Month" },
    { key: "quarter", label: "This Quarter" },
    { key: "year", label: "This Year" },
  ];

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        {/* Period Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {periods.map((p) => (
            <Button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              variant={period === p.key ? "default" : "outline"}
              className={
                period === p.key
                  ? "rounded-full bg-primary hover:bg-primary/90"
                  : "rounded-full text-primary border-primary/30 bg-primary/5 hover:bg-primary/10"
              }
              size="sm"
            >
              {p.label}
            </Button>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {analytics.loading || !analytics.data ? (
            Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
          ) : (
            <>
              <StatCard icon={<DollarSign className="h-5 w-5" />} accent="bg-amber-500" label="Total Revenue" value={fmtMoney(analytics.data.totalRevenue ?? 0)} changePct={0} />
              <StatCard icon={<Briefcase className="h-5 w-5" />} accent="bg-indigo-500" label="Platform Fee Earned" value={fmtMoney(analytics.data.platformFeeEarned ?? 0)} changePct={0} />
              <StatCard icon={<Users className="h-5 w-5" />} accent="bg-sky-500" label="Total Students" value={(analytics.data.totalStudents ?? 0).toLocaleString()} changePct={0} />
              <StatCard icon={<BookOpen className="h-5 w-5" />} accent="bg-rose-500" label="Active Courses" value={(analytics.data.activeCourses ?? 0).toLocaleString()} changePct={0} />
              <StatCard icon={<GraduationCap className="h-5 w-5" />} accent="bg-orange-500" label="Total Instructors" value={(analytics.data.totalInstructors?.current ?? 0).toLocaleString()} changePct={analytics.data.totalInstructors?.deltaPercent ?? 0} />
              <StatCard icon={<Star className="h-5 w-5" />} accent="bg-yellow-500" label="Avg Course Rating" value={formatDecimals(analytics.data.avgCourseRating?.current ?? 0, 1)} changePct={analytics.data.avgCourseRating?.deltaPercent ?? 0} />
              <StatCard icon={<CheckCircle2 className="h-5 w-5" />} accent="bg-emerald-500" label="Completion Rate" value={`${formatDecimals(analytics.data.completionRate?.current ?? 0, 2)} %`} changePct={analytics.data.completionRate?.deltaPercent ?? 0} />
              <StatCard icon={<RotateCcw className="h-5 w-5" />} accent="bg-cyan-500" label="Refund Rate" value={`${formatDecimals(analytics.data.refundRate?.current ?? 0, 2)} %`} changePct={analytics.data.refundRate?.deltaPercent ?? 0} />
            </>
          )}
        </div>

        {/* Revenue Trend + Enrollments */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-base font-semibold">Revenue Trend (12 Months)</CardTitle></CardHeader>
            <CardContent>
              <div className="h-72">
                {analytics.loading ? <Skeleton className="h-full w-full" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} />
                      <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                      <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                      <Line type="monotone" dataKey="grossRevenue" name="Gross Revenue" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 4, fill: "#06b6d4" }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="platformFee" name="Platform Fee" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4, fill: "#2563eb" }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="flex gap-6 justify-center mt-3 text-sm">
                <span className="flex items-center gap-2 text-xs font-medium text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />Gross Revenue</span>
                <span className="flex items-center gap-2 text-xs font-medium text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-blue-600" />Platform Fee</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-base font-semibold">Enrollments (12 Months)</CardTitle></CardHeader>
            <CardContent>
              <div className="h-72">
                {analytics.loading ? <Skeleton className="h-full w-full" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={enrollmentTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} />
                      <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v: number, name: string) => [v, name === "paid" ? "Paid" : "Free"]} />
                      <Bar dataKey="paid" name="Paid" stackId="a" fill="#1d4ed8" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="free" name="Free" stackId="a" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="flex gap-6 justify-center mt-3 text-sm">
                <span className="flex items-center gap-2 text-xs font-medium text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-blue-700" />Paid</span>
                <span className="flex items-center gap-2 text-xs font-medium text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-blue-300" />Free</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue by Category + Acquisition Sources */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-base font-semibold">Revenue by Category</CardTitle></CardHeader>
            <CardContent>
              <div className="h-72">
                {analytics.loading ? <Skeleton className="h-full w-full" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                      <YAxis type="category" dataKey="category" tick={{ fontSize: 12 }} width={90} />
                      <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                      <Bar dataKey="revenue" fill="#2563eb" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-base font-semibold">Top Instructors Revenue Share</CardTitle></CardHeader>
            <CardContent>
              <div className="h-72">
                {topInstructors.loading ? <Skeleton className="h-full w-full" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={topInstructors.data} dataKey="revenue" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2}>
                        {topInstructors.data.map((_, i) => (
                          <Cell key={i} fill={["#3b82f6", "#14b8a6", "#f97316", "#eab308", "#8b5cf6"][i % 5]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                {topInstructors.data.map((item, idx) => (
                  <div key={item.id || idx} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Instructors */}
        <Card className="shadow-sm mb-6">
          <CardHeader><CardTitle className="text-base font-semibold">Top Instructors Leaderboard</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Instructor ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Courses</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topInstructors.loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                  ))
                ) : topInstructors.data.map((i, idx) => (
                  <TableRow key={`${i.rank ?? idx}-${i.id || idx}`}>
                    <TableCell><span className="h-7 w-7 inline-flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">{i.rank ?? idx + 1}</span></TableCell>
                    <TableCell className="font-mono text-xs">{i.instructorId ?? i.id ?? '—'}</TableCell>
                    <TableCell className="font-medium">{i.instructorName ?? i.name ?? '—'}</TableCell>
                    <TableCell>$ {(i.revenue ?? 0).toFixed(2)}</TableCell>
                    <TableCell>{i.courses ?? 0}</TableCell>
                    <TableCell>{(i.students ?? 0).toLocaleString()}</TableCell>
                    <TableCell><span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />{(i.rating ?? 0).toFixed(1)}</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top 5 Courses */}
        <h3 className="font-semibold text-base mb-3">Top 5 Courses By Revenue</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {topCourses.loading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />) : topCourses.data.map((c, idx) => (
            <Card key={c.id || idx} className="shadow-sm">
              <CardContent className="p-4">
                <span className="h-7 w-7 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-semibold mb-3">{c.rank ?? idx + 1}</span>
                <p className="font-semibold text-sm leading-snug mb-2 line-clamp-2">{c.title}</p>
                <p className="text-xs text-muted-foreground mb-3">by<br /><span className="text-foreground font-medium">{c.instructorName ?? c.instructor ?? '—'}</span></p>
                <div className="flex justify-between text-xs text-muted-foreground mt-3"><span>Students</span><span className="text-foreground font-semibold">{c.students ?? 0}</span></div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>Revenue</span><span className="text-primary font-semibold">$ {(c.revenue ?? 0).toLocaleString()}</span></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Payment Methods + Region/Refund */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-base font-semibold flex items-center gap-2"><CreditCard className="h-4 w-4" />Payment Methods Breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                {payments.loading ? <Skeleton className="h-full w-full" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={payments.data || []} dataKey="percentage" nameKey="method" cx="50%" cy="50%" outerRadius={95}>
                        {(payments.data || []).map((m, i) => <Cell key={i} fill={m.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `${formatDecimals(v, 2)}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-4 space-y-2">
                {(payments.data || []).map((m) => (
                  <div key={m.method} className="flex items-center justify-between text-sm py-2 px-3 bg-muted/40 rounded-lg">
                    <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: m.color }} />{m.method}</span>
                    <span className="font-semibold">$ {m.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader><CardTitle className="text-base font-semibold flex items-center gap-2"><Globe className="h-4 w-4" />Revenue by Region</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {regions.loading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />) : (regions.data || []).map((r) => (
                  <div key={r.region}>
                    <div className="flex justify-between items-center text-sm mb-1">
                      <div>
                        <span className="font-medium">{r.region}</span>
                        <span className="text-primary ml-3 text-xs">{formatDecimals(r.percentage, 2)} %</span>
                      </div>
                      <span className="font-semibold">$ {r.revenue.toLocaleString()}</span>
                    </div>
                    <Progress value={Number(formatDecimals(r.percentage, 2))} className="h-1.5" />
                    <p className="text-xs text-muted-foreground mt-1">{r.students.toLocaleString()} students</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader><CardTitle className="text-base font-semibold">Refund Reasons</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {refunds.loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />) : (refunds.data || []).map((r) => (
                  <div key={r.reason} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded" style={{ background: r.color }} />{r.reason}</span>
                    <span className="font-bold">{formatDecimals(r.percentage, 2)}%</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </AdminLayout>
  );
};

export default AdminAnalytics;
