import { useCallback, useEffect, useRef, useState } from "react";
import {
  quizService,
  type Quiz,
  type QuizAttempt,
  type AttemptQuestion,
  type QuizResult,
  type QuizReviewItem,
  type QuizAnswerPayload,
} from "@/services/quiz.service";
import { toast } from "sonner";

export interface UseModuleQuizOptions {
  /** Called after a successful submit so the caller can refresh course progress. */
  onSubmitted?: (result: QuizResult) => void;
}

export const useModuleQuiz = (options?: UseModuleQuizOptions) => {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [questions, setQuestions] = useState<AttemptQuestion[]>([]);
  /** attemptQuestionId -> selected option keys */
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [review, setReview] = useState<QuizReviewItem[]>([]);
  const [history, setHistory] = useState<Awaited<ReturnType<typeof quizService.getAttemptHistory>>>([]);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingReview, setLoadingReview] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const submitRef = useRef<() => Promise<void>>();
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reset = useCallback(() => {
    setQuiz(null);
    setAttempt(null);
    setQuestions([]);
    setAnswers({});
    setResult(null);
    setReview([]);
    setSecondsLeft(null);
  }, []);

  const selectAnswer = useCallback(
    (question: AttemptQuestion, optionKey: string) => {
      setAnswers((prev) => {
        if (question.type === "MULTIPLE_CHOICE") {
          const current = prev[question.attemptQuestionId] ?? [];
          const next = current.includes(optionKey)
            ? current.filter((k) => k !== optionKey)
            : [...current, optionKey];
          return { ...prev, [question.attemptQuestionId]: next };
        }
        return { ...prev, [question.attemptQuestionId]: [optionKey] };
      });
    },
    [],
  );

  const loadHistory = useCallback(async (quizId: string) => {
    try {
      const items = await quizService.getAttemptHistory(quizId);
      if (mountedRef.current) setHistory(items);
      return items;
    } catch {
      return [];
    }
  }, []);

  /** Starts a new attempt for the given quiz. Enforces maxAttempts client-side too. */
  const start = useCallback(
    async (targetQuiz: Quiz) => {
      setStarting(true);
      try {
        const past = await loadHistory(targetQuiz.id);
        const used = past.filter((a) => a.status !== "IN_PROGRESS").length;
        if (targetQuiz.maxAttempts > 0 && used >= targetQuiz.maxAttempts) {
          toast.error(`No attempts left (${used}/${targetQuiz.maxAttempts} used).`);
          return false;
        }

        if (targetQuiz.status === "DRAFT" || (targetQuiz as any).status === "DRAFT") {
          try {
            await quizService.publishQuiz(targetQuiz.id);
          } catch {
            /* best effort auto-publish */
          }
        }

        let started;
        try {
          started = await quizService.startAttempt(targetQuiz.id);
        } catch (attemptErr: any) {
          const errCode = attemptErr?.response?.data?.code;
          const errMsg = String(attemptErr?.response?.data?.message || attemptErr?.message || "");
          if (errCode === "QUIZ_016" || errMsg.includes("Not enough") || errMsg.includes("Available=")) {
            const availMatch = errMsg.match(/Available=(\d+)/i);
            const availableCount = availMatch ? parseInt(availMatch[1], 10) : undefined;

            try {
              const updatePayload: Record<string, any> = {
                easyQuestionCount: 0,
                mediumQuestionCount: 0,
                hardQuestionCount: 0,
              };
              if (availableCount && availableCount > 0) {
                updatePayload.questionCount = availableCount;
              }
              await quizService.updateQuiz(targetQuiz.id, updatePayload);
              await quizService.publishQuiz(targetQuiz.id);
              started = await quizService.startAttempt(targetQuiz.id);
            } catch {
              throw attemptErr;
            }
          } else {
            throw attemptErr;
          }
        }
        let qs = await quizService.getAttemptQuestions(started.attemptId);
        if (!qs.length) {
          // Some backends only expose the question bank on the quiz endpoint.
          try {
            qs = await quizService.getStudentQuestions(targetQuiz.id);
          } catch {
            /* keep empty */
          }
        }
        if (!qs.length) {
          toast.error("This quiz has no questions assigned yet.");
          return false;
        }

        if (!mountedRef.current) return false;

        setQuiz(targetQuiz);
        setAttempt(started);
        setQuestions(qs);
        setAnswers({});
        setResult(null);
        setReview([]);

        const parseUtcDate = (isoString?: string | null): number | null => {
          if (!isoString) return null;
          const str = String(isoString).trim();
          if (!str) return null;
          const hasTimezone = /[Zz]|\+\d{2}:?\d{2}|-\d{2}:?\d{2}$/.test(str);
          const normalized = hasTimezone ? str : `${str}Z`;
          const time = new Date(normalized).getTime();
          return Number.isNaN(time) ? null : time;
        };

        const durationMinutes = Number(started.durationMinutes ?? targetQuiz.durationMinutes ?? 20) || 20;
        const expiresAtMs = parseUtcDate(started.expiresAt);
        const startedAtMs = parseUtcDate(started.startedAt);

        let calculatedLeft: number | null = null;
        if (expiresAtMs) {
          calculatedLeft = Math.floor((expiresAtMs - Date.now()) / 1000);
        }

        const isFreshAttempt = startedAtMs ? Math.abs(Date.now() - startedAtMs) < 60000 : true;
        if (calculatedLeft == null || calculatedLeft <= 0 || isFreshAttempt) {
          setSecondsLeft(durationMinutes * 60);
        } else {
          setSecondsLeft(calculatedLeft);
        }
        return true;
      } catch (err: any) {
        const errCode = err?.response?.data?.code;
        const rawMessage = String(err?.response?.data?.message || err?.message || "");
        let message = rawMessage || "Failed to start the quiz";
        if (errCode === "QUIZ_016" || rawMessage.includes("Not enough") || rawMessage.includes("Available=")) {
          const availMatch = rawMessage.match(/Available=(\d+)/i);
          const avail = availMatch ? availMatch[1] : null;
          message = avail
            ? `This quiz has only ${avail} question(s) available in the question bank. Please ask the instructor to save the course to update the quiz question count.`
            : "Not enough questions in the question bank for this module. Please inform your instructor.";
        }
        toast.error(message);
        return false;
      } finally {
        if (mountedRef.current) setStarting(false);
      }
    },
    [loadHistory],
  );

  const submit = useCallback(async () => {
    if (!attempt || submitting) return;
    setSubmitting(true);
    try {
      const payload: QuizAnswerPayload[] = questions.map((q) => ({
        attemptQuestionId: q.attemptQuestionId,
        selectedAnswers: answers[q.attemptQuestionId] ?? [],
      }));
      const submitted = await quizService.submitAttempt(attempt.attemptId, payload);

      // Prefer the canonical result endpoint when the submit response is thin.
      let finalResult = submitted;
      if (!submitted.maxScore) {
        try {
          finalResult = await quizService.getResult(attempt.attemptId);
        } catch {
          /* keep the submit response */
        }
      }

      if (!mountedRef.current) return;
      setResult(finalResult);
      setSecondsLeft(null);
      if (quiz) void loadHistory(quiz.id);
      options?.onSubmitted?.(finalResult);
      toast[finalResult.passed ? "success" : "info"](
        finalResult.passed ? "Quiz passed 🎉" : "Quiz submitted",
      );
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || "Failed to submit the quiz";
      toast.error(message);
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  }, [attempt, answers, questions, quiz, submitting, loadHistory, options]);

  submitRef.current = submit;

  const loadReview = useCallback(async () => {
    if (!attempt || review.length) return;
    setLoadingReview(true);
    try {
      const items = await quizService.getAttemptReview(attempt.attemptId);
      if (mountedRef.current) setReview(items);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load the review");
    } finally {
      if (mountedRef.current) setLoadingReview(false);
    }
  }, [attempt, review.length]);

  /* Countdown + auto-submit on expiry. */
  useEffect(() => {
    if (secondsLeft == null || result) return;
    if (secondsLeft <= 0) {
      toast.warning("Time is up — submitting your attempt.");
      void submitRef.current?.();
      return;
    }
    const t = window.setTimeout(() => setSecondsLeft((s) => (s == null ? null : s - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [secondsLeft, result]);

  const answeredCount = questions.filter(
    (q) => (answers[q.attemptQuestionId] ?? []).length > 0,
  ).length;

  return {
    quiz,
    attempt,
    questions,
    answers,
    result,
    review,
    history,
    starting,
    submitting,
    loadingReview,
    secondsLeft,
    answeredCount,
    allAnswered: questions.length > 0 && answeredCount === questions.length,
    start,
    submit,
    selectAnswer,
    loadReview,
    loadHistory,
    reset,
  };
};

export default useModuleQuiz;
