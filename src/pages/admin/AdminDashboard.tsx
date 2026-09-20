// ============================================================
// src/pages/admin/AdminDashboard.tsx
// react-router-dom · no TanStack · fully wired to platformService and authService
// ============================================================
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  UserCog,
  BookOpen,
  Video,
  GraduationCap,
  CalendarDays,
  Check,
  X,
  TrendingUp,
} from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/auth.service";
import {
  platformService,
  timeAgo,
  initialsOf,
  type AdminDashboardVm,
  type AdminMeeting,
} from "@/services/platform.service";

const STAT_ICONS = [
  { Icon: Users, bg: "bg-blue-500", fg: "text-white" },
  { Icon: UserCog, bg: "bg-purple-500", fg: "text-white" },
  { Icon: BookOpen, bg: "bg-emerald-500", fg: "text-white" },
  { Icon: Video, bg: "bg-orange-500", fg: "text-white" },
  { Icon: GraduationCap, bg: "bg-pink-500", fg: "text-white" },
];

function StatCard({
  label,
  value,
  change,
  index,
}: {
  label: string;
  value: number | string;
  change: number;
  index: number;
}) {
  const { Icon, bg, fg } = STAT_ICONS[index % STAT_ICONS.length];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className="flex flex-col justify-between p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs transition-all hover:shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-700 truncate">
          {label}
        </span>
        <div
          className={`flex items-center justify-center shrink-0 w-11 h-11 rounded-xl ${bg}`}
        >
          <Icon className={`w-5 h-5 stroke-[2.2] ${fg}`} />
        </div>
      </div>

      <div className="flex items-baseline justify-between mt-4">
        <span className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight leading-none">
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        <div className="flex items-center gap-1 text-emerald-600 font-semibold text-xs bg-emerald-50/60 px-1.5 py-0.5 rounded-md">
          <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>+{Number(Number(change || 0).toFixed(2))}%</span>
        </div>
      </div>
    </motion.div>
  );
}

function MetricRow({
  label,
  value,
  pct,
  className,
}: {
  label: string;
  value: string;
  pct: number;
  className: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{value}</span>
      </div>
      <Progress value={Math.max(0, Math.min(100, pct))} className={`h-2 ${className}`} />
    </div>
  );
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [data, setData] = useState<AdminDashboardVm | null>(null);
  const [meetings] = useState<AdminMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const to = new Date().toISOString().slice(0, 19);
    const from = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19);

    (async () => {
      try {
        const dashboard = await platformService.getDashboard(from, to);
        if (!alive) return;
        setData(dashboard);
      } catch (err) {
        if (!alive) return;
        toast({
          title: "Failed to load dashboard",
          description:
            err instanceof Error ? err.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [toast]);

  const removeApproval = useCallback((id: string) => {
    setData((prev) =>
      prev ? { ...prev, approvals: prev.approvals.filter((a) => a.id !== id) } : prev,
    );
  }, []);

  const handleApprove = async (id: string) => {
    setBusyId(id);
    try {
      await authService.approveInstructor(id);
      removeApproval(id);
      toast({ title: "Instructor approved" });
    } catch (err) {
      toast({
        title: "Action failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id: string) => {
    setBusyId(id);
    try {
      await authService.rejectInstructor(id, "Application rejected");
      removeApproval(id);
      toast({ title: "Application rejected" });
    } catch (err) {
      toast({
        title: "Action failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const quickActions = [
    { label: "View Revenue", path: "/admin/revenue" },
    { label: "Instructor Approvals", path: "/admin/instructor-approvals" },
    { label: "Manage Courses", path: "/admin/courses" },
    { label: "View Users", path: "/admin/users" },
    { label: "View Analytics", path: "/admin/analytics" },
  ];

  const o = data?.overview;
  const stats = o
    ? [
        { label: "Total Students", value: o.totalStudents, change: o.studentsChangePct },
        { label: "Total Instructors", value: o.totalInstructors, change: o.instructorsChangePct },
        { label: "Total Courses", value: o.totalCourses, change: o.coursesChangePct },
        { label: "Total Enrollments", value: o.totalEnrollments, change: o.enrollmentsChangePct },
        {
          label: "Total Revenue",
          value: `$${Number(o.totalRevenue || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
          change: o.revenueChangePct,
        },
      ]
    : [];

  const metrics = data?.metrics;
  const approvals = data?.approvals.slice(0, 3) ?? [];
  const signups = data?.signups.slice(0, 5) ?? [];
  const activity = data?.activity.slice(0, 4) ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6 p-6 lg:p-8">
        {/* Heading */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back! Here's your platform overview.</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))
            : stats.map((s, i) => (
                <StatCard
                  key={s.label}
                  label={s.label}
                  value={s.value}
                  change={s.change}
                  index={i}
                />
              ))}
        </div>

        {/* Recent Activity + Upcoming Meetings */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            <div className="mt-4 grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border pb-2 text-xs font-medium text-muted-foreground">
              <span className="text-center">User</span>
              <span className="min-w-[120px] text-center">Role</span>
              <span className="w-6" />
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="my-3 h-12 rounded-xl" />
                ))
              ) : activity.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No recent activity.
                </p>
              ) : (
                activity.map((a) => (
                  <div
                    key={a.id}
                    className="grid grid-cols-[1fr_120px_24px] items-center gap-3 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="text-[#ffff] bg-primary/90 text-xs font-medium ">
                          {a.userInitials}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {a.userName} {a.action}
                        </p>
                        <p className="text-xs text-muted-foreground underline-offset-2">
                          {timeAgo(a.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <Badge variant="outline" className="capitalize">
                        {a.role}
                      </Badge>
                    </div>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      aria-label="More"
                    >
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Upcoming Meetings</h2>
            </div>
            <div className="mt-4 space-y-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
              ) : meetings.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No upcoming meetings.</p>
              ) : (
                meetings.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => navigate("/admin/meetings")}
                    className="flex w-full items-start gap-3 rounded-xl bg-primary/5 p-3 text-left transition-colors hover:bg-primary/10"
                  >
                    <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{m.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.date
                          ? new Date(m.date).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })
                          : ""}
                        {m.startTime ? `, ${m.startTime}` : ""}
                      </p>
                      <p className="text-xs capitalize text-muted-foreground">{m.status}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Performance Metrics + Quick Actions */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
            <h2 className="text-lg font-semibold">Performance Metrics</h2>
            {loading || !metrics ? (
              <div className="mt-4 space-y-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <MetricRow
                  label="Platform Uptime"
                  value={`${Number(metrics.platformUptimePct.toFixed(2))}%`}
                  pct={metrics.platformUptimePct}
                  className="[&>div]:bg-emerald-500"
                />
                <MetricRow
                  label="Course Completion Rate"
                  value={`${Number(metrics.courseCompletionPct.toFixed(2))}%`}
                  pct={metrics.courseCompletionPct}
                  className="[&>div]:bg-blue-500"
                />
                <MetricRow
                  label="Student Ratings"
                  value={`${Number(metrics.studentRating.toFixed(2))}/5`}
                  pct={(metrics.studentRating / 5) * 100}
                  className="[&>div]:bg-purple-500"
                />
                <MetricRow
                  label="Instructor Ratings"
                  value={`${Number(metrics.instructorRating.toFixed(2))}/5`}
                  pct={(metrics.instructorRating / 5) * 100}
                  className="[&>div]:bg-red-500"
                />
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">Quick Actions</h2>
            <p className="text-xs text-muted-foreground">Common tasks</p>
            <div className="mt-4 space-y-2">
              {quickActions.map((q) => (
                <Button
                  key={q.path}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate(q.path)}
                >
                  {q.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Pending Approvals + New Signups */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
            <h2 className="text-lg font-semibold">Pending Approvals</h2>
            <div className="mt-4 space-y-2">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
              ) : approvals.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No pending approvals.</p>
              ) : (
                approvals.map((a) => (
                  <div
                    key={a.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate("/admin/instructor-approvals")}
                    onKeyDown={(e) => e.key === "Enter" && navigate("/admin/instructor-approvals")}
                    className="flex items-center justify-between gap-3 rounded-xl p-3 text-left transition-colors hover:bg-muted"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                          {initialsOf(a.title)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{a.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          Instructor Approval · {timeAgo(a.requestedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        disabled={busyId === a.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(a.id);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                        aria-label="Approve"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={busyId === a.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReject(a.id);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                        aria-label="Reject"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <Link
              to="/admin/instructor-approvals"
              className="mt-4 inline-block text-sm text-primary hover:underline"
            >
              View All Approvals →
            </Link>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div>
              <h2 className="text-lg font-semibold">New Signups (This Week)</h2>
              {data?.signupSummary ? (
                <p className="text-xs text-muted-foreground">
                  {data.signupSummary.count} total · {data.signupSummary.studentCount} students ·{" "}
                  {data.signupSummary.instructorCount} instructors
                </p>
              ) : null}
            </div>
            <div className="mt-4 space-y-2">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)
              ) : signups.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No new signups.</p>
              ) : (
                signups.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 rounded-xl p-2">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                        {u.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{u.name}</p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {u.role} · {timeAgo(u.joinedAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;