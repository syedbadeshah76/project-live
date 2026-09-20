import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { quizService, type Quiz } from "@/services/quiz.service";
import { useModuleQuiz } from "@/hooks/useModuleQuiz";
import QuizRunner from "@/components/quiz/QuizRunner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { StudentChromeLayout as MainLayout } from "@/components/dashboard/StudentChromeLayout";
import {
  ClipboardList,
  Clock,
  Target,
  BarChart3,
  RotateCcw,
  ArrowLeft,
  Play,
} from "lucide-react";

const StudentQuizPage = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [inQuizMode, setInQuizMode] = useState(false);

  const quizState = useModuleQuiz();
  const { history } = quizState;

  // Fetch quiz & attempts history
  useEffect(() => {
    const fetch = async () => {
      if (!quizId) return;
      try {
        const quizRes = await quizService.getQuizById(quizId);
        if (quizRes.success && quizRes.data) {
          setQuiz(quizRes.data);
          await quizState.loadHistory(quizRes.data.id);
        }
      } catch {
        toast({ title: "Error", description: "Failed to load quiz.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [quizId]);

  const handleStart = async () => {
    if (!quiz) return;
    const ok = await quizState.start(quiz);
    if (ok) {
      setInQuizMode(true);
    }
  };

  const handleExit = () => {
    setInQuizMode(false);
    quizState.reset();
    if (quizId) {
      void quizState.loadHistory(quizId);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-12 w-64 mb-4" />
          <Skeleton className="h-6 w-96 mb-8" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </MainLayout>
    );
  }

  if (!quiz) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <ClipboardList className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Quiz not found</h2>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </MainLayout>
    );
  }

  // Quiz Runner (Active Quiz / Result / Review Phase)
  if (inQuizMode && quizState.quiz) {
    return (
      <MainLayout>
        <div className="py-6">
          <QuizRunner
            state={quizState}
            onExit={handleExit}
            onRetake={() => handleStart()}
          />
        </div>
      </MainLayout>
    );
  }

  // Intro Phase
  const bestScore = history.length > 0 ? Math.max(...history.map((a) => a.percentage)) : null;
  const lastScore = history.length > 0 ? history[0].percentage : null;

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="bg-card rounded-2xl shadow-card overflow-hidden border">
            {/* Header Banner */}
            <div className="bg-primary p-6 md:p-8 text-primary-foreground">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary-foreground/20">
                  <ClipboardList className="h-8 w-8" />
                </div>
                <div>
                  {quiz.courseName && (
                    <p className="text-sm opacity-80 mb-1">{quiz.courseName}</p>
                  )}
                  <h1 className="font-display text-xl md:text-2xl font-bold">{quiz.title}</h1>
                  {quiz.description && (
                    <p className="text-sm opacity-80 mt-2">{quiz.description}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8">
              {/* Quiz Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {[
                  { icon: ClipboardList, label: "Questions", value: quiz.questionCount || quiz.questions?.length || 10 },
                  { icon: Clock, label: "Time Limit", value: `${quiz.durationMinutes || quiz.timeLimit || 20} min` },
                  { icon: Target, label: "Pass Score", value: `${quiz.passingPercentage}%` },
                  { icon: RotateCcw, label: "Max Attempts", value: quiz.maxAttempts || "Unlimited" },
                ].map((s) => (
                  <div key={s.label} className="text-center p-3 rounded-xl bg-muted/50">
                    <s.icon className="h-5 w-5 text-primary mx-auto mb-1.5" />
                    <p className="text-lg font-bold text-card-foreground">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Previous Attempts History */}
              {history.length > 0 && (
                <div className="mb-8">
                  <h3 className="font-semibold text-card-foreground mb-3 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" /> Your Previous Attempts ({history.length})
                  </h3>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                      <p className="text-2xl font-bold text-emerald-700">{bestScore}%</p>
                      <p className="text-xs text-emerald-600">Best Score</p>
                    </div>
                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-center">
                      <p className="text-2xl font-bold text-primary">{lastScore}%</p>
                      <p className="text-xs text-muted-foreground">Latest Score</p>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {history.map((a) => (
                      <div
                        key={a.attemptId}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs">Attempt #{a.attemptNumber}</span>
                          <span className="text-xs text-muted-foreground">
                            {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString() : "In Progress"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-card-foreground">{a.percentage}%</span>
                          {a.passed ? (
                            <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Passed</Badge>
                          ) : (
                            <Badge className="bg-rose-100 text-rose-700 text-[10px]">Failed</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                size="lg"
                className="w-full"
                onClick={handleStart}
                disabled={quizState.starting}
              >
                <Play className="h-5 w-5 mr-2" />
                {quizState.starting
                  ? "Starting..."
                  : history.length > 0
                    ? "Retake Quiz"
                    : "Start Quiz"}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default StudentQuizPage;
