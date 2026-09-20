// ============= Badges Service =============
// Backend-ready (Java Spring Boot). Endpoints expected:
//   GET    /api/student/badges
//   GET    /api/student/badges/:id
//   GET    /api/student/badges/:id/download
//   POST   /api/student/badges/:id/share        { platform }
//   POST   /api/badges/generate                  { courseId, courseTitle, completionDate }
//   GET    /api/badges/verify/:shareToken        (public, no auth)
//
// Spring entities:
//   course_badges(id, course_id, course_title, badge_template, created_at, updated_at)
//   student_badges(id, student_id, course_id, badge_image_url, earned_date, issued_at, share_token, status)
//
// CourseCompletedEvent (Spring application event) triggers generate() automatically
// when courseProgress reaches 100 AND finalQuiz passed (if enabled).
import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/lib/api-client";

const MOCK_MODE = true;

export type SharePlatform =
  | "linkedin"
  | "facebook"
  | "instagram"
  | "whatsapp"
  | "twitter"
  | "telegram"
  | "email"
  | "copy";

export interface StudentBadge {
  id: string;
  studentId: string;
  courseId: string;
  courseTitle: string;
  badgeImageUrl?: string; // backend-rendered PNG (optional — UI renders client-side too)
  earnedDate: string; // ISO date
  issuedAt: string; // ISO datetime
  shareToken: string;
  status: "issued" | "revoked";
}

const STORE_KEY = "edvanz_badges_v1";

const loadStore = (): StudentBadge[] => {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
  } catch {
    return [];
  }
};
const saveStore = (b: StudentBadge[]) =>
  localStorage.setItem(STORE_KEY, JSON.stringify(b));

const seed = (): StudentBadge[] => {
  const existing = loadStore();
  if (existing.length > 0) return existing;
  const initial: StudentBadge[] = [
    {
      id: "b-1",
      studentId: "1",
      courseId: "1",
      courseTitle: "Web Development",
      earnedDate: "2026-04-15",
      issuedAt: "2026-04-15T10:00:00Z",
      shareToken: "wd-2026-001",
      status: "issued",
    },
    {
      id: "b-2",
      studentId: "1",
      courseId: "2",
      courseTitle: "Python Programming",
      earnedDate: "2026-03-21",
      issuedAt: "2026-03-21T10:00:00Z",
      shareToken: "py-2026-002",
      status: "issued",
    },
  ];
  saveStore(initial);
  return initial;
};

const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));

export const badgesService = {
  async getMyBadges(): Promise<ApiResponse<StudentBadge[]>> {
    if (MOCK_MODE) {
      await wait();
      return { success: true, data: seed() };
    }
    return apiClient.get<ApiResponse<StudentBadge[]>>("/student/badges");
  },

  async getBadge(id: string): Promise<ApiResponse<StudentBadge>> {
    if (MOCK_MODE) {
      await wait();
      const b = seed().find((x) => x.id === id);
      if (!b) throw { success: false, message: "Badge not found", statusCode: 404 };
      return { success: true, data: b };
    }
    return apiClient.get<ApiResponse<StudentBadge>>(`/student/badges/${id}`);
  },

  async getBadgeByShareToken(
    token: string
  ): Promise<ApiResponse<StudentBadge & { holderName: string }>> {
    if (MOCK_MODE) {
      await wait();
      const b = seed().find((x) => x.shareToken === token);
      if (!b) throw { success: false, message: "Badge not found", statusCode: 404 };
      return { success: true, data: { ...b, holderName: "Dwyane J" } };
    }
    return apiClient.get<ApiResponse<StudentBadge & { holderName: string }>>(
      `/badges/verify/${token}`
    );
  },

  /**
   * Called by CoursePlayer when a course reaches 100 % AND the
   * final quiz is passed. On Spring Boot side a CourseCompletedEvent
   * fires badge generation server-side; this client call is a safe
   * idempotent fallback.
   */
  async generateBadge(input: {
    courseId: string;
    courseTitle: string;
    completionDate?: string;
  }): Promise<ApiResponse<StudentBadge>> {
    if (MOCK_MODE) {
      await wait(400);
      const all = seed();
      const existing = all.find((b) => b.courseId === input.courseId);
      if (existing) return { success: true, data: existing };
      const newBadge: StudentBadge = {
        id: `b-${Date.now()}`,
        studentId: "1",
        courseId: input.courseId,
        courseTitle: input.courseTitle,
        earnedDate: input.completionDate || new Date().toISOString().split("T")[0],
        issuedAt: new Date().toISOString(),
        shareToken: `${input.courseId}-${Date.now().toString(36)}`,
        status: "issued",
      };
      all.unshift(newBadge);
      saveStore(all);
      return { success: true, data: newBadge };
    }
    return apiClient.post<ApiResponse<StudentBadge>>("/badges/generate", input);
  },

  async share(
    id: string,
    platform: SharePlatform
  ): Promise<ApiResponse<{ shareUrl: string }>> {
    if (MOCK_MODE) {
      await wait(150);
      const b = seed().find((x) => x.id === id);
      const url = `${window.location.origin}/badge/${b?.shareToken}`;
      const caption = `🎉 I have successfully completed the ${b?.courseTitle} Course on EDVANZ LMS and earned my official skill badge.\n\n#EDVANZ #Learning #Upskilling`;
      let shareUrl = url;
      const enc = encodeURIComponent;
      switch (platform) {
        case "linkedin":
          shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`;
          break;
        case "facebook":
          shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`;
          break;
        case "twitter":
          shareUrl = `https://twitter.com/intent/tweet?text=${enc(caption)}&url=${enc(url)}`;
          break;
        case "whatsapp":
          shareUrl = `https://wa.me/?text=${enc(`${caption}\n${url}`)}`;
          break;
        case "telegram":
          shareUrl = `https://t.me/share/url?url=${enc(url)}&text=${enc(caption)}`;
          break;
        case "instagram":
          // Instagram has no web share — return the URL for copy
          shareUrl = url;
          break;
        case "email":
          shareUrl = `mailto:?subject=${enc("My EDVANZ Badge")}&body=${enc(`${caption}\n${url}`)}`;
          break;
        case "copy":
          shareUrl = url;
          break;
      }
      return { success: true, data: { shareUrl } };
    }
    return apiClient.post<ApiResponse<{ shareUrl: string }>>(
      `/student/badges/${id}/share`,
      { platform }
    );
  },
};
