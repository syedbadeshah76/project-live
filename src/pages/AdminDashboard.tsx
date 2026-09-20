import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  UserCog,
  BookOpen,
  Video,
  GraduationCap,
  CalendarDays,
  Check,
  X,
  MoreVertical,
  TrendingUp,
} from "lucide-react";
import {
  platformService,
  timeAgo,
  type PlatformOverview,
  type RecentActivity,
  type PerformanceMetrics,
  type NewSignup,
} from "@/services/platform.service";
import { meetingService } from "@/services/meeting.service";
import type { Meeting } from "@/types/meeting.types";
import { instructorService, type InstructorApplication } from "@/services/instructor.service";

// ============= Stat Card =============
const STAT_ICONS = [
  { Icon: Users, bg: "bg-blue-100", fg: "text-blue-600" },
  { Icon: UserCog, bg: "bg-purple-100", fg: "text-purple-600" },
  { Icon: BookOpen, bg: "bg-emerald-100", fg: "text-emerald-600" },
  { Icon: Video, bg: "bg-orange-100", fg: "text-orange-600" },
  { Icon: GraduationCap, bg: "bg-pink-100", fg: "text-pink-600" },
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
  const { Icon, bg, fg } = STAT_ICONS[index];
  return (
    <div className="bg-card rounded-2xl p-5 border border-border">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className={`p-2 rounded-lg ${bg}`}>
          <Icon className={`h-4 w-4 ${fg}`} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <p className="text-2xl font-bold text-foreground">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600 mb-1">
          <TrendingUp className="h-3 w-3" />+{change}%
        </span>
      </div>
    </div>
  );
}

// ============= Dashboard =============
const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [approvals, setApprovals] = useState<InstructorApplication[]>([]);
  const [signups, setSignups] = useState<NewSignup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      platformService.getOverview(),
      platformService.getRecentActivity(5),
      platformService.getPerformanceMetrics(),
      platformService.getNewSignupsThisWeek(),
      meetingService.getAdminMeetings(),
      instructorService.getApplications(),
    ]).then((results) => {
      if (results[0].status === "fulfilled" && results[0].value.success) setOverview(results[0].value.data);
      if (results[1].status === "fulfilled" && results[1].value.success) setActivity(results[1].value.data);
      if (results[2].status === "fulfilled" && results[2].value.success) setMetrics(results[2].value.data);
      if (results[3].status === "fulfilled" && results[3].value.success) setSignups(results[3].value.data);
      if (results[4].status === "fulfilled" && results[4].value.success) {
        const upcoming = results[4].value.data
          .filter((m) => m.status === "approved" || m.status === "pending")
          .slice(0, 3);
        setMeetings(upcoming);
      }
      if (results[5].status === "fulfilled" && results[5].value.success) {
        setApprovals(results[5].value.data.filter((a) => a.status === "pending").slice(0, 3));
      }
      setLoading(false);
    });
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await instructorService.reviewApplication(id, "approved");
      setApprovals((prev) => prev.filter((a) => a.id !== id));
      toast({ title: "Instructor approved" });
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
    }
  };

  const handleReject = async (id: string) => {
    try {
      await instructorService.reviewApplication(id, "rejected");
      setApprovals((prev) => prev.filter((a) => a.id !== id));
      toast({ title: "Application rejected" });
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
    }
  };

  const quickActions = [
    { label: "View Revenue", path: "/admin/revenue" },
    { label: "Instructor Approvals", path: "/admin/instructor-approvals" },
    { label: "Manage Courses", path: "/admin/courses" },
    { label: "View Users", path: "/admin/users" },
    { label: "View Analytics", path: "/admin/analytics" },
  ];

  const stats = overview
    ? [
        { label: "Total Students", value: overview.totalStudents, change: overview.studentsChangePct },
        { label: "Total Instructors", value: overview.totalInstructors, change: overview.instructorsChangePct },
        { label: "Total Courses", value: overview.totalCourses, change: overview.coursesChangePct },
        { label: "Live Classes", value: overview.liveClasses, change: overview.liveClassesChangePct },
        { label: "Total Enrollment", value: overview.totalEnrollments, change: overview.enrollmentsChangePct },
      ]
    : [];

  const initialsOf = (s: string) =>
    s.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        {/* Heading */}
        <div className="mb-6">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground text-sm">
            Welcome back! Here's your platform overview.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-[110px] rounded-2xl" />
              ))
            : stats.map((s, i) => <StatCard key={s.label} {...s} index={i} />)}
        </div>

        {/* Row: Recent Activity + Upcoming Meetings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6">
            <h2 className="font-semibold text-foreground mb-4">Recent Activity</h2>
            <div className="grid grid-cols-[1fr_auto_auto] gap-y-3 text-xs text-muted-foreground border-b border-border pb-2 mb-2">
              <span>User</span>
              <span>Role</span>
              <span></span>
            </div>
            <div className="space-y-2">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)
              ) : activity.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No recent activity.</p>
              ) : (
                activity.map((a) => (
                  <div
                    key={a.id}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {a.userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {a.userName} {a.action}
                        </p>
                        <p className="text-xs text-muted-foreground">{timeAgo(a.createdAt)}</p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="capitalize border-primary/30 text-primary bg-primary/5 rounded-full font-normal"
                    >
                      {a.role}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Upcoming Meetings</h2>
              <Link to="/admin/meetings" className="text-xs text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
              ) : meetings.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No upcoming meetings.</p>
              ) : (
                meetings.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => navigate("/admin/meetings")}
                    className="w-full text-left bg-primary/5 hover:bg-primary/10 transition-colors p-3 rounded-xl flex items-start gap-3"
                  >
                    <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                      <CalendarDays className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{m.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(m.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}, {m.startTime}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">{m.status}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Row: Performance Metrics + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6">
            <h2 className="font-semibold text-foreground mb-4">Performance Metrics</h2>
            {loading || !metrics ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : (
              <div className="space-y-5">
                <MetricRow label="Platform Uptime" value={`${Number(metrics.platformUptimePct.toFixed(2))}%`} pct={metrics.platformUptimePct} color="bg-emerald-500" />
                <MetricRow label="Course Completion Rate" value={`${Number(metrics.courseCompletionPct.toFixed(2))}%`} pct={metrics.courseCompletionPct} color="bg-blue-500" />
                <MetricRow label="Student Ratings" value={`${Number(metrics.studentRating.toFixed(2))}/5`} pct={(metrics.studentRating / 5) * 100} color="bg-violet-500" />
                <MetricRow label="Instructor Ratings" value={`${Number(metrics.instructorRating.toFixed(2))}/5`} pct={(metrics.instructorRating / 5) * 100} color="bg-red-500" />
              </div>
            )}
          </div>

          <div className="bg-card rounded-2xl border border-border p-6">
            <h2 className="font-semibold text-foreground mb-1">Quick Actions</h2>
            <p className="text-xs text-muted-foreground mb-4">Common tasks</p>
            <div className="space-y-2">
              {quickActions.map((q) => (
                <Button
                  key={q.path}
                  variant="outline"
                  className="w-full justify-start font-normal"
                  onClick={() => navigate(q.path)}
                >
                  {q.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Row: Pending Approvals + New Signups */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6">
            <h2 className="font-semibold text-foreground mb-4">Pending Approvals</h2>
            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)
              ) : approvals.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No pending approvals.</p>
              ) : (
                approvals.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => navigate("/admin/instructor-approvals")}
                    className="w-full flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {initialsOf(a.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{a.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          Instructor Approval · {timeAgo(a.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(a.id);
                        }}
                        className="h-8 w-8 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center"
                        aria-label="Approve"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReject(a.id);
                        }}
                        className="h-8 w-8 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center"
                        aria-label="Reject"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </button>
                ))
              )}
            </div>
            <Link
              to="/admin/instructor-approvals"
              className="inline-block mt-4 text-sm text-primary hover:underline"
            >
              View All Approvals →
            </Link>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6">
            <h2 className="font-semibold text-foreground mb-4">New Signups (This Week)</h2>
            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)
              ) : signups.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No new signups.</p>
              ) : (
                signups.map((u) => (
                  <div key={u.id} className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {u.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {u.role} · {timeAgo(u.joinedAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AdminLayout>
  );
};

function MetricRow({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

export default AdminDashboard;
