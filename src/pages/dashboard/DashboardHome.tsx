import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { courses } from "@/data/courses";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { meetingService } from "@/services/meeting.service";
import { enrollmentService } from "@/services/enrollment.service";
import { coursesService, type CourseProgress } from "@/services/courses.service";
import { certificatesService } from "@/services/certificates.service";
import type { Enrollment } from "@/types/api.types";
import type { DemoClassItem } from "@/types/demoClass";
import { demoClassService } from "@/services/demoClass.service";
import { LiveDemoClassCard } from "@/components/dashboard/LiveDemoClassCard";
import { HandPickedSection, HScroll } from "@/components/dashboard/HandPickedSection";
import {
  BookOpen,
  Clock,
  Award,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Link2,
} from "lucide-react";

const getEnrollmentCourseId = (enrollment: Enrollment) =>
  String(enrollment.courseId || enrollment.course?.id || "");

const StatCard = ({
  value,
  label,
  icon: Icon,
  route,
}: {
  value: string | number;
  label: string;
  icon: typeof BookOpen;
  route: string;
}) => (
  <div className="relative overflow-hidden bg-card rounded-2xl border border-border p-4 md:p-5 shadow-sm">
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs md:text-sm text-muted-foreground truncate">
          {label}
        </p>
        <p className="text-base md:text-lg font-semibold text-card-foreground">
          {value}
        </p>
      </div>
    </div>
    <Link
      to={route}
      className="absolute right-3 bottom-2 text-[11px] text-muted-foreground hover:text-primary"
    >
      See More ›
    </Link>
  </div>
);

const DashboardHome = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [unlockedCertificatesCount, setUnlockedCertificatesCount] = useState(0);
  const [studentDemoClasses, setStudentDemoClasses] = useState<DemoClassItem[]>(() => {
    try {
      const raw = localStorage.getItem("edvanz_cached_demo_classes");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const loadBookedDemoClasses = async () => {
    try {
      const list = await demoClassService.getStudentBookedDemoClasses(user);
      if (Array.isArray(list)) {
        setStudentDemoClasses(list);
      }
    } catch (e) {
      console.error("Failed to load student demo classes:", e);
    }
  };

  useEffect(() => {
    loadBookedDemoClasses();
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    const loadEnrollments = async () => {
      try {
        const res: any = await enrollmentService.getMyEnrollments();
        if (!res.success) return;
        const list = (res.data ?? []).filter(
          (e: any) => !(e.course as any)?.isLive && (e.course as any)?.productType !== "LIVE_COURSE"
        );
        if (cancelled) return;

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
            const finalPct = Math.max((e.progress?.progressPercentage ?? 0), calculatedPct, localMax);
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
      } catch (err) {
        console.error("Failed to load dashboard enrollments", err);
      }
    };

    loadEnrollments();

    // Fetch actual unlocked certificates count (only earned/passed ones)
    certificatesService.getMyCertificates().then((r) => {
      if (cancelled) return;
      const certsList = Array.isArray(r) ? r : r?.data ?? [];
      setUnlockedCertificatesCount(certsList.length);
    }).catch(() => {});

    meetingService.getUpcomingLiveClasses().then((r) => {
      if (r.success) {
        const sorted = r.data
          .filter((m) => new Date(`${m.date}T${m.startTime}:00`) >= new Date())
          .sort(
            (a, b) =>
              new Date(`${a.date}T${a.startTime}:00`).getTime() -
              new Date(`${b.date}T${b.startTime}:00`).getTime(),
          );
        if (!cancelled) setMeetings(sorted);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const enrolled = enrollments.length;
    const hours = Math.round(
      enrollments.reduce((s, e) => s + (e.progress?.watchTime || 0), 0) / 60,
    );
    const avgProgress = enrolled
      ? Math.round(
        enrollments.reduce(
          (s, e) => s + (e.progress?.progressPercentage || 0),
          0,
        ) / enrolled,
      )
      : 0;
    return [
      {
        value: avgProgress + "%",
        label: "Progress",
        icon: TrendingUp,
        route: "/dashboard/analytics",
      },
      {
        value: enrolled,
        label: "Courses Enrolled",
        icon: BookOpen,
        route: "/dashboard/courses",
      },
      {
        value: hours,
        label: "Hours Learned",
        icon: Clock,
        route: "/dashboard/analytics",
      },
      {
        value: unlockedCertificatesCount,
        label: "Certificates",
        icon: Award,
        route: "/dashboard/certificates",
      },
    ];
  }, [enrollments, unlockedCertificatesCount]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      {/* Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </section>

      {/* Continue Learning */}
      <section>
        <HScroll
          ariaLabel="Continue learning courses"
          title="Continue Learning"
        >
          {enrollments.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6">
              You haven't started any courses yet.
            </div>
          ) : (
            enrollments.map((e) => {
              const c = e.course;
              const courseId = getEnrollmentCourseId(e);
              const progress = Math.round(e.progress?.progressPercentage || 0);
              const isCompleted = progress >= 100 || e.status === "completed";
              return (
                <div
                  key={e.id ?? courseId}
                  className="snap-start shrink-0 w-[280px] sm:w-[533px] bg-card rounded border border-border overflow-hidden flex flex-row"
                >
                  <div className="w-28 sm:w-[157px] shrink-0 aspect-square">
                    <img
                      src={c.thumbnail || (c as any).thumbnailUrl || ""}
                      alt={c.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col justify-center flex-1 px-5 py-3 min-w-0 ">
                    <h3 className="text-sm font-semibold text-card-foreground line-clamp-2 mb-2">
                      {c.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mb-1">
                      {progress}% Complete
                    </p>
                    <Progress value={progress} className="h-1.5 mb-3" />
                    <Button asChild size="sm" className="w-[120px] h-8 text-xs">
                     <Link to={`/dashboard/learn/${courseId}`}>
                       {isCompleted ? "Review" : "Continue"}
                     </Link>
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </HScroll>
      </section>

      {/* Live Demo Class Section - Positioned below Continue Learning */}
      {studentDemoClasses.length > 0 && (
        <section className="w-full">
          <LiveDemoClassCard
            demoClasses={studentDemoClasses}
            onRefresh={loadBookedDemoClasses}
          />
        </section>
      )}

      {/* Upcoming Live Session */}
      <section>
        <HScroll
          ariaLabel="Upcoming live sessions"
          title="Upcoming Live Session"
        >
          {meetings.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6">
              No upcoming live classes.
            </div>
          ) : (
            meetings.map((m) => (
              <div
                key={m.id}
                className="snap-start shrink-0 w-[280px] sm:w-[320px] bg-card rounded-2xl border border-border overflow-hidden"
              >
                <div className="p-3 space-y-2">
                  <h3 className="text-sm font-semibold text-card-foreground line-clamp-2">
                    {m.title}
                  </h3>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="truncate">{m.instructorName}</span>
                    <span className="shrink-0 px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium">
                      Live at {m.startTime}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </HScroll>
      </section>

      {/* Hand Picked For You */}
      <HandPickedSection />
    </motion.div>
  );
};

export default DashboardHome;