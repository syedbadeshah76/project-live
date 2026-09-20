// ============= Course Progress Service =============
// Mock backed by localStorage. Backend endpoints expected:
//   GET  /api/courses/{courseId}/progress  -> { completedLessons, totalLessons, percentage }
//   POST /api/courses/{courseId}/lessons/{lessonId}/complete
import type { ApiResponse } from "@/types/api.types";

export interface CourseProgress {
  courseId: string;
  completedLessons: string[];
  totalLessons: number;
  percentage: number;
}

const KEY = "edvanz_course_progress_v1";
const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));

type Store = Record<string, Record<string, string[]>>; // userId -> courseId -> lessonIds

const load = (): Store => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
};
const save = (s: Store) => localStorage.setItem(KEY, JSON.stringify(s));

export const progressService = {
  async getProgress(userId: string, courseId: string, totalLessons: number): Promise<ApiResponse<CourseProgress>> {
    await delay();
    const store = load();
    const completed = store[userId]?.[courseId] ?? [];
    const percentage = totalLessons > 0 ? Math.round((completed.length / totalLessons) * 100) : 0;
    return {
      success: true,
      data: { courseId, completedLessons: completed, totalLessons, percentage },
    };
  },

  async markComplete(userId: string, courseId: string, lessonId: string): Promise<ApiResponse<string[]>> {
    await delay();
    const store = load();
    if (!store[userId]) store[userId] = {};
    const list = store[userId][courseId] ?? [];
    if (!list.includes(lessonId)) list.push(lessonId);
    store[userId][courseId] = list;
    save(store);
    return { success: true, data: list };
  },
};
