import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { quizService, type Quiz, type QuizAnalytics } from "@/services/quiz.service";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3,
  Target,
  Users,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Trophy,
} from "lucide-react";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(var(--muted-foreground))",
];

const InstructorQuizAnalytics = () => {
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string>("");
  const [analytics, setAnalytics] = useState<QuizAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await quizService.getAllQuizzes();
        if (res.success && res.data.length > 0) {
          setQuizzes(res.data);
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

  const fetchAnalytics = useCallback(async (quizId: string) => {
    setAnalyticsLoading(true);
    try {
      const res = await quizService.getQuizAnalytics(quizId);
      if (res.success) setAnalytics(res.data);
    } catch {
      toast({ title: "Error loading analytics", variant: "destructive" });
    } finally {
      setAnalyticsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (selectedQuizId) fetchAnalytics(selectedQuizId);
  }, [selectedQuizId, fetchAnalytics]);

  const selectedQuiz = quizzes.find((q) => q.id === selectedQuizId);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <div className="text-center py-16 bg-card rounded-2xl shadow-card">
        <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No quizzes to analyze</h3>
        <p className="text-muted-foreground">Create a quiz first to see analytics.</p>
      </div>
    );
  }

  const passFailData = analytics ? [
    { name: "Passed", value: analytics.passRate, fill: "hsl(142 76% 36%)" },
    { name: "Failed", value: 100 - analytics.passRate, fill: "hsl(var(--destructive))" },
  ] : [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
            <BarChart3 className="h-7 w-7 text-primary" />practice test Analytics
          </h1>
          <p className="text-muted-foreground mt-1">Monitor student performance across your quizzes</p>
        </div>
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
      </div>

      {analyticsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : analytics ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Attempts", value: analytics.totalAttempts, icon: Users, color: "text-primary", bg: "bg-primary/10" },
              { label: "Average Score", value: `${analytics.avgScore}%`, icon: Target, color: "text-blue-600", bg: "bg-blue-100" },
              { label: "Pass Rate", value: `${analytics.passRate}%`, icon: CheckCircle, color: "text-green-600", bg: "bg-green-100" },
              { label: "Questions", value: selectedQuiz?.questions.length || 0, icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-100" },
            ].map((s) => (
              <Card key={s.label} className="shadow-card">
                <CardContent className="pt-5 pb-4 px-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${s.bg}`}>
                      <s.icon className={`h-4 w-4 ${s.color}`} />
                    </div>
                    <div>
                      <p className="text-xl md:text-2xl font-bold text-card-foreground">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Hardest Questions */}
            <Card className="shadow-card lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />Hardest Questions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.hardestQuestions.length > 0 ? (
                  <div className="h-64 sm:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analytics.hardestQuestions.map((q, i) => ({
                          name: `Q${i + 1}`,
                          wrong: q.wrongPercentage,
                          question: q.question,
                        }))}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} className="text-xs" />
                        <YAxis dataKey="name" type="category" className="text-xs" width={35} />
                        <Tooltip
                          formatter={(value: number) => [`${value}% wrong`, "Error Rate"]}
                          labelFormatter={(_, payload) => payload?.[0]?.payload?.question || ""}
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                            maxWidth: "280px",
                          }}
                        />
                        <Bar dataKey="wrong" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-8 text-center">No data yet</p>
                )}
              </CardContent>
            </Card>

            {/* Pass/Fail Pie */}
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />Pass vs Fail
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={passFailData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        dataKey="value"
                        strokeWidth={2}
                      >
                        {passFailData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value}%`]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-2">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(142 76% 36%)" }} />
                    <span className="text-muted-foreground">Passed ({analytics.passRate}%)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-sm bg-destructive" />
                    <span className="text-muted-foreground">Failed ({100 - analytics.passRate}%)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Hardest Questions Detail List */}
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Question Difficulty Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.hardestQuestions.map((q, i) => (
                  <div key={q.questionId} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">
                        {i + 1}
                      </span>
                      <p className="text-sm text-card-foreground truncate">{q.question}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 pl-11 sm:pl-0">
                      <Progress value={q.wrongPercentage} className="w-24 h-2" />
                      <span className={`text-sm font-semibold ${q.wrongPercentage > 50 ? "text-destructive" : "text-amber-600"}`}>
                        {q.wrongPercentage}% wrong
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Attempts */}
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />Recent Attempts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.recentAttempts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No attempts yet</p>
              ) : (
                <div className="overflow-x-auto -mx-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left font-medium text-muted-foreground px-6 py-2">Student</th>
                        <th className="text-left font-medium text-muted-foreground px-3 py-2 hidden sm:table-cell">Score</th>
                        <th className="text-left font-medium text-muted-foreground px-3 py-2">Result</th>
                        <th className="text-left font-medium text-muted-foreground px-3 py-2 hidden md:table-cell">Time</th>
                        <th className="text-left font-medium text-muted-foreground px-3 py-2 hidden lg:table-cell">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.recentAttempts.map((a) => (
                        <tr key={a.id} className="border-b border-border/50 last:border-0">
                          <td className="px-6 py-3">
                            <p className="font-medium text-card-foreground">{a.userName}</p>
                            <p className="text-xs text-muted-foreground sm:hidden">{a.percentage}%</p>
                          </td>
                          <td className="px-3 py-3 hidden sm:table-cell">
                            <span className="font-semibold text-card-foreground">{a.percentage}%</span>
                            <span className="text-xs text-muted-foreground ml-1">({a.correctCount}/{a.correctCount + a.wrongCount})</span>
                          </td>
                          <td className="px-3 py-3">
                            {a.passed ? (
                              <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />Pass
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                                <XCircle className="h-3 w-3 mr-1" />Fail
                              </Badge>
                            )}
                          </td>
                          <td className="px-3 py-3 hidden md:table-cell text-muted-foreground">
                            {Math.floor(a.timeSpent / 60)}m {a.timeSpent % 60}s
                          </td>
                          <td className="px-3 py-3 hidden lg:table-cell text-muted-foreground">
                            {new Date(a.completedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </motion.div>
  );
};

export default InstructorQuizAnalytics;
