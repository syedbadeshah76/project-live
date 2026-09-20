// Backend-ready DTOs for the Practice Test module.
// Matches Spring Boot REST contract; S3 URLs are flat strings.

export type AttemptStatus = "IN_PROGRESS" | "COMPLETED" | "EXPIRED" | "SUBMITTED";
export type AttemptOutcome = "PASS" | "FAIL";

export interface PracticeTestSummary {
  id: string | number;
  courseId: string | number;
  title: string;
  description: string;
  thumbnail: string;
  passPercentage: number;
  questionCount: number;
  durationMinutes: number;
  averageScore: number;
  category?: string;
  difficulty?: string;
  maxAttempts?: number;
  status?: string;
  courseName?: string;
  courseTitle?: string;
}

export interface PracticeTestOption {
  id: string; // "A" | "B" | "C" | "D"
  text: string;
}

export interface PracticeTestQuestion {
  id: string | number;
  index: number; // 1-based
  text: string;
  points: number;
  options: PracticeTestOption[];
  attemptQuestionId?: string;
  type?: string;
}

export interface PracticeTestDetails extends PracticeTestSummary {
  totalPoints: number;
}

export interface AttemptHistoryItem {
  attemptId: string;
  attemptDate: string; // ISO
  scorePercentage: number;
  status: AttemptOutcome | string;
  attemptNumber?: number;
  score?: number;
  maxScore?: number;
}

export interface AttemptAnswer {
  questionId: string | number;
  attemptQuestionId?: string;
  selectedOptionId: string | null;
  selectedAnswers?: string[];
}

export interface AttemptState {
  attemptId: string;
  testId: string | number;
  testTitle: string;
  status: AttemptStatus;
  startedAt: string; // ISO
  durationMinutes: number;
  serverNow: string; // ISO — used to align countdown
  questions: PracticeTestQuestion[];
  answers: AttemptAnswer[];
}

export interface ReviewQuestion extends PracticeTestQuestion {
  correctOptionId: string;
  correctAnswers?: string[];
  selectedOptionId: string | null;
  selectedAnswers?: string[];
  isCorrect?: boolean;
  explanation?: string | null;
  wrongExplanation?: string | null;
}

export interface PracticeTestResult {
  attemptId: string;
  testId: string | number;
  testTitle: string;
  scorePercentage: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  totalQuestions: number;
  totalPoints: number;
  earnedPoints: number;
  timeTakenSeconds: number;
  passed: boolean;
  performanceInsight: string;
  review: ReviewQuestion[];
  maxAttempts?: number;
  attemptCount?: number;
  courseId?: string;
  courseName?: string;
  courseTitle?: string;
  passPercentage?: number;
}
