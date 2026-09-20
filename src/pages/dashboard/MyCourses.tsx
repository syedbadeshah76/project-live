import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Play,
  Clock,
  BookOpen,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { enrollmentService } from "@/services/enrollment.service";
import { coursesService, type CourseProgress } from "@/services/courses.service";
import LessonVideoPlayer from "@/components/video/LessonVideoPlayer";
import { getLessonMedia } from "@/lib/demo-videos";
import type { Enrollment } from "@/types/api.types";

const getEnrollmentCourseId = (enrollment: Enrollment) =>
  String(enrollment.courseId || enrollment.course?.id || "");

const MyCourses = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"all" | "in-progress" | "completed">(
    "all"
  );
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [backendSummary, setBackendSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [previewCourse, setPreviewCourse] =
    useState<Enrollment["course"] | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res: any = await enrollmentService.getMyEnrollments();
        if (!res.success) return;
        const list = res.data ?? [];
        if (cancelled) return;

        if (res.summary) setBackendSummary(res.summary);

        setEnrollments(
          list.map((e: any) => {
            const courseId = getEnrollmentCourseId(e);

            let localMax = 0;
            let localCompCount = 0;
            try {
              const cachedMax = localStorage.getItem(`edvanz_max_progress_${courseId}`);
              if (cachedMax) localMax = Number(cachedMax) || 0;

              const cachedLessons = localStorage.getItem(`edvanz_completed_lessons_${courseId}`);
              if (cachedLessons) {
                const parsed = JSON.parse(cachedLessons);
                if (Array.isArray(parsed)) localCompCount = parsed.length;
              }
            } catch {}

            const rawTotal = Number(e.course?.lessons || e.course?.totalLessons || e.progress?.totalLessons || 0);
            const compCount = Math.max(
              typeof e.progress?.completedLessons === "number"
                ? e.progress.completedLessons
                : Array.isArray(e.progress?.completedLessons)
                ? e.progress.completedLessons.length
                : 0,
              localCompCount,
            );

            const total = Math.max(rawTotal, compCount);
            const calculatedPct = total > 0 ? Math.min(100, Math.round((compCount / total) * 100)) : 0;
            const finalPct = Math.max(e.progress?.progressPercentage ?? 0, calculatedPct, localMax);
            const isCompleted = finalPct >= 100 || e.status === "completed";

            return {
              ...e,
              status: isCompleted ? "completed" : e.status,
              progress: {
                ...(e.progress ?? {}),
                courseId,
                progressPercentage: finalPct,
                totalLessons: total,
                completedLessons: compCount,
                completedLessonCount: compCount,
              },
            } as Enrollment;
          })
        );
      } catch {
        /* keep whatever loaded */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Filter out any Live Courses from My Courses page (Recorded Courses only)
  const recordedEnrollments = enrollments.filter(
    (e) => !(e.course as any)?.isLive && (e.course as any)?.productType !== "LIVE_COURSE"
  );

  const inProgressCount = recordedEnrollments.filter(
    (e) =>
      (e.progress?.progressPercentage || 0) < 100 && e.status !== "completed"
  ).length;
  const completedCount = recordedEnrollments.filter(
    (e) => e.progress?.progressPercentage === 100 || e.status === "completed"
  ).length;
  const hoursLearned = backendSummary?.hoursLearned ?? Math.round(
    recordedEnrollments.reduce((s, e) => s + (e.progress?.watchTime || 0), 0) / 60
  );

  const stats = [
    { label: "Total Enrolled", value: recordedEnrollments.length },
    { label: "In Progress", value: inProgressCount },
    { label: "Completed", value: completedCount },
    { label: "Hours Learned", value: hoursLearned },
  ];

  const filtered = recordedEnrollments.filter((e) => {
    const c = e.course;
    const matchSearch = c.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const cat =
      typeof c.category === "object" ? c.category.name : String(c.category);
    const matchCat = categoryFilter === "all" || cat === categoryFilter;
    const progress = e.progress?.progressPercentage || 0;
    const matchTab =
      activeTab === "all" ||
      (activeTab === "in-progress" &&
        progress < 100 &&
        e.status !== "completed") ||
      (activeTab === "completed" &&
        (progress === 100 || e.status === "completed"));
    return matchSearch && matchCat && matchTab;
  });

  const categories = [
    ...new Set(
      enrollments.map((e) =>
        typeof e.course.category === "object"
          ? e.course.category.name
          : String(e.course.category)
      )
    ),
  ];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          My Courses
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track your progress and continue learning
        </p>
      </div>

      {/* Stat Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border bg-card px-4 py-3"
          >
            <p className="text-xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + Category */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search your courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-full bg-card border-border"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-56 rounded-full bg-card">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Pill Tabs */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: "all", label: "All" },
            {
              key: "in-progress",
              label: "In Progress",
              count: inProgressCount,
            },
            { key: "completed", label: "Completed", count: completedCount },
          ] as const
        ).map((t) => {
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-1.5 rounded-full border text-sm transition-colors ${
                active
                  ? "bg-primary/10 border-primary text-primary font-medium"
                  : "bg-card border-border text-foreground hover:border-primary/40"
              }`}
            >
              {t.label}
              {"count" in t && t.count !== undefined && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Courses Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <BookOpen className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold text-foreground">No courses found</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Try adjusting your filters or browse new courses
          </p>
          <Button asChild>
            <Link to="/courses">Browse Courses</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map((e, i) => {
            const c = e.course;
            const courseId = getEnrollmentCourseId(e);
            const progress = Math.round(e.progress?.progressPercentage || 0);
            const completed = progress === 100 || e.status === "completed";
            const total = e.progress?.totalLessons || (c as any).lessons || 0;
            const completedLessonsCount =
              typeof e.progress?.completedLessons === "number"
                ? e.progress.completedLessons
                : Array.isArray(e.progress?.completedLessons)
                ? e.progress.completedLessons.length
                : Array.isArray((e.progress as any)?.completedLessonIds)
                ? (e.progress as any).completedLessonIds.length
                : (progress > 0 && total > 0 ? Math.round((progress / 100) * total) : 0);
            return (
              <motion.div
                key={e.id ?? c.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex flex-col sm:flex-row rounded-2xl border border-border bg-card overflow-hidden"
              >
                 <img
                    src={c.thumbnail}
                    alt={c.title}
                    loading="lazy"
                    className="h-[170px] w-[230px] object-cover"
                  />
                {/* <button
                  onClick={() => setPreviewCourse(c)}
                  className="relative w-full sm:w-40 sm:shrink-0 aspect-video sm:aspect-square bg-muted group"
                  aria-label={`Preview ${c.title}`}
                >
                  <img
                    src={c.thumbnail}
                    alt={c.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="h-8 w-8 text-white" />
                  </span>
                  {completed && (
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                      <CheckCircle2 className="h-3 w-3" /> Done
                    </span>
                  )}
                </button> */}

                <div className="flex-1 min-w-0 p-4 space-y-2">
                  <p className="font-semibold text-foreground line-clamp-2">
                    {c.title}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{progress}% Complete</span>
                    <span>
                      {completedLessonsCount}/{total} Lessons
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex items-center justify-between pt-1">
                    <Button asChild size="sm">
                      <Link to={`/dashboard/learn/${courseId}`}>
                        {completed ? "Review" : "Continue"}
                      </Link>
                    </Button>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(e.enrolledAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog
        open={!!previewCourse}
        onOpenChange={(o) => !o && setPreviewCourse(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">
              {previewCourse?.title ?? "Course preview"}
            </DialogTitle>
          </DialogHeader>
          {previewCourse &&
            (() => {
              const cat =
                typeof previewCourse.category === "object"
                  ? previewCourse.category.name
                  : (previewCourse.category as unknown as string);
              const media = getLessonMedia({
                category: cat,
                videoUrl: (previewCourse as { previewVideo?: string })
                  .previewVideo,
                thumbnail: previewCourse.thumbnail,
              });
              return (
                <div className="rounded-xl overflow-hidden bg-black">
                  <LessonVideoPlayer
                    videoUrl={media.videoUrl}
                    poster={media.poster}
                    captionsSrc={media.captionsSrc}
                  />
                </div>
              );
            })()}
          <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Preview clip
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyCourses;
