import { apiClient } from "@/lib/api-client";

export interface InstructorPracticeTestAnalytics {
  totalTests: number;
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  avgAttemptsPerTest?: number;
  avgAttemptsDelta?: string;
  studentPassRate?: number;
  studentPassRateDelta?: string;
  avgTimePerQuestion?: number;
  avgTimePerQuestionDelta?: string;
}

export interface InstructorPracticeTestItem {
  id: string;
  title: string;
  courseName?: string;
  courseTitle?: string;
  courseId?: string;
  moduleId?: string;
  questionCount?: number;
  durationMinutes?: number;
  status?: string;
  totalAttempts?: number;
  averageScore?: number;
  passRate?: number;
  avgTimePerQuestion?: number;
}

class InstructorPracticeTestService {
  /** Fetch Analytics using GET /quizzes/practice-tests/analytics */
  async getAnalytics(): Promise<InstructorPracticeTestAnalytics> {
    try {
      const res: any = await apiClient.get("/quizzes/practice-tests/analytics").catch(() => null);
      const data = res?.data ?? res ?? {};
      return {
        totalTests: Number(data.totalTests ?? data.totalQuizzes ?? data.totalPracticeTests ?? 0),
        totalAttempts: Number(data.totalAttempts ?? 0),
        averageScore: Number(data.averageScore ?? data.avgScore ?? 0),
        passRate: Number(data.passRate ?? 0),
        avgAttemptsPerTest: Number(data.avgAttemptsPerTest ?? 0),
        avgAttemptsDelta: String(data.avgAttemptsDelta ?? "+0.0"),
        studentPassRate: Number(data.studentPassRate ?? data.passRate ?? 0),
        studentPassRateDelta: String(data.studentPassRateDelta ?? "+0.0%"),
        avgTimePerQuestion: Number(data.avgTimePerQuestion ?? data.avgTimePerQuestionMinutes ?? 0),
        avgTimePerQuestionDelta: String(data.avgTimePerQuestionDelta ?? "0.0 min"),
      };
    } catch {
      return {
        totalTests: 0,
        totalAttempts: 0,
        averageScore: 0,
        passRate: 0,
      };
    }
  }

  /** Fetch Practice Tests list using GET /quizzes/practice-tests?page={page}&size={size} */
  async getPracticeTests(page = 0, size = 10, courseId?: string): Promise<InstructorPracticeTestItem[]> {
    let rawQuizzes: any[] = [];

    // 1. Primary endpoint: GET /quizzes/practice-tests?page={page}&size={size}
    try {
      const res: any = await apiClient.get("/quizzes/practice-tests", { params: { page, size } });
      const data = res?.data ?? res;
      if (Array.isArray(data)) rawQuizzes = data;
      else if (Array.isArray(data?.content)) rawQuizzes = data.content;
      else if (Array.isArray(data?.items)) rawQuizzes = data.items;
    } catch {}

    // 2. Fallback if courseId is passed: GET /quizzes/course/{courseId}
    if (!rawQuizzes.length && courseId) {
      try {
        const res: any = await apiClient.get(`/quizzes/course/${courseId}`);
        const data = res?.data ?? res;
        if (Array.isArray(data)) rawQuizzes = data;
        else if (Array.isArray(data?.content)) rawQuizzes = data.content;
      } catch {}
    }

    // 3. Fallback: GET /quizzes?quizType=PRACTICE
    if (!rawQuizzes.length) {
      try {
        const res: any = await apiClient.get("/quizzes", { params: { quizType: "PRACTICE", page, size } });
        const data = res?.data ?? res;
        if (Array.isArray(data)) rawQuizzes = data;
        else if (Array.isArray(data?.content)) rawQuizzes = data.content;
        else if (Array.isArray(data?.items)) rawQuizzes = data.items;
      } catch {}
    }

    // Map raw backend fields (`quizId`, `title`, `courseTitle`, `questionCount`, `durationMinutes`, `status`, etc.)
    const mapped: InstructorPracticeTestItem[] = rawQuizzes
      .map((q: any) => {
        const id = String(q.quizId || q.id || q.uuid || "");
        if (!id) return null;
        return {
          id,
          title: String(q.title || "Practice Test"),
          courseName: String(q.courseTitle || q.courseName || q.course?.title || "Course"),
          courseTitle: String(q.courseTitle || q.courseName || q.course?.title || "Course"),
          courseId: String(q.courseId || q.course?.id || ""),
          moduleId: String(q.moduleId || q.module?.id || ""),
          questionCount: Number(q.questionCount ?? q.totalQuestions ?? q.questions?.length ?? 10),
          durationMinutes: Number(q.durationMinutes ?? q.timeLimit ?? 45),
          status: String(q.status || q.quizStatus || "Active"),
          totalAttempts: Number(q.totalAttempts ?? 0),
          averageScore: q.averageScore != null ? Number(q.averageScore) : 0,
          passRate: q.passRate != null ? Number(q.passRate) : 0,
          avgTimePerQuestion: q.avgTimePerQuestionMinutes != null ? Number(q.avgTimePerQuestionMinutes) : 1.5,
        };
      })
      .filter(Boolean) as InstructorPracticeTestItem[];

    return mapped;
  }
}

export const instructorPracticeTestService = new InstructorPracticeTestService();
