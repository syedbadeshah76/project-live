import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { quizService, type Quiz } from "@/services/quiz.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StudentChromeLayout } from "@/components/dashboard/StudentChromeLayout";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardList,
  Clock,
  Target,
  Play,
  BarChart3,
  BookOpen,
  ArrowRight,
} from "lucide-react";

const QuizListPage = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await quizService.getAllQuizzes();
        if (res.success) setQuizzes(res.data.filter((q) => q.isActive));
      } catch {
        toast({ title: "Error", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [toast]);

  return (
    <StudentChromeLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-8">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
              <ClipboardList className="h-7 w-7 text-primary" />Practice Tests
            </h1>
            <p className="text-muted-foreground mt-1">Test your knowledge and track your progress</p>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-2xl" />
              ))}
            </div>
          ) : quizzes.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-2xl shadow-card">
              <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No practice tests available</h3>
              <p className="text-muted-foreground">Check back later for new tests.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {quizzes.map((quiz, idx) => (
                <motion.div
                  key={quiz.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-card rounded-2xl shadow-card border border-border overflow-hidden hover:shadow-card-hover transition-shadow group"
                >
                  <div className="gradient-primary p-4 text-primary-foreground">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs opacity-75 flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />{quiz.courseName}
                        </p>
                        <h3 className="font-display font-semibold text-lg mt-1">{quiz.title}</h3>
                      </div>
                      <Badge className="bg-primary-foreground/20 text-primary-foreground border-0">
                        {quiz.questions.length} Q
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4 md:p-5">
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{quiz.description}</p>

                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <Clock className="h-3.5 w-3.5 text-primary mx-auto mb-1" />
                        <p className="text-xs font-medium text-card-foreground">{quiz.timeLimit} min</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <Target className="h-3.5 w-3.5 text-primary mx-auto mb-1" />
                        <p className="text-xs font-medium text-card-foreground">{quiz.passingPercentage}% pass</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <BarChart3 className="h-3.5 w-3.5 text-primary mx-auto mb-1" />
                        <p className="text-xs font-medium text-card-foreground">Avg {quiz.avgScore}%</p>
                      </div>
                    </div>

                    <Button
                      variant="gradient"
                      className="w-full"
                      onClick={() => navigate(`/quiz/${quiz.id}`)}
                    >
                      <Play className="h-4 w-4 mr-2" />Start Test
                      <ArrowRight className="h-4 w-4 ml-auto" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </StudentChromeLayout>
  );
};

export default QuizListPage;
