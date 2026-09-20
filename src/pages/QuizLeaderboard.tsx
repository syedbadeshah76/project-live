import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { quizService, type Quiz, type QuizAttempt } from "@/services/quiz.service";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StudentChromeLayout } from "@/components/dashboard/StudentChromeLayout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Trophy,
  Medal,
  Award,
  Clock,
  Target,
  Crown,
  Star,
} from "lucide-react";

const podiumColors = [
  { bg: "bg-yellow-100", border: "border-yellow-300", text: "text-yellow-700", icon: Crown },
  { bg: "bg-gray-100", border: "border-gray-300", text: "text-gray-600", icon: Medal },
  { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-700", icon: Award },
];

const QuizLeaderboard = () => {
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string>("");
  const [leaderboard, setLeaderboard] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [lbLoading, setLbLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await quizService.getAllQuizzes();
        if (res.success && res.data.length > 0) {
          setQuizzes(res.data.filter((q) => q.isActive));
          setSelectedQuizId(res.data[0].id);
        }
      } catch {
        toast({ title: "Error", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [toast]);

  useEffect(() => {
    if (!selectedQuizId) return;
    const fetchLb = async () => {
      setLbLoading(true);
      try {
        const res = await quizService.getLeaderboard(selectedQuizId);
        if (res.success) setLeaderboard(res.data);
      } catch {
        toast({ title: "Error loading leaderboard", variant: "destructive" });
      } finally {
        setLbLoading(false);
      }
    };
    fetchLb();
  }, [selectedQuizId, toast]);

  const selectedQuiz = quizzes.find((q) => q.id === selectedQuizId);

  return (
    <StudentChromeLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
                <Trophy className="h-7 w-7 text-yellow-500" />Leaderboard
              </h1>
              <p className="text-muted-foreground mt-1">Top scorers across practice tests</p>
            </div>
            {!loading && quizzes.length > 0 && (
              <Select value={selectedQuizId} onValueChange={setSelectedQuizId}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Select quiz" />
                </SelectTrigger>
                <SelectContent>
                  {quizzes.map((q) => (
                    <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : quizzes.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-2xl shadow-card">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No quizzes available</h3>
              <p className="text-muted-foreground">Check back after taking some practice tests.</p>
            </div>
          ) : (
            <>
              {/* Quiz info */}
              {selectedQuiz && (
                <div className="bg-card rounded-xl shadow-card p-4 mb-6 flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-card-foreground truncate">{selectedQuiz.title}</h2>
                    <p className="text-sm text-muted-foreground">{selectedQuiz.courseName}</p>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Target className="h-3 w-3" />{selectedQuiz.questions.length} Q</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{selectedQuiz.timeLimit} min</span>
                    <span className="flex items-center gap-1"><Star className="h-3 w-3" />Avg {selectedQuiz.avgScore}%</span>
                  </div>
                </div>
              )}

              {/* Podium (top 3) */}
              {!lbLoading && leaderboard.length >= 3 && (
                <div className="flex items-end justify-center gap-3 sm:gap-4 mb-8 px-4">
                  {[1, 0, 2].map((rank) => {
                    const entry = leaderboard[rank];
                    if (!entry) return null;
                    const style = podiumColors[rank];
                    const height = rank === 0 ? "h-28 sm:h-36" : rank === 1 ? "h-20 sm:h-28" : "h-16 sm:h-24";
                    const Icon = style.icon;

                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: rank * 0.15 }}
                        className="flex flex-col items-center flex-1 max-w-[140px]"
                      >
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${style.bg} border-2 ${style.border} flex items-center justify-center mb-2`}>
                          <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${style.text}`} />
                        </div>
                        <p className="text-xs sm:text-sm font-semibold text-card-foreground text-center truncate w-full">{entry.userName}</p>
                        <p className="text-lg sm:text-xl font-bold text-primary">{entry.percentage}%</p>
                        <div className={`w-full ${height} ${style.bg} rounded-t-xl border ${style.border} border-b-0 flex items-center justify-center mt-2`}>
                          <span className={`text-2xl sm:text-3xl font-bold ${style.text}`}>#{rank + 1}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Full list */}
              {lbLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-2xl shadow-card">
                  <Trophy className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No attempts yet. Be the first!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((entry, i) => {
                    const isTop3 = i < 3;
                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border transition-colors ${
                          isTop3 ? "bg-primary/5 border-primary/20" : "bg-card border-border"
                        }`}
                      >
                        {/* Rank */}
                        <div className={`shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                          i === 0 ? "bg-yellow-100 text-yellow-700" :
                          i === 1 ? "bg-gray-100 text-gray-600" :
                          i === 2 ? "bg-amber-50 text-amber-700" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {i + 1}
                        </div>

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-card-foreground truncate">{entry.userName}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>{Math.floor(entry.timeSpent / 60)}m {entry.timeSpent % 60}s</span>
                            <span>•</span>
                            <span>{entry.correctCount}/{entry.correctCount + entry.wrongCount} correct</span>
                          </div>
                        </div>

                        {/* Score */}
                        <div className="shrink-0 text-right">
                          <p className="text-lg sm:text-xl font-bold text-primary">{entry.percentage}%</p>
                          {entry.passed ? (
                            <Badge className="bg-green-100 text-green-700 border-0 text-[10px]">Passed</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 border-0 text-[10px]">Failed</Badge>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </StudentChromeLayout>
  );
};

export default QuizLeaderboard;
