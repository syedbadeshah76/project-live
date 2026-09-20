import { apiClient } from "@/lib/api-client";
import quizService from "@/services/quiz.service";
import { enrollmentService } from "@/services/enrollment.service";
import { coursesService } from "@/services/courses.service";
import { authService } from "@/services/auth.service";
import type {
  AttemptHistoryItem,
  AttemptState,
  PracticeTestDetails,
  PracticeTestOption,
  PracticeTestQuestion,
  PracticeTestResult,
  PracticeTestSummary,
  ReviewQuestion,
} from "@/types/practiceTest";

const LS_ATTEMPT_PREFIX = "edvanz.pt.attempt.";
const LS_HISTORY_PREFIX = "edvanz.pt.history.";

const THUMB =
  "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=70&auto=format&fit=crop";

/** Validates whether a string is a valid 36-character UUID */
const isUuid = (val: string | number | undefined | null): boolean => {
  if (!val) return false;
  const s = String(val).trim();
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s);
};

/** In-flight request deduplication map to prevent simultaneous duplicate API calls */
const inFlightRequests = new Map<string, Promise<any>>();

function dedupRequest<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key) as Promise<T>;
  }
  const promise = fn().finally(() => {
    inFlightRequests.delete(key);
  });
  inFlightRequests.set(key, promise);
  return promise;
}

/** Resolves the authenticated student's UUID */
const resolveCurrentStudentId = async (): Promise<string | null> => {
  try {
    const stored = typeof window !== "undefined" ? localStorage.getItem("Edvanz_user") : null;
    if (stored) {
      const parsed = JSON.parse(stored);
      if (isUuid(parsed?.id)) return parsed.id;
    }
  } catch {}
  try {
    const storedUserId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    if (isUuid(storedUserId)) return storedUserId;
  } catch {}
  try {
    const userRes = await authService.getCurrentUser().catch(() => null);
    const user = (userRes as any)?.data?.user ?? (userRes as any)?.data ?? (userRes as any)?.user ?? userRes;
    if (isUuid(user?.id)) return user.id;
  } catch {}
  return null;
};

/** Helper to fetch and populate student average scores for tests by courseId */
const enrichTestsWithAverages = async (
  tests: PracticeTestSummary[],
  studentId?: string
): Promise<PracticeTestSummary[]> => {
  if (!tests || tests.length === 0) return tests;
  let resolvedStudentId = studentId;
  if (!resolvedStudentId || !isUuid(resolvedStudentId)) {
    resolvedStudentId = (await resolveCurrentStudentId()) || undefined;
  }
  if (!resolvedStudentId || !isUuid(resolvedStudentId)) return tests;

  const courseAvgMap = new Map<string, number>();
  const uniqueCourseIds = Array.from(
    new Set(tests.map((t) => String(t.courseId || "")).filter((cId) => isUuid(cId)))
  );

  await Promise.allSettled(
    uniqueCourseIds.map(async (cId) => {
      const avgKey = `avg_${resolvedStudentId}_${cId}`;
      const avgRes = await dedupRequest(avgKey, () =>
        quizService.getPracticeTestAverage(resolvedStudentId!, cId)
      );
      if (avgRes && avgRes.averagePercentage != null && !isNaN(Number(avgRes.averagePercentage))) {
        courseAvgMap.set(cId, Number(avgRes.averagePercentage));
      }
    })
  );

  return tests.map((t) => {
    const cId = String(t.courseId || "");
    if (courseAvgMap.has(cId)) {
      return {
        ...t,
        averageScore: Math.round(courseAvgMap.get(cId)!),
      };
    }
    return t;
  });
};

function readLS<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeLS<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

/** Helper to normalize question options from various backend shapes (Map or Array) */
function normalizeOptions(rawOpts: any): PracticeTestOption[] {
  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (!rawOpts) return [];

  // 1. If options is an Object Map: { "A": "new int[5]", "B": "new int[]{1,2,3}" }
  if (typeof rawOpts === "object" && !Array.isArray(rawOpts)) {
    return Object.entries(rawOpts)
      .filter(([, v]) => v != null && String(v).trim() !== "")
      .map(([k, v]) => ({
        id: String(k).trim(),
        text: String(v).trim(),
      }));
  }

  // 2. If options is an Array
  if (Array.isArray(rawOpts)) {
    return rawOpts.map((opt: any, idx: number) => {
      if (opt && typeof opt === "object") {
        const id = String(opt.id || opt.key || opt.optionKey || LETTERS[idx] || `opt-${idx}`);
        const text = String(opt.text || opt.optionText || opt.label || opt.value || "");
        return { id, text };
      }
      return {
        id: LETTERS[idx] || `opt-${idx}`,
        text: String(opt),
      };
    });
  }

  return [];
}

/** Helper to normalize question objects */
function normalizePracticeQuestion(q: any, idx: number): PracticeTestQuestion {
  const qType =
    q.type === "MULTIPLE_CHOICE" ||
    q.questionType === "MULTIPLE_CHOICE" ||
    q.multipleChoice === true
      ? "MULTIPLE_CHOICE"
      : q.type === "TRUE_FALSE" || q.questionType === "TRUE_FALSE"
      ? "TRUE_FALSE"
      : "SINGLE_CHOICE";

  return {
    id: q.questionId || q.attemptQuestionId || q.id || idx + 1,
    attemptQuestionId: q.attemptQuestionId || q.id || `q-${idx + 1}`,
    index: idx + 1,
    text: String(q.questionText || q.question || q.text || q.title || `Question ${idx + 1}`),
    points: Number(q.marks ?? q.points ?? 5),
    type: qType,
    options: normalizeOptions(q.options ?? q.optionList ?? q.choices),
  };
}

/** Helper to normalize practice test summary items */
function normalizeSummary(q: any, fallbackCourseId = ""): PracticeTestSummary | null {
  if (!q) return null;
  const id = String(q.id || q.quizId || q.uuid || "");
  if (!id) return null;

  const rawCourseTitle = String(
    q.courseTitle ||
    q.courseName ||
    q.course?.title ||
    q.course?.name ||
    ""
  );

  const cleanCourseTitle = rawCourseTitle.trim();

  return {
    id,
    courseId: String(q.courseId || q.course?.id || fallbackCourseId || ""),
    title: String(q.title || "Practice Test"),
    description: String(q.description || "Practice Assessment"),
    thumbnail: String(q.thumbnailUrl || q.thumbnail || q.course?.thumbnail || THUMB),
    passPercentage: Math.round(Number(q.passingPercentage ?? q.passPercentage ?? q.passRate ?? 50)),
    questionCount: Number(q.questionCount ?? q.totalQuestions ?? q.questions?.length ?? 10),
    durationMinutes: Number(q.durationMinutes ?? q.timeLimit ?? 45),
    averageScore: Math.round(Number(q.averageScore ?? q.avgScore ?? 0)),
    maxAttempts: Number(q.maxAttempts ?? q.quizAttempts ?? 3),
    category: String(
      q.category ||
        q.categoryName ||
        cleanCourseTitle ||
        "Practice Assessment"
    ),
    difficulty: String(q.difficulty || q.level || "Intermediate"),
    status: String(q.status || q.quizStatus || "PUBLISHED"),
    courseTitle: cleanCourseTitle || undefined,
    courseName: cleanCourseTitle || undefined,
  };
}

const DEFAULT_TESTS: PracticeTestSummary[] = [
  {
    id: "a96366b5-67d1-4a4c-a7f9-1a624c96d1e7",
    courseId: "4a35ff18-3759-431f-9a3c-31dd352b3d75",
    title: "Python Data Science Assessment",
    description:
      "Test your knowledge of Python, data structures, analysis, and core algorithms.",
    thumbnail: THUMB,
    passPercentage: 50,
    questionCount: 10,
    durationMinutes: 45,
    averageScore: 0,
    maxAttempts: 3,
    category: "Data Science",
    difficulty: "Intermediate",
    status: "PUBLISHED",
  },
];

export const practiceTestService = {
  /** Fetch practice tests list (GET /api/quizzes/course/{courseId}/practice-tests) */
  async getPracticeTests(courseId?: string, studentId?: string): Promise<PracticeTestSummary[]> {
    const dedupKey = `getPracticeTests_${courseId || "all"}_${studentId || "curr"}`;
    return dedupRequest(dedupKey, async () => {
      const fetchForCourse = async (
        cId: string,
        courseMeta?: { title?: string; category?: string; thumbnailUrl?: string }
      ): Promise<PracticeTestSummary[]> => {
        if (!cId || !isUuid(cId)) return [];

        // 1. Primary endpoint: GET /api/quizzes/course/{courseId}/practice-tests
        try {
          const res: any = await apiClient.get(`/quizzes/course/${cId}/practice-tests`);
          const payload = res?.data ?? res;
          const list = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.content)
            ? payload.content
            : Array.isArray(payload?.items)
            ? payload.items
            : payload?.id
            ? [payload]
            : [];

          // Primary endpoint succeeded — map results and return without redundant fallback
          return list
            .map((item: any) => {
              const mapped = normalizeSummary(item, cId);
              if (mapped && courseMeta) {
                if (!mapped.category || mapped.category === "Practice Assessment") {
                  mapped.category = courseMeta.title || courseMeta.category || mapped.category;
                }
                if (courseMeta.thumbnailUrl && mapped.thumbnail === THUMB) {
                  mapped.thumbnail = courseMeta.thumbnailUrl;
                }
              }
              return mapped;
            })
            .filter(Boolean) as PracticeTestSummary[];
        } catch (err: any) {
          // Only if 404 (endpoint not supported), try fallback
          if (err?.response?.status === 404) {
            try {
              const res: any = await apiClient.get(`/quizzes/course/${cId}`);
              const payload = res?.data ?? res;
              const list = Array.isArray(payload)
                ? payload
                : Array.isArray(payload?.content)
                ? payload.content
                : Array.isArray(payload?.items)
                ? payload.items
                : payload?.id
                ? [payload]
                : [];

              return list
                .map((item: any) => {
                  const mapped = normalizeSummary(item, cId);
                  if (mapped && courseMeta) {
                    if (!mapped.category || mapped.category === "Practice Assessment") {
                      mapped.category = courseMeta.title || courseMeta.category || mapped.category;
                    }
                    if (courseMeta.thumbnailUrl && mapped.thumbnail === THUMB) {
                      mapped.thumbnail = courseMeta.thumbnailUrl;
                    }
                  }
                  return mapped;
                })
                .filter(Boolean) as PracticeTestSummary[];
            } catch {
              /* ignore fallback error */
            }
          }
        }

        return [];
      };

      // If specific courseId is requested, fetch directly for that course
      if (courseId) {
        const tests = await fetchForCourse(courseId);
        if (tests.length > 0) {
          return await enrichTestsWithAverages(tests, studentId);
        }
      }

      // If no courseId specified, fetch tests across all student enrolled courses
      try {
        const enrollmentsRes = await enrollmentService.getMyEnrollments().catch(() => null);
        const enrollments: any[] =
          (enrollmentsRes as any)?.data ||
          (Array.isArray(enrollmentsRes) ? enrollmentsRes : []);

        if (enrollments && enrollments.length > 0) {
          const results = await Promise.allSettled(
            enrollments.map((en: any) => {
              const cId = String(en.courseId || en.id || en.course?.id || "");
              const courseMeta = {
                title: en.title || en.course?.title || en.courseTitle,
                category: en.category || en.course?.category,
                thumbnailUrl: en.thumbnailUrl || en.thumbnail || en.course?.thumbnail,
              };
              return fetchForCourse(cId, courseMeta);
            })
          );

          const allTests: PracticeTestSummary[] = [];
          const seen = new Set<string>();

          for (const r of results) {
            if (r.status === "fulfilled" && Array.isArray(r.value)) {
              for (const t of r.value) {
                const key = String(t.id);
                if (key && !seen.has(key)) {
                  seen.add(key);
                  allTests.push(t);
                }
              }
            }
          }

          if (allTests.length > 0) {
            return await enrichTestsWithAverages(allTests, studentId);
          }
        }
      } catch {
        /* ignore */
      }

      // Fallback: Check global practice tests endpoints if available
      try {
        const res: any = await apiClient.get("/quizzes/practice-tests").catch(() => null);
        const payload = res?.data ?? res;
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.content)
          ? payload.content
          : Array.isArray(payload?.items)
          ? payload.items
          : [];
        if (list.length > 0) {
          const normalized = list.map((item: any) => normalizeSummary(item)).filter(Boolean) as PracticeTestSummary[];
          if (normalized.length > 0) {
            return await enrichTestsWithAverages(normalized, studentId);
          }
        }
      } catch {
        /* ignore */
      }

      return await enrichTestsWithAverages(DEFAULT_TESTS, studentId);
    });
  },

  /** GET Student Practice Test Average (GET /api/quizzes/student/{studentId}/course/{courseId}/practice-test/average) */
  async getStudentPracticeTestAverage(
    courseId: string,
    studentId?: string
  ): Promise<number | null> {
    if (!isUuid(courseId)) return null;
    let resolvedStudentId = studentId;
    if (!resolvedStudentId || !isUuid(resolvedStudentId)) {
      resolvedStudentId = (await resolveCurrentStudentId()) || undefined;
    }
    if (!resolvedStudentId || !isUuid(resolvedStudentId)) return null;

    const dedupKey = `getStudentPracticeTestAverage_${resolvedStudentId}_${courseId}`;
    return dedupRequest(dedupKey, async () => {
      try {
        const res = await quizService.getPracticeTestAverage(resolvedStudentId!, courseId);
        if (res && res.averagePercentage != null && !isNaN(Number(res.averagePercentage))) {
          return Number(res.averagePercentage);
        }
      } catch {
        /* ignore */
      }
      return null;
    });
  },

  /** GET Practice Test details */
  async getPracticeTestDetails(testId: string | number, studentId?: string): Promise<PracticeTestDetails> {
    const strId = String(testId).trim();
    const dedupKey = `getPracticeTestDetails_${strId}_${studentId || "curr"}`;

    return dedupRequest(dedupKey, async () => {
      if (isUuid(strId)) {
        try {
          const q = await quizService.getQuiz(strId);
          if (q) {
            let resolvedCourseTitle = String(
              (q as any).courseTitle ||
              (q as any).courseName ||
              (q as any).course?.title ||
              (q as any).course?.name ||
              ""
            ).trim();

            if (!resolvedCourseTitle && q.courseId) {
              try {
                const courseRes: any = await coursesService.getCourse(q.courseId).catch(() => null);
                const cData = courseRes?.data ?? courseRes;
                if (cData?.title) {
                  resolvedCourseTitle = cData.title;
                }
              } catch {}
            }

            let avgScore = q.avgScore || 0;
            if (q.courseId && isUuid(q.courseId)) {
              const fetchedAvg = await this.getStudentPracticeTestAverage(String(q.courseId), studentId);
              if (fetchedAvg !== null && !isNaN(fetchedAvg)) {
                avgScore = Math.round(fetchedAvg);
              }
            }

            return {
              id: q.id,
              courseId: q.courseId || "",
              title: q.title,
              courseTitle: resolvedCourseTitle || undefined,
              courseName: resolvedCourseTitle || undefined,
              description: q.description || "Final practice assessment",
              thumbnail: (q as any).thumbnail || (q as any).thumbnailUrl || THUMB,
              passPercentage: q.passingPercentage || 50,
              questionCount: q.questionCount || (q.questions ? q.questions.length : 10),
              durationMinutes: q.durationMinutes || 45,
              averageScore: avgScore,
              maxAttempts: q.maxAttempts || 3,
              category: resolvedCourseTitle || (q as any).category || "Practice Assessment",
              difficulty: (q as any).difficulty || "Intermediate",
              status: q.status || "PUBLISHED",
              totalPoints: (q.questionCount || (q.questions ? q.questions.length : 10)) * 5,
            };
          }
        } catch {
          /* ignore network / missing quiz */
        }
      }

      const tests = await this.getPracticeTests(undefined, studentId);
      const match = tests.find((t) => String(t.id) === strId) || tests[0];
      if (match) {
        let resolvedCourseTitle = match.courseTitle || match.courseName || (match.category !== "Practice Assessment" ? match.category : "");
        if (!resolvedCourseTitle && match.courseId) {
          try {
            const courseRes: any = await coursesService.getCourse(String(match.courseId)).catch(() => null);
            const cData = courseRes?.data ?? courseRes;
            if (cData?.title) {
              resolvedCourseTitle = cData.title;
            }
          } catch {}
        }

        let avgScore = match.averageScore || 0;
        if (match.courseId && isUuid(match.courseId)) {
          const fetchedAvg = await this.getStudentPracticeTestAverage(String(match.courseId), studentId);
          if (fetchedAvg !== null && !isNaN(fetchedAvg)) {
            avgScore = Math.round(fetchedAvg);
          }
        }

        return {
          ...match,
          averageScore: avgScore,
          courseTitle: resolvedCourseTitle || match.courseTitle || undefined,
          courseName: resolvedCourseTitle || match.courseName || undefined,
          category: resolvedCourseTitle || match.category,
          totalPoints: (match.questionCount || 10) * 5,
        };
      }

      return {
        id: strId,
        courseId: "",
        title: "Practice Test",
        description: "Practice Assessment",
        thumbnail: THUMB,
        passPercentage: 50,
        questionCount: 10,
        durationMinutes: 45,
        averageScore: 0,
        maxAttempts: 3,
        category: "Practice Assessment",
        difficulty: "Intermediate",
        status: "PUBLISHED",
        totalPoints: 50,
      };
    });
  },

  /** GET History API: /api/quizzes/{quiz_id}/attempts/history (only if quiz_id is a valid UUID) */
  async getAttemptHistory(testId: string | number): Promise<AttemptHistoryItem[]> {
    const strId = String(testId).trim();
    const dedupKey = `getAttemptHistory_${strId}`;

    return dedupRequest(dedupKey, async () => {
      if (isUuid(strId)) {
        try {
          const history = await quizService.getAttemptHistory(strId);
          if (Array.isArray(history)) {
            const mapped: AttemptHistoryItem[] = history.map((item) => ({
              attemptId: item.attemptId,
              attemptDate: item.submittedAt || item.startedAt || new Date().toISOString(),
              scorePercentage: Math.round(Number(item.percentage ?? item.score ?? 0)),
              status: item.passed || item.status === "PASS" || item.status === "Passed" ? "PASS" : "FAIL",
              attemptNumber: item.attemptNumber,
              score: item.score,
              maxScore: item.maxScore,
            }));
            writeLS(LS_HISTORY_PREFIX + strId, mapped);
            return mapped;
          }
        } catch {
          /* Fallback to local storage if API error */
        }
      }

      const persisted = readLS<AttemptHistoryItem[]>(LS_HISTORY_PREFIX + strId);
      if (persisted && persisted.length > 0) return persisted;

      return [];
    });
  },

  /** Start Attempt API: POST /api/quizzes/{quiz_id}/attempts (only if quiz_id is a valid UUID) */
  async startAttempt(testId: string | number): Promise<AttemptState> {
    const strId = String(testId).trim();
    let attemptId = `att_${strId}_${Date.now()}`;
    let quizDetails: PracticeTestDetails;

    try {
      quizDetails = await this.getPracticeTestDetails(strId);
    } catch {
      quizDetails = {
        id: strId,
        courseId: "",
        title: "Practice Test",
        description: "Practice Assessment",
        thumbnail: THUMB,
        passPercentage: 50,
        questionCount: 10,
        durationMinutes: 45,
        averageScore: 0,
        maxAttempts: 3,
        totalPoints: 50,
      };
    }

    let rawQuestions: any[] = [];

    if (isUuid(strId)) {
      try {
        const apiAttempt = await quizService.startAttempt(strId);
        if (apiAttempt?.attemptId) {
          attemptId = apiAttempt.attemptId;
        }
      } catch {
        /* ignore attempt create error if endpoint falls back */
      }
    }

    if (isUuid(attemptId)) {
      try {
        const res = await apiClient.get(`/quizzes/attempts/${attemptId}/questions`);
        const payload = res?.data ?? res;
        rawQuestions = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.content)
          ? payload.content
          : Array.isArray(payload?.questions)
          ? payload.questions
          : [];
      } catch {
        try {
          rawQuestions = await quizService.getAttemptQuestions(attemptId);
        } catch {
          /* ignore */
        }
      }
    }

    const now = new Date().toISOString();

    const questions = (rawQuestions && rawQuestions.length > 0 ? rawQuestions : []).map(
      (q, idx) => normalizePracticeQuestion(q, idx)
    );

    const state: AttemptState = {
      attemptId,
      testId,
      testTitle: quizDetails.title,
      status: "IN_PROGRESS",
      startedAt: now,
      durationMinutes: quizDetails.durationMinutes || 45,
      serverNow: now,
      questions,
      answers: questions.map((q) => ({
        questionId: q.id,
        attemptQuestionId: q.attemptQuestionId,
        selectedOptionId: null,
        selectedAnswers: [],
      })),
    };

    writeLS(LS_ATTEMPT_PREFIX + attemptId, state);
    return state;
  },

  /** GET Attempt State */
  async getAttempt(attemptId: string): Promise<AttemptState> {
    const dedupKey = `getAttempt_${attemptId}`;
    return dedupRequest(dedupKey, async () => {
      const state = readLS<AttemptState>(LS_ATTEMPT_PREFIX + attemptId);
      if (state && state.questions && state.questions.length > 0) {
        return { ...state, serverNow: new Date().toISOString() };
      }

      if (isUuid(attemptId)) {
        try {
          let rawQuestions: any[] = [];
          try {
            const res = await apiClient.get(`/quizzes/attempts/${attemptId}/questions`);
            const payload = res?.data ?? res;
            rawQuestions = Array.isArray(payload)
              ? payload
              : Array.isArray(payload?.content)
              ? payload.content
              : Array.isArray(payload?.questions)
              ? payload.questions
              : [];
          } catch {
            rawQuestions = await quizService.getAttemptQuestions(attemptId);
          }

          const now = new Date().toISOString();
          const questions = (rawQuestions || []).map((q, idx) =>
            normalizePracticeQuestion(q, idx)
          );

          const newState: AttemptState = {
            attemptId,
            testId: state?.testId || "a96366b5-67d1-4a4c-a7f9-1a624c96d1e7",
            testTitle: state?.testTitle || "Practice Assessment",
            status: "IN_PROGRESS",
            startedAt: state?.startedAt || now,
            durationMinutes: state?.durationMinutes || 45,
            serverNow: now,
            questions,
            answers: questions.map((q) => {
              const existing = state?.answers?.find(
                (a) =>
                  String(a.questionId) === String(q.id) ||
                  a.attemptQuestionId === q.attemptQuestionId
              );
              return {
                questionId: q.id,
                attemptQuestionId: q.attemptQuestionId,
                selectedOptionId: existing?.selectedOptionId || null,
                selectedAnswers: existing?.selectedAnswers || [],
              };
            }),
          };

          writeLS(LS_ATTEMPT_PREFIX + attemptId, newState);
          return newState;
        } catch {
          /* ignore */
        }
      }

      if (state) {
        return { ...state, serverNow: new Date().toISOString() };
      }

      throw new Error("Attempt not found");
    });
  },

  /** Save student answer locally for session state */
  saveAnswer(attemptId: string, questionId: string | number, selectedOptionId: string | null, selectedAnswers?: string[]) {
    const state = readLS<AttemptState>(LS_ATTEMPT_PREFIX + attemptId);
    if (!state) return;
    state.answers = state.answers.map((a) => {
      if (
        String(a.questionId) === String(questionId) ||
        a.attemptQuestionId === String(questionId)
      ) {
        const finalAnswers =
          selectedAnswers !== undefined
            ? selectedAnswers
            : selectedOptionId
            ? [selectedOptionId]
            : [];
        return {
          ...a,
          selectedOptionId: finalAnswers[0] || null,
          selectedAnswers: finalAnswers,
        };
      }
      return a;
    });
    writeLS(LS_ATTEMPT_PREFIX + attemptId, state);
  },

  /** Submit API: POST /api/quizzes/attempts/{attempt_id}/submit */
  async submitAssessment(attemptId: string): Promise<PracticeTestResult> {
    const state = readLS<AttemptState>(LS_ATTEMPT_PREFIX + attemptId);

    const answersPayload = (state?.answers || []).map((a, idx) => {
      const q = state?.questions?.[idx];
      const attemptQuestionId = a.attemptQuestionId || q?.attemptQuestionId || `q-${idx + 1}`;
      const selectedAnswers =
        a.selectedAnswers && a.selectedAnswers.length > 0
          ? a.selectedAnswers
          : a.selectedOptionId
          ? [a.selectedOptionId]
          : [];
      return {
        attemptQuestionId,
        selectedAnswers,
      };
    });

    if (isUuid(attemptId)) {
      try {
        const apiResult = await quizService.submitNewAttempt(attemptId, answersPayload);
        const reviewItems = await this.getAttemptReview(attemptId).catch(() => []);
        const targetTestId = apiResult.quizId || state?.testId || "";
        const details = targetTestId ? await this.getPracticeTestDetails(targetTestId).catch(() => null) : null;
        const passPercentage = details?.passPercentage ?? 50;
        const passed = apiResult.passed ?? (apiResult.percentage >= passPercentage);

        const resolvedCourseTitle = details?.courseTitle || details?.courseName || (details?.category !== "Practice Assessment" ? details?.category : undefined);

        const result: PracticeTestResult = {
          attemptId,
          testId: targetTestId,
          testTitle: details?.title || state?.testTitle || "Practice Assessment",
          scorePercentage: Math.round(Number(apiResult.percentage ?? 0)),
          correctCount: apiResult.correctCount,
          wrongCount: Math.max(0, apiResult.totalQuestions - apiResult.correctCount),
          unansweredCount: reviewItems.filter((r) => r.selectedOptionId == null).length,
          totalQuestions: apiResult.totalQuestions,
          totalPoints: apiResult.maxScore || apiResult.totalQuestions * 5,
          earnedPoints: apiResult.score,
          timeTakenSeconds: 300,
          passed,
          performanceInsight: passed
            ? "Your results show excellent progress and a high level of subject mastery. You successfully answered most questions while maintaining a strong accuracy rate."
            : "Your attempt indicates room for improvement. Revisit the core concepts, focus on the questions you missed, and retake the assessment to strengthen your understanding.",
          review: reviewItems,
          courseId: details?.courseId ? String(details.courseId) : undefined,
          courseTitle: resolvedCourseTitle,
          courseName: resolvedCourseTitle,
          passPercentage,
        };

        if (state) {
          writeLS(LS_ATTEMPT_PREFIX + attemptId, { ...state, status: "COMPLETED" });
        }
        writeLS("edvanz.pt.result." + attemptId, result);

        if (result.testId) {
          const histKey = LS_HISTORY_PREFIX + result.testId;
          const hist = readLS<AttemptHistoryItem[]>(histKey) ?? [];
          hist.unshift({
            attemptId,
            attemptDate: new Date().toISOString().slice(0, 10),
            scorePercentage: result.scorePercentage,
            status: result.passed ? "PASS" : "FAIL",
          });
          writeLS(histKey, hist);
        }

        return result;
      } catch {
        /* Fallback for evaluation if backend submit endpoint fails */
      }
    }

    if (!state) throw new Error("Attempt not found");

    const details = state.testId ? await this.getPracticeTestDetails(state.testId).catch(() => null) : null;
    const passPercentage = details?.passPercentage ?? 50;
    const resolvedCourseTitle = details?.courseTitle || details?.courseName || (details?.category !== "Practice Assessment" ? details?.category : undefined);

    const review: ReviewQuestion[] = state.questions.map((q) => {
      const ans = state.answers.find(
        (a) => String(a.questionId) === String(q.id) || a.attemptQuestionId === q.attemptQuestionId
      );
      const correctOptionId = "A";
      return {
        ...q,
        correctOptionId,
        selectedOptionId: ans?.selectedOptionId ?? null,
        isCorrect: ans?.selectedOptionId === correctOptionId,
        explanation: "Correct answer choice explanation.",
      };
    });

    const correct = review.filter((r) => r.selectedOptionId === r.correctOptionId).length;
    const unanswered = review.filter((r) => r.selectedOptionId == null).length;
    const wrong = review.length - correct - unanswered;
    const totalPoints = review.reduce((s, r) => s + r.points, 0);
    const earnedPoints = correct * 5;
    const scorePercentage = Math.round((earnedPoints / Math.max(1, totalPoints)) * 100);
    const passed = scorePercentage >= passPercentage;

    const fallbackResult: PracticeTestResult = {
      attemptId,
      testId: state.testId,
      testTitle: details?.title || state.testTitle,
      scorePercentage,
      correctCount: correct,
      wrongCount: wrong,
      unansweredCount: unanswered,
      totalQuestions: review.length,
      totalPoints,
      earnedPoints,
      timeTakenSeconds: 300,
      passed,
      performanceInsight: passed
        ? "Your results show excellent progress and a high level of subject mastery."
        : "Your attempt indicates room for improvement. Revisit the core concepts and retake the test.",
      review,
      courseId: details?.courseId ? String(details.courseId) : undefined,
      courseTitle: resolvedCourseTitle,
      courseName: resolvedCourseTitle,
      passPercentage,
    };

    writeLS(LS_ATTEMPT_PREFIX + attemptId, { ...state, status: "COMPLETED" });
    writeLS("edvanz.pt.result." + attemptId, fallbackResult);

    if (state.testId) {
      const histKey = LS_HISTORY_PREFIX + state.testId;
      const hist = readLS<AttemptHistoryItem[]>(histKey) ?? [];
      hist.unshift({
        attemptId,
        attemptDate: new Date().toISOString().slice(0, 10),
        scorePercentage,
        status: passed ? "PASS" : "FAIL",
      });
      writeLS(histKey, hist);
    }

    return fallbackResult;
  },

  /** Result API: GET /api/quizzes/attempts/{attempt_id}/result (only if attempt_id is valid UUID) */
  async getResult(attemptId: string): Promise<PracticeTestResult> {
    const dedupKey = `getResult_${attemptId}`;
    return dedupRequest(dedupKey, async () => {
      if (isUuid(attemptId)) {
        try {
          const apiRes = await quizService.getResult(attemptId);
          const review = await this.getAttemptReview(attemptId).catch(() => []);
          const targetTestId = apiRes.quizId || "";
          const details = targetTestId ? await this.getPracticeTestDetails(targetTestId).catch(() => null) : null;
          const passPercentage = details?.passPercentage ?? 50;
          const passed = apiRes.passed ?? (apiRes.percentage >= passPercentage);
          const resolvedCourseTitle = details?.courseTitle || details?.courseName || (details?.category !== "Practice Assessment" ? details?.category : undefined);

          return {
            attemptId,
            testId: targetTestId,
            testTitle: details?.title || "Practice Assessment",
            scorePercentage: Math.round(Number(apiRes.percentage ?? 0)),
            correctCount: apiRes.correctCount,
            wrongCount: Math.max(0, apiRes.totalQuestions - apiRes.correctCount),
            unansweredCount: review.filter((r) => r.selectedOptionId == null).length,
            totalQuestions: apiRes.totalQuestions,
            totalPoints: apiRes.maxScore || apiRes.totalQuestions * 5,
            earnedPoints: apiRes.score,
            timeTakenSeconds: 300,
            passed,
            performanceInsight: passed
              ? "Your results show excellent progress and a high level of subject mastery. You successfully answered most questions while maintaining a strong accuracy rate."
              : "Your attempt indicates room for improvement. Revisit the core concepts and retake the assessment.",
            review,
            courseId: details?.courseId ? String(details.courseId) : undefined,
            courseTitle: resolvedCourseTitle,
            courseName: resolvedCourseTitle,
            passPercentage,
          };
        } catch {
          /* Fallback to local storage */
        }
      }

      const cached = readLS<PracticeTestResult>("edvanz.pt.result." + attemptId);
      if (!cached) throw new Error("Result not found");
      return cached;
    });
  },

  /** Review API: GET /api/quizzes/attempts/{attempt_id}/review (only if attempt_id is valid UUID) */
  async getAttemptReview(attemptId: string): Promise<ReviewQuestion[]> {
    const dedupKey = `getAttemptReview_${attemptId}`;
    return dedupRequest(dedupKey, async () => {
      if (isUuid(attemptId)) {
        try {
          const reviewItems = await quizService.getAttemptReview(attemptId);
          if (Array.isArray(reviewItems) && reviewItems.length > 0) {
            return reviewItems.map((item, idx) => ({
              id: item.attemptQuestionId || idx + 1,
              attemptQuestionId: item.attemptQuestionId,
              index: idx + 1,
              text: item.questionText,
              points: item.marks || 5,
              options: (item.options || []).map((o) => ({
                id: o.key || o.id || "",
                text: o.text || "",
              })),
              correctOptionId: item.correctAnswers?.[0] || "A",
              correctAnswers: item.correctAnswers,
              selectedOptionId: item.selectedAnswers?.[0] || null,
              selectedAnswers: item.selectedAnswers,
              isCorrect: item.correct,
              explanation: item.explanation || "Correct answer explanation.",
              wrongExplanation: item.correct ? undefined : "Option selected does not meet criteria.",
            }));
          }
        } catch {
          /* ignore */
        }
      }

      const cachedResult = readLS<PracticeTestResult>("edvanz.pt.result." + attemptId);
      if (cachedResult?.review) return cachedResult.review;
      return [];
    });
  },
};

export type PracticeTestService = typeof practiceTestService;
