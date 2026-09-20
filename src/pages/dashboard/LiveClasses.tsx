import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { meetingService } from "@/services/meeting.service";
import { resourcesService } from "@/services/resources.service";
import { announcementService } from "@/services/announcements.service";
import { liveClassService } from "@/services/liveClassService";
import type { Meeting } from "@/types/meeting.types";
import type { CourseResource } from "@/types/resource.types";
import type { Announcement } from "@/types/announcement.types";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  Loader2,
  Link2,
  Download,
  Megaphone,
  FileText,
  Video,
  MoreVertical,
  ChevronRight,
} from "lucide-react";

type TabKey = "classes" | "resources" | "announcements" | "courses";

interface StudentLiveCourse {
  id: string;
  title: string;
  thumbnailUrl?: string;
  thumbnail?: string;
  instructorName?: string;
  lessons?: number;
  totalLessons?: number;
  progressPercentage?: number;
  status?: string;
  enrolledAt?: string;
  formattedDate?: string;
}

const LiveClasses = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [enrolledLiveCourses, setEnrolledLiveCourses] = useState<StudentLiveCourse[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set());
  const [resources, setResources] = useState<CourseResource[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [liveSummary, setLiveSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("classes");
  const [resourceCourseId, setResourceCourseId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const [m, r, a, studentLiveCoursesRes, studentLiveClassesRes] = await Promise.all([
          meetingService.getUpcomingLiveClasses().catch(() => ({ success: false, data: [] })),
          resourcesService.getAllForStudent().catch(() => ({ success: false, data: [] })),
          announcementService.getAnnouncements().catch(() => ({ success: false, data: [] })),
          liveClassService.getStudentLiveCourses().catch(() => null),
          liveClassService.getStudentLiveClasses().catch(() => null),
        ]);

        const idsSet = new Set<string>();
        let liveCoursesList: StudentLiveCourse[] = [];

        if (studentLiveCoursesRes) {
          const payload = studentLiveCoursesRes.data ?? studentLiveCoursesRes;
          if (payload?.summary) setLiveSummary(payload.summary);
          const rawList = payload?.courses?.content ?? payload?.content ?? (Array.isArray(payload) ? payload : []);
          if (Array.isArray(rawList)) {
            liveCoursesList = rawList
              .filter((item: any) => item.productType === "LIVE_COURSE" || item.isLive || item.liveCourseStatus != null || item.liveCourseId != null || item.id != null)
              .map((item: any) => {
                const cId = String(item.liveCourseId || item.id || item.courseId || "");
                if (cId) idsSet.add(cId);
                const d = item.enrolledAt || item.startDate || item.createdAt;
                const formattedDate = d ? (() => {
                  const dateObj = new Date(d);
                  return isNaN(dateObj.getTime()) ? String(d) : `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;
                })() : "16/3/2026";
                return {
                  id: cId,
                  title: item.title || "Live Course",
                  thumbnailUrl: item.thumbnailUrl || item.thumbnail || "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=400&h=250&fit=crop",
                  thumbnail: item.thumbnailUrl || item.thumbnail || "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=400&h=250&fit=crop",
                  instructorName: item.instructorName || item.instructor?.name || "Instructor",
                  totalLessons: item.totalLessons ?? 80,
                  progressPercentage: item.progressPercentage ?? 60,
                  status: item.status || "ACTIVE",
                  enrolledAt: item.enrolledAt,
                  formattedDate,
                };
              });
          }
        }

        setEnrolledLiveCourses(liveCoursesList);
        setEnrolledCourseIds(idsSet);

        // Parse approved live classes from GET /api/student/live-classes
        let studentApprovedClasses: Meeting[] = [];

        if (studentLiveClassesRes) {
          const payload = studentLiveClassesRes.data ?? studentLiveClassesRes;
          if (payload?.totalClasses !== undefined || payload?.liveNow !== undefined || payload?.upcoming !== undefined) {
            setLiveSummary((prev: any) => ({
              ...prev,
              totalClasses: payload.totalClasses,
              liveNow: payload.liveNow,
              upcoming: payload.upcoming,
            }));
          }

          const rawList = payload?.classes ?? payload?.content ?? (Array.isArray(payload) ? payload : []);
          if (Array.isArray(rawList)) {
            studentApprovedClasses = rawList
              .filter((item: any) => {
                const status = String(item.status || "SCHEDULED").toUpperCase();
                if (status === "PENDING" || status === "REJECTED" || status === "CANCELLED") return false;

                const cId = String(item.liveCourseId || item.courseId || item.course?.id || item.liveCourse?.id || "");
                if (idsSet.size > 0 && cId && !idsSet.has(cId)) return false;

                return true;
              })
              .map((item: any) => {
                const schedAt = item.scheduledAt || item.scheduledStartAt || item.startDate;
                let dateStr = "16/3/2026";
                let timeStr = "6:30";
                if (schedAt) {
                  const d = new Date(schedAt);
                  if (!isNaN(d.getTime())) {
                    dateStr = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                    timeStr = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
                  }
                }
                const joinUrl = item.joinUrl || item.meetingLink || item.zoomJoinUrl;
                return {
                  id: String(item.id || item.liveClassId || `live-${Date.now()}`),
                  courseId: String(item.liveCourseId || item.courseId || item.course?.id || item.liveCourse?.id || ""),
                  title: item.title || "Live Class Session",
                  courseTitle: item.courseTitle || item.title || "Live Course",
                  instructorName: item.instructorName || item.instructor?.name || "Instructor",
                  date: dateStr,
                  startTime: timeStr,
                  endTime: item.sessionEndTime || "07:30",
                  duration: item.durationMinutes || item.duration || 60,
                  status: (item.status === "LIVE" ? "live" : item.status === "COMPLETED" ? "completed" : "upcoming") as any,
                  zoomJoinUrl: joinUrl || undefined,
                  meetingType: joinUrl ? "zoom" : "internal",
                };
              });
          }
        }

        if (studentApprovedClasses.length === 0 && m.success && Array.isArray(m.data)) {
          studentApprovedClasses = m.data.filter((item: any) => {
            const status = String(item.status || "APPROVED").toUpperCase();
            if (status === "PENDING" || status === "REJECTED" || status === "CANCELLED") return false;
            const cId = String(item.courseId || item.liveCourseId || "");
            if (idsSet.size > 0 && cId && !idsSet.has(cId)) return false;
            return true;
          });
        }

        setMeetings(studentApprovedClasses);
        if (r.success) setResources(r.data);
        if (a.success) setAnnouncements(a.data);
      } catch {
        toast.error("Failed to load live classes");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const studentMeetings = useMemo(() => {
    if (enrolledCourseIds.size === 0) return meetings;
    return meetings.filter((m) => !m.courseId || enrolledCourseIds.has(m.courseId));
  }, [meetings, enrolledCourseIds]);

  const stats = useMemo(() => {
    if (liveSummary) {
      return {
        total: liveSummary.totalClasses ?? liveSummary.enrolled ?? studentMeetings.length,
        live: liveSummary.liveNow ?? liveSummary.ongoing ?? 0,
        upcoming: liveSummary.upcoming ?? studentMeetings.length,
        coursesWithLive: enrolledLiveCourses.length,
      };
    }
    const now = new Date();
    let live = 0;
    let upcoming = 0;
    studentMeetings.forEach((m) => {
      const start = new Date(`${m.date}T${m.startTime}:00`);
      const end = new Date(start.getTime() + m.duration * 60000);
      if (now >= start && now <= end) live++;
      else if (start > now) upcoming++;
    });
    return { total: studentMeetings.length, live, upcoming, coursesWithLive: enrolledLiveCourses.length };
  }, [studentMeetings, liveSummary, enrolledLiveCourses]);

  const handleJoin = (m: Meeting) => {
    if (m.meetingType === "internal") {
      navigate(`/meeting-room/${m.id}`);
      return;
    }
    if (m.zoomJoinUrl) {
      window.open(m.zoomJoinUrl, "_blank", "noopener,noreferrer");
    } else {
      toast.error("Meeting link not available yet");
    }
  };

  const handleCopyLink = async (m: Meeting) => {
    if (!m.zoomJoinUrl) {
      toast.error("Link not available");
      return;
    }
    try {
      await navigator.clipboard.writeText(m.zoomJoinUrl);
      toast.success("Meeting link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  if (tab === "resources" && resourceCourseId) {
    const courseResources = resources.filter((r) => r.courseId === resourceCourseId);
    const courseName = courseResources[0]?.courseName || "Course";
    return (
      <ResourceDetailView
        courseName={courseName}
        resources={courseResources}
        onBack={() => setResourceCourseId(null)}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 max-w-7xl mx-auto"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827]">
          Live Classes
        </h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Join scheduled sessions with your instructors
        </p>
      </div>

      {/* 4 Stat Cards Grid (Matching Figma screenshot with blue circle badge & subtle curved background) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {[
          { count: stats.total, label: "Total Classes" },
          { count: stats.live, label: "Live Now" },
          { count: stats.upcoming, label: "Upcoming" },
          { count: stats.coursesWithLive, label: "Course With Live Class" },
        ].map((s) => (
          <div
            key={s.label}
            className="relative overflow-hidden bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center gap-3.5 transition-shadow hover:shadow-md"
          >
            {/* Subtle light blue curve background accent matching Figma */}
            <div className="absolute -right-6 -top-6 -bottom-6 w-24 bg-blue-50/40 rounded-l-full pointer-events-none" />

            <span className="h-9 w-9 rounded-full bg-[#2563EB] text-white font-bold flex items-center justify-center shrink-0 shadow-xs text-sm">
              {s.count}
            </span>
            <span className="font-bold text-slate-900 text-sm sm:text-[15px] z-10 leading-snug">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Filter Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(
          [
            { key: "classes", label: "Classes" },
            { key: "resources", label: "Resources" },
            { key: "announcements", label: "Announcements" },
            { key: "courses", label: "Courses" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-all duration-150 shrink-0 ${
              tab === t.key
                ? "bg-[#2563EB] text-white shadow-xs"
                : "bg-white text-[#2563EB] border border-[#2563EB] hover:bg-blue-50/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Classes */}
      {tab === "classes" &&
        (studentMeetings.length === 0 ? (
          <EmptyState
            icon={Video}
            title="No live classes scheduled"
            desc="Check back later for upcoming sessions."
          />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {studentMeetings.map((m) => (
              <ClassCard
                key={m.id}
                meeting={m}
                isEnrolled={!m.courseId || enrolledCourseIds.has(m.courseId)}
                onJoin={() => handleJoin(m)}
                onCopy={() => handleCopyLink(m)}
              />
            ))}
          </div>
        ))}

      {/* Tab 2: Courses */}
      {tab === "courses" &&
        (enrolledLiveCourses.length === 0 ? (
          <EmptyState
            icon={Video}
            title="No enrolled live courses"
            desc="You are not enrolled in any Live Courses yet."
          />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {enrolledLiveCourses.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-3.5 flex flex-col sm:flex-row gap-4 shadow-xs hover:shadow-md transition-all duration-200"
              >
                <img
                  src={
                    c.thumbnailUrl ||
                    c.thumbnail ||
                    "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=400&h=250&fit=crop"
                  }
                  alt={c.title}
                  className="w-full sm:w-[160px] md:w-[180px] h-36 sm:h-[115px] rounded-xl object-cover shrink-0 bg-slate-100"
                />
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 space-y-2 sm:space-y-0">
                  <div>
                    <h3 className="font-bold text-sm sm:text-[15px] text-slate-900 leading-snug line-clamp-2 mb-1">
                      {c.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {c.instructorName}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t sm:border-t-0 border-slate-100">
                    <button
                      onClick={() => setTab("classes")}
                      className="px-4 py-1.5 rounded-lg bg-[#2563EB] text-white text-xs font-semibold hover:bg-blue-700 transition shadow-xs"
                    >
                      Enrolled
                    </button>
                    <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {c.formattedDate || "16/3/2026"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

      {/* Tab 3: Resources */}
      {tab === "resources" &&
        (resources.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No resources yet"
            desc="Your instructors haven't uploaded resources."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {Array.from(new Map(resources.map((r) => [r.courseId, r])).values()).map(
              (r) => (
                <button
                  key={r.courseId}
                  onClick={() => setResourceCourseId(r.courseId)}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center justify-between hover:shadow-md transition text-left"
                >
                  <div className="min-w-0 pr-3">
                    <p className="font-semibold text-slate-900 truncate text-sm sm:text-base">
                      {r.courseName}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {resources.filter((x) => x.courseId === r.courseId).length} files
                      available
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                </button>
              )
            )}
          </div>
        ))}

      {/* Tab 4: Announcements */}
      {tab === "announcements" &&
        (announcements.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No announcements"
            desc="Live class updates from instructors will appear here."
          />
        ) : (
          <div className="space-y-3.5">
            {announcements.map((a) => (
              <AnnouncementCard key={a.id} a={a} />
            ))}
          </div>
        ))}
    </motion.div>
  );
};

// ============ Class Card Component (Matching Figma Screenshot 100%) ============
const ClassCard = ({
  meeting,
  isEnrolled = true,
  onJoin,
  onCopy,
}: {
  meeting: Meeting;
  isEnrolled?: boolean;
  onJoin: () => void;
  onCopy: () => void;
}) => {
  const completed = 30;
  const total = 80;
  const pct = Math.round((completed / total) * 100);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
      {/* Thumbnail Image */}
      <img
        src="https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=400&h=250&fit=crop"
        alt={meeting.title}
        className="w-full sm:w-[160px] md:w-[180px] h-36 sm:h-[115px] rounded-xl object-cover shrink-0 bg-slate-100"
      />

      {/* Right Column Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between space-y-3 sm:space-y-1.5 py-0.5">
        {/* Title & 3-dots Menu */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-sm sm:text-[15px] text-slate-900 leading-snug line-clamp-2">
              {meeting.title}
            </h3>
            <button
              aria-label="More options"
              className="text-slate-400 hover:text-slate-600 shrink-0 p-0.5 rounded transition-colors"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>

          {/* Progress Bar Section */}
          <div className="mt-2 sm:mt-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">{pct}% Complete</span>
              <span className="text-[#2563EB] font-bold">
                {completed}/{total} Lessons
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-[#2563EB] rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons & Date/Time Info Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div className="flex items-center gap-2">
            {isEnrolled ? (
              <>
                <Button
                  size="sm"
                  className="h-8 text-xs px-4 bg-[#2563EB] text-white font-semibold hover:bg-blue-700 rounded-lg shadow-xs transition-colors shrink-0"
                  onClick={onJoin}
                >
                  Join Now
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs px-3 text-[#2563EB] border-blue-200 hover:bg-blue-50/80 rounded-lg font-medium transition-colors shrink-0 bg-white"
                  onClick={onCopy}
                >
                  <Link2 className="h-3.5 w-3.5 mr-1 text-[#2563EB]" /> Copy Link
                </Button>
              </>
            ) : (
              <span className="text-xs font-semibold text-slate-500">
                Enrollment Required
              </span>
            )}
          </div>

          {/* Date & Time metadata */}
          <div className="text-xs text-slate-500 font-medium flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              {meeting.date}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              {meeting.startTime}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============ Resource Detail View ============
const ResourceDetailView = ({
  courseName,
  resources,
  onBack,
}: {
  courseName: string;
  resources: CourseResource[];
  onBack: () => void;
}) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
    <div className="text-sm flex items-center gap-2 text-slate-500">
      <button onClick={onBack} className="underline hover:text-slate-900">
        Resources
      </button>
      <span>›</span>
      <span className="text-slate-900 font-medium underline">{courseName}</span>
    </div>
    <h2 className="text-lg md:text-xl font-bold text-slate-900">{courseName}</h2>
    <div className="space-y-3">
      {resources.map((r, i) => (
        <div
          key={r.id}
          className="flex items-center justify-between bg-white rounded-2xl border border-slate-200/80 px-4 py-3.5 shadow-xs"
        >
          <span className="text-sm text-slate-800 font-medium">
            {String(i + 1).padStart(2, "0")}: {r.title}
          </span>
          <button
            onClick={() => resourcesService.downloadResource(r)}
            aria-label={`Download ${r.title}`}
            className="h-9 w-9 rounded-xl border border-blue-200 text-[#2563EB] flex items-center justify-center hover:bg-blue-50 transition"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  </motion.div>
);

// ============ Announcement Card Component ============
const AnnouncementCard = ({ a }: { a: Announcement }) => (
  <div className="bg-white rounded-2xl border border-slate-200/80 p-4 md:p-5 shadow-xs">
    <div className="flex items-start gap-3.5">
      <span className="h-10 w-10 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0">
        <Megaphone className="h-4 w-4" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-slate-900 text-sm sm:text-base">{a.title}</p>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">{a.message}</p>
        <p className="text-xs text-slate-400 mt-2 font-medium">
          {a.courseName} • {a.createdBy} • {new Date(a.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  </div>
);

// ============ Empty State Component ============
const EmptyState = ({
  icon: Icon,
  title,
  desc,
}: {
  icon: any;
  title: string;
  desc: string;
}) => (
  <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
    <Icon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
    <h3 className="text-lg font-bold text-slate-900 mb-1">{title}</h3>
    <p className="text-slate-500 text-sm">{desc}</p>
  </div>
);

export default LiveClasses;
