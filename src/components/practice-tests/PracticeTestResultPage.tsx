import { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Target,
  HelpCircle,
  X,
  Clock,
  Eye,
  ChevronLeft,
  RotateCw,
  AlertCircle,
  Award,
  Download,
  CheckCircle2,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { practiceTestService } from "@/services/practiceTest/practiceTestService";
import { certificatesService } from "@/services/certificates.service";
import { CertificateSheet } from "@/components/certificates/CertificateSheet";
import { downloadCertificateFromElement } from "@/lib/certificate-pdf";
import { useAuth } from "@/contexts/AuthContext";
import type { PracticeTestResult, AttemptHistoryItem, PracticeTestDetails } from "@/types/practiceTest";
import type { Certificate } from "@/types/api.types";
import { CertificateModal } from "@/components/certificates/CertificateModal";
import { ScoreMeter } from "./ScoreMeter";
import { MetricRing } from "./MetricRing";
import { DetailedReview } from "./DetailedReview";
import { toast } from "sonner";

export function PracticeTestResultPage() {
  const { testId = "", attemptId = "" } = useParams<{
    testId: string;
    attemptId: string;
  }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [result, setResult] = useState<PracticeTestResult | null>(null);
  const [details, setDetails] = useState<PracticeTestDetails | null>(null);
  const [history, setHistory] = useState<AttemptHistoryItem[]>([]);
  const [maxAttempts, setMaxAttempts] = useState<number>(3);
  const [error, setError] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [retaking, setRetaking] = useState(false);

  // Certificate state
  const [earnedCertificate, setEarnedCertificate] = useState<Certificate | null>(null);
  const [certDownloading, setCertDownloading] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      practiceTestService.getResult(attemptId),
      practiceTestService.getAttemptHistory(testId),
      practiceTestService.getPracticeTestDetails(testId),
    ])
      .then(([r, h, d]) => {
        if (!alive) return;
        setResult(r);
        setHistory(h || []);
        if (d) {
          setDetails(d);
          if (d.maxAttempts) {
            setMaxAttempts(d.maxAttempts);
          }
        }
      })
      .catch(() => alive && setError("Could not load assessment result."));

    return () => {
      alive = false;
    };
  }, [attemptId, testId]);

  // Helper to extract clean course title from practice test details or test title
  const getCourseName = () => {
    const raw =
      details?.courseTitle ||
      details?.courseName ||
      (details?.category && details.category !== "Practice Assessment" ? details.category : "") ||
      result?.courseTitle ||
      result?.courseName ||
      details?.title ||
      result?.testTitle ||
      "";

    if (!raw) return "Course";

    const cleaned = raw
      .replace(/\s*-\s*Practice\s*Test/i, "")
      .replace(/\s*Practice\s*Test/i, "")
      .replace(/\s*-\s*Practice\s*Assessment/i, "")
      .replace(/\s*Practice\s*Assessment/i, "")
      .trim();

    return cleaned || raw;
  };

  const courseDisplayName = getCourseName();

  // Request/unlock certificate if student passed
  useEffect(() => {
    if (!result?.passed) return;
    const targetCourseId = String(result.courseId || details?.courseId || "");
    if (!targetCourseId) return;

    let active = true;
    certificatesService.requestCertificate(targetCourseId, {
      courseTitle: courseDisplayName,
      studentName: user?.name,
    })
      .then((res) => {
        if (active && res.success && res.data) {
          if (courseDisplayName && (!res.data.course?.title || res.data.course.title === "Course Completion Assessment" || res.data.course.title === "Course")) {
            res.data.course = { ...res.data.course, id: targetCourseId, title: courseDisplayName, thumbnail: res.data.course?.thumbnail || "" };
            (res.data as any).courseTitle = courseDisplayName;
          }
          setEarnedCertificate(res.data);
        }
      })
      .catch(() => {
        /* non-fatal */
      });

    return () => {
      active = false;
    };
  }, [result?.passed, result?.courseId, details?.courseId, courseDisplayName, user?.name]);

  const attemptsCount = history.length;
  const isMaxAttemptsReached = attemptsCount >= maxAttempts;

  async function retake() {
    if (isMaxAttemptsReached) return;
    setRetaking(true);
    setError(null);
    try {
      const att = await practiceTestService.startAttempt(testId);
      navigate(`/dashboard/practice-tests/${testId}/attempt/${att.attemptId}`);
    } catch {
      setError("Could not start a new attempt.");
      setRetaking(false);
    }
  }

  const hiddenCertRef = useRef<HTMLDivElement>(null);
  const [exportingCert, setExportingCert] = useState(false);

  const handleDownloadCertificate = async () => {
    if (!earnedCertificate) {
      toast.info("Certificate is being generated, please wait a moment...");
      return;
    }
    setCertDownloading(true);
    setExportingCert(true);
    try {
      await new Promise((r) => setTimeout(r, 60));
      if (hiddenCertRef.current) {
        const fileName = `${earnedCertificate.certificateNumber || "Certificate"}.pdf`;
        const success = await downloadCertificateFromElement(hiddenCertRef.current, fileName);
        if (success) {
          toast.success("Certificate downloaded successfully!");
        } else {
          toast.error("Failed to download certificate.");
        }
      }
    } catch {
      toast.error("Failed to download certificate.");
    } finally {
      setCertDownloading(false);
      setExportingCert(false);
    }
  };

  if (error)
    return <div className="p-10 text-center text-sm text-rose-600 font-medium">{error}</div>;
  if (!result)
    return (
      <div className="p-10 text-center text-sm text-[#6B7280]">
        Loading result...
      </div>
    );

  const timeTakenLabel = formatDuration(result.timeTakenSeconds);
  const targetCourseId = result.courseId || details?.courseId || "";
  const passingScore = Math.round(Number(result.passPercentage ?? details?.passPercentage ?? 50));
  const scorePctFormatted = Math.round(Number(result.scorePercentage) || 0);

  return (
    <div className="mx-auto max-w-[1180px]">
      <nav className="mb-4 text-sm text-[#6B7280]">
        <Link to="/dashboard/practice-tests" className="hover:underline">
          Practice Tests
        </Link>
        <span className="mx-2">&gt;</span>
        <span className="text-[#1F2937] underline font-medium">Result</span>
      </nav>

      {/* Certificate Unlocked Banner */}
      {result.passed && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white shadow-xs">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 inline" /> Certificate Unlocked!
                </h2>
                <p className="mt-0.5 text-xs sm:text-sm text-emerald-800">
                  Congratulations! You scored <span className="font-bold text-emerald-900">{scorePctFormatted}%</span> (Passing requirement: {passingScore}%). Your course certificate is unlocked.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <button
                onClick={() => setShowCertificateModal(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-indigo-700 shadow-xs transition-all flex-1 sm:flex-initial"
              >
                <Award className="h-4 w-4" /> View Certificate
              </button>
              <button
                onClick={handleDownloadCertificate}
                disabled={certDownloading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-xs transition-all flex-1 sm:flex-initial"
              >
                {certDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download PDF
              </button>
              <Link
                to="/dashboard/certificates"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-emerald-800 hover:bg-emerald-50 transition-all"
              >
                <ExternalLink className="h-4 w-4" /> View All
              </Link>
            </div>
          </div>
        </div>
      )}

      {earnedCertificate && (
        <CertificateModal
          certificate={earnedCertificate}
          open={showCertificateModal}
          onOpenChange={setShowCertificateModal}
          holderName={user?.name || "Student"}
          studentName={user?.name || "Student"}
          courseTitle={
            courseDisplayName ||
            earnedCertificate.course?.title ||
            (earnedCertificate as any).courseTitle ||
            "Course"
          }
          issueDate={earnedCertificate.issueDate || earnedCertificate.completedDate || new Date()}
          certificateNumber={earnedCertificate.certificateNumber || "EDV-2026-001234"}
          onDownload={handleDownloadCertificate}
          downloading={certDownloading}
        />
      )}

      <section className="rounded-2xl border border-[#E5E9F2] bg-white p-6 shadow-xs">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
          {/* Left: Score */}
          <div className="rounded-2xl bg-gradient-to-b from-[#F7F9FF] to-white p-6 text-center border border-slate-100 flex flex-col items-center justify-center">
            <div className="text-base text-[#6B7280]">Your Score is</div>
            <div className="mt-1 text-2xl font-bold text-[#2D4BFF]">
              {result.passed ? "Awesome" : "Needs Improvement"}
            </div>
            <div className="mt-4 grid place-items-center">
              <ScoreMeter score={scorePctFormatted} outOf={100} />
            </div>
            <div className="mt-3 text-xs text-[#6B7280]">
              Passing criteria: <span className="font-semibold text-[#1F2937]">{passingScore}%</span> | Achieved: <span className={result.passed ? "font-bold text-emerald-600" : "font-bold text-rose-600"}>{scorePctFormatted}%</span>
            </div>
          </div>

          {/* Right: metrics + insight */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <MetricRing
                label="Correct Answers"
                icon={<Target className="h-3.5 w-3.5" />}
                value={
                  (result.correctCount / Math.max(1, result.totalQuestions)) *
                  100
                }
                centerText={String(result.correctCount)}
                subtext={`out of ${result.totalQuestions}`}
              />
              <MetricRing
                label="Unanswered"
                icon={<HelpCircle className="h-3.5 w-3.5" />}
                value={
                  (result.unansweredCount /
                    Math.max(1, result.totalQuestions)) *
                  100
                }
                centerText={String(result.unansweredCount)}
                subtext="Question"
                color="#9CA3AF"
              />
              <MetricRing
                label="Wrong Answers"
                icon={<X className="h-3.5 w-3.5" />}
                value={
                  (result.wrongCount / Math.max(1, result.totalQuestions)) * 100
                }
                centerText={String(result.wrongCount)}
                subtext={`out of ${result.totalQuestions}`}
                color="#EF4444"
              />
              <MetricRing
                label="Time Taken"
                icon={<Clock className="h-3.5 w-3.5" />}
                value={Math.min(100, (result.timeTakenSeconds / 3600) * 100)}
                centerText={timeTakenLabel.value}
                subtext={timeTakenLabel.unit}
              />
            </div>

            <div className="rounded-2xl border border-[#E5E9F2] bg-[#F7F9FF] p-5 shadow-xs">
              <h3 className="text-sm font-bold text-[#2D4BFF]">
                Performance Insight
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#4B5563]">
                {result.performanceInsight}
              </p>
            </div>

            <button
              onClick={() => setShowReview((v) => !v)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E5E9F2] bg-white px-4 py-3 text-sm font-semibold text-[#1F2937] hover:bg-[#F7F9FF] shadow-xs transition-all"
            >
              <Eye className="h-4 w-4 text-[#2D4BFF]" />
              {showReview ? "Hide Detailed View" : "Show Detailed View"}
            </button>

            <div className="grid grid-cols-2 gap-3">
              <Link
                to={targetCourseId ? `/learn/${targetCourseId}` : `/dashboard/practice-tests/${testId}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EEF2FF] px-5 py-3 text-sm font-semibold text-[#2D4BFF] hover:bg-[#DDE5FF] transition-all"
              >
                <ChevronLeft className="h-4 w-4" /> Back to course
              </Link>
              <button
                onClick={retake}
                disabled={retaking || isMaxAttemptsReached}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2D4BFF] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1E3AE6] disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-all"
              >
                <RotateCw className="h-4 w-4" />
                {retaking
                  ? "Starting..."
                  : isMaxAttemptsReached
                  ? "Max Attempts Reached"
                  : "Retake Test"}
              </button>
            </div>

            {isMaxAttemptsReached && (
              <p className="text-xs text-rose-600 font-medium text-center flex items-center justify-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                Maximum attempts reached ({attemptsCount}/{maxAttempts}).
              </p>
            )}
          </div>
        </div>

        {showReview && (
          <div className="mt-8 border-t border-[#E5E9F2] pt-6">
            <h3 className="text-base font-bold text-[#1F2937]">
              Detailed Review
            </h3>
            <DetailedReview review={result.review} />
          </div>
        )}
      </section>

      {/* Off-screen certificate sheet for high-res PDF export */}
      {exportingCert && earnedCertificate && (
        <div
          className="fixed -left-[9999px] -top-[9999px] w-[1040px] pointer-events-none opacity-0"
          aria-hidden="true"
        >
          <CertificateSheet
            innerRef={hiddenCertRef}
            holderName={user?.name ?? "Student"}
            courseTitle={courseDisplayName || earnedCertificate.course?.title || (earnedCertificate as any).courseTitle || "Course"}
            issuedOn={new Date(earnedCertificate.issueDate || earnedCertificate.completedDate || Date.now()).toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" })}
            certificateNumber={earnedCertificate.certificateNumber}
          />
        </div>
      )}
    </div>
  );
}

function formatDuration(secs: number) {
  if (secs >= 3600) {
    const h = Math.round(secs / 3600);
    return { value: String(h), unit: h === 1 ? "Hour" : "Hours" };
  }
  const m = Math.max(1, Math.round(secs / 60));
  return { value: String(m), unit: m === 1 ? "Minute" : "Minutes" };
}
