import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Play, ClipboardList, Target, Clock, BarChart3, AlertCircle } from "lucide-react";
import { practiceTestService } from "@/services/practiceTest/practiceTestService";
import { useAuth } from "@/contexts/AuthContext";
import type {
  AttemptHistoryItem,
  PracticeTestDetails,
} from "@/types/practiceTest";
import { AttemptHistoryRow } from "./AttemptHistoryRow";

export function PracticeTestDetailsPage() {
  const { testId = "" } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [details, setDetails] = useState<PracticeTestDetails | null>(null);
  const [history, setHistory] = useState<AttemptHistoryItem[] | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef<string>("");

  useEffect(() => {
    let alive = true;
    if (!testId) return;

    const fetchKey = `${testId}_${user?.id || "anon"}`;
    if (fetchedRef.current === fetchKey && details) return;
    fetchedRef.current = fetchKey;

    // First call History API & Details API on mount. Do NOT call Start Attempt API on mount!
    Promise.all([
      practiceTestService.getPracticeTestDetails(testId, user?.id),
      practiceTestService.getAttemptHistory(testId),
    ])
      .then(([d, h]) => {
        if (!alive) return;
        setDetails(d);
        setHistory(h);
      })
      .catch(() => alive && setError("Could not load test details."));

    return () => {
      alive = false;
    };
  }, [testId, user?.id, details]);

  const maxAttempts = details?.maxAttempts ?? 3;
  const attemptsCount = history?.length ?? 0;
  const isMaxAttemptsReached = attemptsCount >= maxAttempts;

  async function handleStart() {
    if (isMaxAttemptsReached) return;
    setStarting(true);
    setError(null);
    try {
      // Call Start Attempt API when student actually clicks "Start Test"
      const attempt = await practiceTestService.startAttempt(testId);
      navigate(`/dashboard/practice-tests/${testId}/attempt/${attempt.attemptId}`);
    } catch {
      setError("Could not start the attempt. Please try again.");
      setStarting(false);
    }
  }

  const bestScore = Math.round(
    history?.reduce((m, h) => Math.max(m, Number(h.scorePercentage) || 0), 0) ?? 0
  );
  const latestScore = Math.round(Number(history?.[0]?.scorePercentage) || 0);
  const passScoreFormatted = Math.round(Number(details?.passPercentage) || 0);
  const avgScoreFormatted = Math.round(Number(details?.averageScore) || 0);

  return (
    <div className="mx-auto max-w-[1080px]">
      <nav className="mb-4 text-sm text-[#6B7280]">
        <Link to="/dashboard/practice-tests" className="hover:underline">
          Practice Tests
        </Link>
        <span className="mx-2">&gt;</span>
        <span className="text-[#1F2937] underline font-medium">
          {details?.title ?? "Loading..."}
        </span>
      </nav>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!details ? (
        <div className="h-[260px] animate-pulse rounded-2xl bg-white" />
      ) : (
        <section className="rounded-2xl border border-[#E5E9F2] bg-white p-6 shadow-xs">
          <div className="flex items-start gap-4">
            <img
              src={details.thumbnail}
              alt=""
              className="h-14 w-14 shrink-0 rounded-lg object-cover"
            />
            <div>
              <h2 className="text-lg font-bold text-[#1F2937]">
                {details.title}
              </h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                {details.description}
              </p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatBox
              icon={<ClipboardList className="h-4 w-4" />}
              value={String(details.questionCount)}
              label="Questions"
            />
            <StatBox
              icon={<Target className="h-4 w-4" />}
              value={`${passScoreFormatted}%`}
              label="Pass"
            />
            <StatBox
              icon={<Clock className="h-4 w-4" />}
              value={`${details.durationMinutes} min`}
              label="Duration"
            />
            <StatBox
              icon={<BarChart3 className="h-4 w-4" />}
              value={`${avgScoreFormatted}%`}
              label="Avg Score"
            />
          </div>

          <div className="mt-6 flex flex-col items-center gap-2">
            <button
              onClick={handleStart}
              disabled={starting || isMaxAttemptsReached}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2D4BFF] px-10 py-3 text-base font-semibold text-white hover:bg-[#1E3AE6] disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-all"
            >
              <Play className="h-4 w-4 fill-current" />
              {starting
                ? "Starting..."
                : isMaxAttemptsReached
                ? `Max Attempts Reached (${attemptsCount}/${maxAttempts})`
                : "Start Test"}
            </button>
            {isMaxAttemptsReached && (
              <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                You have reached the maximum allowed attempts ({maxAttempts}) for this Practice Test.
              </p>
            )}
          </div>
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-[#E5E9F2] bg-white p-6 shadow-xs">
        <h3 className="flex items-center gap-2 text-base font-bold text-[#1F2937]">
          <BarChart3 className="h-4 w-4 text-[#2D4BFF]" /> Your Previous Attempts
        </h3>
        {!history ? (
          <div className="mt-4 h-24 animate-pulse rounded-xl bg-[#F3F4F6]" />
        ) : history.length === 0 ? (
          <p className="mt-4 text-sm text-[#6B7280]">
            No previous attempts yet. Click "Start Test" above to begin your first attempt.
          </p>
        ) : (
          <>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl bg-[#2D4BFF] py-6 text-center text-white shadow-xs">
                <div className="text-3xl font-bold">{bestScore}%</div>
                <div className="text-sm font-medium opacity-90">Best Score</div>
              </div>
              <div className="rounded-xl bg-[#EEF2FF] py-6 text-center text-[#2D4BFF] shadow-xs">
                <div className="text-3xl font-bold">{latestScore}%</div>
                <div className="text-sm font-medium text-[#2D4BFF]">Latest Score</div>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {history.map((h) => (
                <AttemptHistoryRow key={h.attemptId} item={h} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function StatBox({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="grid place-items-center rounded-xl bg-[#EEF2FF] p-4 text-[#2D4BFF]">
      {icon}
      <div className="mt-2 text-lg font-bold text-[#1F2937]">{value}</div>
      <div className="text-xs text-[#6B7280]">{label}</div>
    </div>
  );
}
