// ============= Q&A (Discussions) Service =============
// Backend contract (Spring Boot gateway) — from Postman:
//   POST   /discussions                                { courseId, lessonId?, title, content }
//   GET    /discussions?courseId={courseId}
//   GET    /discussions?courseId={courseId}&lessonId={lessonId}
//   GET    /discussions?courseId={courseId}&page=0&size=10&sort=createdAt,desc
//   PUT    /discussions/{discussionId}                 { title, content }
//   DELETE /discussions/{discussionId}
//   GET    /discussions/{discussionId}/replies
//   POST   /discussions/{discussionId}/replies         { content }
//   PUT    /discussions/replies/{replyId}              { content }
//   DELETE /discussions/replies/{replyId}
// apiClient baseURL already ends with /api → paths here are relative.

import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/lib/api-client";

export interface QnaAnswer {
  id: string;
  discussionId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole: "instructor" | "student";
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface QnaQuestion {
  id: string;
  courseId: string;
  courseName?: string;
  lessonId?: string;
  lessonTitle?: string;
  authorId: string;
  authorName: string;
  authorEmail?: string;
  authorAvatar?: string;
  authorRole: "instructor" | "student";
  title: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  repliesCount: number;
  answers: QnaAnswer[];
}

export interface QnaPage {
  items: QnaQuestion[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface InstructorQnaStats {
  total: number;
  answered: number;
  unanswered: number;
  avgResponseHours: number;
}

type Raw = Record<string, any>;

const unwrap = (res: any): any => {
  if (res == null) return res;
  if (typeof res === "object" && "data" in res && !Array.isArray(res)) {
    const inner = (res as Raw).data;
    if (inner && typeof inner === "object" && "content" in inner && Array.isArray(inner.content)) {
      return inner;
    }
    return inner !== undefined ? inner : res;
  }
  return res;
};

const toList = (res: any): Raw[] => {
  const body = unwrap(res);
  if (Array.isArray(body)) return body;
  if (!body || typeof body !== "object") return [];
  if (Array.isArray(body.content)) return body.content;
  if (Array.isArray(body.items)) return body.items;
  if (Array.isArray(body.discussions)) return body.discussions;
  if (Array.isArray(body.replies)) return body.replies;
  return [];
};

const str = (...vals: any[]): string => {
  for (const v of vals) {
    if (v !== undefined && v !== null && String(v).length > 0) return String(v);
  }
  return "";
};

const isoDate = (value: any): string => {
  if (!value) return new Date().toISOString();
  const raw = String(value);
  const normalized = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(raw)
    ? raw.replace(/(\.\d{3})\d+$/, "$1")
    : raw;
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

const roleOf = (raw: Raw): "instructor" | "student" => {
  const roleStr = String(
    raw.authorRole ?? raw.role ?? raw.userRole ?? raw.type ?? ""
  ).toUpperCase();
  if (
    roleStr.includes("INSTRUCT") ||
    roleStr.includes("TEACHER") ||
    Boolean(raw.instructorId || raw.instructor_id || raw.isInstructor)
  ) {
    return "instructor";
  }
  return "student";
};

const getAuthorName = (raw: Raw, defaultRole: "instructor" | "student"): string => {
  const candidate = str(
    raw.studentName,
    raw.student_name,
    raw.userName,
    raw.user_name,
    raw.authorName,
    raw.author_name,
    raw.instructorName,
    raw.instructor_name,
    raw.createdByName,
    raw.name,
    raw.fullName,
    raw.full_name,
    typeof raw.student === "object"
      ? raw.student?.name || raw.student?.fullName || raw.student?.studentName
      : undefined,
    typeof raw.user === "object"
      ? raw.user?.name || raw.user?.fullName || raw.user?.userName
      : undefined,
    typeof raw.author === "object"
      ? raw.author?.name || raw.author?.fullName || raw.author?.authorName
      : undefined,
  );

  if (candidate && candidate.trim().length > 0 && candidate !== "User" && candidate !== "Student") {
    return candidate.trim();
  }

  const obj =
    typeof raw.student === "object"
      ? raw.student
      : typeof raw.user === "object"
        ? raw.user
        : typeof raw.author === "object"
          ? raw.author
          : null;

  if (obj && (obj.firstName || obj.lastName)) {
    const combined = `${obj.firstName || ""} ${obj.lastName || ""}`.trim();
    if (combined) return combined;
  }

  if (raw.firstName || raw.lastName) {
    const combined = `${raw.firstName || ""} ${raw.lastName || ""}`.trim();
    if (combined) return combined;
  }

  return defaultRole === "instructor" ? "Instructor" : "Student";
};

const normalizeReply = (raw: Raw, discussionId: string): QnaAnswer => {
  const role = roleOf(raw);
  return {
    id: str(raw.id, raw.replyId, raw.discussionReplyId, `reply-${Math.random()}`),
    discussionId: str(raw.discussionId, discussionId),
    authorId: str(raw.instructorId, raw.userId, raw.authorId, raw.createdBy, raw.user?.id),
    authorName: getAuthorName(raw, role),
    authorAvatar: raw.userAvatar ?? raw.authorAvatar ?? raw.user?.avatarUrl ?? undefined,
    authorRole: role,
    content: str(raw.content, raw.text, raw.message),
    createdAt: isoDate(raw.createdAt ?? raw.createdDate),
    updatedAt: raw.updatedAt ? isoDate(raw.updatedAt) : undefined,
  };
};

const normalizeQuestion = (raw: Raw): QnaQuestion => {
  const id = str(raw.id, raw.discussionId, `disc-${Math.random()}`);
  const role = roleOf(raw);
  const rawReplies = Array.isArray(raw.replies)
    ? raw.replies
    : Array.isArray(raw.discussionReplies)
      ? raw.discussionReplies
      : Array.isArray(raw.answers)
        ? raw.answers
        : [];
  const answers = rawReplies.map((r: Raw) => normalizeReply(r, id));
  return {
    id,
    courseId: str(raw.courseId, raw.course?.id),
    courseName: raw.courseName ?? raw.course?.title ?? undefined,
    lessonId: raw.lessonId ? str(raw.lessonId) : undefined,
    lessonTitle: raw.lessonTitle ?? raw.lesson?.title ?? undefined,
    authorId: str(raw.userId, raw.studentId, raw.authorId, raw.createdBy, raw.user?.id),
    authorName: getAuthorName(raw, role),
    authorEmail: raw.userEmail ?? raw.authorEmail ?? raw.studentEmail ?? raw.user?.email ?? undefined,
    authorAvatar: raw.userAvatar ?? raw.authorAvatar ?? raw.studentAvatar ?? raw.user?.avatarUrl ?? undefined,
    authorRole: role,
    title: str(raw.title, raw.subject, "Question"),
    content: str(raw.content, raw.body, raw.message),
    createdAt: isoDate(raw.createdAt ?? raw.createdDate ?? raw.askedAt),
    updatedAt: raw.updatedAt ? isoDate(raw.updatedAt) : undefined,
    repliesCount: Number(raw.repliesCount ?? raw.replyCount ?? answers.length) || answers.length,
    answers,
  };
};

const buildQuery = (params: Record<string, string | number | undefined>) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length > 0) qs.append(k, String(v));
  });
  const s = qs.toString();
  return s ? `?${s}` : "";
};

const fail = (error: unknown, fallback: string): string => {
  const e = error as Raw;
  return (
    e?.response?.data?.message ??
    e?.response?.data?.error ??
    e?.message ??
    fallback
  );
};

export const qnaService = {
  async listByCourse(courseId: string): Promise<ApiResponse<QnaQuestion[]>> {
    if (!courseId || courseId.trim() === "") {
      return { success: true, data: [] };
    }
    try {
      const res = await apiClient.get<any>(`/discussions${buildQuery({ courseId })}`);
      const questions = toList(res).map(normalizeQuestion);

      const questionsWithReplies = await Promise.all(
        questions.map(async (q) => {
          if (q.answers && q.answers.length > 0) return q;
          try {
            const repliesRes = await apiClient.get<any>(`/discussions/${q.id}/replies`);
            const fetchedReplies = toList(repliesRes).map((r) => normalizeReply(r, q.id));
            if (fetchedReplies.length > 0) {
              return {
                ...q,
                answers: fetchedReplies,
                repliesCount: Math.max(q.repliesCount, fetchedReplies.length),
              };
            }
          } catch {
            /* optional reply endpoint fallback */
          }
          return q;
        })
      );

      return { success: true, data: questionsWithReplies };
    } catch (error) {
      return { success: false, data: [], message: fail(error, "Failed to load questions") };
    }
  },

  async listByLesson(courseId: string, lessonId: string): Promise<ApiResponse<QnaQuestion[]>> {
    try {
      const res = await apiClient.get<any>(`/discussions${buildQuery({ courseId, lessonId })}`);
      return { success: true, data: toList(res).map(normalizeQuestion) };
    } catch (error) {
      return { success: false, data: [], message: fail(error, "Failed to load lesson questions") };
    }
  },

  async listPaged(
    courseId: string,
    options: { page?: number; size?: number; sort?: string } = {},
  ): Promise<ApiResponse<QnaPage>> {
    const page = options.page ?? 0;
    const size = options.size ?? 10;
    const sort = options.sort ?? "createdAt,desc";
    const empty: QnaPage = {
      items: [],
      page,
      size,
      totalElements: 0,
      totalPages: 0,
      first: true,
      last: true,
    };
    try {
      const res = await apiClient.get<any>(
        `/discussions${buildQuery({ courseId, page, size, sort })}`,
      );
      const body = unwrap(res) ?? {};
      const items = toList(res).map(normalizeQuestion);
      const totalElements = Number(body.totalElements ?? items.length) || items.length;
      const totalPages = Number(body.totalPages ?? Math.ceil(totalElements / size)) || 1;
      return {
        success: true,
        data: {
          items,
          page: Number(body.number ?? page),
          size: Number(body.size ?? size),
          totalElements,
          totalPages,
          first: Boolean(body.first ?? page === 0),
          last: Boolean(body.last ?? page >= totalPages - 1),
        },
      };
    } catch (error) {
      return { success: false, data: empty, message: fail(error, "Failed to load questions") };
    }
  },

  async ask(
    courseId: string,
    payload: { title: string; content: string; lessonId?: string },
  ): Promise<ApiResponse<QnaQuestion>> {
    const res = await apiClient.post<any>(`/discussions`, {
      courseId,
      lessonId: payload.lessonId,
      title: payload.title,
      content: payload.content,
    });
    const body = unwrap(res);
    const created = normalizeQuestion(body && typeof body === "object" ? body : {});
    return {
      success: true,
      data: { ...created, courseId: created.courseId || courseId },
    };
  },

  async updateQuestion(
    discussionId: string,
    payload: { title: string; content: string },
  ): Promise<ApiResponse<QnaQuestion>> {
    const res = await apiClient.put<any>(`/discussions/${discussionId}`, {
      title: payload.title,
      content: payload.content,
    });
    const body = unwrap(res);
    return { success: true, data: normalizeQuestion(body && typeof body === "object" ? body : {}) };
  },

  async deleteQuestion(discussionId: string): Promise<ApiResponse<null>> {
    await apiClient.delete<any>(`/discussions/${discussionId}`);
    return { success: true, data: null };
  },

  async getReplies(discussionId: string): Promise<ApiResponse<QnaAnswer[]>> {
    try {
      const res = await apiClient.get<any>(`/discussions/${discussionId}/replies`);
      return { success: true, data: toList(res).map((r) => normalizeReply(r, discussionId)) };
    } catch (error) {
      return { success: false, data: [], message: fail(error, "Failed to load replies") };
    }
  },

  async answer(discussionId: string, content: string): Promise<ApiResponse<QnaAnswer>> {
    const res = await apiClient.post<any>(`/discussions/${discussionId}/replies`, { content });
    const body = unwrap(res);
    return {
      success: true,
      data: normalizeReply(body && typeof body === "object" ? body : { content }, discussionId),
    };
  },

  async updateReply(replyId: string, content: string): Promise<ApiResponse<QnaAnswer>> {
    const res = await apiClient.put<any>(`/discussions/replies/${replyId}`, { content });
    const body = unwrap(res);
    return { success: true, data: normalizeReply(body && typeof body === "object" ? body : {}, "") };
  },

  async deleteReply(replyId: string): Promise<ApiResponse<null>> {
    await apiClient.delete<any>(`/discussions/replies/${replyId}`);
    return { success: true, data: null };
  },

  async listByCourses(courseIds: string[]): Promise<ApiResponse<QnaQuestion[]>> {
    const validIds = courseIds.filter((id) => id && id.trim() !== "");
    if (validIds.length === 0) {
      return { success: true, data: [] };
    }
    const results = await Promise.all(
      validIds.map(async (id) => {
        const res = await qnaService.listByCourse(id);
        return res.data.map((q) => ({ ...q, courseId: q.courseId || id }));
      }),
    );
    const all = results
      .flat()
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return { success: true, data: all };
  },

  computeStats(questions: QnaQuestion[]): InstructorQnaStats {
    const answered = questions.filter((q) =>
      q.answers.some((a) => a.authorRole === "instructor"),
    ).length;
    const gaps = questions
      .map((q) => {
        const first = q.answers
          .filter((a) => a.authorRole === "instructor")
          .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))[0];
        return first
          ? Math.max(0, (+new Date(first.createdAt) - +new Date(q.createdAt)) / 3_600_000)
          : null;
      })
      .filter((v): v is number => v !== null);
    return {
      total: questions.length,
      answered,
      unanswered: questions.length - answered,
      avgResponseHours: gaps.length
        ? Number((gaps.reduce((s, v) => s + v, 0) / gaps.length).toFixed(1))
        : 0,
    };
  },
};
