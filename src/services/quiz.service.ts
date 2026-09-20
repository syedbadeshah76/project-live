// ============================================================
// Quiz Service — Spring Boot backend contract with Legacy Mock Compatibility
// apiClient baseURL = `${VITE_API_URL}` (already ends in /api)
// ============================================================
import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api.types";

/* ==================== Types ==================== */
export type QuizStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "single" | "multiple" | "boolean";

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options: string[];
  correctAnswer?: number;        // for single answer
  correctAnswers?: number[];     // for multiple answers
  explanation?: string | null;
  points: number;
}

export interface Quiz {
  id: string;
  moduleId: string;
  title: string;
  description?: string | null;
  durationMinutes: number;
  passingPercentage: number;
  maxAttempts: number;
  questionCount: number;
  randomizeQuestions: boolean;
  showResultImmediately: boolean;
  showCorrectAnswers: boolean;
  status?: QuizStatus;
  createdAt?: string | null;
  updatedAt?: string | null;
  
  // Compatibility fields for legacy pages
  courseId?: string;
  courseName?: string;
  questions?: QuizQuestion[];
  timeLimit?: number;
  isActive?: boolean;
  totalAttempts?: number;
  avgScore?: number;
}

export interface PracticeTestAverageResponse {
  courseId: string;
  studentId: string;
  totalAttempts: number;
  averagePercentage: number;
}

export interface QuizPayload {
  moduleId?: string;
  courseId?: string;
  title: string;
  description?: string;
  durationMinutes?: number;
  timeLimit?: number;
  passingPercentage?: number;
  maxAttempts?: number;
  quizAttempts?: number;
  questionCount?: number;
  randomizeQuestions?: boolean;
  showResultImmediately?: boolean;
  showCorrectAnswers?: boolean;
  isActive?: boolean;
  questions?: any[];
}

/** Option as rendered to the student. `key` is what gets submitted ("A".."D"). */
export interface QuizOption {
  key: string;
  text: string;
}

/** Question shape used by the attempt runner. */
export interface AttemptQuestion {
  /** id to send back in `answers[].attemptQuestionId` */
  attemptQuestionId: string;
  questionId?: string;
  questionText: string;
  type: QuestionType;
  marks: number;
  options: QuizOption[];
}

export interface QuizAttempt {
  attemptId: string;
  quizId: string;
  attemptNumber?: number;
  status?: "IN_PROGRESS" | "SUBMITTED" | "EXPIRED" | string;
  startedAt?: string | null;
  expiresAt?: string | null;
  submittedAt?: string | null;
  durationMinutes?: number | null;
  
  // Compatibility fields for legacy pages
  id?: string;
  quizTitle?: string;
  userId?: string;
  userName?: string;
  courseId?: string;
  answers?: Record<string, number | number[]>;
  score?: number;
  maxScore?: number;
  percentage?: number;
  passed?: boolean;
  correctCount?: number;
  wrongCount?: number;
  unansweredCount?: number;
  completedAt?: string | null;
  timeSpent?: number;
}

export interface QuizAnswerPayload {
  attemptQuestionId: string;
  selectedAnswers: string[];
}

export interface QuizResult {
  attemptId: string;
  quizId: string;
  score: number;
  maxScore: number;
  percentage: number;
  passingPercentage: number;
  passed: boolean;
  correctCount: number;
  totalQuestions: number;
  submittedAt: string | null;
  
  // Compatibility fields for legacy pages
  success?: boolean;
  data?: any;
  attempt?: QuizAttempt;
  quiz?: Quiz;
  certificateGenerated?: boolean;
  certificateId?: string;
}

export interface QuizReviewItem {
  attemptQuestionId: string;
  questionText: string;
  type: QuestionType;
  options: QuizOption[];
  selectedAnswers: string[];
  correctAnswers: string[];
  correct: boolean;
  marks: number;
  earnedMarks: number;
  explanation?: string | null;
}

export interface QuizAttemptHistoryItem {
  attemptId: string;
  attemptNumber: number;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  status: string;
  startedAt: string | null;
  submittedAt: string | null;
}

export interface CreateQuizRequest {
  courseId: string;
  title: string;
  description: string;
  passingPercentage: number;
  timeLimit: number;
  maxAttempts: number;
  isActive: boolean;
  questions: Omit<QuizQuestion, "id">[];
}

export interface QuizAnalytics {
  totalAttempts: number;
  avgScore: number;
  passRate: number;
  hardestQuestions: { questionId: string; question: string; wrongPercentage: number }[];
  recentAttempts: QuizAttempt[];
}

export interface InstructorQuizQuestionPerformance {
  questionBankId: string;
  question: string;
  difficulty: "EASY" | "MEDIUM" | "HARD" | string;
  correctCount: number;
  incorrectCount: number;
  accuracyPercent: number;
}

export interface InstructorStudentResultItem {
  studentId: string;
  studentName: string;
  studentEmail: string;
  attemptCount: number;
  attemptIds: string[];
}

export interface InstructorQuizResultsData {
  quizId: string;
  title: string;
  courseTitle: string;
  durationMinutes: number;
  passingPercentage: number;
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  questionPerformance: InstructorQuizQuestionPerformance[];
  studentResults: InstructorStudentResultItem[];
}

export interface InstructorAttemptSummary {
  attemptId: string;
  quizId: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  unanswered: number;
  obtainedMarks: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  startedAt: string;
  submittedAt: string;
  durationInSeconds: number;
}

export interface InstructorStudentAttemptItem {
  attemptId: string;
  attemptNumber: number;
  percentage: number;
  passed: boolean;
  status: string;
  startedAt: string;
  submittedAt: string;
}

export interface InstructorAttemptQuestionItem {
  attemptQuestionId: string;
  displayOrder: number;
  question: string;
  questionType: string;
  options: Record<string, string> | QuizOption[];
  selectedAnswers: string[];
  correctAnswers: string[];
  correct: boolean;
  marksAwarded: number;
  totalMarks: number;
  explanation?: string | null;
}

export interface InstructorReviewData {
  studentId: string;
  studentName: string;
  studentEmail: string;
  quizId: string;
  quizTitle: string;
  passingPercentage: number;
  accuracyRate: number;
  summary: InstructorAttemptSummary;
  studentAttempts: InstructorStudentAttemptItem[];
  questions: InstructorAttemptQuestionItem[];
}

/* ==================== Helpers ==================== */
/** Backend may answer with a bare object or an ApiResponse envelope. */
const unwrap = <T,>(res: any): T =>
  res && typeof res === "object" && "data" in res ? (res.data as T) : (res as T);

const toArray = <T,>(value: any): T[] => {
  const data = unwrap<any>(value);
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    for (const key of ["content", "items", "results", "questions", "attempts", "review"]) {
      if (Array.isArray(data[key])) return data[key] as T[];
    }
  }
  return [];
};

const num = (v: unknown, fallback = 0) => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
};

const str = (...values: unknown[]) => {
  for (const v of values) {
    if (v != null && typeof v !== "object") {
      const s = String(v).trim();
      if (s) return s;
    }
  }
  return "";
};

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
};

const normalizeOptions = (raw: any): QuizOption[] => {
  const LETTERS = "ABCDEFGHIJ";
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((opt, i) => {
      if (opt && typeof opt === "object") {
        return {
          key: str(opt.key, opt.optionKey, opt.value, opt.id, LETTERS[i]) || LETTERS[i],
          text: str(opt.text, opt.optionText, opt.label, opt.value) || `Option ${LETTERS[i]}`,
        };
      }
      return { key: LETTERS[i], text: String(opt) };
    });
  }
  if (typeof raw === "object") {
    return Object.entries(raw)
      .filter(([, v]) => v != null && String(v).trim() !== "")
      .map(([k, v]) => ({ key: k, text: String(v) }));
  }
  return [];
};

const normalizeQuiz = (raw: any, fallbackModuleId = ""): Quiz | null => {
  const data = unwrap<any>(raw);
  if (!data || typeof data !== "object") return null;
  const id = str(data.id, data.quizId, data.quiz_id, data.uuid);
  if (!id) return null;
  
  const questions: QuizQuestion[] = toArray<any>(data.questions).map((q, idx) => ({
    id: str(q.id, `q-${idx}`),
    type: (q.type ?? q.questionType ?? "single") as QuestionType,
    question: str(q.question, q.text) || "",
    options: normalizeOptions(q.options ?? q.choices).map(o => o.text),
    correctAnswer: q.correctAnswer != null ? num(q.correctAnswer) : undefined,
    correctAnswers: q.correctAnswers ? toStringArray(q.correctAnswers).map(Number) : undefined,
    explanation: q.explanation ?? null,
    points: num(q.points ?? q.marks, 1),
  }));

  const durationMinutes = num(data.durationMinutes ?? data.timeLimit, 0);

  return {
    id,
    moduleId: str(data.moduleId, data.module?.id, fallbackModuleId),
    title: str(data.title) || "Quiz",
    description: data.description ?? null,
    durationMinutes,
    passingPercentage: num(data.passingPercentage, 0),
    maxAttempts: num(data.maxAttempts ?? data.quizAttempts, 0),
    questionCount: num(data.questionCount ?? data.totalQuestions ?? questions.length, 0),
    randomizeQuestions: !!data.randomizeQuestions,
    showResultImmediately: data.showResultImmediately !== false,
    showCorrectAnswers: !!data.showCorrectAnswers,
    status: data.status ?? undefined,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    
    // Compatibility fields
    courseId: str(data.courseId, data.course?.id),
    courseName: str(data.courseName, data.course?.title),
    questions,
    timeLimit: durationMinutes,
    isActive: data.status === "PUBLISHED" || data.isActive !== false,
    totalAttempts: num(data.totalAttempts, 0),
    avgScore: num(data.avgScore, 0),
  };
};

const normalizeAttemptQuestion = (raw: any, index: number): AttemptQuestion => {
  const options = normalizeOptions(raw.options ?? raw.optionList ?? raw.choices);
  const type: QuestionType =
    raw.type === "MULTIPLE_CHOICE" || raw.questionType === "MULTIPLE_CHOICE"
      ? "MULTIPLE_CHOICE"
      : raw.type === "TRUE_FALSE" || raw.questionType === "TRUE_FALSE"
        ? "TRUE_FALSE"
        : "SINGLE_CHOICE";
  return {
    attemptQuestionId: str(raw.attemptQuestionId, raw.id, raw.questionId, `q-${index}`),
    questionId: str(raw.questionId, raw.question?.id) || undefined,
    questionText: str(raw.questionText, raw.text, raw.question, raw.title) || `Question ${index + 1}`,
    type,
    marks: num(raw.marks ?? raw.points, 1),
    options,
  };
};

const normalizeAttempt = (raw: any, quizId: string): QuizAttempt => {
  const data = unwrap<any>(raw) ?? {};
  const attemptId = str(data.attemptId, data.id);
  const startedAt = data.startedAt ?? null;
  const submittedAt = data.submittedAt ?? data.completedAt ?? null;
  const timeSpent = data.timeSpent != null 
    ? num(data.timeSpent) 
    : startedAt && submittedAt 
      ? Math.round((new Date(submittedAt).getTime() - new Date(startedAt).getTime()) / 1000) 
      : 0;

  return {
    attemptId,
    quizId: str(data.quizId, quizId),
    attemptNumber: num(data.attemptNumber, 1),
    status: data.status ?? "IN_PROGRESS",
    startedAt,
    expiresAt: data.expiresAt ?? null,
    submittedAt,
    durationMinutes: data.durationMinutes != null ? num(data.durationMinutes) : null,
    
    // Compatibility fields
    id: attemptId,
    quizTitle: str(data.quizTitle),
    userId: str(data.userId),
    userName: str(data.userName),
    courseId: str(data.courseId),
    answers: data.answers ?? {},
    score: num(data.score ?? data.obtainedMarks),
    maxScore: num(data.maxScore ?? data.totalMarks),
    percentage: num(data.percentage),
    passed: !!data.passed,
    correctCount: num(data.correctCount),
    wrongCount: num(data.wrongCount),
    unansweredCount: num(data.unansweredCount),
    completedAt: submittedAt,
    timeSpent,
  };
};

const normalizeResult = (raw: any, attemptId: string): QuizResult => {
  const data = unwrap<any>(raw) ?? {};
  const score = num(data.score ?? data.obtainedMarks);
  const maxScore = num(data.maxScore ?? data.totalMarks, 0);
  const percentage = data.percentage != null
    ? num(data.percentage)
    : maxScore > 0
      ? Math.round((score / maxScore) * 100)
      : 0;
  const passingPercentage = num(data.passingPercentage, 0);
  const passed = data.passed != null ? !!data.passed : percentage >= passingPercentage;
  
  const attempt = data.attempt ? normalizeAttempt(data.attempt, data.quizId) : undefined;
  const quiz = data.quiz ? normalizeQuiz(data.quiz) || undefined : undefined;

  return {
    attemptId: str(data.attemptId, attemptId),
    quizId: str(data.quizId),
    score,
    maxScore,
    percentage,
    passingPercentage,
    passed,
    correctCount: num(data.correctCount ?? data.correctAnswers),
    totalQuestions: num(data.totalQuestions ?? data.questionCount),
    submittedAt: data.submittedAt ?? null,
    
    // Compatibility fields
    success: true,
    data: data.data ?? raw,
    attempt,
    quiz,
    certificateGenerated: passed,
    certificateId: data.certificateId ?? undefined,
  };
};

const normalizeReviewItem = (raw: any, index: number): QuizReviewItem => ({
  attemptQuestionId: str(raw.attemptQuestionId, raw.id, `r-${index}`),
  questionText: str(raw.questionText, raw.text, raw.question) || `Question ${index + 1}`,
  type: (raw.type ?? raw.questionType ?? "SINGLE_CHOICE") as QuestionType,
  options: normalizeOptions(raw.options ?? raw.choices),
  selectedAnswers: toStringArray(raw.selectedAnswers ?? raw.selected ?? raw.userAnswers),
  correctAnswers: toStringArray(raw.correctAnswers ?? raw.correct),
  correct: !!(raw.correct ?? raw.isCorrect),
  marks: num(raw.marks ?? raw.points, 1),
  earnedMarks: num(raw.earnedMarks ?? raw.obtainedMarks),
  explanation: raw.explanation ?? null,
});

/* ==================== Service ==================== */
export const quizService = {
  /* ---------- Quiz CRUD ---------- */
  async getQuiz(quizId: string): Promise<Quiz | null> {
    const res = await apiClient.get<ApiResponse<Quiz>>(`/quizzes/${quizId}`);
    return normalizeQuiz(res);
  },

  /**
   * Safe quiz lookup by ID without calling non-existent /quizzes/module/ endpoint.
   */
  async getModuleQuiz(quizIdOrModuleId: string): Promise<Quiz | null> {
    const id = String(quizIdOrModuleId ?? "").trim();
    if (!id || id.startsWith("section-") || id.startsWith("module-")) return null;
    try {
      return await this.getQuiz(id);
    } catch {
      return null;
    }
  },


  createQuiz(payload: QuizPayload) {
    const quizType = payload.quizType || (payload.moduleId ? "MODULE" : "PRACTICE");
    return apiClient.post<ApiResponse<Quiz>>("/quizzes", {
      ...payload,
      quizType,
      durationMinutes: num(payload.durationMinutes, 20),
      passingPercentage: num(payload.passingPercentage, 70),
      maxAttempts: num(payload.maxAttempts, 3),
      questionCount: num(payload.questionCount, 10),
      randomizeQuestions: payload.randomizeQuestions ?? (payload as any).shuffleQuestions ?? true,
      showResultImmediately: payload.showResultImmediately !== false,
      showCorrectAnswers: payload.showCorrectAnswers !== false,
    });
  },

  uploadQuestionBank(file: File, courseId?: string, moduleId?: string) {
    const formData = new FormData();
    formData.append("file", file);
    if (courseId) formData.append("courseId", courseId);
    if (moduleId) formData.append("moduleId", moduleId);
    return apiClient.post<ApiResponse<{ message: string }>>("/questionbank/upload", formData);
  },

  async updateQuiz(quizId: string, payload: Partial<QuizPayload>) {
    const quizType = payload.quizType || (payload.moduleId ? "MODULE" : undefined);
    try {
      return await apiClient.put<ApiResponse<Quiz>>(`/quizzes/${quizId}`, {
        ...payload,
        ...(quizType ? { quizType } : {}),
      });
    } catch (err: any) {
      if (
        err?.response?.data?.code === "QUIZ_007" ||
        err?.response?.data?.message?.includes("cannot be edited") ||
        err?.response?.data?.message?.includes("Published")
      ) {
        return { success: true, data: { id: quizId, quizId } as any };
      }
      throw err;
    }
  },

  async publishQuiz(quizId: string) {
    try {
      return await apiClient.patch<ApiResponse<Quiz>>(`/quizzes/${quizId}/publish`, {});
    } catch (err: any) {
      if (
        err?.response?.data?.code === "QUIZ_007" ||
        err?.response?.data?.message?.includes("already published")
      ) {
        return { success: true, data: null } as any;
      }
      throw err;
    }
  },

  archiveQuiz(quizId: string) {
    return apiClient.patch<ApiResponse<Quiz>>(`/quizzes/${quizId}/archive`, {});
  },

  deleteQuiz(quizId: string) {
    return apiClient.delete<ApiResponse<{ message: string }>>(`/quizzes/${quizId}`);
  },

  /* ---------- Questions (author side) ---------- */
  assignQuestions(quizId: string, questionIds: string[]) {
    return apiClient.post<ApiResponse<{ message: string }>>(
      `/quizzes/${quizId}/questions`,
      { questionIds },
    );
  },

  async getAssignedQuestions(quizId: string): Promise<any[]> {
    const res = await apiClient.get(`/quizzes/${quizId}/questions`);
    return toArray<any>(res);
  },

  async getStudentQuestions(quizId: string): Promise<AttemptQuestion[]> {
    const res = await apiClient.get(`/quizzes/${quizId}/questions/student`);
    return toArray<any>(res).map(normalizeAttemptQuestion);
  },

  removeAllQuestions(quizId: string) {
    return apiClient.delete<ApiResponse<{ message: string }>>(`/quizzes/${quizId}/questions`);
  },

  /* ---------- Attempts (student side) ---------- */
  async startAttempt(quizId: string): Promise<QuizAttempt> {
    const res = await apiClient.post(`/quizzes/${quizId}/attempts`, {});
    const attempt = normalizeAttempt(res, quizId);
    if (!attempt.attemptId) throw new Error("Backend did not return an attempt id");
    return attempt;
  },

  async getAttemptQuestions(attemptId: string): Promise<AttemptQuestion[]> {
    const res = await apiClient.get(`/quizzes/attempts/${attemptId}/questions`);
    return toArray<any>(res).map(normalizeAttemptQuestion);
  },

  async submitNewAttempt(attemptId: string, answers: QuizAnswerPayload[]): Promise<QuizResult> {
    const res = await apiClient.post(`/quizzes/attempts/${attemptId}/submit`, {
      answers: answers.map((a) => ({
        attemptQuestionId: a.attemptQuestionId,
        selectedAnswers: a.selectedAnswers,
      })),
    });
    return normalizeResult(res, attemptId);
  },

  async submitAttempt(attemptIdOrQuizId: string, answersOrCourseId: any, maybeAnswers?: any, maybeTimeSpent?: number): Promise<any> {
    // Check if called with legacy signature: submitAttempt(quizId, courseId, answers, timeSpent)
    if (typeof answersOrCourseId === "string") {
      const quizId = attemptIdOrQuizId;
      const courseId = answersOrCourseId;
      const oldAnswers = maybeAnswers as Record<string, number | number[]>;
      const timeSpent = maybeTimeSpent ?? 0;
      
      const attempt = await this.startAttempt(quizId);
      const questions = await this.getAttemptQuestions(attempt.attemptId);
      
      const newAnswers: QuizAnswerPayload[] = questions.map((q) => {
        const val = oldAnswers[q.attemptQuestionId] ?? oldAnswers[q.questionId ?? ""] ?? [];
        const selectedAnswers: string[] = [];
        if (Array.isArray(val)) {
          val.forEach((idx) => {
            if (q.options[idx]) selectedAnswers.push(q.options[idx].key);
          });
        } else if (val !== undefined && val !== null) {
          const idx = Number(val);
          if (q.options[idx]) selectedAnswers.push(q.options[idx].key);
        }
        return {
          attemptQuestionId: q.attemptQuestionId,
          selectedAnswers,
        };
      });
      
      const result = await this.submitNewAttempt(attempt.attemptId, newAnswers);
      const quiz = await this.getQuiz(quizId);
      
      const legacyAttempt: QuizAttempt = {
        ...attempt,
        id: attempt.attemptId,
        quizTitle: quiz?.title || "Quiz",
        courseId,
        score: result.score,
        maxScore: result.maxScore,
        percentage: result.percentage,
        passed: result.passed,
        correctCount: result.correctCount,
        wrongCount: result.totalQuestions - result.correctCount,
        completedAt: result.submittedAt || new Date().toISOString(),
        timeSpent,
      };
      
      return {
        success: true,
        data: {
          attempt: legacyAttempt,
          quiz,
        },
      };
    }
    
    // Otherwise call new implementation directly
    return this.submitNewAttempt(attemptIdOrQuizId, answersOrCourseId);
  },

  async getAttemptHistory(quizId: string): Promise<QuizAttemptHistoryItem[]> {
    const res = await apiClient.get(`/quizzes/${quizId}/attempts/history`);
    return toArray<any>(res).map((a, i) => ({
      attemptId: str(a.attemptId, a.id),
      attemptNumber: num(a.attemptNumber, i + 1),
      score: num(a.score ?? a.obtainedMarks),
      maxScore: num(a.maxScore ?? a.totalMarks),
      percentage: num(a.percentage),
      passed: !!a.passed,
      status: str(a.status) || "SUBMITTED",
      startedAt: a.startedAt ?? null,
      submittedAt: a.submittedAt ?? null,
    }));
  },

  async getResult(attemptId: string): Promise<QuizResult> {
    const res = await apiClient.get(`/quizzes/attempts/${attemptId}/result`);
    return normalizeResult(res, attemptId);
  },

  async getAttemptReview(attemptId: string): Promise<QuizReviewItem[]> {
    const res = await apiClient.get(`/quizzes/attempts/${attemptId}/review`);
    return toArray<any>(res).map(normalizeReviewItem);
  },

  /* ---------- Instructor Quiz Results & Review APIs ---------- */
  async getInstructorQuizResults(quizId: string): Promise<InstructorQuizResultsData> {
    const res = await apiClient.get<any>(`/quizzes/${quizId}/results`);
    const data = unwrap<any>(res) ?? {};
    return {
      quizId: str(data.quizId, quizId),
      title: str(data.title, data.quizTitle, "Practice Test"),
      courseTitle: str(data.courseTitle, data.courseName, ""),
      durationMinutes: num(data.durationMinutes, 0),
      passingPercentage: num(data.passingPercentage, 0),
      totalAttempts: num(data.totalAttempts, 0),
      averageScore: num(data.averageScore, 0),
      passRate: num(data.passRate, 0),
      questionPerformance: toArray<any>(data.questionPerformance).map((q, idx) => ({
        questionBankId: str(q.questionBankId, q.id, `qb-${idx}`),
        question: str(q.question, q.questionText, `Question ${idx + 1}`),
        difficulty: str(q.difficulty, "MEDIUM").toUpperCase(),
        correctCount: num(q.correctCount, 0),
        incorrectCount: num(q.incorrectCount, 0),
        accuracyPercent: num(q.accuracyPercent ?? q.accuracyRate, 0),
      })),
      studentResults: toArray<any>(data.studentResults).map((st, idx) => ({
        studentId: str(st.studentId, st.id, `st-${idx}`),
        studentName: str(st.studentName, st.name, "Student"),
        studentEmail: str(st.studentEmail, st.email, ""),
        attemptCount: num(st.attemptCount ?? st.attemptIds?.length, 0),
        attemptIds: toStringArray(st.attemptIds),
      })),
    };
  },

  async getInstructorAttemptReview(attemptId: string): Promise<InstructorReviewData> {
    const res = await apiClient.get<any>(`/quizzes/attempts/${attemptId}/instructor-review`);
    const data = unwrap<any>(res) ?? {};
    const summaryRaw = data.summary || {};
    return {
      studentId: str(data.studentId, summaryRaw.studentId),
      studentName: str(data.studentName, "Student"),
      studentEmail: str(data.studentEmail, ""),
      quizId: str(data.quizId, summaryRaw.quizId),
      quizTitle: str(data.quizTitle, "Practice Test"),
      passingPercentage: num(data.passingPercentage, 0),
      accuracyRate: num(data.accuracyRate ?? summaryRaw.percentage, 0),
      summary: {
        attemptId: str(summaryRaw.attemptId, attemptId),
        quizId: str(summaryRaw.quizId, data.quizId),
        totalQuestions: num(summaryRaw.totalQuestions, 0),
        correctAnswers: num(summaryRaw.correctAnswers, 0),
        wrongAnswers: num(summaryRaw.wrongAnswers, 0),
        unanswered: num(summaryRaw.unanswered, 0),
        obtainedMarks: num(summaryRaw.obtainedMarks, 0),
        totalMarks: num(summaryRaw.totalMarks, 0),
        percentage: num(summaryRaw.percentage, 0),
        passed: summaryRaw.passed != null ? !!summaryRaw.passed : num(summaryRaw.percentage, 0) >= num(data.passingPercentage, 0),
        startedAt: str(summaryRaw.startedAt),
        submittedAt: str(summaryRaw.submittedAt),
        durationInSeconds: num(summaryRaw.durationInSeconds, 0),
      },
      studentAttempts: toArray<any>(data.studentAttempts).map((att, idx) => ({
        attemptId: str(att.attemptId, att.id),
        attemptNumber: num(att.attemptNumber, idx + 1),
        percentage: num(att.percentage, 0),
        passed: !!att.passed,
        status: str(att.status, "SUBMITTED"),
        startedAt: str(att.startedAt),
        submittedAt: str(att.submittedAt),
      })),
      questions: toArray<any>(data.questions).map((q, idx) => ({
        attemptQuestionId: str(q.attemptQuestionId, q.id, `q-${idx}`),
        displayOrder: num(q.displayOrder, idx + 1),
        question: str(q.question, q.questionText, `Question ${idx + 1}`),
        questionType: str(q.questionType, "SINGLE_CHOICE"),
        options: q.options || {},
        selectedAnswers: toStringArray(q.selectedAnswers),
        correctAnswers: toStringArray(q.correctAnswers),
        correct: !!q.correct,
        marksAwarded: num(q.marksAwarded, 0),
        totalMarks: num(q.totalMarks, 1),
        explanation: q.explanation ?? null,
      })),
    };
  },

  /* ---------- Legacy / Compatibility Helper Methods ---------- */
  async getAllQuizzes(): Promise<ApiResponse<Quiz[]>> {
    return Promise.resolve({ success: true, data: [] });
  },

  async getQuizById(quizId: string): Promise<ApiResponse<Quiz | null>> {
    try {
      const q = await this.getQuiz(quizId);
      return { success: true, data: q };
    } catch (err: any) {
      return { success: false, data: null, message: err.message };
    }
  },

  async getCourseQuiz(courseId: string): Promise<ApiResponse<Quiz | null>> {
    try {
      const res = await apiClient.get(`/quizzes/course/${courseId}`);
      const data = unwrap<any>(res);
      const q = normalizeQuiz(data);
      return { success: true, data: q };
    } catch {
      try {
        const res = await apiClient.get(`/quizzes`);
        const all = toArray<any>(res).map(q => normalizeQuiz(q)).filter(Boolean) as Quiz[];
        const match = all.find(q => q.courseId === courseId) || null;
        return { success: true, data: match };
      } catch (err: any) {
        return { success: false, data: null, message: err.message };
      }
    }
  },

  async getAttempts(quizId: string): Promise<ApiResponse<QuizAttempt[]>> {
    try {
      const res = await apiClient.get(`/quizzes/${quizId}/attempts/history`);
      const attempts = toArray<any>(res).map(a => normalizeAttempt(a, quizId));
      return { success: true, data: attempts };
    } catch (err: any) {
      return { success: false, data: [], message: err.message };
    }
  },

  async getStudentAttempts(): Promise<ApiResponse<QuizAttempt[]>> {
    try {
      const quizzesRes = await this.getAllQuizzes();
      if (!quizzesRes.success) return { success: false, data: [] };
      const attemptsList: QuizAttempt[] = [];
      for (const q of quizzesRes.data) {
        try {
          const history = await this.getAttemptHistory(q.id);
          history.forEach((h) => {
            attemptsList.push({
              attemptId: h.attemptId,
              id: h.attemptId,
              quizId: q.id,
              quizTitle: q.title,
              score: h.score,
              maxScore: h.maxScore,
              percentage: h.percentage,
              passed: h.passed,
              completedAt: h.submittedAt || h.startedAt,
              startedAt: h.startedAt,
              status: h.status as any,
            });
          });
        } catch {}
      }
      return { success: true, data: attemptsList };
    } catch (err: any) {
      return { success: false, data: [], message: err.message };
    }
  },

  async getLeaderboard(quizId: string): Promise<ApiResponse<QuizAttempt[]>> {
    try {
      const history = await this.getAttemptHistory(quizId);
      const attempts = history.map((h) => ({
        attemptId: h.attemptId,
        id: h.attemptId,
        quizId,
        score: h.score,
        maxScore: h.maxScore,
        percentage: h.percentage,
        passed: h.passed,
        completedAt: h.submittedAt || h.startedAt,
        startedAt: h.startedAt,
        status: h.status as any,
        timeSpent: h.submittedAt && h.startedAt ? Math.round((new Date(h.submittedAt).getTime() - new Date(h.startedAt).getTime()) / 1000) : 0,
        userName: "Student",
        userId: "1",
        correctCount: h.score,
        wrongCount: h.maxScore - h.score,
      }));
      return { success: true, data: attempts };
    } catch (err: any) {
      return { success: false, data: [], message: err.message };
    }
  },

  async getQuizAnalytics(quizId: string): Promise<ApiResponse<QuizAnalytics>> {
    try {
      const res = await apiClient.get(`/quizzes/${quizId}/analytics`);
      const data = unwrap<any>(res) ?? {};
      return {
        success: true,
        data: {
          totalAttempts: num(data.totalAttempts),
          avgScore: num(data.avgScore),
          passRate: num(data.passRate),
          hardestQuestions: toArray<any>(data.hardestQuestions).map(q => ({
            questionId: str(q.questionId),
            question: str(q.question),
            wrongPercentage: num(q.wrongPercentage),
          })),
          recentAttempts: toArray<any>(data.recentAttempts).map(a => normalizeAttempt(a, quizId)),
        },
      };
    } catch {
      try {
        const history = await this.getAttemptHistory(quizId);
        const totalAttempts = history.length;
        const avgScore = totalAttempts > 0 ? Math.round(history.reduce((sum, a) => sum + a.percentage, 0) / totalAttempts) : 0;
        const passRate = totalAttempts > 0 ? Math.round((history.filter((a) => a.passed).length / totalAttempts) * 100) : 0;
        
        return {
          success: true,
          data: {
            totalAttempts,
            avgScore,
            passRate,
            hardestQuestions: [],
            recentAttempts: history.map((h) => ({
              attemptId: h.attemptId,
              id: h.attemptId,
              quizId,
              score: h.score,
              maxScore: h.maxScore,
              percentage: h.percentage,
              passed: h.passed,
              completedAt: h.submittedAt || h.startedAt,
              startedAt: h.startedAt,
              status: h.status as any,
            })),
          },
        };
      } catch (err: any) {
        return { success: false, data: { totalAttempts: 0, avgScore: 0, passRate: 0, hardestQuestions: [], recentAttempts: [] }, message: err.message };
      }
    }
  },

  async getQuizzesByCategory(category: string, courseIds: string[] = []): Promise<ApiResponse<Quiz[]>> {
    try {
      const res = await this.getAllQuizzes();
      if (!res.success) return { success: false, data: [] };
      const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
      const target = norm(category);
      const matches = res.data.filter((q) => {
        if (q.courseId && courseIds.includes(q.courseId)) return true;
        const haystack = `${q.title} ${q.courseName ?? ""} ${q.description ?? ""}`;
        return norm(haystack).includes(target);
      });
      return { success: true, data: matches };
    } catch (err: any) {
      return { success: false, data: [], message: err.message };
    }
  },

  /** GET /api/quizzes/student/{studentId}/course/{courseId}/practice-test/average */
  async getPracticeTestAverage(
    studentId: string,
    courseId: string
  ): Promise<PracticeTestAverageResponse | null> {
    try {
      const res = await apiClient.get<any>(
        `/quizzes/student/${encodeURIComponent(studentId)}/course/${encodeURIComponent(courseId)}/practice-test/average`
      );
      const data = unwrap<any>(res) ?? (res as any)?.data ?? res;
      if (data) {
        return {
          courseId: String(data.courseId || courseId),
          studentId: String(data.studentId || studentId),
          totalAttempts: Number(data.totalAttempts ?? 0),
          averagePercentage: Number(data.averagePercentage ?? data.avgScore ?? 0),
        };
      }
      return null;
    } catch {
      return null;
    }
  },
};

export default quizService;
