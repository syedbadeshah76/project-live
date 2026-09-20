import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MessageSquare,
  Send,
  Search,
  CheckCircle2,
  Hourglass,
  Loader2,
  HelpCircle,
  UserX,
  Undo2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { instructorsService } from "@/services/instructors.service";
import { liveCoursesService } from "@/services/liveCourses.service";
import {
  instructorDashboardService,
  type PendingQuestion,
} from "@/services/instructor-dashboard.service";
import {
  qnaService,
  type QnaQuestion,
  type InstructorQnaStats,
} from "@/services/qna.service";
import { cn } from "@/lib/utils";

type FilterKey = "all" | "unanswered" | "answered";

const toArray = <T,>(res: any): T[] => {
  const body = res && typeof res === "object" && "data" in res ? res.data : res;
  if (Array.isArray(body)) return body as T[];
  if (body && Array.isArray(body.content)) return body.content as T[];
  if (body && Array.isArray(body.items)) return body.items as T[];
  return [];
};

const formatRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const isQuestionAnswered = (q: QnaQuestion) => {
  if (!q.answers || !Array.isArray(q.answers)) return false;
  return q.answers.some(
    (a) => a.authorRole === "instructor" || Boolean((a as any).isInstructor),
  );
};

function StatCard({
  label,
  value,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.03)] rounded-[20px] transition-all cursor-pointer",
        active && "ring-2 ring-blue-600 border-transparent shadow-md",
      )}
    >
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
        {/* Left Side: Value & Subtitle */}
        <div className="flex flex-col justify-center pr-2">
          <span className="text-2xl sm:text-[26px] font-bold text-blue-600 dark:text-blue-400 tracking-tight leading-none mb-1.5">
            {value}
          </span>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">
            {label}
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

const InstructorQnA = () => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<QnaQuestion[]>([]);
  const [stats, setStats] = useState<InstructorQnaStats>({
    total: 0,
    answered: 0,
    unanswered: 0,
    avgResponseHours: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const questionMap = new Map<string, QnaQuestion>();

        // 1. Fetch dashboard data (includes instructor pendingQuestions)
        let dashboardData: any = null;
        try {
          dashboardData = await instructorDashboardService.getDashboard();
        } catch {
          /* optional dashboard fetch fallback */
        }

        if (cancelled) return;

        // Extract questions from dashboard response
        const rawPendingQuestions: PendingQuestion[] =
          dashboardData?.pendingQuestions || [];

        // For each dashboard question, fetch replies to populate answers array & verify answer status
        const dashboardQuestions = await Promise.all(
          rawPendingQuestions.map(async (pq) => {
            let fetchedAnswers: any[] = [];
            try {
              const repliesRes = await qnaService.getReplies(pq.id);
              if (repliesRes.success && Array.isArray(repliesRes.data)) {
                fetchedAnswers = repliesRes.data;
              }
            } catch {
              /* ignore individual reply fetch errors */
            }

            const answers =
              fetchedAnswers.length > 0
                ? fetchedAnswers
                : pq.isAnswered
                  ? [
                      {
                        id: `ans-${pq.id}`,
                        discussionId: pq.id,
                        authorId: "",
                        authorName: "Instructor",
                        authorRole: "instructor" as const,
                        content: "Answered",
                        createdAt: pq.createdAt,
                      },
                    ]
                  : [];

            const q: QnaQuestion = {
              id: pq.id,
              courseId: pq.courseId || "",
              courseName: pq.courseName || "Course",
              authorId: pq.studentId || "",
              authorName: pq.studentName || "Student",
              authorRole: "student",
              title: pq.question || "Student Question",
              content: pq.question || "",
              createdAt: pq.createdAt || new Date().toISOString(),
              repliesCount: Math.max(answers.length, pq.isAnswered ? 1 : 0),
              answers,
            };
            return q;
          }),
        );

        dashboardQuestions.forEach((q) => {
          questionMap.set(q.id, q);
        });

        // 2. Fetch live courses & course performance to discover all instructor course IDs
        let liveCourses: any[] = [];
        try {
          const liveRes = await liveCoursesService.list();
          liveCourses = toArray<any>(liveRes);
        } catch {
          liveCourses = [];
        }

        const myCourseMap = new Map<string, string>();

        // Map live courses
        liveCourses.forEach((c: any) => {
          const id = String(c.id ?? c.courseId ?? c.liveCourseId ?? "");
          if (id) {
            myCourseMap.set(id, c.title ?? c.name ?? "Course");
          }
        });

        // Map courses from dashboard performance
        if (
          dashboardData?.coursePerformance &&
          Array.isArray(dashboardData.coursePerformance)
        ) {
          dashboardData.coursePerformance.forEach((cp: any) => {
            const id = String(cp.courseId ?? cp.id ?? "");
            if (id) {
              myCourseMap.set(id, cp.title ?? cp.courseName ?? "Course");
            }
          });
        }

        // Map courses from dashboard pending questions
        rawPendingQuestions.forEach((pq) => {
          if (pq.courseId) {
            myCourseMap.set(String(pq.courseId), pq.courseName || "Course");
          }
        });

        const ownedCourseIds = Array.from(myCourseMap.keys());

        // 3. Fetch discussions for owned course IDs and merge
        if (ownedCourseIds.length > 0) {
          try {
            const res = await qnaService.listByCourses(ownedCourseIds);
            if (res.success && Array.isArray(res.data)) {
              res.data.forEach((q) => {
                const existing = questionMap.get(q.id);
                const isGeneric = (name?: string) =>
                  !name || name === "User" || name === "Student";
                const validAuthorName = !isGeneric(q.authorName)
                  ? q.authorName
                  : !isGeneric(existing?.authorName)
                    ? existing!.authorName
                    : q.authorName || existing?.authorName || "Student";

                questionMap.set(q.id, {
                  ...q,
                  authorName: validAuthorName,
                  courseName:
                    q.courseName ??
                    existing?.courseName ??
                    myCourseMap.get(String(q.courseId)) ??
                    "Course",
                  answers:
                    q.answers && q.answers.length > 0
                      ? q.answers
                      : existing?.answers ?? [],
                });
              });
            }
          } catch {
            /* ignore listByCourses errors if dashboard questions were loaded */
          }
        }

        if (cancelled) return;

        const allQuestions = Array.from(questionMap.values()).sort(
          (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
        );

        setQuestions(allQuestions);
        setStats(qnaService.computeStats(allQuestions));
      } catch {
        if (!cancelled) toast.error("Failed to load questions");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return questions.filter((q) => {
      const answered = isQuestionAnswered(q);
      if (filter === "answered" && !answered) return false;
      if (filter === "unanswered" && answered) return false;
      if (!term) return true;
      return `${q.title} ${q.content} ${q.authorName} ${q.courseName ?? ""}`
        .toLowerCase()
        .includes(term);
    });
  }, [questions, search, filter]);

  const handleAnswer = async (questionId: string) => {
    const content = drafts[questionId]?.trim();
    if (!content) return;
    setSubmitting((p) => ({ ...p, [questionId]: true }));
    try {
      const res = await qnaService.answer(questionId, content);
      const reply = { ...res.data, authorRole: "instructor" as const };
      setQuestions((prev) => {
        const next = prev.map((q) =>
          q.id === questionId
            ? { ...q, answers: [...q.answers, reply], repliesCount: q.repliesCount + 1 }
            : q,
        );
        setStats(qnaService.computeStats(next));
        return next;
      });
      setDrafts((p) => ({ ...p, [questionId]: "" }));
      toast.success("Answer posted");
    } catch {
      toast.error("Failed to post answer");
    } finally {
      setSubmitting((p) => ({ ...p, [questionId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Q&amp;A
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage enrolled students across all your courses
        </p>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Questions"
          value={stats.total}
          icon={HelpCircle}
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
        <StatCard
          label="Unanswered"
          value={stats.unanswered}
          icon={UserX}
          active={filter === "unanswered"}
          onClick={() => setFilter("unanswered")}
        />
        <StatCard
          label="Answered"
          value={stats.answered}
          icon={Undo2}
          active={filter === "answered"}
          onClick={() => setFilter("answered")}
        />
        <StatCard
          label="Avg. Response Time"
          value={`${stats.avgResponseHours || 0}h`}
          icon={Zap}
        />
      </div>

      {/* Info Alert Banner */}
      <div className="rounded-xl border border-blue-200/80 bg-blue-50/70 dark:bg-blue-950/40 dark:border-blue-900 px-4 py-3 text-sm text-blue-700 dark:text-blue-300 font-medium flex items-center gap-2">
        <span className="text-xs font-bold">←</span> Questions submitted by enrolled students in your courses
      </div>

      {/* Filter Tabs + Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "px-5 py-2 rounded-xl text-sm font-semibold transition-all",
              filter === "all"
                ? "bg-[#1D4ED8] text-white shadow-sm"
                : "bg-white text-[#1D4ED8] border border-blue-200 hover:bg-blue-50/60 dark:bg-slate-900 dark:border-slate-800",
            )}
          >
            All Questions
          </button>
          <button
            onClick={() => setFilter("unanswered")}
            className={cn(
              "px-5 py-2 rounded-xl text-sm font-semibold transition-all",
              filter === "unanswered"
                ? "bg-[#1D4ED8] text-white shadow-sm"
                : "bg-white text-[#1D4ED8] border border-blue-200 hover:bg-blue-50/60 dark:bg-slate-900 dark:border-slate-800",
            )}
          >
            Unanswered
          </button>
          <button
            onClick={() => setFilter("answered")}
            className={cn(
              "px-5 py-2 rounded-xl text-sm font-semibold transition-all",
              filter === "answered"
                ? "bg-[#1D4ED8] text-white shadow-sm"
                : "bg-white text-[#1D4ED8] border border-blue-200 hover:bg-blue-50/60 dark:bg-slate-900 dark:border-slate-800",
            )}
          >
            Answered
          </button>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 min-w-[260px] focus-within:ring-2 focus-within:ring-blue-600/30">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search questions or courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none"
          />
        </div>
      </div>

      {/* Question List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-[20px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center shadow-sm">
          <MessageSquare className="mx-auto h-9 w-9 text-slate-400" />
          <p className="mt-3 text-base font-semibold text-slate-700 dark:text-slate-300">
            No questions found
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Questions asked by students enrolled in your courses will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((q) => {
            const answered = isQuestionAnswered(q);
            const isExpanded =
              expandedIds.has(q.id) || !!drafts[q.id]?.trim() || submitting[q.id];

            return (
              <div
                key={q.id}
                className="rounded-[20px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4"
              >
                {/* Header Row: Student Avatar, Name, Course Badge, Timestamp */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={q.authorAvatar} />
                      <AvatarFallback className="bg-[#1D4ED8] text-white font-bold text-sm">
                        {q.authorName ? q.authorName.charAt(0).toUpperCase() : "A"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-base text-slate-900 dark:text-slate-100 leading-tight">
                          {q.authorName}
                        </span>
                        <Link to={`/instructor/courses/${q.courseId}`}>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900 hover:underline">
                            {q.courseName ?? "Course"}
                          </span>
                        </Link>
                      </div>
                      <p className="mt-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                        {q.title}
                      </p>
                      {q.content && q.content !== q.title && (
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed">
                          {q.content}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="text-xs font-medium text-slate-400 shrink-0">
                    {formatRelative(q.createdAt)}
                  </span>
                </div>

                {/* Footer Action Row */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-3">
                    {/* Status Pill Badge */}
                    {answered ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Answered
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900">
                        <Hourglass className="h-3.5 w-3.5" />
                        Unanswered
                      </span>
                    )}
                  </div>

                  {/* Primary Action Button */}
                  {answered ? (
                    <Button
                      variant="outline"
                      onClick={() => toggleExpand(q.id)}
                      className="border-blue-600 text-blue-600 hover:bg-blue-50/80 dark:hover:bg-blue-950/50 rounded-xl text-xs font-semibold px-4 py-2 h-auto"
                    >
                      {isExpanded ? "Hide Answer" : "View Answer"}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => toggleExpand(q.id)}
                      className="bg-[#1D4ED8] hover:bg-blue-700 text-white rounded-xl text-xs font-semibold px-4 py-2 h-auto shadow-sm"
                    >
                      {isExpanded ? "Close Reply" : "Reply Now"}
                    </Button>
                  )}
                </div>

                {/* Expandable Answers & Reply Drawer */}
                {isExpanded && (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                    {/* List of answers */}
                    {q.answers.length > 0 && (
                      <div className="space-y-3">
                        {q.answers.map((a) => (
                          <div
                            key={a.id}
                            className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-100 dark:border-slate-800"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                  {a.authorName}
                                </span>
                                {a.authorRole === "instructor" && (
                                  <span className="text-[11px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                    Instructor
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400 font-medium">
                                {formatRelative(a.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                              {a.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Answer composition area */}
                    <div className="space-y-2.5">
                      <Textarea
                        placeholder="Write your answer..."
                        value={drafts[q.id] ?? ""}
                        onChange={(e) =>
                          setDrafts((p) => ({ ...p, [q.id]: e.target.value }))
                        }
                        className="min-h-[85px] text-sm rounded-xl border-slate-200 focus-visible:ring-blue-600"
                      />
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          disabled={!drafts[q.id]?.trim() || submitting[q.id]}
                          onClick={() => handleAnswer(q.id)}
                          className="bg-[#1D4ED8] hover:bg-blue-700 text-white rounded-xl text-xs font-semibold px-4 py-2"
                        >
                          {submitting[q.id] ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="mr-2 h-4 w-4" />
                          )}
                          Post answer
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InstructorQnA;

