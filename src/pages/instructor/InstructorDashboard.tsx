// ============================================================
// src/pages/instructor/InstructorDashboard.tsx
// Instructor Dashboard aligned with Figma specifications.
// Connected to backend APIs + Live Classes functionality.
// ============================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  BookOpen,
  IndianRupee,
  Star,
  Video,
  Plus,
  Calendar,
  Clock,
  UserCircle2,
  Loader2,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

import { instructorService, InstructorCourse } from "@/services/instructor.service";
import { qnaService } from "@/services/qna.service";
import { liveClassService } from "@/services/liveClassService";
import { LiveClassItem } from "@/types/liveClass";
import {
  instructorDashboardService,
  parseEnrollmentTrend,
  type CoursePerformancePoint,
  type EnrollmentCompletionPoint,
  type InstructorDashboardStats,
  type LiveSession,
  type PendingQuestion,
  type RecentStudentActivity,
} from "@/services/instructor-dashboard.service";

// ---------------- Helpers ----------------
const isToday = (d: Date) => {
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
};

const isTomorrow = (d: Date) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    d.getDate() === tomorrow.getDate() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getFullYear() === tomorrow.getFullYear()
  );
};

const formatWhenSession = (session: {
  scheduledAt?: string;
  date?: string;
  startTime?: string;
}) => {
  let dateObj: Date | null = null;

  if (session.scheduledAt) {
    const parsed = new Date(session.scheduledAt);
    if (!Number.isNaN(parsed.getTime())) {
      dateObj = parsed;
    }
  }

  if (!dateObj && session.date) {
    const timeStr = session.startTime ? session.startTime : "00:00";
    const parsed = new Date(`${session.date}T${timeStr}:00`);
    if (!Number.isNaN(parsed.getTime())) {
      dateObj = parsed;
    }
  }

  if (!dateObj) return "Scheduled session";

  const timeStr = dateObj.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isToday(dateObj)) {
    return `Today at ${timeStr}`;
  }
  if (isTomorrow(dateObj)) {
    return `Tomorrow at ${timeStr}`;
  }

  const dateLabel = dateObj.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
  return `${dateLabel} at ${timeStr}`;
};

const isUpcomingAndApproved = (item: {
  status: string;
  scheduledStartAt?: string;
  scheduledAt?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
}) => {
  const statusUpper = (item.status || "").toUpperCase();

  // Admin approves Live Class -> status is SCHEDULED or LIVE_NOW (or APPROVED)
  // Exclude PENDING_APPROVAL, REJECTED, CANCELLED, COMPLETED, ENDED
  if (
    statusUpper === "PENDING_APPROVAL" ||
    statusUpper === "REJECTED" ||
    statusUpper === "CANCELLED" ||
    statusUpper === "COMPLETED" ||
    statusUpper === "ENDED"
  ) {
    return false;
  }

  // Check start and end time
  const now = Date.now();
  let startMs = 0;
  let endMs = 0;

  const iso = item.scheduledStartAt || item.scheduledAt;
  if (iso) {
    startMs = new Date(iso).getTime();
  } else if (item.date && item.startTime) {
    startMs = new Date(`${item.date}T${item.startTime}:00`).getTime();
  }

  if (Number.isFinite(startMs) && startMs > 0) {
    if (item.endTime) {
      const datePart = iso ? iso.slice(0, 10) : item.date;
      const parsedEnd = new Date(`${datePart}T${item.endTime}:00`).getTime();
      endMs = Number.isFinite(parsedEnd) ? parsedEnd : startMs + 2 * 60 * 60 * 1000;
    } else {
      endMs = startMs + 2 * 60 * 60 * 1000; // 2 hour default duration
    }

    if (now >= endMs) {
      return false; // Scheduled live class has ended -> automatically remove from upcoming
    }
  }

  return true;
};

const timeAgo = (iso: string) => {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

const activityAction = (a: RecentStudentActivity) => {
  switch (a.type) {
    case "assignment_submitted":
      return `submitted ${a.detail || "Assignment 3"}`;
    case "module_completed":
      return `completed ${a.detail || "Module 5"}`;
    default:
      return a.detail ? `enrolled — ${a.detail}` : "enrolled";
  }
};

const currency = (value: number) =>
  `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

const truncate = (value: any, max = 14) => {
  const s = typeof value === "string" ? value : String(value ?? "");
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

// ---------------- Schedule / Edit Session Dialog ----------------
interface SessionFormValues {
  title: string;
  courseId: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
}

const emptyForm: SessionFormValues = {
  title: "",
  courseId: "",
  date: "",
  startTime: "",
  endTime: "",
  description: "",
};

const ScheduleSessionDialog = ({
  open,
  onOpenChange,
  courses,
  initial,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  courses: InstructorCourse[];
  initial?: LiveSession | null;
  saving: boolean;
  onSave: (values: SessionFormValues, editingId?: string) => Promise<boolean>;
}) => {
  const [form, setForm] = useState<SessionFormValues>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const isEditing = Boolean(initial);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (initial) {
      setForm({
        title: initial.title,
        courseId: initial.courseId,
        date: initial.date,
        startTime: initial.startTime,
        endTime: initial.endTime,
        description: initial.description ?? "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, initial]);

  const update = <K extends keyof SessionFormValues>(
    key: K,
    value: SessionFormValues[K],
  ) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return setError("Session title is required.");
    if (!form.courseId) return setError("Please select a course.");
    if (!form.date) return setError("Please pick a date.");
    if (!form.startTime || !form.endTime)
      return setError("Please set start and end time.");
    if (form.endTime <= form.startTime)
      return setError("End time must be after start time.");
    setError(null);
    const ok = await onSave(form, initial?.id);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Live Session" : "Schedule New Session"}
          </DialogTitle>
          <DialogDescription>
            Fill in the details below to {isEditing ? "update" : "schedule"} a live class
            for your learners.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="session-title">Session Title</Label>
            <Input
              id="session-title"
              value={form.title}
              placeholder="e.g. Live Q&A Session"
              onChange={(e) => update("title", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Course</Label>
            <Select value={form.courseId} onValueChange={(v) => update("courseId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="session-date">Date</Label>
              <Input
                id="session-date"
                type="date"
                value={form.date}
                onChange={(e) => update("date", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-start">Start Time</Label>
              <Input
                id="session-start"
                type="time"
                value={form.startTime}
                onChange={(e) => update("startTime", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-end">End Time</Label>
              <Input
                id="session-end"
                type="time"
                value={form.endTime}
                onChange={(e) => update("endTime", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="session-desc">Description</Label>
            <Textarea
              id="session-desc"
              rows={3}
              value={form.description}
              placeholder="What will you cover in this session?"
              onChange={(e) => update("description", e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-[#2563eb] hover:bg-blue-700">
              {saving ? "Saving..." : isEditing ? "Save Changes" : "Schedule Session"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ---------------- Page ----------------
const InstructorDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<InstructorDashboardStats | null>(null);
  const [courses, setCourses] = useState<InstructorCourse[]>([]);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [trend, setTrend] = useState<EnrollmentCompletionPoint[]>([]);
  const [rawTrendObj, setRawTrendObj] = useState<any>(null);
  const [trendPeriod, setTrendPeriod] = useState<"weekly" | "monthly" | "yearly">("weekly");
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState(false);
  const [coursePerf, setCoursePerf] = useState<CoursePerformancePoint[]>([]);
  const [activity, setActivity] = useState<RecentStudentActivity[]>([]);
  const [questions, setQuestions] = useState<PendingQuestion[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [replyingQuestion, setReplyingQuestion] = useState<PendingQuestion | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LiveSession | null>(null);
  const [saving, setSaving] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);

  const handlePeriodChange = useCallback(
    async (period: "weekly" | "monthly" | "yearly") => {
      setTrendPeriod(period);
      setTrendError(false);

      if (rawTrendObj) {
        const immediatePoints = parseEnrollmentTrend(rawTrendObj, period);
        if (immediatePoints.length > 0) {
          setTrend(immediatePoints);
        }
      }

      setTrendLoading(true);
      try {
        const data = await instructorDashboardService.getEnrollmentTrend(period);
        if (data && data.length > 0) {
          setTrend(data);
        }
      } catch (err) {
        console.error("Failed to load enrollment trend:", err);
        if (!rawTrendObj) {
          setTrendError(true);
          toast.error("Failed to update trend data");
        }
      } finally {
        setTrendLoading(false);
      }
    },
    [rawTrendObj],
  );

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    const [dashboardRes, coursesRes, liveClassesRes] = await Promise.allSettled([
      instructorDashboardService.getDashboard(trendPeriod),
      instructorService.getMyCourses(),
      liveClassService.getInstructorDashboard(),
    ]);

    let fetchedSessions: LiveSession[] = [];
    let loadedCourses: InstructorCourse[] = [];

    if (coursesRes.status === "fulfilled") {
      const value: any = coursesRes.value;
      loadedCourses = Array.isArray(value) ? value : value?.data ?? [];
      setCourses(loadedCourses);
    }

    // 1. Process Live Classes from liveClassService (Admin approved live classes)
    if (liveClassesRes.status === "fulfilled" && liveClassesRes.value) {
      const rawList = liveClassesRes.value.liveClasses || [];
      const validUpcoming = rawList.filter(isUpcomingAndApproved);

      fetchedSessions = validUpcoming.map((item: LiveClassItem) => {
        const iso = item.scheduledStartAt || item.scheduledAt || "";
        let dStr = "";
        let startStr = "";
        let endStr = "";

        if (iso) {
          const d = new Date(iso);
          dStr = d.toISOString().slice(0, 10);
          startStr = d.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
          const endD = new Date(d.getTime() + 2 * 60 * 60 * 1000);
          endStr = endD.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
        }

        const matchingCourse = loadedCourses.find((c) => c.id === item.liveCourseId);

        return {
          id: item.id,
          title: item.title,
          courseId: item.liveCourseId,
          courseName: item.courseTitle || matchingCourse?.title || "Live Course",
          description: item.description,
          date: dStr,
          startTime: startStr,
          endTime: endStr,
          scheduledAt: iso,
          enrolledCount: item.enrolledStudents ?? item.enrolledCount ?? 0,
          status:
            item.status === "LIVE_NOW" ? ("Live" as const) : ("Upcoming" as const),
          startUrl: item.startUrl,
        } as LiveSession;
      });
    }

    // 2. Set dashboard stats & main data from instructorDashboardService
    if (dashboardRes.status === "fulfilled") {
      const data = dashboardRes.value;
      setStats(data.stats);
      setRawTrendObj(data.rawEnrollmentTrend);
      setTrend(data.enrollmentTrend);
      setCoursePerf(data.coursePerformance);
      setActivity(data.recentActivity);

      // Fallback if liveClassService list is empty
      if (fetchedSessions.length === 0 && (data as any).sessions) {
        fetchedSessions = ((data as any).sessions || []).filter(isUpcomingAndApproved);
      }

      // Process Q&A
      const rawQuestions = data.pendingQuestions || [];
      const verifiedResults = await Promise.allSettled(
        rawQuestions.map(async (q) => {
          if (q.isAnswered) return { q, isAnswered: true };
          try {
            const repliesRes = await qnaService.getReplies(q.id);
            if (repliesRes.success && Array.isArray(repliesRes.data)) {
              const hasInstructorReply = repliesRes.data.some(
                (r) => r.authorRole === "instructor",
              );
              if (hasInstructorReply) {
                return { q, isAnswered: true };
              }
            }
          } catch {
            /* ignore individual reply fetch errors */
          }
          return { q, isAnswered: false };
        }),
      );

      const unansweredQuestions = verifiedResults
        .map((res) => (res.status === "fulfilled" ? res.value : null))
        .filter(
          (item): item is { q: PendingQuestion; isAnswered: boolean } =>
            item !== null && !item.isAnswered,
        )
        .map((item) => item.q);

      setQuestions(unansweredQuestions);
      setPendingCount(
        data.totalPendingQnA > 0 ? data.totalPendingQnA : unansweredQuestions.length,
      );
    } else {
      toast.error(errorMessage(dashboardRes.reason, "Failed to load dashboard"));
    }

    setSessions(fetchedSessions);
    setLoading(false);
  }, [trendPeriod]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // ---- Stat cards ----
  const statCards = useMemo(
    () => [
      {
        title: "Total Students",
        value: (stats?.totalStudents ?? 0).toLocaleString(),
        icon: Users,
      },
      {
        title: "Total Courses",
        value: (stats?.totalCourses ?? courses.length ?? 0).toString(),
        icon: BookOpen,
      },
      {
        title: "Total Revenue",
        value: currency(stats?.totalRevenue ?? 0),
        icon: IndianRupee,
      },
      {
        title: "Avg. Rating",
        value: (stats?.averageRating ?? 0).toFixed(1),
        icon: Star,
      },
      {
        title: "Live Classes",
        value: (stats?.liveClasses ?? sessions.length).toString(),
        icon: Video,
      },
    ],
    [stats, courses.length, sessions.length],
  );

  const perfChartData = useMemo(() => {
    if (coursePerf.length > 0) {
      return coursePerf.map((c) => ({ ...c, shortName: truncate(c.courseName) }));
    }
    return [];
  }, [coursePerf]);

  const trendChartData = useMemo(() => {
    if (trend.length > 0) return trend;
    return [];
  }, [trend]);

  // ---- Actions ----
  const openScheduleNew = () => {
    navigate("/instructor/meetings/schedule");
  };

  const openEdit = (s: LiveSession) => {
    setEditing(s);
    setDialogOpen(true);
  };

  const handleSaveSession = async (
    values: SessionFormValues,
    editingId?: string,
  ) => {
    setSaving(true);
    try {
      const payload = {
        title: values.title.trim(),
        courseId: values.courseId,
        date: values.date,
        startTime: values.startTime,
        endTime: values.endTime,
        ...(values.description.trim() ? { description: values.description.trim() } : {}),
      };

      if (editingId) {
        const updated = await instructorDashboardService.updateLiveSession(
          editingId,
          payload,
        );
        setSessions((prev) =>
          prev.map((s) => (s.id === editingId ? { ...s, ...updated, id: editingId } : s)),
        );
        toast.success("Live session updated");
      } else {
        const created = await instructorDashboardService.scheduleLiveSession(payload);
        setSessions((prev) => [created, ...prev]);
        toast.success("Live session scheduled");
      }
      return true;
    } catch (error) {
      toast.error(errorMessage(error, "Failed to save live session"));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleStart = async (s: LiveSession) => {
    setStartingId(s.id);
    try {
      if ((s as any).startUrl) {
        window.open((s as any).startUrl, "_blank");
        toast.success("Session started");
        return;
      }

      const res = await liveClassService.startLiveClass(s.id);
      if (res?.startUrl) {
        window.open(res.startUrl, "_blank");
        toast.success("Session started");
        loadDashboard();
        return;
      }

      const started = await instructorDashboardService.startLiveSession(s.id);
      if ((started as any)?.startUrl) {
        window.open((started as any).startUrl, "_blank");
      }
      toast.success("Session started");
      loadDashboard();
    } catch (error: any) {
      const msg = (error?.response?.data?.message || error?.message || "").toLowerCase();
      const code = error?.response?.data?.code;
      if (code === "VAL_004" || msg.includes("already started") || msg.includes("has already started")) {
        toast("Class already started");
        if ((s as any).startUrl || (s as any).joinUrl) {
          window.open((s as any).startUrl || (s as any).joinUrl, "_blank");
        }
        loadDashboard();
      } else {
        toast.error(errorMessage(error, "Failed to start session"));
      }
    } finally {
      setStartingId(null);
    }
  };

  const handleOpenReplyModal = (q: PendingQuestion) => {
    setReplyingQuestion(q);
    setReplyText("");
  };

  const handlePostReply = async () => {
    if (!replyText.trim() || !replyingQuestion) return;
    setSubmittingReply(true);
    try {
      await qnaService.answer(replyingQuestion.id, replyText.trim());
      toast.success("Reply posted successfully");
      setQuestions((prev) => prev.filter((q) => q.id !== replyingQuestion.id));
      setPendingCount((prev) => Math.max(0, prev - 1));
      setReplyingQuestion(null);
      setReplyText("");
    } catch {
      toast.error("Failed to post reply");
    } finally {
      setSubmittingReply(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2563eb] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Welcome back! Here's your course overview.
        </p>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map(({ title, value, icon: Icon }) => (
          <Card
            key={title}
            className="relative overflow-hidden border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-md"
          >
            {/* Soft decorative light blue corner glow */}
            <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-blue-50/80 dark:bg-blue-950/40 pointer-events-none" />

            <div className="flex items-start justify-between relative z-10">
              <span className="text-2xl font-bold text-[#1d4ed8] dark:text-blue-400 tracking-tight">
                {value}
              </span>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-white shadow-xs">
                <Icon className="h-5 w-5" />
              </div>
            </div>

            <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mt-2 relative z-10">
              {title}
            </p>
          </Card>
        ))}
      </div>

      {/* Upcoming Live Sessions Card Section */}
      <div className="rounded-2xl border border-[#c7d9ff] dark:border-blue-900/60 bg-[#edf3ff] dark:bg-blue-950/20 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Upcoming Live Sessions
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {sessions.length} session{sessions.length === 1 ? "" : "s"} scheduled
            </p>
          </div>
          <Button
            onClick={openScheduleNew}
            className="bg-[#2563eb] hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-all self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            Schedule New Session
          </Button>
        </div>

        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#b0c8ff] dark:border-blue-800 bg-white/70 dark:bg-slate-900/70 p-8 text-center">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/50 p-3 text-[#2563eb] dark:text-blue-400 mb-3">
              <Video className="h-6 w-6" />
            </div>
            <p className="font-semibold text-slate-800 dark:text-slate-200 text-base">
              No upcoming live sessions
            </p>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">
              When live sessions are scheduled and approved by admin, they will appear here.
            </p>
            <Button
              onClick={openScheduleNew}
              size="sm"
              className="bg-[#2563eb] hover:bg-blue-700 text-white font-medium"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Schedule New Session
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-[#dbe6ff] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs transition-all hover:border-blue-300"
              >
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-200/60 bg-blue-50 dark:bg-blue-950/60 text-[#2563eb] dark:text-blue-400 mt-0.5 sm:mt-0">
                    <Video className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 dark:text-white text-base leading-tight">
                        {s.title}
                      </h3>
                      {s.status === "Live" && (
                        <Badge
                          variant="destructive"
                          className="animate-pulse text-[10px] uppercase font-bold px-1.5 py-0"
                        >
                          Live
                        </Badge>
                      )}
                    </div>
                    <p className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{formatWhenSession(s)}</span>
                    </p>
                    <p className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                      <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{s.enrolledCount ?? 0} learners enrolled</span>
                    </p>
                  </div>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  <Button
                    size="sm"
                    className="bg-[#2563eb] hover:bg-blue-700 text-white rounded-lg px-5 py-1.5 text-xs font-semibold shadow-xs min-w-[70px]"
                    disabled={startingId === s.id || s.status === "Live"}
                    onClick={() => handleStart(s)}
                  >
                    {s.status === "Live"
                      ? "Live"
                      : startingId === s.id
                      ? "Starting..."
                      : "Start"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg px-5 py-1.5 text-xs font-medium min-w-[70px]"
                    onClick={() => openEdit(s)}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Middle Row: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollment & Completion Trend */}
        <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs rounded-2xl p-5">
          <div className="flex flex-row items-center justify-between pb-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Enrollment & Completion Trend
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {trendPeriod === "weekly"
                  ? "Last 7 days performance"
                  : trendPeriod === "monthly"
                  ? "Last 30 days performance"
                  : "Last 12 months performance"}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {(["weekly", "monthly", "yearly"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePeriodChange(p)}
                  disabled={trendLoading}
                  className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-all ${
                    trendPeriod === p
                      ? "bg-[#2563eb] text-white shadow-xs"
                      : "border border-blue-400 text-[#2563eb] bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="h-72 w-full pt-2">
            {trendLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading trend data...
              </div>
            ) : trendError ? (
              <div className="flex h-full items-center justify-center text-sm text-destructive">
                Failed to load trend data.
              </div>
            ) : trendChartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  No enrollment trend data yet
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Trends will show once students begin enrolling in your courses
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="completions"
                    name="Completions"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#38bdf8" }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="enrollments"
                    name="Enrollments"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#2563eb" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Course Performance */}
        <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs rounded-2xl p-5">
          <div className="pb-4">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Course Performance
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Completion rate %
            </p>
          </div>
          <div className="h-72 w-full pt-2">
            {perfChartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  No course performance data available
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Completion rate metrics will appear as students take your courses
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perfChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="shortName"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#475569" }}
                    interval={0}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [`${value}%`, "Completion"]}
                    labelFormatter={(_label, payload) =>
                      payload?.[0]?.payload?.courseName ?? ""
                    }
                  />
                  <Bar
                    dataKey="score"
                    name="Completion %"
                    fill="#2563eb"
                    radius={[6, 6, 0, 0]}
                    barSize={38}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Bottom Row: Recent Activity + Pending Q&A */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Student Activity */}
        <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs rounded-2xl p-5">
          <div className="flex flex-row items-center justify-between pb-3">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Recent Student Activity
            </h3>
            <Link
              to="/instructor/students"
              className="text-sm font-medium text-[#2563eb] hover:underline"
            >
              View All
            </Link>
          </div>
          <div>
            {activity.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                No recent activity.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {activity.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 py-3.5">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#2563eb]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-normal text-slate-800 dark:text-slate-200">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {a.studentName}
                        </span>{" "}
                        <span className="font-medium text-[#2563eb] dark:text-blue-400">
                          {activityAction(a)}
                        </span>
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {a.courseName}
                        {a.createdAt ? `  ·  ${timeAgo(a.createdAt)}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Pending Q&A */}
        <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs rounded-2xl p-5">
          <div className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Pending Q&amp;A
              </h3>
              {pendingCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white shadow-xs">
                  {pendingCount}
                </span>
              )}
            </div>
            <Link
              to="/instructor/qna"
              className="text-sm font-medium text-[#2563eb] hover:underline"
            >
              View All
            </Link>
          </div>
          <div>
            {questions.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                No pending questions.
              </p>
            ) : (
              <ul className="space-y-3">
                {questions.map((q) => (
                  <li
                    key={q.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-[#93c5fd]/50 dark:border-blue-900/60 bg-white dark:bg-slate-900 p-4 shadow-xs"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {q.studentName}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                        {q.question}
                      </p>
                      <p className="text-xs font-medium text-[#2563eb] dark:text-blue-400 pt-1 flex items-center gap-1">
                        <span>← {q.courseName || q.tag}</span>
                        <span className="text-slate-400">· student question</span>
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="bg-[#2563eb] hover:bg-blue-700 text-white rounded-lg px-4 py-1.5 text-xs font-semibold shadow-xs shrink-0"
                      onClick={() => handleOpenReplyModal(q)}
                    >
                      Reply
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <ScheduleSessionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        courses={courses}
        initial={editing}
        saving={saving}
        onSave={handleSaveSession}
      />

      {/* Reply Q&A Modal */}
      <Dialog
        open={replyingQuestion !== null}
        onOpenChange={(open) => !open && setReplyingQuestion(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reply to {replyingQuestion?.studentName}</DialogTitle>
            <DialogDescription>
              Posted in {replyingQuestion?.courseName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm italic">"{replyingQuestion?.question}"</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reply-text">Your Answer</Label>
              <Textarea
                id="reply-text"
                rows={4}
                value={replyText}
                placeholder="Type your response here..."
                onChange={(e) => setReplyText(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={submittingReply}
              onClick={() => setReplyingQuestion(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#2563eb] hover:bg-blue-700 text-white"
              disabled={submittingReply || !replyText.trim()}
              onClick={handlePostReply}
            >
              {submittingReply ? "Posting..." : "Send Reply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InstructorDashboard;
