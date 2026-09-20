import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ArrowLeft, Save, ClipboardList, CheckCircle2 } from "lucide-react";
import { quizService } from "@/services/quiz.service";
import { toast } from "sonner";

interface QuestionForm {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  points: number;
}

const QuizEditor = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [quizData, setQuizData] = useState({
    title: "",
    description: "",
    passingPercentage: 70,
    timeLimit: 30,
    courseId: "",
  });

  const [questions, setQuestions] = useState<QuestionForm[]>([
    { id: "1", question: "", options: ["", "", "", ""], correctAnswer: "", points: 1 },
  ]);

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { id: Date.now().toString(), question: "", options: ["", "", "", ""], correctAnswer: "", points: 1 },
    ]);
  };

  const removeQuestion = (id: string) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const updateQuestion = (id: string, field: string, value: any) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? { ...q, options: q.options.map((o, i) => (i === optionIndex ? value : o)) }
          : q
      )
    );
  };

  const handleSave = async () => {
    if (!quizData.title.trim()) {
      toast.error("Quiz title is required");
      return;
    }

    const hasEmptyQuestions = questions.some(
      (q) => !q.question.trim() || q.options.some((o) => !o.trim()) || !q.correctAnswer
    );
    if (hasEmptyQuestions) {
      toast.error("Please fill in all questions, options, and correct answers");
      return;
    }

    setLoading(true);
    try {
      await quizService.createQuiz({
        courseId: quizData.courseId || "1",
        title: quizData.title,
        description: quizData.description,
        passingPercentage: quizData.passingPercentage,
        timeLimit: quizData.timeLimit,
        maxAttempts: 3,
        isActive: true,
        questions: questions.map((q) => ({
          type: "single" as const,
          question: q.question,
          options: q.options,
          correctAnswer: q.options.indexOf(q.correctAnswer),
          points: q.points,
        })),
      });
      toast.success("Quiz created successfully!");
      navigate("/instructor/courses");
    } catch {
      toast.error("Failed to create quiz");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-primary" />
              Create Quiz
            </h1>
            <p className="text-muted-foreground text-sm">Create MCQ-based assessment for your course</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={loading} className="shrink-0">
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Saving..." : "Save Quiz"}
        </Button>
      </div>

      {/* Quiz Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Quiz Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Quiz Title *</Label>
              <Input
                placeholder="e.g., Final Assessment"
                value={quizData.title}
                onChange={(e) => setQuizData((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Passing Percentage (%)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={quizData.passingPercentage}
                onChange={(e) => setQuizData((p) => ({ ...p, passingPercentage: parseInt(e.target.value) || 70 }))}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Time Limit (minutes)</Label>
              <Input
                type="number"
                min={5}
                value={quizData.timeLimit}
                onChange={(e) => setQuizData((p) => ({ ...p, timeLimit: parseInt(e.target.value) || 30 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Brief quiz description"
                value={quizData.description}
                onChange={(e) => setQuizData((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Questions ({questions.length})</h2>

        {questions.map((q, idx) => (
          <Card key={q.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Question {idx + 1}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => removeQuestion(q.id)} disabled={questions.length <= 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Question *</Label>
                <Textarea
                  placeholder="Enter your question..."
                  value={q.question}
                  onChange={(e) => updateQuestion(q.id, "question", e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-3">
                <Label>Options *</Label>
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2 sm:gap-3">
                    <button
                      onClick={() => updateQuestion(q.id, "correctAnswer", opt || `option-${oi}`)}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        q.correctAnswer === opt && opt
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary/50"
                      }`}
                      title="Mark as correct answer"
                    >
                      {q.correctAnswer === opt && opt && <CheckCircle2 className="h-4 w-4" />}
                    </button>
                    <Input
                      placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                      value={opt}
                      onChange={(e) => {
                        const newVal = e.target.value;
                        if (q.correctAnswer === opt) updateQuestion(q.id, "correctAnswer", newVal);
                        updateOption(q.id, oi, newVal);
                      }}
                    />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">Click the circle to mark the correct answer</p>
              </div>

              <div className="flex items-center gap-4">
                <Label>Points:</Label>
                <Input
                  type="number"
                  min={1}
                  className="w-20"
                  value={q.points}
                  onChange={(e) => updateQuestion(q.id, "points", parseInt(e.target.value) || 1)}
                />
              </div>
            </CardContent>
          </Card>
        ))}

        <Button variant="outline" onClick={addQuestion} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Add Question
        </Button>
      </div>
    </div>
  );
};

export default QuizEditor;
