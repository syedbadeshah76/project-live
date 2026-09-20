import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus,
  FileCheck2,
  CheckCircle2,
  RotateCcw,
  BarChart3,
  Award,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  Check,
  X,
  Upload,
  Download,
} from "lucide-react";
import { downloadQuizSampleXlsx } from "@/lib/quiz-template";
import quizService, {
  type InstructorQuizResultsData,
  type InstructorReviewData,
  type InstructorStudentResultItem,
} from "@/services/quiz.service";
import { instructorService } from "@/services/instructor.service";
import { coursesService } from "@/services/courses.service";
import { instructorsService } from "@/services/instructors.service";
import { useAuth } from "@/contexts/AuthContext";
import {
  instructorPracticeTestService,
  type InstructorPracticeTestAnalytics,
  type InstructorPracticeTestItem,
} from "@/services/instructor-practice-test.service";

// ================= HELPER FORMATTERS =================
function formatDateTime(isoString?: string | null): string {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoString || "-";
  }
}

function formatDuration(seconds?: number | null): string {
  if (seconds == null || isNaN(seconds) || seconds <= 0) return "0 sec";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs} sec`;
  if (secs === 0) return `${mins} min`;
  return `${mins} min ${secs}s`;
}

function renderAnswerWithOption(keys: string[], options: Record<string, string> | any[]): string {
  if (!keys || keys.length === 0) return "No answer provided";
  if (!options) return keys.join(", ");

  if (Array.isArray(options)) {
    return keys
      .map((k) => {
        const found = options.find((o) => (o.key || o.optionKey || o.id) === k);
        return found ? `${k}. ${found.text || found.optionText || found.label || found.value}` : k;
      })
      .join(", ");
  }

  if (typeof options === "object") {
    return keys
      .map((k) => {
        const val = options[k] ?? options[k.toUpperCase()] ?? options[k.toLowerCase()];
        return val ? `${k}. ${val}` : k;
      })
      .join(", ");
  }

  return keys.join(", ");
}

export default function InstructorPracticeTestPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<InstructorPracticeTestAnalytics | null>(null);
  const [tests, setTests] = useState<InstructorPracticeTestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [instructorCoursesList, setInstructorCoursesList] = useState<{ id: string; title: string }[]>([]);

  // View mode: "list" | "create" | "results" | "attempt"
  const [view, setView] = useState<"list" | "create" | "results" | "attempt">("list");
  const [selectedTest, setSelectedTest] = useState<InstructorPracticeTestItem | null>(null);

  // Results View State (API: GET /quizzes/{quizId}/results)
  const [resultsData, setResultsData] = useState<InstructorQuizResultsData | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState<string | null>(null);

  // Instructor Review State (API: GET /quizzes/attempts/{attemptId}/instructor-review)
  const [selectedStudent, setSelectedStudent] = useState<InstructorStudentResultItem | null>(null);
  const [reviewData, setReviewData] = useState<InstructorReviewData | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);

  // Create Form State
  const [selectedCourse, setSelectedCourse] = useState("");
  const [testTitle, setTestTitle] = useState("");
  const [maxAttempts, setMaxAttempts] = useState("70");
  const [questionCount, setQuestionCount] = useState("10");
  const [description, setDescription] = useState("");
  const [timeLimit, setTimeLimit] = useState("45");
  const [passingScore, setPassingScore] = useState("50");

  const [shuffleQuestionOrder, setShuffleQuestionOrder] = useState(true);
  const [randomizeAnswerChoices, setRandomizeAnswerChoices] = useState(false);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(true);
  const [examType, setExamType] = useState(true);
  const [allowMultipleAttempts, setAllowMultipleAttempts] = useState(false);
  const [instructions, setInstructions] = useState("");

  // CSV File Upload State
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploaded, setCsvUploaded] = useState<boolean>(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [uploadedCsvQuestionsCount, setUploadedCsvQuestionsCount] = useState<number>(0);

  // Load instructor analytics & tests
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [aData, tData] = await Promise.all([
          instructorPracticeTestService.getAnalytics(),
          instructorPracticeTestService.getPracticeTests(0, 50, selectedCourse || undefined),
        ]);
        if (isMounted) {
          setAnalytics(aData);
          setTests(tData);
        }
      } catch {
        if (isMounted) {
          toast.error("Failed to load practice test data");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [selectedCourse]);

  // Fetch real courses created strictly by the logged-in instructor
  useEffect(() => {
    let isMounted = true;
    async function loadCourses() {
      try {
        const myIds = new Set<string>();
        if (user?.id) myIds.add(String(user.id).toLowerCase());
        if (user?.email) myIds.add(String(user.email).toLowerCase());

        try {
          const meRes: any = await instructorsService.getMyProfile().catch(() => null);
          const data = meRes?.data ?? meRes;
          if (data?.id) myIds.add(String(data.id).toLowerCase());
          if (data?.userId) myIds.add(String(data.userId).toLowerCase());
        } catch {
          /* non-fatal */
        }

        let items: any[] = [];
        const res: any = await instructorService.getMyCourses().catch(() => null);
        if (res?.data && Array.isArray(res.data)) {
          items = res.data;
        } else if (Array.isArray(res)) {
          items = res;
        }

        if (!items.length) {
          const allRes: any = await coursesService.getCourses(undefined, { page: 0, size: 100 } as any).catch(() => null);
          const raw = allRes?.data?.content || allRes?.content || allRes?.data || allRes || [];
          if (Array.isArray(raw)) items = raw;
        }

        // Filter courses created ONLY by this instructor and ONLY PUBLISHED courses
        const filteredByInstructor = items.filter((c: any) => {
          const statusStr = String(c.status || c.courseStatus || "").toUpperCase();
          const isPublished = statusStr === "PUBLISHED" || c.isPublished === true;
          if (!isPublished) return false;

          if (!myIds.size) return true;
          const instId = String(
            c.instructorId ||
            c.instructorUserId ||
            (typeof c.instructor === "object" ? c.instructor?.id || c.instructor?.userId : c.instructor) ||
            ""
          ).toLowerCase();
          const instEmail = String(c.instructorEmail || c.instructor?.email || "").toLowerCase();
          return myIds.has(instId) || (!!instEmail && myIds.has(instEmail));
        });

        if (isMounted) {
          const mapped = filteredByInstructor
            .map((c: any) => ({
              id: String(c.id || c.courseId || c.uuid || ""),
              title: String(c.title || c.courseTitle || c.name || "Untitled Course"),
            }))
            .filter((c) => c.id && c.title);

          const uniqueMap = new Map<string, { id: string; title: string }>();
          mapped.forEach((m) => uniqueMap.set(m.id, m));
          const courseList = Array.from(uniqueMap.values());
          setInstructorCoursesList(courseList);

          if (courseList.length > 0 && !selectedCourse) {
            setSelectedCourse(courseList[0].id);
          }
        }
      } catch {
        /* non-fatal */
      }
    }

    loadCourses();
    return () => {
      isMounted = false;
    };
  }, [user?.id, user?.email]);



  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testTitle.trim()) {
      toast.error("Please enter a title for the Practice Test.");
      return;
    }

    try {
      const courseId = selectedCourse;
      const totalQ = Number(questionCount) || 10;
      const easyCount = Math.max(1, Math.ceil(totalQ * 0.5));
      const medCount = Math.max(1, Math.floor(totalQ * 0.3));
      const hardCount = Math.max(1, totalQ - easyCount - medCount);

      // Step 1: Upload Questions if CSV file selected and NOT already uploaded
      if (csvFile && !csvUploaded) {
        if (!courseId) {
          toast.error("Please select a Course before uploading the Question Bank.");
          return;
        }
        try {
          const res: any = await quizService.uploadQuestionBank(csvFile, courseId || undefined);
          setCsvUploaded(true);
          const imported = Number(res?.data?.imported ?? res?.imported ?? 50);
          setUploadedCsvQuestionsCount((prev) => prev + imported);
          toast.success("Question bank uploaded successfully!");
        } catch (err: any) {
          toast.error(err?.response?.data?.message || "Failed to upload question bank.");
          return;
        }
      }

      // Step 2: Create Quiz with Practice Test body
      const payload: any = {
        courseId,
        title: testTitle.trim(),
        description: description || "Final practice assessment",
        durationMinutes: Number(timeLimit) || 45,
        passingPercentage: Number(passingScore) || 50,
        maxAttempts: Number(maxAttempts) || 3,
        questionCount: totalQ,
        shuffleQuestions: shuffleQuestionOrder,
        shuffleOptions: randomizeAnswerChoices,
        showCorrectAnswers: showCorrectAnswers,
        showResultImmediately: true,
        quizType: "PRACTICE",
        easyQuestionCount: easyCount,
        mediumQuestionCount: medCount,
        hardQuestionCount: hardCount,
      };

      const createdRes: any = await quizService.createQuiz(payload);
      const createdData = createdRes?.data ?? createdRes;
      const quizId =
        createdData?.id ||
        createdData?.quizId ||
        `pt_${Date.now()}`;

      // Step 3: Publish API
      if (quizId) {
        try {
          await quizService.publishQuiz(quizId);
        } catch {
          /* ignore if already published */
        }
      }

      toast.success("Practice Test created and published successfully!");

      // Step 4: Re-fetch latest practice tests list from backend API
      let updatedList: InstructorPracticeTestItem[] = [];
      try {
        updatedList = await instructorPracticeTestService.getPracticeTests(0, 50, courseId);
      } catch {
        /* ignore */
      }

      const newTest: InstructorPracticeTestItem = {
        id: String(quizId),
        title: testTitle.trim(),
        courseName: selectedCourse ? selectedCourse.toUpperCase() : "General Course",
        courseId,
        questionCount: totalQ,
        durationMinutes: Number(timeLimit) || 45,
        status: "Active",
        totalAttempts: 0,
        averageScore: 0,
        passRate: 0,
        avgTimePerQuestion: 1.5,
      };

      setTests(() => {
        const hasQuiz = updatedList.some((t) => String(t.id) === String(quizId));
        return hasQuiz ? updatedList : [newTest, ...updatedList];
      });

      setView("list");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to create Practice Test.");
    }
  };

  const loadQuizResults = async (quizId: string) => {
    setResultsLoading(true);
    setResultsError(null);
    try {
      const data = await quizService.getInstructorQuizResults(quizId);
      setResultsData(data);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to load quiz results.";
      setResultsError(msg);
      toast.error(msg);
    } finally {
      setResultsLoading(false);
    }
  };

  const loadAttemptReview = async (attemptId: string) => {
    setSelectedAttemptId(attemptId);
    setReviewLoading(true);
    setReviewError(null);
    try {
      const data = await quizService.getInstructorAttemptReview(attemptId);
      setReviewData(data);
      if (data.summary?.attemptId) {
        setSelectedAttemptId(data.summary.attemptId);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to load attempt review.";
      setReviewError(msg);
      toast.error(msg);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleOpenResults = (test: InstructorPracticeTestItem) => {
    setSelectedTest(test);
    setResultsData(null);
    setView("results");
    loadQuizResults(test.id);
  };

  const handleOpenAttempt = (student: InstructorStudentResultItem) => {
    setSelectedStudent(student);
    setReviewData(null);
    setView("attempt");

    const firstAttemptId = student.attemptIds?.[0];
    if (firstAttemptId) {
      loadAttemptReview(firstAttemptId);
    } else {
      setReviewError("No attempts recorded for this student.");
    }
  };

  const handleCsvSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      toast.error("Only .xlsx files are allowed!");
      setCsvError("Invalid file type. Only .xlsx files are allowed.");
      setCsvFile(null);
      setCsvUploaded(false);
      e.target.value = "";
      return;
    }

    setCsvError(null);
    setCsvFile(file);
    setCsvUploaded(false);
  };

  const handleRemoveCsv = () => {
    setCsvFile(null);
    setCsvUploaded(false);
    setCsvError(null);
  };

  const handleProcessCsv = async () => {
    if (!csvFile) {
      setCsvError("Please choose a .xlsx file first.");
      toast.error("Please choose a .xlsx file first.");
      return;
    }
    if (!selectedCourse) {
      setCsvError("Course selection is required before uploading Question Bank. Please select a Course.");
      toast.error("Please select a Course before uploading the Question Bank.");
      return;
    }
    if (csvUploaded) {
      toast.info("Question bank file has already been imported into the pool.");
      return;
    }

    setCsvUploading(true);
    setCsvError(null);
    try {
      const res: any = await quizService.uploadQuestionBank(csvFile, selectedCourse || undefined);
      setCsvUploaded(true);
      const imported = Number(res?.data?.imported ?? res?.imported ?? 50);
      setUploadedCsvQuestionsCount((prev) => prev + imported);
      toast.success(`Successfully uploaded and imported ${imported} questions into Question Pool!`);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || "Question bank upload failed.";
      setCsvError(errorMsg);
      toast.error(`Upload error: ${errorMsg}`);
    } finally {
      setCsvUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  // ================= VIEW 4: ATTEMPT DETAILS =================
  if (view === "attempt") {
    if (reviewLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-24 min-h-[400px] space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
          <p className="text-sm font-medium text-slate-500">Loading student attempt review...</p>
        </div>
      );
    }

    if (reviewError || !reviewData) {
      return (
        <div className="max-w-4xl mx-auto py-12 text-center space-y-4">
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 space-y-2">
            <h3 className="text-base font-bold text-rose-800">Failed to load attempt review</h3>
            <p className="text-xs text-rose-600">{reviewError || "No attempt data available."}</p>
            <div className="pt-3 flex items-center justify-center gap-3">
              {selectedAttemptId && (
                <Button
                  onClick={() => loadAttemptReview(selectedAttemptId)}
                  className="bg-[#2563EB] text-white text-xs font-semibold px-4 h-9 rounded-xl"
                >
                  Retry
                </Button>
              )}
              <Button
                onClick={() => setView("results")}
                variant="outline"
                className="text-xs font-semibold px-4 h-9 rounded-xl border-slate-200"
              >
                ← Back to Results
              </Button>
            </div>
          </div>
        </div>
      );
    }

    const attemptsList = reviewData.studentAttempts.length > 0 ? reviewData.studentAttempts : [];
    const activeSummary = reviewData.summary;
    const studentDisplayName = reviewData.studentName || selectedStudent?.studentName || "Student";
    const studentDisplayEmail = reviewData.studentEmail || selectedStudent?.studentEmail || "";
    const isPassed = activeSummary ? activeSummary.passed : (reviewData.accuracyRate >= reviewData.passingPercentage);

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="max-w-5xl mx-auto space-y-6 pb-12"
      >
        {/* Card 1: Student Overview Header */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <span className="h-12 w-12 rounded-full bg-[#2563EB] text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-xs">
                {studentDisplayName.charAt(0).toUpperCase()}
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{studentDisplayName}</h2>
                <p className="text-xs text-slate-500">{studentDisplayEmail}</p>
              </div>
            </div>

            <div className="flex flex-col items-start sm:items-end">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-[#2563EB]">
                  {Number(activeSummary?.percentage ?? reviewData.accuracyRate ?? 0).toFixed(1)} %
                </span>
              </div>
              <span
                className={`mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  isPassed
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                {isPassed ? "Passed" : "Failed"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
            <div>
              <p className="text-xs text-slate-400 font-medium">Test</p>
              <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 leading-snug">
                {reviewData.quizTitle || selectedTest?.title || "Practice Test"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Start Time</p>
              <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                {formatDateTime(activeSummary?.startedAt)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Time Taken</p>
              <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                {formatDuration(activeSummary?.durationInSeconds)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Points</p>
              <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                {activeSummary?.obtainedMarks ?? 0} / {activeSummary?.totalMarks ?? activeSummary?.totalQuestions ?? 0}
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Student Attempts Selection Pills */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900">Student attempts</h3>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {attemptsList.length > 0 ? (
              attemptsList.map((att, idx) => {
                const isSelected = att.attemptId === (selectedAttemptId || activeSummary?.attemptId);
                return (
                  <button
                    key={att.attemptId || idx}
                    onClick={() => {
                      if (att.attemptId && att.attemptId !== selectedAttemptId) {
                        loadAttemptReview(att.attemptId);
                      }
                    }}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                      isSelected
                        ? "bg-[#2563EB] text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Attempt {att.attemptNumber || idx + 1}
                  </button>
                );
              })
            ) : (
              <span className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#2563EB] text-white shadow-xs">
                Attempt 1
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Selected Attempt Stat Cards (3 Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
            <p className="text-xs font-semibold text-slate-900">Correct Answers</p>
            <p className="text-2xl font-bold text-[#2563EB]">
              {activeSummary?.correctAnswers ?? 0}/{activeSummary?.totalQuestions ?? reviewData.questions.length}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
            <p className="text-xs font-semibold text-slate-900">Accuracy Rate</p>
            <p className="text-2xl font-bold text-[#2563EB]">
              {Number(reviewData.accuracyRate ?? activeSummary?.percentage ?? 0).toFixed(1)}%
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
            <p className="text-xs font-semibold text-slate-900">Passing Score</p>
            <p className="text-2xl font-bold text-[#2563EB]">{reviewData.passingPercentage}%</p>
          </div>
        </div>

        {/* Card 4: Questions List for Selected Attempt */}
        <div className="space-y-4">
          {reviewData.questions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-500">
              No questions recorded for this attempt.
            </div>
          ) : (
            reviewData.questions.map((q, idx) => {
              const qNum = q.displayOrder || idx + 1;
              const formattedStudentAns = renderAnswerWithOption(q.selectedAnswers, q.options);
              const formattedCorrectAns = renderAnswerWithOption(q.correctAnswers, q.options);

              return (
                <div
                  key={q.attemptQuestionId || idx}
                  className="bg-blue-50/30 border border-blue-200/90 rounded-2xl p-5 shadow-xs space-y-4"
                >
                  {/* Question Title & Points Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span
                        className={`h-7 w-7 rounded-full text-white flex items-center justify-center shrink-0 mt-0.5 font-bold shadow-xs ${
                          q.correct ? "bg-[#2563EB]" : "bg-rose-500"
                        }`}
                      >
                        {q.correct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </span>

                      <div>
                        <h4 className="text-sm sm:text-base font-bold text-slate-900">
                          Question {qNum}
                        </h4>
                        <p className="text-xs text-slate-600 mt-0.5">{q.question}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-slate-900">
                        {q.marksAwarded} / {q.totalMarks} pts
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">{q.questionType}</p>
                    </div>
                  </div>

                  {/* Student's Answer */}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-400">Student's Answer</p>
                    <div className="bg-white rounded-xl p-3 text-xs sm:text-sm font-medium text-slate-800 border border-slate-100 shadow-2xs">
                      {formattedStudentAns}
                    </div>
                  </div>

                  {/* Correct Answer */}
                  {(!q.correct || formattedCorrectAns) && formattedCorrectAns && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-400">Correct Answer</p>
                      <div className="bg-[#2563EB] text-white rounded-xl p-3 text-xs sm:text-sm font-medium shadow-xs">
                        {formattedCorrectAns}
                      </div>
                    </div>
                  )}

                  {/* Explanation */}
                  {q.explanation && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-400">Explanation</p>
                      <div className="bg-white rounded-xl p-3 text-xs text-slate-600 border border-slate-100 shadow-2xs">
                        {q.explanation}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Back Button */}
        <div className="pt-2">
          <Button
            onClick={() => setView("results")}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold px-4 h-9 text-xs rounded-xl shadow-xs"
          >
            ← Back to Results
          </Button>
        </div>
      </motion.div>
    );
  }

  // ================= VIEW 3: VIEW RESULTS DASHBOARD =================
  if (view === "results") {
    if (resultsLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-24 min-h-[400px] space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
          <p className="text-sm font-medium text-slate-500">Loading test results...</p>
        </div>
      );
    }

    if (resultsError || !resultsData) {
      return (
        <div className="max-w-4xl mx-auto py-12 text-center space-y-4">
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 space-y-2">
            <h3 className="text-base font-bold text-rose-800">Failed to load test results</h3>
            <p className="text-xs text-rose-600">{resultsError || "No results data found."}</p>
            <div className="pt-3 flex items-center justify-center gap-3">
              {selectedTest && (
                <Button
                  onClick={() => loadQuizResults(selectedTest.id)}
                  className="bg-[#2563EB] text-white text-xs font-semibold px-4 h-9 rounded-xl"
                >
                  Retry
                </Button>
              )}
              <Button
                onClick={() => setView("list")}
                variant="outline"
                className="text-xs font-semibold px-4 h-9 rounded-xl border-slate-200"
              >
                ← Back to Tests
              </Button>
            </div>
          </div>
        </div>
      );
    }

    const totalAttemptsCount = resultsData.totalAttempts ?? 0;
    const avgScoreFormatted = Number(resultsData.averageScore ?? 0).toFixed(1);
    const passRateFormatted = Number(resultsData.passRate ?? 0).toFixed(1);
    const passingScoreVal = resultsData.passingPercentage ?? 0;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="max-w-6xl mx-auto space-y-6 pb-12"
      >
        {/* Top Summary Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-400 font-medium">Course</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              {resultsData.courseTitle || selectedTest?.courseName || "General Course"}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400 font-medium">Test</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              {resultsData.title || selectedTest?.title || "Practice Test"}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400 font-medium">Passing Score</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{passingScoreVal}%</p>
          </div>

          <div>
            <p className="text-xs text-slate-400 font-medium">Time Limit</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              {resultsData.durationMinutes || selectedTest?.durationMinutes || 0} minutes
            </p>
          </div>
        </div>

        {/* 4 Overview Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
            <p className="text-xs font-semibold text-slate-900">Total Attempts</p>
            <p className="text-2xl font-bold text-[#2563EB]">{totalAttemptsCount}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
            <p className="text-xs font-semibold text-slate-900">Average Score</p>
            <p className="text-2xl font-bold text-[#2563EB]">{avgScoreFormatted}%</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
            <p className="text-xs font-semibold text-slate-900">Pass Rate</p>
            <p className="text-2xl font-bold text-[#2563EB]">{passRateFormatted}%</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
            <p className="text-xs font-semibold text-slate-900">Passing Score</p>
            <p className="text-2xl font-bold text-[#2563EB]">{passingScoreVal}%</p>
          </div>
        </div>

        {/* Question Performance Table Section */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900">Question Performance</h3>

          <div className="overflow-x-auto">
            {resultsData.questionPerformance.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No question performance data available yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3 pr-4">QUESTION</th>
                    <th className="pb-3 px-3">DIFFICULTY</th>
                    <th className="pb-3 px-3">CORRECT</th>
                    <th className="pb-3 px-3">INCORRECT</th>
                    <th className="pb-3 pl-3">ACCURACY</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resultsData.questionPerformance.map((q, idx) => {
                    const diffUpper = String(q.difficulty || "MEDIUM").toUpperCase();
                    const diffBadge =
                      diffUpper === "EASY"
                        ? "bg-emerald-100 text-emerald-700"
                        : diffUpper === "MEDIUM"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-rose-100 text-rose-700";
                    const diffLabel =
                      diffUpper === "EASY" ? "Easy" : diffUpper === "MEDIUM" ? "Medium" : "Hard";

                    return (
                      <tr key={q.questionBankId || idx} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 pr-4 font-semibold text-slate-900 text-xs sm:text-sm">
                          {q.question}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${diffBadge}`}>
                            {diffLabel}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-bold text-emerald-600">{q.correctCount}</td>
                        <td className="py-3.5 px-3 font-bold text-rose-500">{q.incorrectCount}</td>
                        <td className="py-3.5 pl-3">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-[#2563EB] h-full rounded-full"
                                style={{ width: `${Math.min(100, Math.max(0, q.accuracyPercent))}%` }}
                              />
                            </div>
                            <span className="font-bold text-slate-900">
                              {Number(q.accuracyPercent).toFixed(0)} %
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Student Results Table Section */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900">
            Student Results ( {resultsData.studentResults.length} )
          </h3>

          <div className="overflow-x-auto">
            {resultsData.studentResults.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No students have attempted this test yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3 pr-4">STUDENT</th>
                    <th className="pb-3 px-3">ATTEMPTS</th>
                    <th className="pb-3 pl-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resultsData.studentResults.map((st, idx) => {
                    const attemptsCount = st.attemptCount ?? (st.attemptIds?.length || 0);
                    const hasAttempts = st.attemptIds && st.attemptIds.length > 0;

                    return (
                      <tr key={st.studentId || idx} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-3">
                            <span className="h-8 w-8 rounded-full bg-[#2563EB] text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {st.studentName.charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <p className="font-bold text-slate-900 text-xs sm:text-sm">{st.studentName}</p>
                              <p className="text-[11px] text-slate-400">{st.studentEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 font-medium text-slate-700">{attemptsCount}</td>
                        <td className="py-3.5 pl-3 text-right">
                          <Button
                            disabled={!hasAttempts}
                            onClick={() => handleOpenAttempt(st)}
                            className="bg-blue-50 hover:bg-blue-100 text-[#2563EB] font-semibold text-xs px-3 h-8 rounded-lg border border-blue-200/80 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            View Attempt
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer Action Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <Button
            onClick={() => setView("list")}
            variant="outline"
            className="rounded-xl h-10 px-5 text-sm font-medium text-slate-600 border-slate-200 bg-white hover:bg-slate-50"
          >
            ← Back to Tests
          </Button>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => toast.info("Report generation ready for backend export.")}
              className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl h-10 px-5 text-sm font-semibold shadow-xs"
            >
              Generate Report
            </Button>
            <Button
              onClick={() => toast.info("Results export ready for backend export.")}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl h-10 px-5 text-sm font-semibold"
            >
              Export Results
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  // ================= VIEW 2: CREATE PRACTICE TEST FORM =================
  if (view === "create") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="max-w-5xl mx-auto space-y-6 pb-12"
      >
        {/* Top Navigation & Info Banner */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setView("list")}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Practice Tests
          </button>
        </div>

        <div className="bg-blue-50/80 border border-blue-200/90 rounded-2xl p-5 text-slate-900 space-y-1">
          <h2 className="text-base font-bold text-[#2563EB]">Create Practice Test</h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Practice tests help students assess their knowledge with immediate feedback. Tests can be timed and include various question types.
          </p>
        </div>

        <form onSubmit={handleCreateSubmit} className="space-y-6">
          {/* Card 1: Test Details */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
            <h3 className="text-lg font-bold text-slate-900">Test Details</h3>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Select Course</label>
              <Select value={selectedCourse} onValueChange={(val) => setSelectedCourse(val)}>
                <SelectTrigger className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:border-[#2563EB]">
                  <SelectValue placeholder="Choose option..." />
                </SelectTrigger>
                <SelectContent className="max-w-[calc(100vw-2rem)] max-h-60 overflow-y-auto">
                  {instructorCoursesList.length > 0 ? (
                    instructorCoursesList.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No published courses created by you yet
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>



            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Test Title</label>
              <Input
                placeholder="e.g. Module 1 Quiz: UI Principles"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                className="h-11 rounded-xl border-slate-200 text-sm focus:border-[#2563EB]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Max attempts</label>
                <Input
                  type="number"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(e.target.value)}
                  className="h-11 rounded-xl border-slate-200 text-sm focus:border-[#2563EB]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Question count</label>
                <Input
                  type="number"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(e.target.value)}
                  className="h-11 rounded-xl border-slate-200 text-sm focus:border-[#2563EB]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Description</label>
              <Textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a detailed description of what this practice test covers..."
                className="rounded-xl border-slate-200 text-sm focus:border-[#2563EB]"
              />
            </div>
          </div>

          {/* Card 2: Test Configuration */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
            <h3 className="text-lg font-bold text-slate-900">Test Configuration</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Time Limit (minutes)</label>
                <Input
                  type="number"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                  className="h-11 rounded-xl border-slate-200 text-sm focus:border-[#2563EB]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Passing Score (%)</label>
                <Input
                  type="number"
                  value={passingScore}
                  onChange={(e) => setPassingScore(e.target.value)}
                  className="h-11 rounded-xl border-slate-200 text-sm focus:border-[#2563EB]"
                />
              </div>
            </div>

            {/* Checkboxes List */}
            {/* <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="shuffleQuestions"
                  checked={shuffleQuestionOrder}
                  onCheckedChange={(c) => setShuffleQuestionOrder(!!c)}
                />
                <label htmlFor="shuffleQuestions" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Shuffle question order
                </label>
              </div>

              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="randomizeAnswers"
                  checked={randomizeAnswerChoices}
                  onCheckedChange={(c) => setRandomizeAnswerChoices(!!c)}
                />
                <label htmlFor="randomizeAnswers" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Randomize answer choices
                </label>
              </div>

              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="showAnswers"
                  checked={showCorrectAnswers}
                  onCheckedChange={(c) => setShowCorrectAnswers(!!c)}
                />
                <label htmlFor="showAnswers" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Show correct answers after submission
                </label>
              </div>

              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="examType"
                  checked={examType}
                  onCheckedChange={(c) => setExamType(!!c)}
                />
                <label htmlFor="examType" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Exam Type
                </label>
              </div>

              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="allowMultipleAttempts"
                  checked={allowMultipleAttempts}
                  onCheckedChange={(c) => setAllowMultipleAttempts(!!c)}
                />
                <label htmlFor="allowMultipleAttempts" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Allow Multiple Options
                </label>
              </div>
            </div> */}
          </div>

          {/* Card 3: Question Pool */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Question Pool</h3>
              {uploadedCsvQuestionsCount > 0 && (
                <span className="bg-blue-50 text-[#2563EB] font-bold text-xs px-3 py-1 rounded-full border border-blue-200">
                  {uploadedCsvQuestionsCount} Questions Added
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Add questions to your test. You can add multiple question types including multiple choice, true/false, and short answer.
            </p>
            {/* <Button
              type="button"
              variant="outline"
              onClick={() => setShowCsvUpload(true)}
              className="border-blue-200 text-[#2563EB] hover:bg-blue-50 font-semibold text-xs px-4 h-9 rounded-xl"
            >
              Add Question
            </Button> */}
          </div>

          {/* Card 4: Upload Question (Figma Screenshot) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Upload Question</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => downloadQuizSampleXlsx()}
                className="text-xs border-blue-200 text-[#2563EB] hover:bg-blue-50 gap-1.5 h-8 rounded-lg"
              >
                <Download className="h-3.5 w-3.5" />
                Download Sample XLSX
              </Button>
            </div>



            {/* Hidden native file input */}
            <input
              type="file"
              id="csvFileInput"
              accept=".xlsx"
              onChange={handleCsvSelect}
              className="hidden"
            />

            {/* CSV File Input display matching Figma */}
            <div className="space-y-2">
              {!csvFile ? (
                <label
                  htmlFor="csvFileInput"
                  className="h-11 px-4 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-500 bg-white cursor-pointer hover:border-[#2563EB] transition-colors"
                >
                  <span className="truncate">Choose File - No file chosen</span>
                  <Upload className="h-4 w-4 text-slate-400 shrink-0" />
                </label>
              ) : (
                <div className="h-12 px-4 border border-blue-200 bg-blue-50/40 rounded-xl flex items-center justify-between text-xs text-slate-800 font-medium">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileCheck2 className="h-4 w-4 text-[#2563EB] shrink-0" />
                    <span className="truncate font-bold">{csvFile.name}</span>
                    <span className="text-[11px] text-slate-500">
                      ({Math.round(csvFile.size / 1024)} KB)
                    </span>
                    {csvUploaded ? (
                      <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Imported into Question Pool
                      </span>
                    ) : (
                      <span className="bg-blue-100 text-[#2563EB] text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                        Ready for processing
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleRemoveCsv}
                    className="text-slate-400 hover:text-rose-500 p-1 transition-colors shrink-0"
                    title="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Validation Error */}
              {csvError && (
                <p className="text-xs text-rose-500 font-semibold">{csvError}</p>
              )}
            </div>

            {/* Action Buttons Matching Figma */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowCsvUpload(false);
                  setCsvFile(null);
                  setCsvUploaded(false);
                  setCsvError(null);
                }}
                className="text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  toast.success("Saved as Draft");
                }}
                className="text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl px-4 h-9"
              >
                Save as Draft
              </Button>
              <Button
                type="button"
                disabled={csvUploading || csvUploaded}
                onClick={handleProcessCsv}
                className="bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold px-4 h-9 rounded-xl shadow-xs disabled:bg-emerald-600 disabled:text-white"
              >
                {csvUploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Processing...
                  </>
                ) : csvUploaded ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Questions Imported
                  </span>
                ) : (
                  "Add Question"
                )}
              </Button>
            </div>
          </div>

          {/* Card 5: Instructions for Students */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-3">
            <h3 className="text-lg font-bold text-slate-900">Instructions for Students</h3>
            <p className="text-xs text-slate-500">
              Add any additional instructions or resources for students taking the test
            </p>
            <Textarea
              rows={4}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Enter instructions here..."
              className="rounded-xl border-slate-200 text-sm focus:border-[#2563EB]"
            />
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setView("list")}
              className="rounded-xl h-10 px-5 text-sm font-medium text-slate-600 border-slate-200 bg-white hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                toast.success("Saved as Draft");
                setView("list");
              }}
              className="rounded-xl h-10 px-5 text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              Save as Draft
            </Button>
            <Button
              type="submit"
              className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl h-10 px-6 text-sm font-semibold shadow-xs"
            >
              Create Test
            </Button>
          </div>
        </form>
      </motion.div>
    );
  }

  // ================= VIEW 1: PRACTICE TEST DASHBOARD & ANALYTICS =================
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 max-w-7xl mx-auto pb-10"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Tests
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Here you can see your reviews and ratings
          </p>
        </div>

        <Button
          onClick={() => setView("create")}
          className="bg-[#2563EB] hover:bg-blue-700 text-white font-semibold rounded-xl px-5 h-10 text-sm shadow-xs flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" /> Create Test
        </Button>
      </div>

      {/* Top 4 Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="absolute -right-6 -top-6 -bottom-6 w-24 bg-blue-50/40 rounded-l-full pointer-events-none" />
          <div>
            <p className="text-2xl font-bold text-[#2563EB]">{analytics?.totalTests ?? 0}</p>
            <p className="text-xs font-bold text-slate-900 mt-0.5">Total Tests</p>
          </div>
          <span className="h-10 w-10 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-xs z-10">
            <FileCheck2 className="h-5 w-5" />
          </span>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="absolute -right-6 -top-6 -bottom-6 w-24 bg-blue-50/40 rounded-l-full pointer-events-none" />
          <div>
            <p className="text-2xl font-bold text-[#2563EB]">{analytics?.totalAttempts ?? 0}</p>
            <p className="text-xs font-bold text-slate-900 mt-0.5">Total Attempts</p>
          </div>
          <span className="h-10 w-10 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-xs z-10">
            <RotateCcw className="h-5 w-5" />
          </span>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="absolute -right-6 -top-6 -bottom-6 w-24 bg-blue-50/40 rounded-l-full pointer-events-none" />
          <div>
     <p className="text-2xl font-bold text-[#2563EB]">
  {analytics?.averageScore != null
    ? Number(analytics.averageScore).toFixed(1)
    : "0.0"}%
</p>
            <p className="text-xs font-bold text-slate-900 mt-0.5">Average Score</p>
          </div>
          <span className="h-10 w-10 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-xs z-10">
            <BarChart3 className="h-5 w-5" />
          </span>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="absolute -right-6 -top-6 -bottom-6 w-24 bg-blue-50/40 rounded-l-full pointer-events-none" />
          <div>
          <p className="text-2xl font-bold text-[#2563EB]">
  {analytics?.passRate != null
    ? Number(analytics.passRate).toFixed(1)
    : "0.0"}%
</p>
            <p className="text-xs font-bold text-slate-900 mt-0.5">Pass Rate</p>
          </div>
          <span className="h-10 w-10 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-xs z-10">
            <Award className="h-5 w-5" />
          </span>
        </div>
      </div>

      {/* Middle 3 Metrics Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-2">
          <p className="text-xs font-semibold text-slate-900">Average Attempts per Test</p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#2563EB]">
              {analytics?.avgAttemptsPerTest ?? 0}
            </span>
            <span className="text-xs font-medium text-emerald-600 flex items-center">
              <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" />
              {analytics?.avgAttemptsDelta ?? "+0.0"}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-2">
          <p className="text-xs font-semibold text-slate-900">Student Pass Rate</p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#2563EB]">
           {analytics?.studentPassRate != null
  ? Number(analytics.studentPassRate).toFixed(1)
  : "0.0"}%
            </span>
            <span className="text-xs font-medium text-emerald-600 flex items-center">
              <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" />
              {analytics?.studentPassRateDelta ?? "+0.0%"}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-2">
          <p className="text-xs font-semibold text-slate-900">Avg Time per Question</p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#2563EB]">
      {analytics?.avgTimePerQuestion != null
  ? Number(analytics.avgTimePerQuestion).toFixed(1)
  : "0.0"} min
            </span>
            <span className="text-xs font-medium text-emerald-600 flex items-center">
              <ArrowDownRight className="h-3.5 w-3.5 mr-0.5 text-emerald-600" />
              {analytics?.avgTimePerQuestionDelta ?? "0.0 min"}
            </span>
          </div>
        </div>
      </div>

      {/* Practice Tests List Section */}
      <div className="space-y-4">
        {tests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-500 shadow-xs">
            <FileCheck2 className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            <h3 className="text-base font-bold text-slate-900">No Practice Tests Created</h3>
            <p className="text-xs text-slate-500 mt-1">
              Click "+ Create Test" above to build your first practice test.
            </p>
          </div>
        ) : (
          tests.map((test, index) => (
            <div
              key={test.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-all space-y-4"
            >
              {/* Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="h-7 w-7 rounded-full bg-[#2563EB] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {test.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      {test.courseName} · {test.questionCount ?? 25} questions · {test.durationMinutes ?? 45} min
                    </p>
                  </div>
                </div>

                <span className="bg-emerald-100 text-emerald-700 font-semibold px-3 py-1 rounded-full text-xs self-start sm:self-auto">
                  {test.status ?? "Active"}
                </span>
              </div>

              {/* Analytics Metrics Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                <div>
                  <p className="text-xs text-slate-400 font-medium">Total Attempts</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {test.totalAttempts ?? 0}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400 font-medium">Average Score</p>
                  <p className="text-sm font-bold text-[#2563EB] mt-0.5">
               {test.averageScore != null
  ? Number(test.averageScore).toFixed(1)
  : "0.0"} %
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400 font-medium">Pass Rate</p>
                  <p className="text-sm font-bold text-emerald-600 mt-0.5">
                   {test.passRate != null
  ? Number(test.passRate).toFixed(1)
  : "0.0"} %
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400 font-medium">Avg Time</p>
                  <p className="text-sm font-semibold text-slate-700 mt-0.5">
               {test.avgTimePerQuestion != null
  ? Number(test.avgTimePerQuestion).toFixed(1)
  : "0.0"} min/q
                  </p>
                </div>
              </div>

              {/* Action Divider & Button */}
              <div className="border-t border-slate-100 pt-3">
                <Button
                  onClick={() => handleOpenResults(test)}
                  className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-lg px-4 h-8 text-xs font-semibold shadow-xs"
                >
                  View Results
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
