import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Clock, CheckSquare, Info, Check } from "lucide-react";
import { toast } from "sonner";
import { practiceTestService } from "@/services/practiceTest/practiceTestService";
import type { AttemptState } from "@/types/practiceTest";
import { QuestionNavPanel } from "./QuestionNavPanel";
import { SubmitModal } from "./SubmitModal";
import { ExitModal } from "./ExitModal";

export function PracticeTestAttemptPage() {
  const { testId = "", attemptId = "" } = useParams<{
    testId: string;
    attemptId: string;
  }>();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<AttemptState | null>(null);
  const [currentIdx, setCurrentIdx] = useState(1); // 1-based
  const [remaining, setRemaining] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [locked, setLocked] = useState(false);
  const submittedRef = useRef(false);

  // Load attempt questions + compute remaining timer
  useEffect(() => {
    let alive = true;
    practiceTestService
      .getAttempt(attemptId)
      .then((a) => {
        if (!alive) return;
        if (a.status === "COMPLETED" || a.status === "SUBMITTED") {
          // Already completed: navigate to result
          navigate(`/dashboard/practice-tests/${testId}/result/${attemptId}`, {
            replace: true,
          });
          return;
        }
        setAttempt(a);
        const startMs = new Date(a.startedAt).getTime();
        const serverMs = new Date(a.serverNow || Date.now()).getTime();
        const elapsed = Math.floor((serverMs - startMs) / 1000);
        const total = (a.durationMinutes || 45) * 60;
        setRemaining(Math.max(0, total - elapsed));
      })
      .catch(() => alive && setError("Could not load attempt questions. Please try again."));

    return () => {
      alive = false;
    };
  }, [attemptId, testId, navigate]);

  const submitAttempt = useCallback(
    async (reason: "user" | "exit" | "timeout") => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      try {
        await practiceTestService.submitAssessment(attemptId);
        if (reason === "timeout") {
          toast.info("Time is up.", {
            description: "Your assessment has been submitted automatically.",
          });
        }
        navigate(`/dashboard/practice-tests/${testId}/result/${attemptId}`, {
          replace: true,
        });
      } catch {
        submittedRef.current = false;
        setSubmitting(false);
        toast.error("Submission failed. Please try again.");
      }
    },
    [attemptId, navigate, testId],
  );

  // Countdown timer
  useEffect(() => {
    if (!attempt || locked) return;
    if (remaining <= 0) {
      setLocked(true);
      submitAttempt("timeout");
      return;
    }
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [attempt, remaining, locked, submitAttempt]);

  const currentQ = attempt?.questions[currentIdx - 1];
  const isMultipleChoice = Boolean(
    currentQ &&
      (currentQ.type === "MULTIPLE_CHOICE" ||
        (currentQ as any).type === "multiple" ||
        (currentQ as any).questionType === "MULTIPLE_CHOICE" ||
        (currentQ as any).multipleChoice === true)
  );

  const currentAnswerList = useMemo(() => {
    if (!attempt || !currentQ) return [];
    const ansObj = attempt.answers.find(
      (a) => String(a.questionId) === String(currentQ.id) || a.attemptQuestionId === currentQ.attemptQuestionId
    );
    if (!ansObj) return [];
    if (ansObj.selectedAnswers && ansObj.selectedAnswers.length > 0) {
      return ansObj.selectedAnswers;
    }
    return ansObj.selectedOptionId ? [ansObj.selectedOptionId] : [];
  }, [attempt, currentQ]);

  const answeredSet = useMemo(() => {
    const s = new Set<number>();
    attempt?.answers.forEach((a, i) => {
      if (a.selectedOptionId != null || (a.selectedAnswers && a.selectedAnswers.length > 0)) {
        s.add(i + 1);
      }
    });
    return s;
  }, [attempt]);

  function pickOption(optionId: string) {
    if (!attempt || !currentQ || locked) return;
    let newSelected: string[] = [];

    if (isMultipleChoice) {
      if (currentAnswerList.includes(optionId)) {
        newSelected = currentAnswerList.filter((id) => id !== optionId);
      } else {
        newSelected = [...currentAnswerList, optionId];
      }
    } else {
      newSelected = [optionId];
    }

    const updated = {
      ...attempt,
      answers: attempt.answers.map((a) =>
        String(a.questionId) === String(currentQ.id) || a.attemptQuestionId === currentQ.attemptQuestionId
          ? {
              ...a,
              selectedOptionId: newSelected[0] || null,
              selectedAnswers: newSelected,
            }
          : a
      ),
    };
    setAttempt(updated);
    practiceTestService.saveAnswer(attemptId, currentQ.id, newSelected[0] || null, newSelected);
  }

  function goPrev() {
    setCurrentIdx((i) => Math.max(1, i - 1));
  }
  function goNext() {
    if (!attempt) return;
    setCurrentIdx((i) => Math.min(attempt.questions.length, i + 1));
  }

  if (error) {
    return <div className="p-10 text-center text-sm text-rose-600 font-medium">{error}</div>;
  }
  if (!attempt || !currentQ) {
    return (
      <div className="p-10 text-center text-sm text-[#6B7280]">
        Loading assessment questions...
      </div>
    );
  }

  const total = attempt.questions.length;
  const completedPct = Math.round((currentIdx / total) * 100);
  const isLast = currentIdx === total;

  return (
    <div className="min-h-screen bg-[#F7F9FC] px-4 py-6 lg:px-10">
      {/* Top header */}
      <div className="mx-auto flex max-w-[1280px] flex-col items-start gap-4 lg:flex-row lg:items-center">
        <div className="rounded-xl bg-[#2D4BFF] px-5 py-3 text-sm font-semibold text-white shadow-xs">
          {attempt.testTitle}
        </div>
        <div className="flex-1 rounded-xl border border-[#E5E9F2] bg-[#F7F9FF] px-5 py-3 w-full">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#2D4BFF]">
              Question {currentIdx} of {total}
            </span>
            <span className="font-semibold text-[#1F2937]">
              {completedPct}% Completed
            </span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-[#E5E9F2]">
            <div
              className="h-2 rounded-full bg-[#2D4BFF] transition-[width] duration-300"
              style={{ width: `${completedPct}%` }}
            />
          </div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-[#E5E9F2] bg-white px-4 py-2.5 text-sm font-semibold text-[#1F2937] shadow-xs">
          <Clock className="h-4 w-4 text-[#2D4BFF]" /> {formatTime(remaining)}
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto mt-6 grid max-w-[1280px] grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="rounded-2xl border border-[#E5E9F2] bg-[#F7F9FF] p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-full border border-[#CBD5E1] bg-white px-4 py-1 text-xs font-bold text-[#2D4BFF] shadow-2xs">
                Q{currentIdx}
              </span>
              {isMultipleChoice ? (
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-bold text-[#2D4BFF] flex items-center gap-1.5 shadow-2xs">
                  <CheckSquare className="h-3.5 w-3.5 text-[#2D4BFF]" />
                  <span>Multiple Choice</span>
                  <span className="text-[11px] font-medium text-blue-600">
                    (Select all that apply)
                  </span>
                </span>
              ) : (
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                  Single Choice
                </span>
              )}
            </div>

            <span className="rounded-full border border-[#CBD5E1] bg-white px-4 py-1 text-xs font-bold text-[#2D4BFF] shadow-2xs">
              Marks: {currentQ.points} Points
            </span>
          </div>

          <p className="mt-5 text-[15px] sm:text-base font-semibold leading-relaxed text-[#1F2937]">
            {currentQ.text}
          </p>

          {isMultipleChoice && (
            <div className="mt-3.5 flex items-center gap-2 rounded-xl bg-blue-50/80 border border-blue-200/80 px-3.5 py-2.5 text-xs font-medium text-blue-900 shadow-2xs">
              <Info className="h-4 w-4 shrink-0 text-[#2D4BFF]" />
              <span>
                <strong>Multiple options can be selected:</strong> Click to select or deselect any options that apply.
              </span>
            </div>
          )}

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {currentQ.options.map((o) => {
              const selected = isMultipleChoice
                ? currentAnswerList.includes(o.id)
                : currentAnswerList[0] === o.id;

              return (
                <button
                  key={o.id}
                  disabled={locked}
                  onClick={() => pickOption(o.id)}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-all ${
                    selected
                      ? "border-[#2D4BFF] bg-white text-[#1F2937] shadow-sm ring-1.5 ring-[#2D4BFF]"
                      : "border-slate-200 bg-white text-[#1F2937] hover:border-[#CBD5E1]"
                  } ${locked ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`grid h-7 w-7 place-items-center text-xs font-bold shrink-0 transition-colors ${
                        isMultipleChoice ? "rounded-lg" : "rounded-full"
                      } ${
                        selected
                          ? "bg-[#2D4BFF] text-white"
                          : "bg-slate-100 text-[#2D4BFF] border border-slate-200"
                      }`}
                    >
                      {o.id}
                    </span>
                    <span className="text-[#1F2937] truncate">{o.text}</span>
                  </div>

                  {selected && (
                    <Check className="h-4 w-4 text-[#2D4BFF] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <QuestionNavPanel
            total={total}
            current={currentIdx}
            answered={answeredSet}
            onJump={(idx) => setCurrentIdx(idx)}
          />
          <div className="flex gap-2">
            <button
              onClick={goPrev}
              disabled={currentIdx === 1 || locked}
              className="flex-1 rounded-lg border border-[#E5E9F2] bg-white px-4 py-2.5 text-sm font-semibold text-[#4B5563] hover:bg-[#F3F4F6] disabled:opacity-50"
            >
              Previous
            </button>
            {isLast ? (
              <button
                onClick={() => setShowSubmit(true)}
                disabled={locked}
                className="flex-1 rounded-lg bg-[#2D4BFF] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1E3AE6] shadow-xs"
              >
                Submit Assessment
              </button>
            ) : (
              <button
                onClick={goNext}
                disabled={locked}
                className="flex-1 rounded-lg bg-[#2D4BFF] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1E3AE6] shadow-xs"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Submit & Exit Buttons */}
      <div className="mx-auto mt-10 flex max-w-[1280px] justify-center">
        <button
          onClick={() => setShowExit(true)}
          disabled={locked}
          className="rounded-xl bg-[#2D4BFF] px-10 py-3 text-sm font-semibold text-white hover:bg-[#1E3AE6] disabled:opacity-60 shadow-xs"
        >
          Leave Exam
        </button>
      </div>

      <SubmitModal
        open={showSubmit}
        submitting={submitting}
        onCancel={() => setShowSubmit(false)}
        onConfirm={() => submitAttempt("user")}
      />
      <ExitModal
        open={showExit}
        submitting={submitting}
        onCancel={() => setShowExit(false)}
        onConfirm={() => submitAttempt("exit")}
      />
    </div>
  );
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
