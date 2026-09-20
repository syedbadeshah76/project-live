import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  BookOpen,
  Clock,
  GraduationCap,
  Flame,
  Trophy,
  Award,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { enrollmentService } from "@/services/enrollment.service";
import {
  studentAnalyticsService,
} from "@/services/student-analytics.service";
import { streakService, type StreakData } from "@/services/streak.service";
import { quizService, type QuizAttempt } from "@/services/quiz.service";
import { certificatesService } from "@/services/certificates.service";
import type { Enrollment, Certificate, UserAnalytics } from "@/types/api.types";

type Period = "week" | "month" | "year";
type Status = "idle" | "loading" | "success" | "error";

interface Resource<T> {
  data: T;
  status: Status;
  error?: string;
  reload: () => void;
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
];

const PERIOD_STORAGE_KEY = "edvanz_analytics_period";

const CATEGORY_COLORS = [
  "#2563EB",
  "#3B82F6",
  "#60A5FA",
  "#93C5FD",
  "#BFDBFE",
  "#DBEAFE",
];

const DAYS_OF_WEEK = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

// Generic hook: load any async resource w/ status & retry.
function useResource<T>(
  loader: () => Promise<T>,
  deps: React.DependencyList,
  initial: T,
): Resource<T> {
  const [data, setData] = useState<T>(initial);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | undefined>();
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let mounted = true;
    setStatus("loading");
    setError(undefined);
    loader()
      .then((d) => {
        if (!mounted) return;
        setData(d);
        setStatus("success");
      })
      .catch((e: unknown) => {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Failed to load");
        setStatus("error");
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, status, error, reload };
}

const readInitialPeriod = (search: URLSearchParams): Period => {
  const fromUrl = search.get("period");
  if (fromUrl === "week" || fromUrl === "month" || fromUrl === "year")
    return fromUrl;
  try {
    const stored = localStorage.getItem(PERIOD_STORAGE_KEY);
    if (stored === "week" || stored === "month" || stored === "year")
      return stored;
  } catch {
    /* ignore */
  }
  return "week";
};

const LearningAnalytics = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [period, setPeriodState] = useState<Period>(() =>
    readInitialPeriod(searchParams),
  );

  const setPeriod = useCallback(
    (next: Period) => {
      setPeriodState(next);
      try {
        localStorage.setItem(PERIOD_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      const sp = new URLSearchParams(searchParams);
      sp.set("period", next);
      setSearchParams(sp, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    if (searchParams.get("period") !== period) {
      const sp = new URLSearchParams(searchParams);
      sp.set("period", period);
      setSearchParams(sp, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- API Resources ----------
  const enrollmentsR = useResource<Enrollment[]>(
    () =>
      enrollmentService.getMyEnrollments().then((r) => {
        if (!r.success) throw new Error("Failed to load enrollments");
        return r.data;
      }),
    [],
    [],
  );

  const streakR = useResource<StreakData | null>(
    () =>
      streakService.getStreakData().then((r) => {
        if (!r.success) throw new Error("Failed to load streak");
        return r.data;
      }),
    [],
    null,
  );

  const attemptsR = useResource<QuizAttempt[]>(
    () =>
      quizService.getStudentAttempts().then((r) => {
        if (!r.success) throw new Error("Failed to load quiz attempts");
        return r.data;
      }),
    [],
    [],
  );

  const certificatesR = useResource<Certificate[]>(
    () =>
      certificatesService.getMyCertificates().then((r) => {
        if (!r.success) throw new Error("Failed to load certificates");
        return r.data;
      }),
    [],
    [],
  );

  const leaderboardR = useResource<QuizAttempt[]>(
    async () => {
      const quizzes = await quizService.getAllQuizzes();
      if (!quizzes.success || quizzes.data.length === 0)
        return [] as QuizAttempt[];
      const lb = await quizService.getLeaderboard(quizzes.data[0].id);
      if (!lb.success) throw new Error("Failed to load leaderboard");
      return lb.data.slice(0, 5);
    },
    [],
    [],
  );

  const analyticsR = useResource<UserAnalytics | null>(
    () =>
      studentAnalyticsService.getAnalytics(period).then((r) => {
        if (!r.success) throw new Error("Failed to load analytics");
        return r.data;
      }),
    [period],
    null,
  );

  const enrollments = enrollmentsR.data;
  const streak = streakR.data;
  const attempts = attemptsR.data;
  const certificates = certificatesR.data;
  const leaderboard = leaderboardR.data;
  const analytics = analyticsR.data;

  // ---------- Real API Data Mapping ----------
  const stats = useMemo(() => {
    const sum = analytics?.summary;
    const enrolled = sum?.coursesEnrolled ?? (enrollmentsR.status === "success" ? enrollments.length : 0);
    const inProgress =
      sum?.coursesInProgress ??
      (enrollmentsR.status === "success"
        ? enrollments.filter(
            (e) =>
              (e.progress?.progressPercentage ?? 0) > 0 &&
              (e.progress?.progressPercentage ?? 0) < 100,
          ).length
        : 0);

    const hours =
      sum?.hoursLearned ??
      (period === "week"
        ? analytics?.weeklyActivity?.reduce((s, d) => s + d.hours, 0) ?? 0
        : (analytics?.totalWatchTime ?? 0) / 60);

    const prevHours = sum?.hoursLearnedPrevPeriod ?? 0;
    const diff = sum ? hours - prevHours : 0;
    const hoursSub = sum
      ? `${diff >= 0 ? "+" : ""}${diff.toFixed(1)} vs Last period`
      : `This ${period}`;

    const lecturesCompleted =
      sum?.lecturesCompleted ??
      (enrollmentsR.status === "success"
        ? enrollments.reduce(
            (s, e) => s + (e.progress?.completedLessons?.length || 0),
            0,
          )
        : 0);

    const lecturesRemaining =
      sum?.lecturesRemaining ??
      (enrollmentsR.status === "success"
        ? Math.max(
            0,
            enrollments.reduce(
              (s, e) => s + (e.progress?.totalLessons || e.course.lessons || 0),
              0,
            ) - lecturesCompleted,
          )
        : 0);

    const streakDays = streak?.currentStreak ?? analytics?.streak ?? 0;
    const bestStreak = streak?.longestStreak ?? 0;

    return {
      enrolled,
      inProgress,
      hours: Number(hours.toFixed(1)),
      hoursSub,
      lecturesCompleted,
      lecturesRemaining,
      streakDays,
      bestStreak,
    };
  }, [enrollments, enrollmentsR.status, analytics, period, streak]);

  // ---------- Activity Breakdown Chart ----------
  const activityData = useMemo(() => {
    if (analytics?.activityBreakdown && analytics.activityBreakdown.length > 0) {
      return analytics.activityBreakdown.map((item) => ({
        label: item.label,
        minutes: item.minutesWatched,
      }));
    }
    if (
      analytics?.weeklyTrend &&
      analytics.weeklyTrend.length > 0 &&
      period !== "week"
    ) {
      return analytics.weeklyTrend.map((item) => ({
        label: item.weekLabel,
        minutes: item.minutesWatched,
      }));
    }
    if (analytics?.weeklyActivity && analytics.weeklyActivity.length > 0) {
      return analytics.weeklyActivity.map((d) => ({
        label: d.day,
        minutes: Math.round(d.hours * 60),
      }));
    }
    return [];
  }, [analytics, period]);

  const bestActivity = useMemo(() => {
    if (!activityData.length) return null;
    return activityData.reduce((a, b) => (b.minutes > a.minutes ? b : a));
  }, [activityData]);

  const avgActivity = useMemo(() => {
    if (!activityData.length) return 0;
    return Math.round(
      activityData.reduce((s, d) => s + d.minutes, 0) / activityData.length,
    );
  }, [activityData]);

  // ---------- Category Breakdown Chart ----------
  const categoryData = useMemo(() => {
    if (analytics?.categoryBreakdown && analytics.categoryBreakdown.length > 0) {
      return analytics.categoryBreakdown.map((item, i) => ({
        name: item.categoryName,
        value: item.percentage,
        minutesWatched: item.minutesWatched,
        color: item.color || CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      }));
    }
    if (
      analytics?.categoryDistribution &&
      analytics.categoryDistribution.length > 0
    ) {
      return analytics.categoryDistribution.map((item, i) => ({
        name: item.category,
        value: item.percentage,
        minutesWatched: item.count,
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      }));
    }
    if (enrollments.length > 0) {
      const map = new Map<string, number>();
      enrollments.forEach((e) => {
        const name =
          typeof e.course.category === "object"
            ? e.course.category?.name || "Other"
            : String(e.course.category || "Other");
        map.set(name, (map.get(name) || 0) + 1);
      });
      const total = Array.from(map.values()).reduce((s, v) => s + v, 0) || 1;
      return Array.from(map.entries()).map(([name, count], i) => ({
        name,
        value: Math.round((count / total) * 100),
        minutesWatched: 0,
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      }));
    }
    return [];
  }, [analytics, enrollments]);

  // ---------- Quiz Trend ----------
  const quizTrend = useMemo(() => {
    if (attempts.length > 0) {
      const sorted = [...attempts].sort(
        (a, b) =>
          new Date(a.completedAt || a.startedAt).getTime() -
          new Date(b.completedAt || b.startedAt).getTime(),
      );
      return sorted.slice(-7).map((a, i) => ({
        name: `Quiz ${i + 1}`,
        score: a.percentage,
      }));
    }
    return [];
  }, [attempts]);

  const quizStats = useMemo(() => {
    if (!quizTrend.length) return { pass: 0, best: 0, avg: 0 };
    const best = Math.max(...quizTrend.map((q) => q.score));
    const avg = Math.round(
      quizTrend.reduce((s, q) => s + q.score, 0) / quizTrend.length,
    );
    const pass = Math.round(
      (quizTrend.filter((q) => q.score >= 50).length / quizTrend.length) * 100,
    );
    return { pass, best, avg };
  }, [quizTrend]);

  // ---------- Weekly Activity Streak Pills ----------
  const weekStrip = useMemo(() => {
    const raw = streak?.weeklyActivity ?? [];
    if (raw.length === 7) {
      return raw.map((d) => ({
        shortName: d.shortName || d.date || "—",
        active: Boolean(d.active),
      }));
    }
    return DAYS_OF_WEEK.map((day) => ({
      shortName: day,
      active: false,
    }));
  }, [streak]);

  // ---------- Leaderboard ----------
  const leaderboardTable = useMemo(() => {
    if (leaderboard.length > 0) {
      return leaderboard.map((entry, idx) => ({
        rank: idx + 1,
        name: entry.userName || "Student",
        coursesCompleted: entry.correctCount || 0,
        streaks: stats.bestStreak || 0,
        badges: 0,
        ezCoins: 0,
      }));
    }
    return [];
  }, [leaderboard, stats.bestStreak]);

  // ---------- Courses in Progress ----------
  const inProgressCoursesList = useMemo(() => {
    return enrollments
      .filter((e) => {
        if (e.status === "completed") return false;
        const p = e.progress?.progressPercentage ?? 0;
        return p >= 0 && p < 100;
      })
      .map((e) => {
        const p = e.progress?.progressPercentage ?? 0;
        const done = e.progress?.completedLessons?.length ?? 0;
        const total = e.progress?.totalLessons || e.course.lessons || 0;
        return {
          id: e.id,
          courseId: e.course.id,
          title: e.course.title,
          progress: p,
          completedLectures: done,
          totalLectures: total,
          lastViewed: e.progress?.lastAccessedAt
            ? new Date(e.progress.lastAccessedAt).toLocaleDateString()
            : "Recently",
        };
      });
  }, [enrollments]);

  // ---------- Completed Courses ----------
  const completedCoursesList = useMemo(() => {
    return enrollments
      .filter(
        (e) =>
          e.status === "completed" ||
          (e.progress?.progressPercentage ?? 0) >= 100,
      )
      .map((e) => {
        const cert = certificates.find((c) => c.course.id === e.course.id);
        const categoryName =
          typeof e.course.category === "object"
            ? e.course.category.name
            : String(e.course.category || "Course");
        return {
          id: e.id,
          courseId: e.course.id,
          title: e.course.title,
          category: categoryName,
          completedDate: cert?.issuedAt
            ? new Date(cert.issuedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
            : "Completed",
          thumbnail:
            e.course.thumbnail ||
            "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&auto=format&fit=crop&q=80",
          hasCertificate: Boolean(cert),
        };
      });
  }, [enrollments, certificates]);

  const statsLoading =
    enrollmentsR.status === "loading" ||
    streakR.status === "loading" ||
    analyticsR.status === "loading";
  const statsError =
    enrollmentsR.status === "error" ||
    analyticsR.status === "error" ||
    streakR.status === "error";

  const reloadStats = () => {
    if (enrollmentsR.status === "error") enrollmentsR.reload();
    if (analyticsR.status === "error") analyticsR.reload();
    if (streakR.status === "error") streakR.reload();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 max-w-7xl mx-auto pb-8"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            Analytics
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track your learning progress and achievements
            {user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all ${
                period === opt.value
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-blue-50/60 dark:bg-card text-primary border-primary/30 hover:bg-blue-100/50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top 4 Stat cards */}
      <WidgetShell
        loading={statsLoading}
        error={statsError ? "Couldn't load your stats." : undefined}
        onRetry={reloadStats}
        skeletonHeight={110}
        skeletonCols={4}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            value={stats.enrolled}
            label="Courses Enrolled"
            sub={`${stats.inProgress} in progress`}
          />
          <StatCard
            value={`${stats.hours}`}
            label="Hours Learned"
            sub={stats.hoursSub}
          />
          <StatCard
            value={stats.lecturesCompleted}
            label="Lectures Completed"
            sub={`of ${stats.lecturesRemaining} remaining`}
          />
          {/* <StatCard
            value={stats.streakDays}
            label="Days Streak"
            sub={`Best ${stats.bestStreak} days`}
            hasFlame
          /> */}
        </div>
      </WidgetShell>

      {/* Learning activity + category */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-border/80 shadow-sm rounded-2xl">
          <CardContent className="p-5 md:p-6">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Learning Activity
              </h3>
              <div className="text-xs text-primary font-bold space-x-4">
                <span>
                  Best: {bestActivity ? `${bestActivity.label} ${bestActivity.minutes}min` : "—"}
                </span>
                <span>
                  Avg: {avgActivity}/day
                </span>
              </div>
            </div>
            <WidgetState
              status={analyticsR.status}
              error={analyticsR.error}
              onRetry={analyticsR.reload}
              height={260}
            >
              {activityData.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                  <BookOpen className="h-8 w-8 mb-2 opacity-40 text-primary" />
                  <p className="text-sm font-medium">No learning activity recorded for this period.</p>
                </div>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityData} barCategoryGap={16}>
                      <defs>
                        <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563EB" stopOpacity={1} />
                          <stop offset="100%" stopColor="#60A5FA" stopOpacity={0.8} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="4 4"
                        vertical={false}
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "hsl(var(--muted-foreground))",
                          fontSize: 12,
                        }}
                      />
                      <YAxis
                        domain={[0, "auto"]}
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "hsl(var(--muted-foreground))",
                          fontSize: 12,
                        }}
                        tickFormatter={(v) => `${v}min`}
                      />
                      <Tooltip
                        cursor={{ fill: "transparent" }}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "12px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                        }}
                        formatter={(v: number) => [`${v} min`, "Learning"]}
                      />
                      <Bar
                        dataKey="minutes"
                        fill="url(#actGrad)"
                        radius={[12, 12, 12, 12]}
                        barSize={38}
                        background={{
                          fill: "hsl(215, 20%, 94%)",
                          radius: 12,
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </WidgetState>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm rounded-2xl">
          <CardContent className="p-5 md:p-6">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2 mb-6">
              <BookOpen className="h-5 w-5 text-primary" />
              Learning by Category
            </h3>
            <WidgetState
              status={analyticsR.status}
              error={analyticsR.error}
              onRetry={analyticsR.reload}
              height={260}
            >
              {categoryData.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                  <BookOpen className="h-8 w-8 mb-2 opacity-40 text-primary" />
                  <p className="text-sm font-medium">No category breakdown available.</p>
                </div>
              ) : (
                <>
                  <div className="h-72 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={72}
                          outerRadius={105}
                          paddingAngle={5}
                          cornerRadius={12}
                          dataKey="value"
                          stroke="transparent"
                        >
                          {categoryData.map((c, i) => (
                            <Cell key={i} fill={c.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: number, n) => [`${v}%`, n as string]}
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-primary text-xl font-bold">
                        Learning
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 justify-center mt-3">
                    {categoryData.map((c) => (
                      <div
                        key={c.name}
                        className="flex items-center gap-1.5 text-xs font-semibold"
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: c.color }}
                        />
                        <span className="text-muted-foreground">
                          {c.value}% {c.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </WidgetState>
          </CardContent>
        </Card>
      </div>

      {/* Quiz performance + weekly streak */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-border/80 shadow-sm rounded-2xl">
          <CardContent className="p-5 md:p-6">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Quiz Performance
              </h3>
              <div className="text-xs text-primary font-bold space-x-3">
                <span>Pass Rate: {quizStats.pass}%</span>
                <span>Best: {quizStats.best}%</span>
                <span>Avg: {quizStats.avg}%</span>
              </div>
            </div>
            <WidgetState
              status={attemptsR.status}
              error={attemptsR.error}
              onRetry={attemptsR.reload}
              height={224}
            >
              {quizTrend.length === 0 ? (
                <div className="h-60 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                  <BookOpen className="h-8 w-8 mb-2 opacity-40 text-primary" />
                  <p className="text-sm font-medium">No quiz attempts recorded yet.</p>
                </div>
              ) : (
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={quizTrend}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        ticks={[0, 20, 40, 60, 80, 100]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(v: number) => [`${v}%`, "Score"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#2563EB"
                        strokeWidth={3}
                        dot={{ r: 5, fill: "#2563EB", strokeWidth: 2, stroke: "#FFFFFF" }}
                        activeDot={{ r: 7 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </WidgetState>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm rounded-2xl">
          <CardContent className="p-5 md:p-6">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-primary" />
              Weekly Activity Streak
            </h3>
            <WidgetState
              status={streakR.status}
              error={streakR.error}
              onRetry={streakR.reload}
              height={224}
            >
              <div className="space-y-3">
                <p className="text-base font-bold text-foreground">
                  {streak?.calendarStats?.daysWithoutBreak ?? streak?.currentStreak ?? 0} Days without a break
                </p>
                <p className="text-xs text-muted-foreground">
                  The record is {streak?.calendarStats?.recordDays ?? streak?.longestStreak ?? 0} Days without a break
                </p>
                <div className="grid grid-cols-7 gap-2 pt-1">
                  {weekStrip.map((d, i) => (
                    <div
                      key={i}
                      className={`aspect-square rounded-2xl flex flex-col items-center justify-center p-1 text-xs font-semibold ${
                        d.active
                          ? "bg-primary text-white shadow-sm"
                          : "bg-muted/80 text-muted-foreground"
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold tracking-wider">
                        {d.shortName}
                      </span>
                      <Flame
                        className={`h-4 w-4 mt-1 ${
                          d.active
                            ? "fill-white text-white"
                            : "fill-muted-foreground/40 text-muted-foreground/40"
                        }`}
                      />
                    </div>
                  ))}
                </div>
                {/* <div className="flex flex-col gap-2 pt-2 text-xs font-semibold text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                    <span>{streak?.calendarStats?.classesCovered ?? 0} Classes covered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                    <span>{streak?.calendarStats?.assignmentsCompleted ?? 0} Assignments Completed</span>
                  </div>
                </div> */}
              </div>
            </WidgetState>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard Section */}
      <Card className="border-border/80 shadow-sm rounded-2xl">
        <CardContent className="p-5 md:p-6">
          <div className="space-y-6">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Leaderboard
            </h3>

            {/* Top 3 Podium Cards */}
            <div className="grid grid-cols-3 gap-3 md:gap-4 max-w-3xl mx-auto items-end pt-2">
              {/* #3 Left */}
              <div className="bg-card border border-border/80 rounded-2xl p-4 text-center shadow-sm">
                <p className="text-xl font-bold text-foreground">#3</p>
                <div className="w-14 h-14 rounded-full mx-auto my-2 overflow-hidden bg-primary/10 flex items-center justify-center text-primary font-bold border-2 border-primary/20">
                  <span className="text-lg">{leaderboardTable[2]?.name?.[0] || "—"}</span>
                </div>
                <p className="font-bold text-sm text-foreground truncate">
                  {leaderboardTable[2]?.name || "—"}
                </p>
                <div className="grid grid-cols-2 gap-1.5 mt-3 text-[11px] text-muted-foreground font-medium">
                  <span>{leaderboardTable[2]?.coursesCompleted ?? 0} Courses</span>
                  <span>{leaderboardTable[2]?.badges ?? 0} Badges</span>
                  <span>{leaderboardTable[2]?.streaks ?? 0} Days Streaks</span>
                  <span>{leaderboardTable[2]?.ezCoins ?? 0} EZ Points</span>
                </div>
              </div>

              {/* #1 Center (Bright Blue) */}
              <div className="bg-primary text-white rounded-2xl p-5 text-center shadow-xl scale-105 relative z-10">
                <p className="text-2xl font-black">#1</p>
                <div className="w-16 h-16 rounded-full mx-auto my-2 overflow-hidden bg-white/20 flex items-center justify-center text-white font-bold border-2 border-white/40">
                  <span className="text-xl">{leaderboardTable[0]?.name?.[0] || "—"}</span>
                </div>
                <p className="font-bold text-base text-white truncate">
                  {leaderboardTable[0]?.name || "—"}
                </p>
                <div className="grid grid-cols-2 gap-1.5 mt-3 text-[11px] text-white/90 font-medium">
                  <span>{leaderboardTable[0]?.coursesCompleted ?? 0} Courses</span>
                  <span>{leaderboardTable[0]?.badges ?? 0} Badges</span>
                  <span>{leaderboardTable[0]?.streaks ?? 0} Days Streaks</span>
                  <span>{leaderboardTable[0]?.ezCoins ?? 0} EZ Points</span>
                </div>
              </div>

              {/* #2 Right */}
              <div className="bg-card border border-border/80 rounded-2xl p-4 text-center shadow-sm">
                <p className="text-xl font-bold text-foreground">#2</p>
                <div className="w-14 h-14 rounded-full mx-auto my-2 overflow-hidden bg-primary/10 flex items-center justify-center text-primary font-bold border-2 border-primary/20">
                  <span className="text-lg">{leaderboardTable[1]?.name?.[0] || "—"}</span>
                </div>
                <p className="font-bold text-sm text-foreground truncate">
                  {leaderboardTable[1]?.name || "—"}
                </p>
                <div className="grid grid-cols-2 gap-1.5 mt-3 text-[11px] text-muted-foreground font-medium">
                  <span>{leaderboardTable[1]?.coursesCompleted ?? 0} Courses</span>
                  <span>{leaderboardTable[1]?.badges ?? 0} Badges</span>
                  <span>{leaderboardTable[1]?.streaks ?? 0} Days Streaks</span>
                  <span>{leaderboardTable[1]?.ezCoins ?? 0} EZ Points</span>
                </div>
              </div>
            </div>

            {/* Table */}
            {leaderboardTable.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No leaderboard rankings available.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground border-b border-border/60">
                    <tr>
                      <th className="py-3 px-6">Rank</th>
                      <th className="py-3 px-6">User</th>
                      <th className="py-3 px-6">Courses Completed</th>
                      <th className="py-3 px-6">Streaks</th>
                      <th className="py-3 px-6">Badges</th>
                      <th className="py-3 px-6">EZ Coins</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {leaderboardTable.map((row) => (
                      <tr key={row.rank} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3.5 px-6 font-bold text-foreground">{row.rank}</td>
                        <td className="py-3.5 px-6 font-semibold text-foreground">{row.name}</td>
                        <td className="py-3.5 px-6 font-semibold text-foreground">{row.coursesCompleted}</td>
                        <td className="py-3.5 px-6 font-semibold text-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Flame className="h-4 w-4 text-primary fill-primary" />
                            {row.streaks} Days
                          </span>
                        </td>
                        <td className="py-3.5 px-6 font-semibold text-foreground">{row.badges}</td>
                        <td className="py-3.5 px-6 font-bold text-foreground">{row.ezCoins}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Courses in Progress */}
      <Card className="border-border/80 shadow-sm rounded-2xl">
        <CardContent className="p-5 md:p-6">
          <h3 className="font-bold text-base text-foreground flex items-center gap-2 mb-5">
            <BookOpen className="h-5 w-5 text-primary" />
            Courses in Progress
          </h3>
          <WidgetState
            status={enrollmentsR.status}
            error={enrollmentsR.error}
            onRetry={enrollmentsR.reload}
            height={140}
          >
            {inProgressCoursesList.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-center text-muted-foreground">
                <BookOpen className="h-8 w-8 mb-2 opacity-40 text-primary" />
                <p className="text-sm font-medium">No courses currently in progress.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {inProgressCoursesList.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-border/80 bg-card p-4 space-y-2 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to={`/learn/${c.courseId}`}
                        className="font-bold text-primary text-base hover:underline line-clamp-1"
                      >
                        {c.title}
                      </Link>
                      <span className="font-bold text-primary text-sm shrink-0">
                        {c.progress}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      {c.completedLectures} of {c.totalLectures} Lectures Last viewed {c.lastViewed}
                    </p>
                    <div className="flex items-center gap-3 pt-2">
                      <Progress value={c.progress} className="flex-1 h-2 bg-muted rounded-full" />
                      <Button
                        asChild
                        size="sm"
                        className="bg-primary text-white hover:bg-primary/90 rounded-lg px-4 h-8 text-xs font-semibold shrink-0"
                      >
                        <Link to={`/learn/${c.courseId}`}>Continue</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </WidgetState>
        </CardContent>
      </Card>

      {/* Completed Courses */}
      <Card className="border-border/80 shadow-sm rounded-2xl">
        <CardContent className="p-5 md:p-6">
          <h3 className="font-bold text-base text-foreground flex items-center gap-2 mb-5">
            <Award className="h-5 w-5 text-primary" />
            Completed Courses
          </h3>
          <WidgetState
            status={
              enrollmentsR.status === "loading" ||
              certificatesR.status === "loading"
                ? "loading"
                : enrollmentsR.status === "error"
                  ? "error"
                  : "success"
            }
            error={enrollmentsR.error}
            onRetry={() => {
              enrollmentsR.reload();
              certificatesR.reload();
            }}
            height={140}
          >
            {completedCoursesList.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-center text-muted-foreground">
                <Award className="h-8 w-8 mb-2 opacity-40 text-primary" />
                <p className="text-sm font-medium">No completed courses yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Complete a course to earn and view certificates here.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {completedCoursesList.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card p-3 shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={c.thumbnail}
                        alt={c.title}
                        className="w-16 h-12 rounded-lg object-cover shrink-0 border border-border/40"
                      />
                      <div className="min-w-0">
                        <Link
                          to={`/learn/${c.courseId}`}
                          className="font-bold text-primary text-sm hover:underline line-clamp-1"
                        >
                          {c.title}
                        </Link>
                        <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                          {c.category} · Completed {c.completedDate}
                        </p>
                      </div>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      className="bg-primary text-white hover:bg-primary/90 rounded-lg px-4 h-8 text-xs font-semibold shrink-0"
                    >
                      <Link to="/dashboard/certificates">Certificate</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </WidgetState>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ---------- Stat Card Component ----------
const StatCard = ({
  value,
  label,
  sub,
  hasFlame,
}: {
  value: string | number;
  label: string;
  sub: string;
  hasFlame?: boolean;
}) => (
  <div className="relative bg-card rounded-2xl border border-border/80 p-5 shadow-sm overflow-hidden flex items-center gap-4">
    <div className="w-12 h-12 rounded-full bg-primary text-white font-bold text-base flex items-center justify-center shrink-0 shadow-sm gap-0.5">
      {hasFlame && <Flame className="h-4 w-4 fill-white text-white" />}
      <span>{value}</span>
    </div>
    <div className="min-w-0">
      <p className="font-bold text-sm text-foreground truncate">{label}</p>
      <p className="text-xs text-muted-foreground font-medium mt-0.5 truncate">{sub}</p>
    </div>
  </div>
);

// ---------- Widget loading/error wrapper ----------
const WidgetState = ({
  status,
  error,
  onRetry,
  height,
  children,
}: {
  status: Status;
  error?: string;
  onRetry: () => void;
  height: number;
  children: React.ReactNode;
}) => {
  if (status === "loading") {
    return <Skeleton className="w-full rounded-xl" style={{ height }} />;
  }
  if (status === "error") {
    return (
      <div
        className="flex flex-col items-center justify-center text-center gap-2 rounded-xl border border-dashed border-border p-6"
        style={{ minHeight: height }}
      >
        <AlertTriangle className="h-6 w-6 text-destructive" />
        <p className="text-sm text-muted-foreground">
          {error || "Couldn't load this section."}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={onRetry}
          className="gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    );
  }
  return <>{children}</>;
};

// Shell that wraps a grid of items (e.g., stat cards) with one loading skeleton row.
const WidgetShell = ({
  loading,
  error,
  onRetry,
  skeletonHeight,
  skeletonCols,
  children,
}: {
  loading: boolean;
  error?: string;
  onRetry: () => void;
  skeletonHeight: number;
  skeletonCols: number;
  children: React.ReactNode;
}) => {
  if (loading) {
    return (
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${skeletonCols} gap-4`}
      >
        {Array.from({ length: skeletonCols }).map((_, i) => (
          <Skeleton
            key={i}
            className="w-full rounded-2xl"
            style={{ height: skeletonHeight }}
          />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-center gap-2 rounded-xl border border-dashed border-border p-6">
        <AlertTriangle className="h-6 w-6 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button
          size="sm"
          variant="outline"
          onClick={onRetry}
          className="gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    );
  }
  return <>{children}</>;
};

export default LearningAnalytics;
