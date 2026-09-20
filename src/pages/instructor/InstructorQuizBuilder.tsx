import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { courses } from "@/data/courses";
import { quizService, type Quiz, type QuizQuestion, type QuestionType, type CreateQuizRequest } from "@/services/quiz.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  Save,
  ClipboardList,
  CheckCircle2,
  GripVertical,
  Edit,
  Eye,
  BarChart3,
  Loader2,
  AlertCircle,
  Target,
  Clock,
  Users,
} from "lucide-react";

interface QuestionForm {
  id: string;
  type: QuestionType;
  question: string;
  options: string[];
  correctAnswer?: number;
  correctAnswers?: number[];
  explanation: string;
  points: number;
}

const emptyQuestion = (): QuestionForm => ({
  id: `new-${Date.now()}-${Math.random()}`,
  type: "single",
  question: "",
  options: ["", "", "", ""],
  correctAnswer: undefined,
  correctAnswers: [],
  explanation: "",
  points: 5,
});

const InstructorQuizBuilder = () => {
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState("");
  const [passingPercentage, setPassingPercentage] = useState(60);
  const [timeLimit, setTimeLimit] = useState(20);
  const [maxAttempts, setMaxAttempts] = useState(5);
  const [questions, setQuestions] = useState<QuestionForm[]>([emptyQuestion()]);

  const fetchQuizzes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await quizService.getAllQuizzes();
      if (res.success) setQuizzes(res.data);
    } catch {
      toast({ title: "Error", description: "Failed to load quizzes.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchQuizzes(); }, [fetchQuizzes]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCourseId("");
    setPassingPercentage(60);
    setTimeLimit(20);
    setMaxAttempts(5);
    setQuestions([emptyQuestion()]);
    setEditingQuiz(null);
  };

  const openNewQuiz = () => {
    resetForm();
    setShowEditor(true);
  };

  const openEditQuiz = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setTitle(quiz.title);
    setDescription(quiz.description);
    setCourseId(quiz.courseId);
    setPassingPercentage(quiz.passingPercentage);
    setTimeLimit(quiz.timeLimit);
    setMaxAttempts(quiz.maxAttempts);
    setQuestions(quiz.questions.map((q) => ({
      id: q.id,
      type: q.type,
      question: q.question,
      options: [...q.options],
      correctAnswer: q.correctAnswer,
      correctAnswers: q.correctAnswers ? [...q.correctAnswers] : [],
      explanation: q.explanation || "",
      points: q.points,
    })));
    setShowEditor(true);
  };

  const addQuestion = () => setQuestions((prev) => [...prev, emptyQuestion()]);

  const removeQuestion = (id: string) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const updateQuestion = (id: string, updates: Partial<QuestionForm>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const updateOption = (qId: string, optIdx: number, value: string) => {
    setQuestions((prev) => prev.map((q) =>
      q.id === qId ? { ...q, options: q.options.map((o, i) => (i === optIdx ? value : o)) } : q
    ));
  };

  const toggleCorrectMultiple = (qId: string, optIdx: number) => {
    setQuestions((prev) => prev.map((q) => {
      if (q.id !== qId) return q;
      const current = q.correctAnswers || [];
      const next = current.includes(optIdx) ? current.filter((i) => i !== optIdx) : [...current, optIdx];
      return { ...q, correctAnswers: next };
    }));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Error", description: "Quiz title is required.", variant: "destructive" });
      return;
    }
    if (!courseId) {
      toast({ title: "Error", description: "Please select a course.", variant: "destructive" });
      return;
    }

    const hasErrors = questions.some((q) => {
      if (!q.question.trim()) return true;
      if (q.options.some((o) => !o.trim())) return true;
      if (q.type === "single" && q.correctAnswer === undefined) return true;
      if (q.type === "multiple" && (!q.correctAnswers || q.correctAnswers.length === 0)) return true;
      return false;
    });

    if (hasErrors) {
      toast({ title: "Error", description: "Please fill all questions, options, and mark correct answers.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload: CreateQuizRequest = {
        courseId,
        title,
        description,
        passingPercentage,
        timeLimit,
        maxAttempts,
        isActive: true,
        questions: questions.map((q) => ({
          type: q.type,
          question: q.question,
          options: q.options,
          ...(q.type === "single" ? { correctAnswer: q.correctAnswer } : { correctAnswers: q.correctAnswers }),
          explanation: q.explanation,
          points: q.points,
        })),
      };

      if (editingQuiz) {
        await quizService.updateQuiz(editingQuiz.id, payload as any);
        toast({ title: "Quiz Updated! ✅" });
      } else {
        await quizService.createQuiz(payload);
        toast({ title: "Quiz Created! 🎉" });
      }
      setShowEditor(false);
      resetForm();
      fetchQuizzes();
    } catch {
      toast({ title: "Error", description: "Failed to save quiz.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (quizId: string) => {
    try {
      await quizService.deleteQuiz(quizId);
      toast({ title: "Quiz Deleted" });
      fetchQuizzes();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  // =========== QUIZ LIST VIEW ===========
  if (!showEditor) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
              <ClipboardList className="h-7 w-7 text-primary" />Practice test
            </h1>
            <p className="text-muted-foreground mt-1">Create and manage practice tests for your courses</p>
          </div>
          <Button variant="gradient" onClick={openNewQuiz}>
            <Plus className="h-4 w-4 mr-2" />Create practice
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Quizzes", value: quizzes.length, icon: ClipboardList },
            { label: "Total Questions", value: quizzes.reduce((sum, q) => sum + q.questions.length, 0), icon: Target },
            { label: "Avg Score", value: `${Math.round(quizzes.reduce((s, q) => s + q.avgScore, 0) / (quizzes.length || 1))}%`, icon: BarChart3 },
            { label: "Total Attempts", value: quizzes.reduce((s, q) => s + q.totalAttempts, 0), icon: Users },
          ].map((s) => (
            <div key={s.label} className="bg-card rounded-xl p-4 shadow-card">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <s.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold text-card-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : quizzes.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl shadow-card">
            <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No quizzes yet</h3>
            <p className="text-muted-foreground mb-4">Create your first practice test</p>
            <Button variant="gradient" onClick={openNewQuiz}><Plus className="h-4 w-4 mr-2" />Create Quiz</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {quizzes.map((quiz, idx) => (
              <motion.div
                key={quiz.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-card rounded-xl shadow-card border border-border p-4 md:p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-card-foreground">{quiz.title}</h3>
                      <Badge variant="outline" className={quiz.isActive ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}>
                        {quiz.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{quiz.courseName}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Target className="h-3 w-3" />{quiz.questions.length} Questions</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{quiz.timeLimit} min</span>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{quiz.totalAttempts} attempts</span>
                      <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" />Avg: {quiz.avgScore}%</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => openEditQuiz(quiz)}>
                      <Edit className="h-3.5 w-3.5 mr-1" />Edit
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(quiz.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  // =========== QUIZ EDITOR VIEW ===========
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-bold text-foreground">
            {editingQuiz ? "Edit Quiz" : "Create New Quiz"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {questions.length} question{questions.length > 1 ? "s" : ""} • Total {questions.reduce((s, q) => s + q.points, 0)} points
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setShowEditor(false); resetForm(); }}>Cancel</Button>
          <Button variant="gradient" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {editingQuiz ? "Update Quiz" : "Save Quiz"}
          </Button>
        </div>
      </div>

      {/* Quiz Settings */}
      <Card className="mb-6 shadow-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Quiz Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Quiz Title *</label>
              <Input placeholder="e.g., React Fundamentals Test" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Course *</label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>
                  {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
            <Textarea placeholder="Brief description of this quiz" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid gap-4 grid-cols-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Pass %</label>
              <Input type="number" min={1} max={100} value={passingPercentage} onChange={(e) => setPassingPercentage(Number(e.target.value) || 60)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Time (min)</label>
              <Input type="number" min={5} value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value) || 20)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Max Attempts</label>
              <Input type="number" min={1} value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value) || 5)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-foreground">Questions ({questions.length})</h2>

        {questions.map((q, idx) => (
          <Card key={q.id} className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground hidden sm:block" />
                  <CardTitle className="text-base">Question {idx + 1}</CardTitle>
                  <Badge variant="outline" className="text-[10px]">{q.points} pts</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={q.type}
                    onValueChange={(v: QuestionType) => {
                      updateQuestion(q.id, {
                        type: v,
                        correctAnswer: v === "single" ? undefined : undefined,
                        correctAnswers: v === "multiple" ? [] : undefined,
                      });
                    }}
                  >
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single Answer</SelectItem>
                      <SelectItem value="multiple">Multiple Answers</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeQuestion(q.id)} disabled={questions.length <= 1}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Question *</label>
                <Textarea
                  placeholder="Enter your question..."
                  value={q.question}
                  onChange={(e) => updateQuestion(q.id, { question: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2.5">
                <label className="text-sm font-medium block">
                  Options * <span className="text-xs text-muted-foreground font-normal">
                    ({q.type === "single" ? "Click circle to mark correct" : "Click checkboxes for all correct"})
                  </span>
                </label>
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2 sm:gap-3">
                    {q.type === "single" ? (
                      <button
                        type="button"
                        onClick={() => updateQuestion(q.id, { correctAnswer: oi })}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          q.correctAnswer === oi
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {q.correctAnswer === oi && <CheckCircle2 className="h-3.5 w-3.5" />}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleCorrectMultiple(q.id, oi)}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                          (q.correctAnswers || []).includes(oi)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {(q.correctAnswers || []).includes(oi) && <CheckCircle2 className="h-3.5 w-3.5" />}
                      </button>
                    )}
                    <Input
                      placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                      value={opt}
                      onChange={(e) => updateOption(q.id, oi, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Explanation (shown after submission)</label>
                  <Input
                    placeholder="Why is this the correct answer?"
                    value={q.explanation}
                    onChange={(e) => updateQuestion(q.id, { explanation: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Points</label>
                  <Input
                    type="number"
                    min={1}
                    value={q.points}
                    onChange={(e) => updateQuestion(q.id, { points: Number(e.target.value) || 5 })}
                    className="w-24"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button variant="outline" onClick={addQuestion} className="w-full">
          <Plus className="h-4 w-4 mr-2" />Add Question
        </Button>
      </div>

      {/* Bottom Save Bar (mobile sticky) */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-card border-t border-border sm:hidden z-40">
        <Button variant="gradient" className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {editingQuiz ? "Update Quiz" : "Save Quiz"}
        </Button>
      </div>
    </motion.div>
  );
};

export default InstructorQuizBuilder;
