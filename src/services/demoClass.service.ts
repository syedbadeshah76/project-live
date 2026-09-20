// src/services/demoClass.service.ts
import { apiClient } from "@/lib/api-client";
import { liveCoursesService } from "@/services/liveCourses.service";
import { instructorsService } from "@/services/instructors.service";
import { profileService } from "@/services/profile.service";
import { meetingService } from "@/services/meeting.service";
import type {
  CreateDemoClassReq,
  DemoClassItem,
  BookDemoClassResponse,
  StartDemoClassResponse,
} from "@/types/demoClass";

const BASE = "/demo-classes";

/** Helper to extract data unwrapped from ApiResponse or raw response */
const unwrap = <T>(res: any): T => {
  if (res && typeof res === "object" && "data" in res && res.data !== undefined) {
    return res.data as T;
  }
  return res as T;
};

async function resolveMyInstructorIds(user: any): Promise<Set<string>> {
  const ids = new Set<string>();
  if (!user) return ids;

  if (user.id) ids.add(String(user.id).toLowerCase());
  if (user.email) ids.add(String(user.email).toLowerCase());

  try {
    const meRes: any = await instructorsService.getMyProfile().catch(() => null);
    const data = meRes?.data ?? meRes;
    if (data?.id) ids.add(String(data.id).toLowerCase());
    if (data?.userId) ids.add(String(data.userId).toLowerCase());
  } catch {
    /* non-fatal */
  }

  try {
    const profRes: any = await profileService.getProfile().catch(() => null);
    const data = profRes?.data ?? profRes;
    if (data?.id) ids.add(String(data.id).toLowerCase());
  } catch {
    /* non-fatal */
  }

  try {
    const list = await instructorsService.list().catch(() => []);
    const matched = list.filter(
      (i: any) =>
        (user.id &&
          (String(i.userId).toLowerCase() === String(user.id).toLowerCase() ||
            String(i.id).toLowerCase() === String(user.id).toLowerCase())) ||
        (user.email &&
          i.email &&
          String(i.email).toLowerCase() === String(user.email).toLowerCase())
    );
    matched.forEach((m: any) => {
      if (m.id) ids.add(String(m.id).toLowerCase());
      if (m.userId) ids.add(String(m.userId).toLowerCase());
    });
  } catch {
    /* non-fatal */
  }

  return ids;
}

export function parseDemoDate(dateVal: any): number | null {
  if (!dateVal) return null;
  if (typeof dateVal === "number") {
    return dateVal < 10000000000 ? dateVal * 1000 : dateVal;
  }
  if (Array.isArray(dateVal)) {
    const [y, m, d, h = 0, min = 0, s = 0] = dateVal;
    const localD = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), Number(s));
    return !isNaN(localD.getTime()) ? localD.getTime() : null;
  }
  if (typeof dateVal === "string") {
    const trimmed = dateVal.trim();
    if (!trimmed) return null;

    // Numeric epoch timestamp string
    if (/^\d{10,13}$/.test(trimmed)) {
      const num = Number(trimmed);
      return num < 10000000000 ? num * 1000 : num;
    }

    // Explicit timezone offset (+05:30, -04:00, Z)
    const hasExplicitTz = /[zZ]|([+-]\d{2}:?\d{2})$/.test(trimmed);
    if (hasExplicitTz) {
      const parsed = new Date(trimmed).getTime();
      if (!isNaN(parsed)) return parsed;
    }

    // Local ISO format: YYYY-MM-DD[T or space]HH:mm(:ss)?
    const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (match) {
      const [, y, m, d, h = "0", min = "0", s = "0"] = match;
      const localDate = new Date(
        Number(y),
        Number(m) - 1,
        Number(d),
        Number(h),
        Number(min),
        Number(s)
      );
      if (!isNaN(localDate.getTime())) {
        return localDate.getTime();
      }
    }

    const fallback = new Date(trimmed).getTime();
    if (!isNaN(fallback)) return fallback;
  }
  return null;
}

export const demoClassService = {
  /**
   * Instructor: Create Demo Live Class
   * POST /api/demo-classes
   */
  async createDemoClass(data: CreateDemoClassReq): Promise<DemoClassItem> {
    const res = await apiClient.post<any>(BASE, data);
    return unwrap<DemoClassItem>(res);
  },

  /**
   * Student: Book Demo Live Class
   * POST /api/demo-classes/{demoClassId}/book
   */
  async bookDemoClass(demoClassId: string): Promise<BookDemoClassResponse> {
    const res = await apiClient.post<any>(`${BASE}/${demoClassId}/book`, {});
    return unwrap<BookDemoClassResponse>(res);
  },

  /**
   * Student: Join Demo Live Class
   * GET /api/demo-classes/{demoClassId}/join
   */
  async joinDemoClass(demoClassId: string): Promise<any> {
    try {
      const res = await apiClient.get<any>(`${BASE}/${demoClassId}/join`);
      return unwrap<any>(res);
    } catch (err: any) {
      throw err;
    }
  },

  /**
   * Student: Get all booked & scheduled Live Demo Classes for the student dashboard
   */
  async getStudentBookedDemoClasses(_user?: any): Promise<DemoClassItem[]> {
    const bookedMap = new Map<string, DemoClassItem>();

    // 1. Read previously cached demo classes from localStorage
    try {
      const rawCached = localStorage.getItem("edvanz_cached_demo_classes");
      if (rawCached) {
        const parsed = JSON.parse(rawCached);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            if (item?.id) bookedMap.set(String(item.id), item);
          });
        }
      }
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("demo_classes_")) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              parsed.forEach((item: any) => {
                if (item?.id) bookedMap.set(String(item.id), item);
              });
            }
          }
        }
      }
    } catch {}

    const now = Date.now();
    const resultList = Array.from(bookedMap.values()).filter((d) => {
      const start = parseDemoDate(d.scheduledStartAt || (d as any).scheduledAt);
      if (!start) return true;
      const duration = (d.durationMinutes || 90) * 60 * 1000;
      const end = parseDemoDate(d.scheduledEndAt) || (start + duration);
      // Keep if session ends in future or ended within last 3 hours
      return end >= (now - 3 * 60 * 60 * 1000);
    });

    // Sort chronologically ascending
    resultList.sort((a, b) => {
      const tA = parseDemoDate(a.scheduledStartAt || (a as any).scheduledAt) || 0;
      const tB = parseDemoDate(b.scheduledStartAt || (b as any).scheduledAt) || 0;
      return tA - tB;
    });

    return resultList;
  },

  /**
   * Instructor / Admin: Delete Demo Live Class
   * DELETE /api/demo-classes/{demoClassId}
   */
  async deleteDemoClass(demoClassId: string): Promise<any> {
    const res = await apiClient.delete<any>(`${BASE}/${demoClassId}`);
    return unwrap<any>(res);
  },

  /**
   * Instructor: Start Demo Live Class
   * POST /api/demo-classes/{demoClassId}/start
   */
  async startDemoClass(demoClassId: string): Promise<StartDemoClassResponse> {
    const res = await apiClient.post<any>(`${BASE}/${demoClassId}/start`, {});
    return unwrap<StartDemoClassResponse>(res);
  },

  /**
   * Get Demo Live Class by ID
   * GET /api/demo-classes/{demoClassId}
   */
  async getDemoClass(demoClassId: string): Promise<DemoClassItem> {
    const res = await apiClient.get<any>(`${BASE}/${demoClassId}`);
    return unwrap<DemoClassItem>(res);
  },

  /**
   * Get Demo Live Classes for a specific live course
   * GET /api/demo-classes/course/{liveCourseId}
   */
  async getDemoClassesByCourse(liveCourseId: string): Promise<DemoClassItem[]> {
    try {
      const res = await apiClient.get<any>(`${BASE}/course/${liveCourseId}`);
      const list = unwrap<any>(res);
      if (Array.isArray(list)) return list;
      if (Array.isArray(list?.content)) return list.content;
      if (Array.isArray(list?.data)) return list.data;
      return [];
    } catch (err) {
      console.error(`Failed to get demo classes for course ${liveCourseId}:`, err);
      return [];
    }
  },

  /**
   * Get all Demo Live Classes for the instructor across all their Live Courses
   */
  async getInstructorDemoClasses(user: any): Promise<(DemoClassItem & { courseTitle?: string })[]> {
    try {
      const instructorCourses = await this.getInstructorLiveCourses(user);
      if (!instructorCourses || instructorCourses.length === 0) {
        return [];
      }

      const results = await Promise.allSettled(
        instructorCourses.map(async (c) => {
          const list = await this.getDemoClassesByCourse(c.id);
          return list.map((item) => ({
            ...item,
            courseTitle: c.title,
          }));
        })
      );

      const allDemoClasses: (DemoClassItem & { courseTitle?: string })[] = [];
      results.forEach((res) => {
        if (res.status === "fulfilled" && Array.isArray(res.value)) {
          allDemoClasses.push(...res.value);
        }
      });

      return allDemoClasses;
    } catch (err) {
      console.error("Failed to load instructor demo classes:", err);
      return [];
    }
  },

  /**
   * Get the instructor's own Live Courses for dropdown selection and fetching demo classes
   */
  async getInstructorLiveCourses(user: any): Promise<{ id: string; title: string }[]> {
    try {
      const myInstructorIds = await resolveMyInstructorIds(user);
      const liveRes: any = await liveCoursesService.list().catch(() => []);
      const rawList = Array.isArray(liveRes)
        ? liveRes
        : Array.isArray(liveRes?.content)
        ? liveRes.content
        : Array.isArray(liveRes?.data)
        ? liveRes.data
        : Array.isArray(liveRes?.liveCourses?.content)
        ? liveRes.liveCourses.content
        : [];

      const filtered = rawList.filter((course: any) => {
        const isLive =
          course.courseType === "LIVE" ||
          course.productType === "LIVE_COURSE" ||
          course.type === "LIVE" ||
          course.isLive ||
          course.liveCourseStatus != null ||
          course.schedule != null;

        if (!isLive) return false;

        const instId = String(course.instructorId || course.instructor?.id || "").toLowerCase();
        if (myInstructorIds.size > 0 && instId) {
          return myInstructorIds.has(instId);
        }
        if (user?.id && instId) {
          return instId === String(user.id).toLowerCase();
        }
        return false;
      });

      return filtered
        .map((c: any) => ({
          id: String(c.id || c.liveCourseId || ""),
          title: c.title || "Live Course",
        }))
        .filter((c: any) => !!c.id);
    } catch (e) {
      console.error("Failed to list live courses for instructor:", e);
      return [];
    }
  },
};
