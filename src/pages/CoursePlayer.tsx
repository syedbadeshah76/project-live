import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Bell, CheckCircle, Circle, FileText, Clock, ChevronLeft, Save, Award,
  PartyPopper, Star, Share2, ClipboardList, Lock, MessageSquare,
  ChevronRight, ChevronLeft as ChevronLeftIcon, BookOpen, Megaphone,
  Plus, Send, Video, Link2, Calendar, Trash2, Loader2,
  Search, Filter,
} from "lucide-react";
import LessonVideoPlayer from "@/components/video/LessonVideoPlayer";
import { HandPickedSection } from "@/components/dashboard/HandPickedSection";
import { coursesService, type CourseProgress, type LessonSession, type StudentCourseDetails } from "@/services/courses.service";
import { announcementService, mapAnnouncement } from "@/services/announcements.service";
import { AnnouncementList } from "@/components/announcements/AnnouncementList";
import { enrollmentService } from "@/services/enrollment.service";
import { notesService } from "@/services/notes.service";
import { searchService } from "@/services/search.service";
import { instructorsService, type InstructorOption } from "@/services/instructors.service";
import { reviewsService } from "@/services/reviews.service";
import { liveCoursesService } from "@/services/liveCourses.service";

import { instructorService, type InstructorAnalytics } from "@/services/instructor.service";
import { remindersService } from "@/services/reminders.service";
import { certificatesService } from "@/services/certificates.service";
import { quizService, type Quiz } from "@/services/quiz.service";
import { practiceTestService } from "@/services/practiceTest/practiceTestService";
import type { PracticeTestSummary } from "@/types/practiceTest";
import { useModuleQuiz } from "@/hooks/useModuleQuiz";
import QuizRunner from "@/components/quiz/QuizRunner";
import { qnaService, type QnaQuestion } from "@/services/qna.service";
import { meetingService } from "@/services/meeting.service";
import type { Meeting } from "@/types/meeting.types";
import type { Announcement } from "@/types/announcement.types";
import { CertificateSheet } from "@/components/certificates/CertificateSheet";
import { downloadCertificateFromElement } from "@/lib/certificate-pdf";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getLessonMedia } from "@/lib/demo-videos";
import { CourseReminderButton } from "@/components/reminders/CourseReminderButton";
import type { Course, Section, Lesson, Note as NoteType, Certificate } from "@/types/api.types";

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const formatDurationLabel = (seconds: number) => {
  if (!seconds || !Number.isFinite(seconds)) return "0:00";
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const formatRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

const unwrap = <T,>(res: any): T => {
  if (res && typeof res === "object" && "data" in res) return res.data as T;
  return res as T;
};

const toArray = <T,>(value: any): T[] => {
  const data = unwrap<any>(value);
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    for (const key of ["content", "items", "results", "modules", "lessons"]) {
      if (Array.isArray(data[key])) return data[key] as T[];
    }
  }
  return [];
};

const firstNonEmptyString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

const firstPositiveNumber = (...values: unknown[]) => {
  for (const value of values) {
    const n =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? Number(value)
          : 0;
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
};

const normalizeLessonDurationSeconds = (lesson: any) => {
  const seconds = firstPositiveNumber(
    lesson.videoDurationSeconds,
    lesson.durationInSeconds,
    lesson.videoDurationSeconds,
  );
  if (seconds) return seconds;

  const minutes = firstPositiveNumber(lesson.durationMinutes, lesson.durationInMinutes);
  if (minutes) return minutes * 60;

  return firstPositiveNumber(lesson.duration);
};

const normalizeLesson = (lesson: any, index: number): Lesson => {
  const realLessonId = String(
    lesson.id ?? lesson.lessonId ?? lesson.uuid ?? lesson.lesson_id ?? lesson.lessonUuid ?? `lesson-${index}`
  );
  return {
    id: realLessonId,
    lessonId: realLessonId,
    title: lesson.title ?? `Lesson ${index + 1}`,
    description: lesson.description ?? "",
    type: String(lesson.type ?? "video").toLowerCase(),
    duration: normalizeLessonDurationSeconds(lesson),
    videoUrl: firstNonEmptyString(
      lesson.videoUrl,
      lesson.videoURL,
      lesson.video_url,
      lesson.playbackUrl,
      lesson.playbackURL,
      lesson.streamUrl,
      lesson.streamURL,
      lesson.mediaUrl,
      lesson.fileUrl,
      lesson.objectUrl,
      lesson.contentUrl,
      lesson.url,
    ),
    content: lesson.content ?? "",
    resources: Array.isArray(lesson.resources) ? lesson.resources : [],
    order: Number(lesson.order ?? index),
    isFree: Boolean(lesson.isFree ?? lesson.previewEnabled ?? false),
  } as Lesson;
};

const extractQuizId = (section: any): string => {
  if (!section) return "";
  const secId = String(section.id ?? section.moduleId ?? section.sectionId ?? "").trim();
  const rawQ = section.quiz ?? section.moduleQuiz ?? (Array.isArray(section.quizzes) ? section.quizzes[0] : null);

  if (typeof rawQ === "string" && rawQ) {
    const trimmed = rawQ.trim();
    if (trimmed && trimmed !== "undefined" && trimmed !== secId && !trimmed.startsWith("section-") && !trimmed.startsWith("module-")) {
      return trimmed;
    }
  }

  if (rawQ && typeof rawQ === "object") {
    const candidates = [rawQ.quizId, rawQ.quiz_id, rawQ.id, rawQ.uuid];
    for (const cand of candidates) {
      if (cand) {
        const strVal = String(cand).trim();
        if (strVal && strVal !== "undefined" && strVal !== secId && !strVal.startsWith("section-") && !strVal.startsWith("module-")) {
          return strVal;
        }
      }
    }
  }

  const sectionCandidates = [section.quizId, section.quiz_id, section.quizUuid];
  for (const cand of sectionCandidates) {
    if (cand) {
      const strVal = String(cand).trim();
      if (strVal && strVal !== "undefined" && strVal !== secId && !strVal.startsWith("section-") && !strVal.startsWith("module-")) {
        return strVal;
      }
    }
  }

  return "";
};

const normalizeSection = (section: any, index: number, lessons: any[] = []): Section => {
  const rawQ = section.quiz ?? section.moduleQuiz ?? (Array.isArray(section.quizzes) ? section.quizzes[0] : null);
  const quizId = extractQuizId(section);

  const quizObj = quizId ? {
    id: quizId,
    quizId: quizId,
    title: (typeof rawQ === "object" && rawQ?.title) || `${section.title ?? section.name ?? "Module"} Quiz`,
    durationMinutes: typeof rawQ === "object" ? (rawQ?.durationMinutes ?? rawQ?.timeLimit ?? 20) : 20,
    passingPercentage: typeof rawQ === "object" ? (rawQ?.passingPercentage ?? 70) : 70,
    maxAttempts: typeof rawQ === "object" ? (rawQ?.maxAttempts ?? 3) : 3,
  } : undefined;

  return {
    id: String(section.id ?? section.moduleId ?? `section-${index}`),
    title: section.title ?? section.name ?? `Section ${index + 1}`,
    order: Number(section.order ?? index),
    lessons: lessons.map((lesson, lessonIndex) => normalizeLesson(lesson, lessonIndex)),
    quiz: quizObj,
    quizId: quizId || undefined,
  } as any;
};

const normalizeProgress = (raw: any, courseId: string, totalLessons: number): {
  completedLessons: string[];
  notes: NoteType[];
  backendProgress: CourseProgress | null;
} => {
  const data = unwrap<any>(raw) ?? {};
  const completedIds = Array.isArray(data.completedLessons)
    ? data.completedLessons
    : Array.isArray(data.completedLessonIds)
      ? data.completedLessonIds
      : Array.isArray(data.completedLessonIdsList)
        ? data.completedLessonIdsList
        : [];

  const completedLessons = completedIds.map((id: unknown) => String(id));
  const completedCount =
    typeof data.completedLessons === "number"
      ? data.completedLessons
      : typeof data.completedLessonCount === "number"
        ? data.completedLessonCount
        : completedLessons.length;

  return {
    completedLessons,
    notes: Array.isArray(data.notes) ? data.notes : [],
    backendProgress: {
      courseId: String(data.courseId ?? courseId),
      status: data.status ?? (data.progressPercentage >= 100 ? "COMPLETED" : "IN_PROGRESS"),
      progressPercentage: totalLessons ? Math.min(100, Math.round((completedLessons.length / totalLessons) * 100)) : 0,
      completedModules: Number(data.completedModules ?? 0),
      totalModules: Number(data.totalModules ?? 0),
      completedLessons: completedLessons.length,
      totalLessons: totalLessons,
      completedQuizzes: Number(data.completedQuizzes ?? 0),
      totalQuizzes: Number(data.totalQuizzes ?? 0),
      startedAt: data.startedAt ?? null,
      completedAt: data.completedAt ?? null,
    },
  };
};

const normalizeStudentCourse = (raw: StudentCourseDetails | any, fallbackCourseId: string): Course =>
  ({
    id: String(raw.id ?? raw.courseId ?? fallbackCourseId),
    title: raw.title ?? "Untitled course",
    slug: raw.slug ?? String(raw.title ?? "course").toLowerCase().replace(/\s+/g, "-"),
    description: raw.description ?? "",
    shortDescription: raw.shortDescription ?? raw.description ?? "",
    thumbnail: raw.thumbnailUrl ?? raw.thumbnail ?? "",
    previewVideo: raw.previewVideoUrl ?? raw.previewVideo,
    category: raw.category && typeof raw.category === "object"
      ? raw.category
      : {
          id: raw.categoryId ?? "general",
          name: raw.categoryName ?? "General",
          slug: "general",
          description: "",
          icon: "BookOpen",
          color: "from-blue-500 to-cyan-500",
          courseCount: 0,
          isActive: true,
        },
    categoryId: raw.categoryId ?? raw.category?.id ?? "general",
    instructor: raw.instructor && typeof raw.instructor === "object"
      ? raw.instructor
      : {
          id: raw.instructorId ?? "",
          name: raw.instructorName ?? "Instructor",
          avatar: raw.instructorAvatar ?? "",
          bio: "",
          title: "",
          rating: 0,
          students: 0,
          courses: 0,
        },
    instructorId: raw.instructorId ?? raw.instructor?.id ?? "",
    duration: raw.duration ?? `${Number(raw.totalLessons ?? 0)} lessons`,
    totalDuration: Number(raw.totalDuration ?? raw.totalDurationMinutes ?? 0),
    lessons: Number(raw.totalLessons ?? raw.lessons ?? 0),
    students: Number(raw.students ?? raw.totalStudents ?? 0),
    rating: Number(raw.rating ?? raw.avgRating ?? 0),
    reviewCount: Number(raw.reviewCount ?? raw.reviewsCount ?? 0),
    price: Number(raw.price ?? raw.basePrice ?? 0),
    discountPrice: raw.discountPrice ?? raw.discountedPrice,
    level: raw.level ?? "Beginner",
    status: raw.status === "ARCHIVED" ? "Archived" : raw.status === "DRAFT" ? "Draft" : "Published",
    featured: Boolean(raw.featured),
    tags: raw.tags ?? [],
    requirements: raw.requirements ?? [],
    whatYouWillLearn: raw.whatYouWillLearn ?? raw.learningOutcomes ?? [],
    curriculum: raw.curriculum ?? [],
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  } as Course);

/** Small horizontal scroll carousel with arrows. */
const HScroll = ({
  children,
  ariaLabel,
  controlsClassName = "",
  title,
  subHeader,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  controlsClassName?: string;
  title?: React.ReactNode;
  subHeader?: React.ReactNode;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;

    const amount = Math.max(280, el.clientWidth * 0.85);

    el.scrollBy({
      left: dir * amount,
      behavior: "smooth",
    });
  };

  const navButtons = (
    <div className="flex items-center gap-2 shrink-0">
      <button
        type="button"
        onClick={() => scrollBy(-1)}
        className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full border border-border bg-card flex items-center justify-center text-foreground shadow-sm hover:bg-muted active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 shrink-0 after:absolute after:-inset-1 after:content-['']"
        aria-label="Scroll left"
      >
        <ChevronLeft className="h-4 w-4 shrink-0" />
      </button>

      <button
        type="button"
        onClick={() => scrollBy(1)}
        className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm hover:opacity-90 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 shrink-0 after:absolute after:-inset-1 after:content-['']"
        aria-label="Scroll right"
      >
        <ChevronRight className="h-4 w-4 shrink-0" />
      </button>
    </div>
  );

  return (
    <div className="relative">
      {title ? (
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-display text-lg md:text-xl font-semibold text-foreground">
            {title}
          </h2>
          {navButtons}
        </div>
      ) : (
        <div
          className={`absolute right-0 flex items-center gap-2 ${controlsClassName}`}
        >
          {navButtons}
        </div>
      )}

      {subHeader}

      <div
        ref={ref}
        aria-label={ariaLabel}
        className="flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </div>
  );
};

const CoursePlayer = () => {
  const { courseId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [course, setCourse] = useState<Course | null>(null);
  const [curriculum, setCurriculum] = useState<Section[]>([]);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [notes, setNotes] = useState<NoteType[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [courseProgress, setCourseProgress] = useState<CourseProgress | null>(null);
  const [lessonSession, setLessonSession] = useState<LessonSession | null>(null);
  const [resolvedInstructorName, setResolvedInstructorName] = useState<string>("Instructor");
  const [resolvedStudentCount, setResolvedStudentCount] = useState<number>(0);
  const [resolvedCourseRating, setResolvedCourseRating] = useState<number>(0);
  const [resolvedTotalCourses, setResolvedTotalCourses] = useState<number>(1);

  const [instructorAnalytics, setInstructorAnalytics] = useState<InstructorAnalytics | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const isCourseInstructor = user?.role === "instructor" && String(course?.instructorId || "") === String(user?.id || "");
    /** moduleId -> quiz (null = module has no quiz) */
  const [moduleQuizzes, setModuleQuizzes] = useState<Record<string, Quiz | null>>({});
  /** moduleId -> the student already passed that module's quiz */
  const [moduleQuizPassed, setModuleQuizPassed] = useState<Record<string, boolean>>({});
  /** moduleId or quizId -> the student already attempted that module's quiz */
  const [moduleQuizAttempted, setModuleQuizAttempted] = useState<Record<string, boolean>>({});
  const [showQuiz, setShowQuiz] = useState(false);
  const [activeQuizModuleId, setActiveQuizModuleId] = useState<string | null>(null);

  const quizState = useModuleQuiz({
    onSubmitted: async (result) => {
      const passThreshold = Number(quizState.quiz?.passingPercentage ?? 70);
      const isPassed = Boolean(
        result?.passed ||
        (result?.percentage != null && result.percentage >= passThreshold)
      );

      const quizId = quizState.quiz?.id;
      if (quizId) {
        try { localStorage.setItem(`edvanz_quiz_completed_${quizId}`, "true"); } catch {}
      }
      if (activeQuizModuleId) {
        try { localStorage.setItem(`edvanz_quiz_completed_${activeQuizModuleId}`, "true"); } catch {}
      }

      setModuleQuizAttempted((prev) => {
        const next = { ...prev };
        if (activeQuizModuleId) next[activeQuizModuleId] = true;
        if (quizId) next[quizId] = true;
        return next;
      });

      let maxAttemptsReached = false;
      if (quizState.quiz?.id) {
        try {
          const history = await quizService.getAttemptHistory(quizState.quiz.id);
          const usedCount = Array.isArray(history) ? history.filter((a) => a.status !== "IN_PROGRESS").length : 0;
          const maxAllowed = Number(quizState.quiz.maxAttempts ?? 3);
          if (maxAllowed > 0 && usedCount >= maxAllowed) {
            maxAttemptsReached = true;
          }
        } catch {
          /* optional check */
        }
      }

      if (isPassed || maxAttemptsReached) {
        setModuleQuizPassed((prev) => {
          const next = { ...prev };
          if (activeQuizModuleId) next[activeQuizModuleId] = true;
          if (quizState.quiz?.id) next[quizState.quiz.id] = true;
          return next;
        });
      }
      try {
        const fresh = await coursesService.getCourseProgress(courseId!);
        setCourseProgress(fresh);
      } catch {
        /* non-fatal */
      }
    },
  });

  const [related, setRelated] = useState<Course[]>([]);
  const [coursePracticeTest, setCoursePracticeTest] = useState<Quiz | PracticeTestSummary | null>(null);
  const [upcomingClasses, setUpcomingClasses] = useState<Meeting[]>([]);
  const recRef = useRef<HTMLDivElement>(null);

  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [earnedCertificate, setEarnedCertificate] = useState<Certificate | null>(null);
  const [certDownloading, setCertDownloading] = useState(false);

  const [showQuizReview, setShowQuizReview] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizIndexAnswers, setQuizIndexAnswers] = useState<Record<string, number>>({});
  const [quizResult, setQuizResult] = useState<{ score: number; maxScore: number; passed: boolean; passingPercentage: number } | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const maxWatchedRef = useRef(0);

  // Q&A state
  const [questions, setQuestions] = useState<QnaQuestion[]>([]);
  const [askTitle, setAskTitle] = useState("");
  const [askBody, setAskBody] = useState("");
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [showAskForm, setShowAskForm] = useState(false);
  const [qnaSearch, setQnaSearch] = useState("");
  const [openReplies, setOpenReplies] = useState<Record<string, boolean>>({});
  const [openReplyForm, setOpenReplyForm] = useState<Record<string, boolean>>({});
  const [noteSort, setNoteSort] = useState<"newest" | "oldest" | "timestamp">("newest");

  // Notes UI state
  const [noteScope, setNoteScope] = useState<"all" | "current">("all");
  const [savingNote, setSavingNote] = useState(false);

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");

  // Right-column tabs (Course Content / Summary)
  const [rightTab, setRightTab] = useState<"content" | "summary">("content");

  // Set Reminder modal
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_NAMES = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

const [reminderOpen, setReminderOpen] = useState(false);
const [reminderDays, setReminderDays] = useState<number[]>([]);
const [reminderHour, setReminderHour] = useState("06");
const [reminderMinute, setReminderMinute] = useState("30");
const [reminderMeridiem, setReminderMeridiem] = useState<"AM" | "PM">("PM");
const [savingReminder, setSavingReminder] = useState(false);
const [hasReminder, setHasReminder] = useState(false);

const toggleReminderDay = (i: number) =>
  setReminderDays((prev) => (prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i].sort()));
const buildReminderTime = () => {
  let h = Number(reminderHour || "0");
  if (Number.isNaN(h)) h = 0;
  h = h % 12;
  if (reminderMeridiem === "PM") h += 12;
  const m = Math.min(59, Number(reminderMinute || "0") || 0);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const formatReminderDays = (days: number[]) =>
  days.map((d) => DAY_NAMES[d]).join(",");

 const saveReminder = async () => {
  if (!courseId) return;
  if (reminderDays.length === 0) {
    toast.error("Pick at least one day");
    return;
  }

  setSavingReminder(true);
  try {
    await remindersService.create({
      courseId,
      reminderDays: formatReminderDays(reminderDays),
      reminderTime: buildReminderTime(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    setHasReminder(true);
    setReminderOpen(false);
    toast.success("Reminder set successfully");
  } catch (e: any) {
    toast.error(e?.message || "Failed to set reminder");
  } finally {
    setSavingReminder(false);
  }
};
useEffect(() => {
  if (!courseId) return;
  let cancelled = false;
  (async () => {
    try {
      const r = await remindersService.getByCourse(courseId);
      if (cancelled || !r) return;
      setHasReminder(true);
      if (r.reminder_days.length) setReminderDays(r.reminder_days);
      if (r.reminder_time) {
        const [hh, mm] = r.reminder_time.split(":");
        const h24 = Number(hh);
        setReminderMeridiem(h24 >= 12 ? "PM" : "AM");
        setReminderHour(String(h24 % 12 === 0 ? 12 : h24 % 12).padStart(2, "0"));
        setReminderMinute((mm ?? "00").padStart(2, "0"));
      }
    } catch {
      /* ignore */
    }
  })();
  return () => { cancelled = true; };
}, [courseId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!courseId) return;
      setLoading(true);
      setCourse(null);
      setCurriculum([]);
      setCurrentLesson(null);
      setCompletedLessons([]);
      setNotes([]);
      setCourseProgress(null);
      setQuestions([]);
      setRelated([]);
      setCoursePracticeTest(null);
      setUpcomingClasses([]);
      try {
        const courseRes = await coursesService.getStudentCourseDetails(courseId);
        const courseData = normalizeStudentCourse(courseRes ?? { courseId }, courseId);
        setCourse(courseData);

        const curriculumRes = await coursesService
          .getCourseCurriculum(courseId)
          .catch(() => []);

        const rawCourseModules = toArray<any>(
          courseRes?.modules ??
          (courseRes as any)?.data?.modules ??
          courseData?.modules ??
          courseData?.curriculum
        );
        const curriculumModules = toArray<any>(curriculumRes);

        let modulesToEnrich = curriculumModules;
        if (!modulesToEnrich.length && rawCourseModules.length) {
          modulesToEnrich = rawCourseModules;
        } else if (modulesToEnrich.length && rawCourseModules.length) {
          modulesToEnrich = modulesToEnrich.map((m: any) => {
            const matched = rawCourseModules.find(
              (cm: any) => String(cm.id ?? cm.moduleId ?? "") === String(m.id ?? m.moduleId ?? "")
            );
            return {
              ...matched,
              ...m,
              quiz: m.quiz ?? m.moduleQuiz ?? matched?.quiz ?? matched?.moduleQuiz,
            };
          });
        }

        const enrichedModules = await Promise.all(
          modulesToEnrich.map(async (module, index) => {
            const modId = String(module.id ?? module.moduleId ?? "");
            let fetchedLessons: any[] = [];
            if (modId && !modId.startsWith("section-") && !modId.startsWith("module-")) {
              try {
                const lessonsRes = await coursesService.getLessonsByModule(modId);
                fetchedLessons = toArray<any>(lessonsRes);
              } catch {
                /* fallback to embedded */
              }
            }
            const embeddedLessons = toArray<any>(module.lessons ?? module.items ?? module.lessonList);
            const combinedMap = new Map<string, any>();
            embeddedLessons.forEach((l: any) => {
              const id = String(l.id ?? l.lessonId ?? "");
              if (id) combinedMap.set(id, l);
            });
            fetchedLessons.forEach((l: any) => {
              const id = String(l.id ?? l.lessonId ?? "");
              if (id) {
                combinedMap.set(id, { ...combinedMap.get(id), ...l });
              }
            });

            const rawLessons = combinedMap.size > 0 
              ? Array.from(combinedMap.values())
              : fetchedLessons.length ? fetchedLessons : embeddedLessons;

            return normalizeSection(module, index, rawLessons);
          }),
        );
        setCurriculum(enrichedModules);

        const allLessons = enrichedModules.flatMap((section) => section.lessons);
        const [
          backendProgress,
          qnaRes,
          relatedRes,
          allQuizRes,
          notesRes,
          instructorsList,
          enrollmentCountRes,
          reviewSummaryRes,
        ] = await Promise.all([
          coursesService.getCourseProgress(courseId).catch(() => null as CourseProgress | null),
          qnaService.listByCourse(courseId).catch(() => ({ success: true, data: [] as QnaQuestion[] })),
          searchService
            .searchFilters({ page: 0, size: 20 })
            .then((res) => ({
              data: (res?.courses || []).filter((c: any) => String(c.id) !== String(courseId)),
            }))
            .catch(() => ({ data: [] })),
          Promise.resolve({ success: true, data: [] }),
          notesService.listByCourse(courseId).catch(() => ({ success: true, data: [] as NoteType[] })),
          instructorsService.list().catch(() => [] as InstructorOption[]),
          enrollmentService.getCourseEnrollmentCount(courseId).catch(() => null),
          reviewsService.getReviewSummary(courseId).catch(() => null),
        ]);

        // 1. Resolve instructor name from instructors.service.ts
        const targetInstId = String(courseData.instructorId || (courseRes as any)?.instructorId || (courseRes as any)?.instructorUserId || "");
        const instMatch = (instructorsList || []).find((i: any) =>
          String(i.id) === targetInstId ||
          String(i.userId) === targetInstId ||
          String(i.id) === String(courseData.instructor?.id) ||
          String(i.userId) === String(courseData.instructor?.id)
        );
        const instName =
          instMatch?.name ||
          (typeof courseData.instructor === "object" ? courseData.instructor?.name : "") ||
          (courseRes as any)?.instructorName ||
          "Instructor";
        setResolvedInstructorName(instName);

        // 2. Resolve actual student count for this course from enrollment.service.ts
        const studentCnt =
          typeof (enrollmentCountRes as any)?.data?.count === "number"
            ? (enrollmentCountRes as any).data.count
            : typeof (enrollmentCountRes as any)?.count === "number"
            ? (enrollmentCountRes as any).count
            : (courseData as any)?.students || (courseRes as any)?.students || (courseRes as any)?.enrolledCount || 0;
        setResolvedStudentCount(studentCnt);

        // 3. Resolve actual course rating for this course from rating/reviews service
        const ratingData = (reviewSummaryRes as any)?.data ?? reviewSummaryRes;
        const ratingVal =
          typeof ratingData?.avgRating === "number"
            ? ratingData.avgRating
            : typeof ratingData?.averageRating === "number"
            ? ratingData.averageRating
            : typeof ratingData?.rating === "number"
            ? ratingData.rating
            : (courseData as any)?.rating || (courseRes as any)?.rating || 0;
        setResolvedCourseRating(ratingVal);

        const normalizedProgress = normalizeProgress(
          backendProgress,
          courseId,
          allLessons.length,
        );
        let savedLocalCompleted: string[] = [];
        if (courseId) {
          try {
            const local = localStorage.getItem(`edvanz_completed_lessons_${courseId}`);
            if (local) savedLocalCompleted = JSON.parse(local);
          } catch {}
        }
        const mergedCompleted = [...new Set([...normalizedProgress.completedLessons, ...savedLocalCompleted])];
        setCompletedLessons(mergedCompleted);
        setNotes(toArray<NoteType>(notesRes));
        setCourseProgress(normalizedProgress.backendProgress);
        setQuestions(toArray<QnaQuestion>(qnaRes));
        setRelated(toArray<Course>(relatedRes));

        // Resolve total courses created by this instructor
        const instProfileId = instMatch?.id ? String(instMatch.id) : targetInstId;
        const instUserId = instMatch?.userId ? String(instMatch.userId) : targetInstId;

        try {
          const [allCoursesRes, liveCoursesRes] = await Promise.all([
            searchService.searchFilters({ page: 0, size: 100 }).catch(() => null),
            liveCoursesService.getAll().catch(() => ({ data: [] })),
          ]);

          const recordedAndLiveFromSearch = allCoursesRes?.courses || [];
          const liveList = Array.isArray((liveCoursesRes as any)?.data)
            ? (liveCoursesRes as any).data
            : Array.isArray(liveCoursesRes)
            ? liveCoursesRes
            : [];

          const allCombinedCourses = [...recordedAndLiveFromSearch, ...liveList];

          const instructorCoursesList = allCombinedCourses.filter((c: any) => {
            const cInstId = String(
              c.instructorId ||
              c.instructorUserId ||
              (typeof c.instructor === "object" ? c.instructor?.id || c.instructor?.userId : c.instructor) ||
              ""
            );
            const cInstUser = String(c.instructorUserId || c.instructorId || "");

            return (
              (instProfileId && (cInstId === instProfileId || cInstUser === instProfileId)) ||
              (instUserId && (cInstId === instUserId || cInstUser === instUserId)) ||
              (targetInstId && (cInstId === targetInstId || cInstUser === targetInstId))
            );
          });

          const uniqueCourseIds = new Set<string>();
          instructorCoursesList.forEach((c: any) => {
            const id = String(c.id || c.courseId || c.liveCourseId || "");
            if (id) uniqueCourseIds.add(id);
          });

          const totalCoursesCreated = Math.max(1, uniqueCourseIds.size);
          setResolvedTotalCourses(totalCoursesCreated);

          setInstructorAnalytics({
            totalStudents: studentCnt,
            totalCourses: totalCoursesCreated,
            totalRevenue: 0,
            averageRating: ratingVal,
            enrollmentsThisMonth: 0,
            revenueThisMonth: 0,
            studentsGrowth: 0,
            revenueGrowth: 0,
            popularCourses: [],
            revenueByMonth: [],
            enrollmentsByMonth: [],
            studentActivity: [],
          });
        } catch (err) {
          console.error("Failed to compute instructor stats", err);
        }

        let match: Quiz | PracticeTestSummary | null = null;
        try {
          const ptList = await practiceTestService.getPracticeTests(courseId);
          if (ptList && ptList.length > 0) {
            const courseSpecific = ptList.find((t) => String(t.courseId) === String(courseId));
            match = courseSpecific || ptList[0];
          }
        } catch {}

        if (!match) {
          try {
            const all = toArray<Quiz>(allQuizRes);
            const courseQuiz = all.find((q) => String(q.courseId) === String(courseId));
            if (courseQuiz) {
              match = courseQuiz;
            }
          } catch {}
        }
        setCoursePracticeTest(match);
        setUpcomingClasses([]);

        let resumeLesson = null;
        const lastLessonId =
          (backendProgress as any)?.lastLessonId ??
          (backendProgress as any)?.lastWatchedLessonId ??
          (backendProgress as any)?.currentLessonId;
        if (lastLessonId) {
          resumeLesson = allLessons.find((l) => String(l.id) === String(lastLessonId));
        }

        if (!resumeLesson && courseId) {
          try {
            const savedLocal = localStorage.getItem(`edvanz_last_lesson_${courseId}`);
            if (savedLocal) {
              resumeLesson = allLessons.find((l) => String(l.id) === String(savedLocal));
            }
          } catch {}
        }

        if (resumeLesson) {
          setCurrentLesson(resumeLesson);
        } else if (allLessons.length > 0) {
          const nextLesson = allLessons.find((l) => !normalizedProgress.completedLessons.includes(l.id));
          setCurrentLesson(nextLesson || allLessons[0]);
        }
      } catch (error) {
        console.error("Failed to load course:", error);
        toast.error("Failed to load course data");
        setCourse(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [courseId]);

  // Per-module quizzes. Backend model: Module → { lessons: Lesson[], quiz?: Quiz }
  useEffect(() => {
    if (!curriculum.length) return;
    let cancelled = false;

    (async () => {
      const entries = await Promise.all(
        curriculum.map(async (section: any) => {
          const moduleId = String(section.id ?? section.moduleId ?? "");
          if (!moduleId) return null;

          try {
            let quiz: Quiz | null = null;
            const embedded = section.quiz;
            const realQuizId = String(
              embedded?.id ?? embedded?.quizId ?? embedded?.quiz_id ?? section.quizId ?? section.quiz_id ?? ""
            );

            if (realQuizId && !realQuizId.startsWith("section-") && !realQuizId.startsWith("module-")) {
              if (embedded && typeof embedded === "object" && embedded.title) {
                quiz = { ...embedded, id: realQuizId };
              } else {
                try {
                  const qRes = await quizService.getQuizById(realQuizId);
                  if (qRes?.success && qRes?.data) quiz = qRes.data;
                } catch {
                  /* non-fatal */
                }
              }
            }

            let passed = false;
            let attempted = false;
            if (quiz?.id) {
              try {
                const history = await quizService.getAttemptHistory(quiz.id);
                const hasAttempt =
                  Array.isArray(history) &&
                  history.some((a) =>
                    a.submittedAt ||
                    a.completedAt ||
                    a.status === "PASSED" ||
                    a.status === "FAILED" ||
                    a.status === "COMPLETED" ||
                    a.status === "SUBMITTED" ||
                    a.passed != null ||
                    a.score != null ||
                    a.obtainedMarks != null ||
                    a.percentage != null
                  );

                const isPassed =
                  Array.isArray(history) &&
                  history.some((a) => {
                    if (a.passed || a.status === "PASSED") return true;
                    const pct = Number(a.percentage ?? 0);
                    const passPct = Number(quiz?.passingPercentage ?? 70);
                    if (pct >= passPct && pct > 0) return true;
                    const score = Number(a.score ?? 0);
                    const maxScore = Number(a.maxScore ?? quiz?.questionCount ?? 1);
                    if (maxScore > 0 && (score / maxScore) * 100 >= passPct && score > 0) return true;
                    return false;
                  });

                const usedCount = Array.isArray(history) ? history.filter((a) => a.status !== "IN_PROGRESS").length : 0;
                const maxAllowed = Number(quiz?.maxAttempts ?? 3);
                const maxAttemptsReached = maxAllowed > 0 && usedCount >= maxAllowed;

                passed = isPassed || maxAttemptsReached;
                attempted =
                  hasAttempt ||
                  usedCount > 0 ||
                  localStorage.getItem(`edvanz_quiz_completed_${quiz.id}`) === "true" ||
                  localStorage.getItem(`edvanz_quiz_completed_${moduleId}`) === "true";
              } catch {
                attempted =
                  localStorage.getItem(`edvanz_quiz_completed_${quiz.id}`) === "true" ||
                  localStorage.getItem(`edvanz_quiz_completed_${moduleId}`) === "true";
              }
            }
            return [moduleId, quiz, passed, attempted] as const;
          } catch {
            const fallbackQuiz = section.quiz ?? null;
            return [moduleId, fallbackQuiz, false, false] as const;
          }
        }),
      );
      if (cancelled) return;
      const valid = entries.filter(Boolean) as (readonly [string, Quiz | null, boolean, boolean])[];
      setModuleQuizzes(Object.fromEntries(valid.map(([id, quiz]) => [id, quiz])));
      const passedMap: Record<string, boolean> = {};
      const attemptedMap: Record<string, boolean> = {};
      valid.forEach(([id, quiz, passed, attempted]) => {
        if (id) {
          passedMap[id] = passed;
          attemptedMap[id] = attempted;
        }
        if (quiz?.id) {
          passedMap[quiz.id] = passed;
          attemptedMap[quiz.id] = attempted;
        }
      });
      setModuleQuizPassed(passedMap);
      setModuleQuizAttempted(attemptedMap);
    })();

    return () => { cancelled = true; };
  }, [curriculum, courseId]);

  useEffect(() => {
    if (!courseId || !course) {
      setAnnouncements([]);
      return;
    }

    let cancelled = false;
    const loadAnnouncements = async () => {
      try {
        const rawAnnouncements = await announcementService.getAnnouncementsByCourse(courseId);
        if (cancelled) return;

        const courseMeta = {
          courseId: course.id,
          courseName: course.title,
          courseType: "recorded" as const,
          studentCount: course.students ?? 0,
        };

        setAnnouncements(rawAnnouncements.map((raw) => mapAnnouncement(raw, courseMeta)));
      } catch {
        if (!cancelled) setAnnouncements([]);
      }
    };

    loadAnnouncements();
    return () => {
      cancelled = true;
    };
  }, [courseId, course]);

  const [openAccordionModules, setOpenAccordionModules] = useState<string[]>([]);
  const [isRestoringSession, setIsRestoringSession] = useState<boolean>(false);
  const activeSessionAbortRef = useRef<AbortController | null>(null);

  // Automatically expand module accordion containing current active lesson
  useEffect(() => {
    if (!currentLesson || !curriculum.length) return;
    const parentSection = curriculum.find((sec) =>
      sec.lessons.some((l) => String(l.id) === String(currentLesson.id))
    );
    if (parentSection) {
      const secId = String(parentSection.id ?? parentSection.moduleId ?? "");
      setOpenAccordionModules((prev) => (prev.includes(secId) ? prev : [...prev, secId]));
    }
  }, [currentLesson?.id, curriculum]);

  const activeSaveSeqRef = useRef<number>(0);
  const isSavingRef = useRef<boolean>(false);

  // Helper to persist watch progress to the backend (PUT /api/student/lessons/{lessonId}/session)
  const saveCurrentSession = useCallback(
    async (forceCompleted = false) => {
      if (!currentLesson || !courseId || isSavingRef.current) return;
      isSavingRef.current = true;
      const currentSeq = ++activeSaveSeqRef.current;

      const el = videoRef.current;
      const pos = el?.currentTime || 0;
      const dur = el?.duration || 0;
      const rate = el?.playbackRate || 1.0;
      const pct = dur > 0 ? Math.min(100, Math.round((pos / dur) * 100)) : 0;
      const isWatched = forceCompleted || pct >= 80;
      const watched = Math.max(maxWatchedRef.current, pos);

      try {
        localStorage.setItem(`edvanz_pos_${courseId}_${currentLesson.id}`, String(pos));
        localStorage.setItem(`edvanz_last_lesson_${courseId}`, currentLesson.id);
      } catch {}

      try {
        const session = await coursesService.saveLessonSession(currentLesson.id, {
          watchedSeconds: watched,
          lastPositionSeconds: pos,
          playbackRate: rate,
          progressPercentage: isWatched ? 100 : pct,
          completed: isWatched,
        });

        if (currentSeq === activeSaveSeqRef.current) {
          setLessonSession(session);
          if (isWatched) {
            setCompletedLessons((prev) => [...new Set([...prev, currentLesson.id])]);
          }
        }
      } catch (err) {
        console.debug("Silent error saving lesson session", err);
      } finally {
        isSavingRef.current = false;
      }
    },
    [currentLesson, courseId],
  );

  // Restore player position & track active lesson session
  useEffect(() => {
    if (!currentLesson || !courseId) return;

    try {
      localStorage.setItem(`edvanz_last_lesson_${courseId}`, currentLesson.id);
    } catch {}

    if (activeSessionAbortRef.current) {
      activeSessionAbortRef.current.abort();
    }

    const controller = new AbortController();
    activeSessionAbortRef.current = controller;

    let isMounted = true;
    setIsRestoringSession(true);

    (async () => {
      let savedPos = 0;
      let sessionData: LessonSession | null = null;

      try {
        sessionData = await coursesService.getLessonSession(currentLesson.id, controller.signal);
        if (!isMounted) return;
        if (sessionData) {
          setLessonSession(sessionData);
          if (sessionData.completed) {
            setCompletedLessons((prev) => [...new Set([...prev, currentLesson.id])]);
          }
          savedPos = Number(sessionData.lastPositionSeconds ?? 0);
          maxWatchedRef.current = Math.max(
            maxWatchedRef.current,
            Number(sessionData.watchedSeconds ?? savedPos),
          );
        }
      } catch (err: any) {
        if (err?.name === "CanceledError" || err?.name === "AbortError") {
          return;
        }
      }

      if (savedPos === 0) {
        try {
          const localPos = localStorage.getItem(`edvanz_pos_${courseId}_${currentLesson.id}`);
          if (localPos) savedPos = Number(localPos) || 0;
        } catch {}
      }

      if (!isMounted) return;

      if (videoRef.current && currentLesson) {
        videoRef.current.load();
        setCurrentTime(savedPos);
        setVideoCompleted(completedLessons.includes(currentLesson.id) || Boolean(sessionData?.completed));
        maxWatchedRef.current = Math.max(maxWatchedRef.current, savedPos);
      }

      const applySeek = () => {
        const v = videoRef.current;
        if (!v) {
          if (isMounted) setIsRestoringSession(false);
          return;
        }
        const dur = v.duration;
        let targetPos = savedPos;
        if (Number.isFinite(dur) && dur > 0) {
          if (targetPos >= Math.max(0, dur - 5)) {
            targetPos = 0;
          } else {
            targetPos = Math.min(targetPos, dur);
          }
        }
        if (targetPos > 0) {
          v.currentTime = targetPos;
          setCurrentTime(targetPos);
        }
        if (isMounted) setIsRestoringSession(false);
      };

      if (videoRef.current) {
        if (videoRef.current.readyState >= 1) {
          applySeek();
        } else {
          const handleLoadedMeta = () => {
            applySeek();
            videoRef.current?.removeEventListener("loadedmetadata", handleLoadedMeta);
          };
          videoRef.current.addEventListener("loadedmetadata", handleLoadedMeta);
        }
      } else {
        if (isMounted) setIsRestoringSession(false);
      }
    })();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [currentLesson?.id, courseId]);

  // Save session before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveCurrentSession(false);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [saveCurrentSession]);

  // Periodic watch progress saving (every 15s while playing)
  useEffect(() => {
    if (!currentLesson || !courseId) return;
    const interval = setInterval(() => {
      const el = videoRef.current;
      if (el && el.duration && !el.paused) {
        saveCurrentSession(false);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [currentLesson?.id, courseId, saveCurrentSession]);

  const handleNextLesson = async () => {
    await saveCurrentSession(false);
    const allLessons = curriculum.flatMap((s) => s.lessons);
    const currentIndex = allLessons.findIndex((l) => String(l.id) === String(currentLesson?.id));
    if (currentIndex >= 0 && currentIndex < allLessons.length - 1) {
      setCurrentLesson(allLessons[currentIndex + 1]);
    }
  };

  const handleVideoEnded = async () => {
    setVideoCompleted(true);
    if (!currentLesson || !courseId) return;

    try {
      const el = videoRef.current;
      const session = await coursesService.saveLessonSession(currentLesson.id, {
        watchedSeconds: maxWatchedRef.current || el?.currentTime || 0,
        lastPositionSeconds: el?.currentTime || 0,
        progressPercentage: 100,
        completed: true,
      });
      setLessonSession(session);

      const allLessons = curriculum.flatMap((s) => s.lessons);
      const p = await coursesService.getCourseProgress(courseId);
      const normalized = normalizeProgress(p, courseId, allLessons.length);
      setCourseProgress(normalized.backendProgress);
      if (normalized.completedLessons.length) {
        setCompletedLessons(normalized.completedLessons);
      } else {
        setCompletedLessons((prev) => [...new Set([...prev, currentLesson.id])]);
      }
    } catch {
      // best-effort
    }
  };

  const handleLessonComplete = async () => {
    if (!courseId || !currentLesson) return;
    try {
      const el = videoRef.current;
      const watched = maxWatchedRef.current || el?.currentTime || 0;
      const pos = el?.currentTime || 0;

      const session = await coursesService.saveLessonSession(currentLesson.id, {
        watchedSeconds: watched,
        lastPositionSeconds: pos,
        progressPercentage: 100,
        completed: true,
      });
      setLessonSession(session);

      const updatedCompleted = [...new Set([...completedLessons, currentLesson.id])];
      setCompletedLessons(updatedCompleted);

      coursesService
        .getCourseProgress(courseId)
        .then((progress) => {
          const normalized = normalizeProgress(progress, courseId, allLessons.length);
          setCourseProgress(normalized.backendProgress);
        })
        .catch(() => {});

      toast.success("Lesson marked as complete!");

      const allLessons = curriculum.flatMap((s) => s.lessons);
      const allCompleted = allLessons.length > 0 && allLessons.every((l) => updatedCompleted.includes(l.id));

      if (allCompleted) {
        try {
          await coursesService.markCourseComplete(courseId);
        } catch { }
        setTimeout(() => handleTestUnlock(), 800);
      } else {
        const currentIndex = allLessons.findIndex((l) => l.id === currentLesson.id);
        if (currentIndex < allLessons.length - 1) {
          setCurrentLesson(allLessons[currentIndex + 1]);
        }
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to mark lesson complete");
    }
  };

  const handleFinalCourseComplete = async () => {
    if (!courseId || !currentLesson) return;
    setMarkingComplete(true);
    try {
      const el = videoRef.current;
      const watched = maxWatchedRef.current || el?.currentTime || 0;
      const pos = el?.currentTime || 0;

      const session = await coursesService.saveLessonSession(currentLesson.id, {
        watchedSeconds: watched,
        lastPositionSeconds: pos,
        progressPercentage: 100,
        completed: true,
      });
      setLessonSession(session);

      const updatedCompleted = [...new Set([...completedLessons, currentLesson.id])];
      setCompletedLessons(updatedCompleted);

      await coursesService.markCourseComplete(courseId);

      const freshProgress = await coursesService.getCourseProgress(courseId);
      const allLessonsList = curriculum.flatMap((s) => s.lessons);
      const normalized = normalizeProgress(freshProgress, courseId, allLessonsList.length);

      setCourseProgress({
        ...(normalized.backendProgress || {
          courseId,
          progressPercentage: 100,
          completedModules: curriculum.length,
          totalModules: curriculum.length,
          completedLessons: allLessonsList.length,
          totalLessons: allLessonsList.length,
          completedQuizzes: 0,
          totalQuizzes: 0,
          startedAt: null,
        }),
        status: "COMPLETED",
        completedAt: normalized.backendProgress?.completedAt || new Date().toISOString(),
      });

      toast.success("Course marked as complete! Take Test is now available.");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to mark course complete");
    } finally {
      setMarkingComplete(false);
    }
  };

  const handleTestUnlock = async () => {
    if (!courseId) return;

    // 1. Check practice test specifically for this course via practiceTestService
    try {
      const tests = await practiceTestService.getPracticeTests(courseId);
      const courseTest = tests.find((t) => String(t.courseId) === String(courseId)) || tests[0];
      if (courseTest?.id) {
        navigate(`/dashboard/practice-tests/${courseTest.id}`);
        return;
      }
    } catch {
      /* ignore */
    }

    // 2. Fallback check via quizService
    try {
      const res = await quizService.getCourseQuiz(courseId);
      if (res?.success && res?.data?.id && (String(res.data.courseId) === String(courseId) || !res.data.courseId)) {
        navigate(`/dashboard/practice-tests/${res.data.id}`);
        return;
      }
    } catch {
      /* ignore */
    }

    // 3. Fallback to loaded coursePracticeTest state if matching course
    if (coursePracticeTest?.id && (String(coursePracticeTest.courseId) === String(courseId) || !coursePracticeTest.courseId)) {
      navigate(`/dashboard/practice-tests/${coursePracticeTest.id}`);
      return;
    }

    // 4. If no practice test exists for this course
    toast.info("No Practice Test is available for this course yet.");
  };

  const handleStartModuleQuiz = async (section: any, quiz: Quiz) => {
    if (!isModuleComplete(section)) {
      toast.info("Complete all lessons in this module to unlock the quiz.");
      return;
    }
    const secId = String(section.id ?? section.moduleId ?? "");
    const realQuizId = extractQuizId(section) || extractQuizId({ quiz }) || (quiz?.id && quiz.id !== secId && !quiz.id.startsWith("section-") && !quiz.id.startsWith("module-") ? quiz.id : "") || "";

    if (!realQuizId || realQuizId === secId || realQuizId === "undefined" || realQuizId.startsWith("section-") || realQuizId.startsWith("module-")) {
      toast.error("Quiz not available for this module yet");
      return;
    }

    const targetQuiz: Quiz = {
      ...quiz,
      id: realQuizId,
      quizId: realQuizId,
    };

    setActiveQuizModuleId(secId);
    const ok = await quizState.start(targetQuiz);
    if (ok) setShowQuiz(true);
  };

  const handleExitQuiz = () => {
    setShowQuiz(false);
    setActiveQuizModuleId(null);
    quizState.reset();
  };

  const handleRetakeQuiz = async () => {
    if (!quizState.quiz) return;
    await quizState.start(quizState.quiz);
  };

  const handleSubmitQuiz = async () => {
    if (!courseId) return;
    setQuizLoading(true);
    try {
      const quizRes = await quizService.getCourseQuiz(courseId);
      if (!quizRes.success || !quizRes.data) return;
      const indexAnswers: Record<string, number> = {};
      quizQuestions.forEach((q: any) => {
        const selectedOpt = quizAnswers[q.id];
        const idx = q.options.indexOf(selectedOpt);
        indexAnswers[q.id] = idx >= 0 ? idx : -1;
      });
      setQuizIndexAnswers(indexAnswers);
      const res = await quizService.submitAttempt(quizRes.data.id, courseId, indexAnswers, 0);
      if (res.success) {
        const { attempt } = res.data;
        setQuizResult({ score: attempt.score, maxScore: attempt.maxScore, passed: attempt.passed, passingPercentage: attempt.percentage });
        if (attempt.passed) {
          toast.success(`🎉 You passed with ${attempt.percentage}%!`);
          setTimeout(() => handleCourseCompletion(), 1500);
        } else {
          toast.error(`You scored ${attempt.percentage}%. Need to pass. Try again!`);
        }
      }
    } catch {
      toast.error("Failed to submit quiz");
    } finally {
      setQuizLoading(false);
    }
  };

  const handleCourseCompletion = async () => {
    if (!courseId) return;
    try {
      const response = await certificatesService.getCertificate(courseId).catch(() => null);
      if (response && response.success && response.data) {
        setEarnedCertificate(response.data);
      }
    } catch { } finally {
      setShowCompletionModal(true);
      setShowQuiz(false);
    }
  };

  const hiddenCourseCertRef = useRef<HTMLDivElement>(null);
  const [exportingCourseCert, setExportingCourseCert] = useState(false);

  const handleDownloadCertificate = async () => {
    if (!earnedCertificate) return;
    setCertDownloading(true);
    setExportingCourseCert(true);
    try {
      await new Promise((r) => setTimeout(r, 60));
      if (hiddenCourseCertRef.current) {
        const fileName = `${earnedCertificate.certificateNumber || "Certificate"}.pdf`;
        const success = await downloadCertificateFromElement(hiddenCourseCertRef.current, fileName);
        if (success) {
          toast.success("Certificate downloaded!");
        } else {
          toast.error("Failed to download certificate.");
        }
      }
    } catch {
      toast.error("Failed to download certificate.");
    } finally {
      setCertDownloading(false);
      setExportingCourseCert(false);
    }
  };

  const refreshNotes = async () => {
    if (!courseId) return;
    try {
      const res = await notesService.listByCourse(courseId);
      if (res.success) setNotes(res.data);
    } catch {
      /* keep current list on transient failure */
    }
  };

  const handleSaveNote = async () => {
    if (!newNote.trim() || !currentLesson || !courseId) return;
    const content = newNote.trim();
    setSavingNote(true);
    try {
      const moduleId = curriculum.find((s) =>
        s.lessons.some((l) => l.id === currentLesson.id),
      )?.id;

      const res = await notesService.create({
        courseId,
        moduleId,
        lessonId: currentLesson.id,
        title: currentLesson.title?.replace(/^Lesson \d+:\s*/, "") || "Note",
        content,
        timestamp: Math.floor(currentTime),
      });

      if (res.success) {
        setNotes((prev) => [...prev, res.data]);
        setNewNote("");
        toast.success("Note saved!");
      }
    } catch (err: any) {
      toast.error(err?.message || "Could not save note");
    } finally {
      setSavingNote(false);
    }
  };

  const handleUpdateNote = async (id: string) => {
    const existing = notes.find((n) => n.id === id);
    if (!existing || !editingNoteContent.trim()) return;
    const content = editingNoteContent.trim();
    setSavingNote(true);
    try {
      const res = await notesService.update(id, {
        title: (existing as any).title || "Note",
        content,
        timestamp: existing.timestamp ?? 0,
      });
      if (res.success) {
        setNotes((prev) => prev.map((n) => (n.id === id ? res.data : n)));
        setEditingNoteId(null);
        setEditingNoteContent("");
        toast.success("Note updated");
      }
    } catch (err: any) {
      toast.error(err?.message || "Could not update note");
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    const snapshot = notes;
    setNotes((prev) => prev.filter((n) => n.id !== id));
    try {
      await notesService.remove(id);
      toast.success("Note deleted");
    } catch (err: any) {
      setNotes(snapshot);
      toast.error(err?.message || "Could not delete note");
    }
  };

  const refreshQuestions = async () => {
    if (!courseId) return;
    const res = await qnaService.listByCourse(courseId);
    if (res.success) setQuestions(res.data);
  };

  const handleAskQuestion = async () => {
    if (!courseId || !askTitle.trim() || !askBody.trim()) return;
    try {
      const res = await qnaService.ask(courseId, {
        title: askTitle.trim(),
        content: askBody.trim(),
        lessonId: currentLesson?.id,
      });
      setQuestions((prev) => [res.data, ...prev]);
      setAskTitle("");
      setAskBody("");
      toast.success("Question posted");
      refreshQuestions();
    } catch {
      toast.error("Failed to post question");
    }
  };

  const handleToggleReplies = async (qid: string) => {
    const willOpen = !openReplies[qid];
    setOpenReplies((p) => ({ ...p, [qid]: willOpen }));
    if (!willOpen) return;
    const res = await qnaService.getReplies(qid);
    if (res.success) {
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === qid ? { ...q, answers: res.data, repliesCount: res.data.length } : q,
        ),
      );
    }
  };

  const handleAnswer = async (qid: string) => {
    if (!isCourseInstructor) {
      toast.error("Only the course instructor can reply to questions.");
      return;
    }
    const content = answerDrafts[qid]?.trim();
    if (!content) return;
    try {
      const res = await qnaService.answer(qid, content);
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === qid
            ? { ...q, answers: [...(q.answers || []), res.data], repliesCount: (q.repliesCount || 0) + 1 }
            : q,
        ),
      );
      setAnswerDrafts((prev) => ({ ...prev, [qid]: "" }));
      setOpenReplies((p) => ({ ...p, [qid]: true }));
      toast.success("Reply posted");
    } catch {
      toast.error("Failed to post reply");
    }
  };

  const scrollRec = (dir: 1 | -1) => {
    const el = recRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.85), behavior: "smooth" });
  };

  const totalLessons = curriculum.reduce((acc, s) => acc + s.lessons.length, 0);
  const isCurrentLessonCompleted = currentLesson ? completedLessons.includes(currentLesson.id) : false;

  const [maxProgressPercentage, setMaxProgressPercentage] = useState<number>(() => {
    if (!courseId) return 0;
    try {
      const saved = localStorage.getItem(`edvanz_max_progress_${courseId}`);
      return saved ? Number(saved) || 0 : 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    if (!courseId) return;
    try {
      const saved = localStorage.getItem(`edvanz_max_progress_${courseId}`);
      if (saved) {
        const val = Number(saved);
        if (Number.isFinite(val) && val > 0) {
          setMaxProgressPercentage((prev) => Math.max(prev, val));
        }
      }
    } catch {}
  }, [courseId]);

  useEffect(() => {
    if (!courseId || !completedLessons.length) return;
    try {
      localStorage.setItem(`edvanz_completed_lessons_${courseId}`, JSON.stringify(completedLessons));
    } catch {}
  }, [courseId, completedLessons]);

  const isCurrentLessonWatched = Boolean(
    isCurrentLessonCompleted ||
    videoCompleted ||
    lessonSession?.completed ||
    (lessonSession?.progressPercentage ?? 0) >= 80
  );

  const effectiveCompletedCount = useMemo(() => {
    const set = new Set<string>(completedLessons);
    if (isCurrentLessonWatched && currentLesson) set.add(currentLesson.id);
    return set.size;
  }, [completedLessons, isCurrentLessonWatched, currentLesson]);

  const currentLessonContribution = currentLesson
    ? isCurrentLessonWatched
      ? 1
      : (lessonSession?.progressPercentage ?? 0) / 100
    : 0;

  const completedExcludingCurrent = currentLesson
    ? completedLessons.filter((id) => id !== currentLesson.id).length
    : completedLessons.length;

  const calculatedProgressPercentage = totalLessons > 0
    ? Math.min(
        100,
        Math.round(
          ((completedExcludingCurrent + currentLessonContribution) / totalLessons) * 100
        )
      )
    : 0;

  const progressPercentage = useMemo(() => {
    const rawCalc = Math.max(
      courseProgress?.progressPercentage ?? 0,
      calculatedProgressPercentage,
      totalLessons > 0 ? Math.min(100, Math.round((effectiveCompletedCount / totalLessons) * 100)) : 0,
      maxProgressPercentage
    );
    return Math.min(100, Math.max(0, rawCalc));
  }, [courseProgress?.progressPercentage, calculatedProgressPercentage, totalLessons, effectiveCompletedCount, maxProgressPercentage]);

  useEffect(() => {
    if (progressPercentage > maxProgressPercentage) {
      setMaxProgressPercentage(progressPercentage);
      if (courseId) {
        try {
          localStorage.setItem(`edvanz_max_progress_${courseId}`, String(progressPercentage));
        } catch {}
      }
    }
  }, [progressPercentage, maxProgressPercentage, courseId]);

  const allCompleted = totalLessons > 0 && effectiveCompletedCount >= totalLessons;

  const lastSection = curriculum[curriculum.length - 1];
  const lastLessonInCurriculum = lastSection?.lessons?.[lastSection.lessons.length - 1];
  const isFinalLessonOfFinalModule = Boolean(
    currentLesson &&
    lastLessonInCurriculum &&
    String(currentLesson.id) === String(lastLessonInCurriculum.id)
  );

  const isCourseCompleted = Boolean(
    courseProgress?.status === "COMPLETED" ||
    (courseProgress as any)?.completedAt ||
    progressPercentage >= 100
  );

  /** A module's quiz unlocks only when every lesson in that module is completed. */
  const isModuleComplete = useCallback(
    (section: any) => {
      const lessons = (section?.lessons ?? []) as Lesson[];
      if (!lessons.length) return true;
      return lessons.every((l: any) => completedLessons.includes(String(l.id)));
    },
    [completedLessons],
  );

  /** Quizzes are non-mandatory: modules unlock when previous lessons are complete. */
  const isModuleUnlocked = useCallback(
    (index: number) => {
      if (index === 0) return true;
      for (let i = 0; i < index; i++) {
        const prev: any = curriculum[i];
        if (!prev) continue;
        if (!isModuleComplete(prev)) return false;
      }
      return true;
    },
    [curriculum, isModuleComplete],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Course not found</h2>
          <p className="text-muted-foreground mb-4">The course you're looking for doesn't exist.</p>
          <Button asChild><Link to="/courses">Browse Courses</Link></Button>
        </div>
      </div>
    );
  }

  const categoryName =
    typeof course.category === "object" ? course.category?.name : (course.category as unknown as string);
  const media = getLessonMedia({
    category: categoryName,
    videoUrl: currentLesson?.videoUrl,
    thumbnail: course.thumbnail,
  });

  const allLessons = curriculum.flatMap((s) => s.lessons);
  const assignments = allLessons.filter((l) => l.type === "assignment");
  const practiceTests = allLessons.filter((l) => l.type === "quiz");

  if (showQuiz && quizState.quiz) {
    return (
      <QuizRunner state={quizState} onExit={handleExitQuiz} onRetake={handleRetakeQuiz} />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb + Title */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 lg:pt-6 pb-2">
        <div className="text-xs sm:text-sm text-muted-foreground mb-2">
          <Link to="/dashboard/courses" className="hover:text-foreground">My Course</Link>
          <span className="mx-1.5">›</span>
          <span className="text-foreground">{course.title}</span>
        </div>
        <h1 className="text-lg sm:text-2xl font-bold text-foreground">{course.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs sm:text-sm">
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            {resolvedInstructorName}
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="inline-flex items-center gap-1 text-muted-foreground font-medium">
            {resolvedStudentCount.toLocaleString()} Students Enrolled
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="inline-flex items-center gap-1 text-amber-500 font-semibold">
            ⭐ {Number(resolvedCourseRating).toFixed(1)} Course Rating
          </span>
          <span className="text-muted-foreground">•</span>
          <Badge variant="secondary" className="gap-1.5 bg-primary/10 text-primary border-0">
            <BookOpen className="h-3.5 w-3.5" />
            {totalLessons} Lessons
          </Badge>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> {course.duration}
          </span>
        </div>
      </div>

      {/* Two-column area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
          {/* Video column */}
          <div className="lg:sticky lg:top-4 self-start">
            <div className="rounded-2xl overflow-hidden border border-border bg-black relative">
              {isRestoringSession && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm text-white space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-medium">Restoring playback position...</p>
                </div>
              )}
              <LessonVideoPlayer
                ref={videoRef}
                videoUrl={media.videoUrl}
                poster={media.poster}
                captionsSrc={media.captionsSrc}
                onTimeUpdate={(ct, total) => {
                  setCurrentTime(ct);
                  setDuration(total);
                  if (ct > maxWatchedRef.current) maxWatchedRef.current = ct;
                  if (ct / total >= 0.95) setVideoCompleted(true);
                }}
                onPause={() => saveCurrentSession(false)}
                onEnded={handleVideoEnded}
              />
            </div>

            {/* Lesson actions */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{currentLesson?.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {currentLesson?.description || "Lesson by " + course.instructor.name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isCourseCompleted ? (
                  <>
                    <Badge variant="secondary" className="gap-1 h-9 px-3">
                      <CheckCircle className="h-4 w-4 text-primary" /> Completed
                    </Badge>
                    <Button variant="outline" size="sm" onClick={handleTestUnlock} className="gap-2">
                      <ClipboardList className="h-4 w-4" /> Take Test
                    </Button>
                  </>
                ) : isCurrentLessonCompleted ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1 h-9 px-3">
                      <CheckCircle className="h-4 w-4 text-primary" /> Completed
                    </Badge>
                    {!isFinalLessonOfFinalModule && (
                      <Button size="sm" variant="outline" onClick={handleNextLesson} className="gap-2">
                        Next Lesson <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ) : videoCompleted ? (
                  isFinalLessonOfFinalModule ? (
                    <Button
                      size="sm"
                      disabled={markingComplete}
                      className="bg-green-600 hover:bg-green-700 text-white gap-2"
                      onClick={handleFinalCourseComplete}
                    >
                      {markingComplete ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      Mark Course Complete
                    </Button>
                  ) : (
                    <Button size="sm" onClick={handleNextLesson} className="gap-2">
                      Next Lesson <ChevronRight className="h-4 w-4" />
                    </Button>
                  )
                ) : (
                  <Button size="sm" disabled variant="outline" className="gap-2">
                    <Lock className="h-4 w-4" /> Watch full video
                  </Button>
                )}
              </div>
              <CourseReminderButton courseId={courseId} />
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-3">
            {/* Progress card */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-foreground">Your Progress</p>
                <p className="text-sm font-bold text-primary">{Math.round(progressPercentage)}%</p>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <p className="mt-2 text-xs text-muted-foreground">
                {effectiveCompletedCount}/{totalLessons} lessons completed
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="grid grid-cols-2 p-1.5 gap-1.5 bg-muted/40">
                <button
                  onClick={() => setRightTab("content")}
                  className={cn(
                    "h-10 rounded-lg text-sm font-semibold transition-colors",
                    rightTab === "content" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-background"
                  )}
                >
                  Course Content
                </button>
              </div>

              <ScrollArea className="lg:h-[calc(100vh-260px)]">
                {rightTab === "content" ? (
                  <div className="p-2">
                    <Accordion type="multiple" className="space-y-1" value={openAccordionModules} onValueChange={setOpenAccordionModules}>
                      {curriculum.map((section, sIdx) => {
                        const moduleUnlocked = isModuleUnlocked(sIdx);
                        const secId = String(section.id ?? section.moduleId ?? "");
                        const moduleQuiz: Quiz | null =
                          moduleQuizzes[secId] ??
                          (section.quiz ? (section.quiz as Quiz) : null) ??
                          Object.values(moduleQuizzes).find(
                            (q) => q && (String(q.moduleId) === secId || String((q as any).module_id) === secId)
                          ) ??
                          null;
                        const quizPassed = !!(
                          moduleQuizPassed[secId] ||
                          (moduleQuiz && moduleQuizPassed[moduleQuiz.id])
                        );
                        const quizAttempted = !!(
                          quizPassed ||
                          moduleQuizAttempted[secId] ||
                          (moduleQuiz && moduleQuizAttempted[moduleQuiz.id]) ||
                          localStorage.getItem(`edvanz_quiz_completed_${secId}`) === "true" ||
                          (moduleQuiz && localStorage.getItem(`edvanz_quiz_completed_${moduleQuiz.id}`) === "true")
                        );
                        const lessonsComplete = isModuleComplete(section);
                        const quizLocked = !moduleUnlocked || !lessonsComplete;
                        return (
                        <div key={section.id}>
                          <AccordionItem value={section.id} className="border rounded-lg overflow-hidden bg-background">
                            <AccordionTrigger className="px-3 py-3 text-sm hover:no-underline">
                              <div className="flex items-center justify-between w-full pr-2">
                                <span className="font-semibold text-left flex items-center gap-2">
                                  {!moduleUnlocked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                                  {String(sIdx + 1).padStart(2, "0")}: {section.title.replace(/^Section \d+:\s*/, "")}
                                </span>
                                <span className="text-xs text-muted-foreground shrink-0 ml-2">
                                  {section.lessons.reduce((acc) => acc + 22, 0)}min
                                </span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-2 pb-2 space-y-1">
                              {!moduleUnlocked && (
                                <p className="px-3 py-2 text-xs text-muted-foreground">
                                  Complete the previous module lessons to unlock this module.
                                </p>
                              )}
                              {section.lessons.map((lesson) => {
                                const isCompleted = completedLessons.includes(lesson.id);
                                const isCurrent = currentLesson?.id === lesson.id;
                                const isAssignment = lesson.type === "assignment";
                                return (
                                  <button
                                    key={lesson.id}
                                    disabled={!moduleUnlocked}
                                    onClick={async () => {
                                      if (!moduleUnlocked || lesson.id === currentLesson?.id) return;
                                      await saveCurrentSession(false);
                                      setCurrentLesson(lesson);
                                      setShowQuiz(false);
                                    }}
                                    className={cn(
                                      "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                                      isCurrent ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground/80",
                                      isAssignment && "bg-primary/5",
                                      !moduleUnlocked && "opacity-50 cursor-not-allowed hover:bg-transparent",
                                    )}
                                  >
                                    {!moduleUnlocked ? (
                                      <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    ) : isAssignment ? (
                                      <ClipboardList className="h-4 w-4 shrink-0 text-primary" />
                                    ) : isCompleted ? (
                                      <CheckCircle className="h-4 w-4 shrink-0 text-primary" />
                                    ) : (
                                      <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    )}
                                    <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                                      <span className="truncate">{lesson.title.replace(/^Lesson \d+:\s*/, "")}</span>
                                      <span className="text-xs text-muted-foreground shrink-0">
                                        {isAssignment ? "Start" : formatDurationLabel(lesson.duration)}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}

                              {moduleQuiz && (
                              <div
                                className={cn(
                                  "mt-2 w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all border",
                                  quizLocked
                                    ? "bg-muted/40 border-muted text-muted-foreground"
                                    : "bg-blue-50/80 hover:bg-blue-100/80 border-blue-100 text-blue-700 shadow-sm",
                                )}
                              >
                                <span className="font-semibold flex items-center gap-2 min-w-0 text-sm text-blue-900">
                                  {quizLocked && <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                                  {quizPassed ? (
                                    <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
                                  ) : quizAttempted ? (
                                    <CheckCircle className="h-4 w-4 shrink-0 text-blue-600 opacity-80" />
                                  ) : null}
                                  <span className="truncate">{moduleQuiz.title || `Quiz ${sIdx + 1}`}</span>
                                </span>

                                <button
                                  disabled={quizLocked || quizState.starting}
                                  onClick={() => handleStartModuleQuiz(section, moduleQuiz)}
                                  className={cn(
                                    "px-5 py-1.5 rounded-md text-xs font-semibold transition shrink-0 ml-2 shadow-sm",
                                    quizLocked
                                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                      : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95",
                                  )}
                                >
                                  {quizAttempted || quizPassed ? "Retake" : "Start"}
                                </button>
                              </div>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        </div>
                        );
                      })}

                    </Accordion>
                  </div>
                ) : (
                  <div className="p-4 space-y-4 text-sm">
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">About this course</h4>
                      <p className="text-muted-foreground">{course.shortDescription || course.description}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Lessons</p>
                        <p className="font-semibold">{totalLessons}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Duration</p>
                        <p className="font-semibold">{course.duration}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Level</p>
                        <p className="font-semibold">{course.level}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Progress</p>
                        <p className="font-semibold">{Math.round(progressPercentage)}%</p>
                      </div>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom tabs section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <Tabs defaultValue="overview">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
                <TabsTrigger
                  value="overview"
                  className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Overview
                </TabsTrigger>
 
                <TabsTrigger
                  value="notes"
                  className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Notes
                </TabsTrigger>
 
                <TabsTrigger
                  value="instructor"
                  className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Instructor
                </TabsTrigger>
 
                <TabsTrigger
                  value="qna"
                  className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Q&A
                </TabsTrigger>
 
                <TabsTrigger
                  value="announcements"
                  className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Announcements
                </TabsTrigger>
 
                <TabsTrigger
                  value="summarise"
                  className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Summarise
                </TabsTrigger>
              </TabsList>
              <Button variant="outline" size="sm" onClick={() => setReminderOpen(true)}>
                <Bell className="mr-2 h-4 w-4" />
                {hasReminder ? "Reminder On" : "Set Reminder"}
              </Button>
            </div>

            {/* Overview */}
            <TabsContent value="overview" className="mt-6">
              <h3 className="text-lg font-bold mb-3">About Course</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">{course.description}</p>
              {course.whatYouWillLearn?.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5">
                  {course.whatYouWillLearn.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-primary">
                      <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Notes */}
            <TabsContent value="notes" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-bold">Notes</h3>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-[240px] rounded-lg border bg-card px-3 py-2">
                    <Input
                      placeholder={`Create a new note ${formatTime(currentTime)}`}
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveNote()}
                      className="border-0 shadow-none focus-visible:ring-0 px-0 h-auto"
                    />
                    <button
                      onClick={handleSaveNote}
                      disabled={!newNote.trim() || !currentLesson || savingNote}
                      aria-label="Add note"
                      className="shrink-0 h-7 w-7 rounded-md bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40 flex items-center justify-center"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <select
                    value={noteSort}
                    onChange={(e) => setNoteSort(e.target.value as "newest" | "oldest" | "timestamp")}
                    className="h-10 rounded-md border bg-card px-3 text-sm"
                  >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="timestamp">Timestamp</option>
                  </select>
                  <select
                    value={noteScope}
                    onChange={(e) => setNoteScope(e.target.value as "all" | "current")}
                    className="h-10 rounded-md border bg-card px-3 text-sm"
                  >
                    <option value="all">All Lectures</option>
                    <option value="current">Current Lecture</option>
                  </select>
                </div>

                <div className="space-y-3">
                  {(() => {
                    const visible = notes
                      .filter((n) =>
                        noteScope === "current" ? n.lessonId === currentLesson?.id : true
                      )
                      .sort((a, b) => {
                        if (noteSort === "timestamp") {
                          return (a.timestamp || 0) - (b.timestamp || 0);
                        }
                        const diff =
                          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                        return noteSort === "oldest" ? diff : -diff;
                      });

                    if (visible.length === 0) {
                      return <p className="text-sm text-muted-foreground text-center py-6">No notes yet.</p>;
                    }
                    return visible.map((note) => {
                      const lessonTitle =
                        curriculum
                          .flatMap((s) => s.lessons)
                          .find((l) => l.id === note.lessonId)?.title.replace(/^Lesson \d+:\s*/, "") ||
                        (note as any).title ||
                        "Lesson";
                      const isEditing = editingNoteId === note.id;
                      return (
                        <div key={note.id} className="rounded-xl border bg-card p-3">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="inline-flex items-center justify-center h-7 px-2 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold shrink-0">
                                {formatTime(note.timestamp || 0)}
                              </span>
                              <p className="font-semibold text-sm truncate">{lessonTitle}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {isEditing ? (
                                <button
                                  onClick={() => handleUpdateNote(note.id)}
                                  disabled={savingNote || !editingNoteContent.trim()}
                                  className="text-xs font-semibold text-primary hover:underline disabled:opacity-40"
                                >
                                  Save
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingNoteId(note.id);
                                    setEditingNoteContent(note.content);
                                  }}
                                  className="text-xs font-semibold text-primary hover:underline"
                                >
                                  Edit
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                aria-label="Delete note"
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          {isEditing ? (
                            <Textarea
                              value={editingNoteContent}
                              onChange={(e) => setEditingNoteContent(e.target.value)}
                              className="min-h-[70px] text-sm bg-muted/30"
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground bg-muted/30 rounded-md p-3">
                              {note.content}
                            </p>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </TabsContent>

            {/* Instructor */}
            <TabsContent value="instructor" className="mt-6">
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={course.instructor?.avatar} alt={resolvedInstructorName} />
                  <AvatarFallback>{resolvedInstructorName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-lg font-bold">{resolvedInstructorName}</h3>
                  <p className="text-sm text-muted-foreground">{course.instructor?.title || "Instructor"}</p>
                  <div className="grid gap-3 mt-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-border bg-background p-3">
                      <p className="text-xs text-muted-foreground">Total Students Enrolled</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">
                        {resolvedStudentCount.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-background p-3">
                      <p className="text-xs text-muted-foreground">Total Courses Created</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">
                        {resolvedTotalCourses}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-background p-3">
                      <p className="text-xs text-muted-foreground">Instructor Rating</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">
                        {Number(resolvedCourseRating).toFixed(1)}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-foreground/80 mt-3 leading-relaxed">{course.instructor?.bio || ""}</p>
                </div>
              </div>
            </TabsContent>

            {/* Q&A */}
            <TabsContent value="qna" className="mt-6">
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px] rounded-lg border bg-card px-3 h-10">
                    <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <Input
                      placeholder="Search from courses..."
                      value={qnaSearch}
                      onChange={(e) => setQnaSearch(e.target.value)}
                      className="border-0 shadow-none focus-visible:ring-0 px-0 h-auto"
                    />
                  </div>
                  <div className="relative">
                    <Filter
                      className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      strokeWidth={1.8}
                    />
                    <select
                      className="h-10 appearance-none rounded-md border bg-card pl-8 pr-4 text-sm outline-none"
                      defaultValue="all"
                    >
                      <option value="all">All Lectures</option>
                      <option value="current">Current Lesson</option>
                    </select>
                  </div>

                  <select className="h-10 rounded-md border bg-card px-3 text-sm">
                    <option>Recommended</option>
                    <option>Most Recent</option>
                    <option>Most Liked</option>
                  </select>
                  <Button size="sm" variant="outline" className="h-10" onClick={() => setShowAskForm((v) => !v)}>
                    Add a comment
                  </Button>
                </div>

                {showAskForm && (
                  <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
                    <Input placeholder="Question title" value={askTitle} onChange={(e) => setAskTitle(e.target.value)} />
                    <Textarea placeholder="Describe your question..." value={askBody} onChange={(e) => setAskBody(e.target.value)} className="min-h-[80px]" />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setShowAskForm(false)}>Cancel</Button>
                      <Button
                        onClick={async () => { await handleAskQuestion(); setShowAskForm(false); }}
                        disabled={!askTitle.trim() || !askBody.trim()}
                        size="sm"
                      >
                        <Send className="mr-2 h-4 w-4" />Post Question
                      </Button>
                    </div>
                  </div>
                )}

                <h4 className="text-sm font-semibold text-foreground">Featured questions in this course</h4>

                {questions.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No questions yet. Be the first to ask!</p>
                )}
                {questions
                  .filter((q) =>
                    qnaSearch.trim()
                      ? (q.title + " " + q.content).toLowerCase().includes(qnaSearch.toLowerCase())
                      : true
                  )
                  .map((q) => {
                    const repliesOpen = !!openReplies[q.id];
                    const replyOpen = !!openReplyForm[q.id];
                    return (
                      <div key={q.id} className="rounded-xl border bg-card p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarImage src={q.authorAvatar} />
                            <AvatarFallback>{q.authorName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <p className="font-semibold text-sm text-foreground">{q.title}</p>
                              <span className="inline-flex items-center gap-1 text-xs text-primary font-semibold shrink-0">
                                👍 {102 + q.answers.length}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 leading-relaxed whitespace-pre-line">
                              {q.content}
                            </p>
                            <div className="mt-3 flex items-center justify-between gap-3">
                              <button
                                onClick={() => handleToggleReplies(q.id)}
                                className="text-xs font-medium text-foreground hover:text-primary"
                              >
                                {repliesOpen ? "Hide Replies" : `See Replies${q.answers?.length ? ` (${q.answers.length})` : ""}`}
                              </button>
                              {isCourseInstructor && (
                                <button
                                  onClick={() => setOpenReplyForm((p) => ({ ...p, [q.id]: !p[q.id] }))}
                                  className="text-xs font-semibold text-primary hover:underline"
                                >
                                  Add a reply
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {repliesOpen && q.answers && q.answers.length > 0 && (
                          <div className="ml-12 space-y-2 border-l-2 border-primary/20 pl-3">
                            {q.answers.map((a) => (
                              <div key={a.id} className="rounded-lg bg-muted/40 p-3">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <p className="text-xs font-semibold">{a.authorName}</p>
                                  <span className="text-[10px] text-muted-foreground">{formatRelative(a.createdAt)}</span>
                                </div>
                                <p className="text-sm">{a.content}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {replyOpen && isCourseInstructor && (
                          <div className="ml-12 flex gap-2">
                            <Input
                              placeholder="Write a reply..."
                              value={answerDrafts[q.id] || ""}
                              onChange={(e) => setAnswerDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                              className="text-sm"
                            />
                            <Button
                              size="sm"
                              onClick={async () => {
                                await handleAnswer(q.id);
                                setOpenReplies((p) => ({ ...p, [q.id]: true }));
                                setOpenReplyForm((p) => ({ ...p, [q.id]: false }));
                              }}
                              disabled={!answerDrafts[q.id]?.trim()}
                            >
                              Reply
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </TabsContent>

            {/* Announcements */}
            <TabsContent value="announcements" className="mt-6">
              <div className="space-y-3">
                {announcements.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-muted p-8 text-center">
                    <Megaphone className="mx-auto mb-3 h-6 w-6 text-primary" />
                    <p className="text-sm font-semibold text-foreground">No announcements yet.</p>
                    <p className="text-sm text-muted-foreground mt-1">Announcements created by the instructor will appear here.</p>
                  </div>
                ) : (
                  <AnnouncementList items={announcements} />
                )}
              </div>
            </TabsContent>

            {/* Summarise */}
            <TabsContent value="summarise" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-bold">Lesson Summary</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {currentLesson?.description ||
                    "AI-generated summary will appear here once you finish watching this lesson. Key concepts, code snippets and takeaways are auto-extracted from the video transcript."}
                </p>
                <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground mb-2">Key Takeaways</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Core concepts covered in this lesson</li>
                    <li>Practical examples and live coding walkthrough</li>
                    <li>Recommended next steps and reading material</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Upcoming Live Classes */}
        {upcomingClasses.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                Upcoming Live Classes
              </h3>
              <Link to="/dashboard/live-classes" className="text-xs text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {upcomingClasses.slice(0, 4).map((m) => (
                <div key={m.id} className="rounded-xl border bg-card p-4 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm line-clamp-1">{m.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{m.instructorName}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px]">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium">
                        <Clock className="h-3 w-3" />
                        {m.startTime} • {m.duration}m
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(m.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                  <Button asChild size="sm" className="shrink-0">
                    <Link to={`/meeting-room/${m.id}`}>Join</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hand Picked For You */}
        <HandPickedSection excludeCourseId={courseId} />
      </div>

      {/* Completion Modal */}
      <AnimatePresence>
        {showCompletionModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={() => setShowCompletionModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.8, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} transition={{ type: "spring", damping: 20, stiffness: 300 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <div className="pointer-events-auto relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/80 to-violet-600 px-8 py-10 text-center">
                  <div className="absolute -top-8 -left-8 h-32 w-32 rounded-full bg-white/10" />
                  <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
                  <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.2, type: "spring", stiffness: 200 }} className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
                    <PartyPopper className="h-10 w-10 text-white" />
                  </motion.div>
                  <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-3xl font-bold text-white">Congratulations! 🎉</motion.h2>
                  <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-2 text-white/80">You've completed the course!</motion.p>
                </div>
                <div className="px-8 py-6 space-y-5">
                  <div className="rounded-xl border bg-muted/40 p-4 text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Course Completed</p>
                    <p className="font-semibold text-foreground">{course?.title}</p>
                  </div>
                  {earnedCertificate ? (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10"><Award className="h-5 w-5 text-primary" /></div>
                        <div><p className="font-semibold text-foreground text-sm">Certificate Earned!</p><p className="text-xs text-muted-foreground font-mono">{earnedCertificate.certificateNumber}</p></div>
                      </div>
                      <Button className="w-full gap-2" onClick={handleDownloadCertificate} disabled={certDownloading}>
                        {certDownloading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : <Award className="h-4 w-4" />}
                        Download Certificate PDF
                      </Button>
                    </motion.div>
                  ) : (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Pass the Practice Test to earn and unlock your official Certificate!
                      </p>
                      <Button className="w-full gap-2" asChild>
                        <Link to="/dashboard/practice-tests">
                          <Award className="h-4 w-4" />
                          Take Practice Test
                        </Link>
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 gap-2" asChild><Link to="/dashboard/certificates"><Award className="h-4 w-4" />Certificates</Link></Button>
                    <Button variant="outline" className="flex-1 gap-2" asChild><Link to="/courses"><Share2 className="h-4 w-4" />Browse Courses</Link></Button>
                  </div>
                  <button onClick={() => setShowCompletionModal(false)} className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors">Continue reviewing the course</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Set Reminder modal */}
      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set your weekly learning target</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Stay consistent by aiming for a weekly learning goal. Complete
            tasks throughout the week, one step at a time.
          </p>
          <div className="grid grid-cols-7 gap-2 mt-2">
            {DAYS.map((d, i) => {
              const on = reminderDays.includes(i);
              return (
                <button
                  key={d}
                  onClick={() => toggleReminderDay(i)}
                  className={cn(
                    "h-12 rounded-lg text-xs font-semibold transition-colors",
                    on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70",
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>
          <div className="mt-2">
            <p className="text-xs font-semibold text-primary mb-1.5">Time</p>
            <div className="flex items-center gap-2">
              <Input
                value={reminderHour}
                onChange={(e) => setReminderHour(e.target.value.replace(/\D/g, "").slice(0, 2))}
                className="w-16 text-center"
              />
              <Input
                value={reminderMinute}
                onChange={(e) => setReminderMinute(e.target.value.replace(/\D/g, "").slice(0, 2))}
                className="w-16 text-center"
              />
              <button
                onClick={() => setReminderMeridiem((m) => (m === "AM" ? "PM" : "AM"))}
                className="h-10 px-3 rounded-md border border-primary text-primary text-sm font-semibold"
              >
                {reminderMeridiem}
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Looks really good choosing {reminderDays.length} day
            {reminderDays.length === 1 ? "" : "s"} as reminder. All the best!
          </p>
          <DialogFooter>
            <Button onClick={saveReminder} disabled={savingReminder} className="px-8">
              {savingReminder ? "Saving…" : "Next"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Off-screen certificate sheet for pixel-perfect PDF export */}
      {exportingCourseCert && earnedCertificate && (
        <div
          className="fixed -left-[9999px] -top-[9999px] w-[1040px] pointer-events-none opacity-0"
          aria-hidden="true"
        >
          <CertificateSheet
            innerRef={hiddenCourseCertRef}
            holderName={user?.name ?? "Student"}
            courseTitle={course?.title || earnedCertificate.course?.title || (earnedCertificate as any).courseTitle || "Course"}
            issuedOn={new Date(earnedCertificate.issueDate || earnedCertificate.completedDate || Date.now()).toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" })}
            certificateNumber={earnedCertificate.certificateNumber}
          />
        </div>
      )}
    </div>
  );
};

export default CoursePlayer;
