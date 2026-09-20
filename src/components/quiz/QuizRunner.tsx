import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { useModuleQuiz } from "@/hooks/useModuleQuiz";

const formatClock = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const scoreMessage = (pct: number, passed: boolean) => {
  if (pct >= 90) return "You Did Excellent";
  if (pct >= 75) return "Great Job!";
  if (passed) return "You Passed";
  return "Keep Practicing";
};

interface QuizRunnerProps {
  state: ReturnType<typeof useModuleQuiz>;
  onExit: () => void;
  onRetake: () => void;
  /** Optional "Next Video" handler on the result screen. Falls back to onExit. */
  onNext?: () => void;
}

/** Circular score ring used on the result screen. */
const ScoreRing = ({ percentage, passed }: { percentage: number; passed: boolean }) => {
  const size = 200;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          className="stroke-muted"
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          className={passed ? "stroke-primary" : "stroke-destructive"}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - percentage / 100) }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold">{percentage}%</span>
        <span className="text-xs text-muted-foreground">Score</span>
      </div>
    </div>
  );
};

export const QuizRunner = ({ state, onExit, onRetake, onNext }: QuizRunnerProps) => {
  const {
    quiz, questions, answers, result, review, secondsLeft,
    submitting, loadingReview, answeredCount, allAnswered,
    submit, selectAnswer, loadReview, history,
  } = state;

  const [index, setIndex] = useState(0);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    setIndex(0);
    setShowReview(false);
  }, [quiz?.id, questions.length]);

  if (!quiz) return null;

  const attemptsUsed = history.filter((a) => a.status !== "IN_PROGRESS").length;
  const attemptsLeft = quiz.maxAttempts > 0 ? Math.max(0, quiz.maxAttempts - attemptsUsed) : null;

  /* ---------------- Result screen ---------------- */
  if (result) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex w-full flex-col items-center rounded-2xl border bg-card p-8 text-center"
        >
          <ScoreRing percentage={result.percentage} passed={result.passed} />
          <h2 className="mt-6 text-2xl font-bold">
            {scoreMessage(result.percentage, result.passed)}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.score}/{result.maxScore} marks
            {!result.passed && ` • Need ${result.passingPercentage}% to pass`}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {result.passed ? (
              <Button size="lg" onClick={onNext ?? onExit}>
                Next Video <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              (attemptsLeft == null || attemptsLeft > 0) && (
                <Button size="lg" onClick={onRetake}>Retake Quiz</Button>
              )
            )}
            {quiz.showCorrectAnswers && (
              <Button
                size="lg"
                variant="outline"
                disabled={loadingReview}
                onClick={async () => {
                  if (!review.length) await loadReview();
                  setShowReview((v) => !v);
                }}
              >
                {loadingReview ? "Loading…" : showReview ? "Hide Review" : "Review Answers"}
              </Button>
            )}
            <Button size="lg" variant="ghost" onClick={onExit}>Back to Course</Button>
          </div>
        </motion.div>

        {showReview && review.length > 0 && (
          <div className="mt-6 w-full space-y-4">
            {review.map((item, idx) => (
              <div
                key={item.attemptQuestionId}
                className={cn(
                  "rounded-xl border-2 p-4",
                  item.correct ? "border-primary/30 bg-primary/5" : "border-destructive/20 bg-destructive/5",
                )}
              >
                <p className="mb-2 font-medium">{idx + 1}. {item.questionText}</p>
                <div className="space-y-1 text-sm">
                  {item.options.map((opt) => {
                    const isCorrect = item.correctAnswers.includes(opt.key);
                    const isSelected = item.selectedAnswers.includes(opt.key);
                    return (
                      <div
                        key={opt.key}
                        className={cn(
                          "rounded-md px-2 py-1",
                          isCorrect && "bg-primary/10 text-primary",
                          isSelected && !isCorrect && "bg-destructive/10 text-destructive",
                        )}
                      >
                        <span className="font-semibold">{opt.key}.</span> {opt.text}
                        {isSelected && <span className="ml-2 text-xs">(your answer)</span>}
                        {isCorrect && <span className="ml-2 text-xs">(correct)</span>}
                      </div>
                    );
                  })}
                </div>
                {item.explanation && (
                  <p className="mt-2 text-xs text-muted-foreground">{item.explanation}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {item.earnedMarks}/{item.marks} marks
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ---------------- Question runner ---------------- */
  if (!questions.length) return null;

  const question = questions[index];
  const selected = answers[question.attemptQuestionId] ?? [];
  const isLast = index === questions.length - 1;
  const percentComplete = Math.round(((index + 1) / questions.length) * 100);

  return (
    <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" className="font-semibold" onClick={onExit}>
          <ChevronLeft className="mr-1 h-4 w-4" /> {quiz.title}
        </Button>
        <div className="flex items-center gap-2">
          {attemptsLeft != null && (
            <Badge variant="secondary">
              {attemptsLeft} attempt{attemptsLeft === 1 ? "" : "s"} left
            </Badge>
          )}
          {secondsLeft != null && (
            <Badge
              variant={secondsLeft < 60 ? "destructive" : "outline"}
              className="gap-1 px-3 py-1 text-sm"
            >
              <Clock className="h-4 w-4" /> {formatClock(secondsLeft)}
            </Badge>
          )}
        </div>
      </div>

      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm font-medium">
          <span>Question {index + 1} of {questions.length}</span>
          <span className="text-muted-foreground">{percentComplete}% Completed</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            animate={{ width: `${percentComplete}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={question.attemptQuestionId}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border bg-card p-5 md:p-6"
        >
          <p className="mb-5 text-base font-semibold md:text-lg">
            {question.questionText}
            {question.type === "MULTIPLE_CHOICE" && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                (select all that apply)
              </span>
            )}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {question.options.map((opt) => {
              const active = selected.includes(opt.key);
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => selectAnswer(question, opt.key)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border-2 p-4 text-left text-sm transition-all",
                    active
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/40 hover:bg-muted/50",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {opt.key}
                  </span>
                  <span className="min-w-0">{opt.text}</span>
                </button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button
          variant="outline"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          <ChevronLeft className="mr-1 h-4 w-4" /> Previous
        </Button>

        <span className="text-xs text-muted-foreground">
          {answeredCount} of {questions.length} answered
        </span>

        {isLast ? (
          <Button onClick={submit} disabled={submitting || !allAnswered}>
            {submitting ? "Submitting…" : "Submit Quiz"}
          </Button>
        ) : (
          <Button onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}>
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default QuizRunner;
