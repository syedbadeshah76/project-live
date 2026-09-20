// src/services/liveClassService.ts
import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api.types";
import type {
  CreateLiveClassReq,
  LiveClassItem,
  InstructorDashboardLiveClassesResponse,
  AdminLiveClassesDashboardResponse,
  StartLiveClassResponse,
} from "@/types/liveClass";

/** Helper to extract data unwrapped from ApiResponse or raw response */
const unwrap = <T>(res: any): T => {
  if (res && typeof res === "object" && "data" in res && res.data !== undefined) {
    return res.data as T;
  }
  return res as T;
};

export const liveClassService = {
  /**
   * Instructor: Create Live Class
   * POST /api/live-classes
   */
  async createLiveClass(data: CreateLiveClassReq): Promise<LiveClassItem> {
    const res = await apiClient.post<any>("/live-classes", data);
    return unwrap<LiveClassItem>(res);
  },

  /**
   * Instructor: Get Dashboard Live Classes Stats & List
   * GET /api/live-classes/instructor-dashboard
   */
  async getInstructorDashboard(): Promise<InstructorDashboardLiveClassesResponse> {
    try {
      const res = await apiClient.get<any>("/live-classes/instructor-dashboard");
      return unwrap<InstructorDashboardLiveClassesResponse>(res);
    } catch (err) {
      // Fallback response shape if API error occurs
      return {
        totalClasses: 0,
        liveNow: 0,
        upcoming: 0,
        completed: 0,
        liveClasses: [],
      };
    }
  },

  /**
   * Admin: Get Live Classes Dashboard
   * GET /api/live-classes/admin-dashboard or GET /api/live-classes/pending
   */
  async getAdminDashboard(): Promise<AdminLiveClassesDashboardResponse> {
    try {
      const res = await apiClient.get<any>("/live-classes/admin-dashboard");
      return unwrap<AdminLiveClassesDashboardResponse>(res);
    } catch {
      try {
        const pendingRes = await apiClient.get<any>("/live-classes/pending");
        const list = unwrap<LiveClassItem[]>(pendingRes);
        return {
          totalRequests: list?.length || 0,
          pendingApproval: list?.length || 0,
          approved: 0,
          rejected: 0,
          liveClasses: Array.isArray(list) ? list : [],
        };
      } catch {
        return {
          totalRequests: 0,
          pendingApproval: 0,
          approved: 0,
          rejected: 0,
          liveClasses: [],
        };
      }
    }
  },

  /**
   * Admin: Get Review Detail for a specific Live Class
   * GET /api/live-classes/{id}/review
   */
  async getReviewDetails(id: string): Promise<LiveClassItem> {
    const res = await apiClient.get<any>(`/live-classes/${id}/review`);
    return unwrap<LiveClassItem>(res);
  },

  /**
   * Admin: Approve Live Class
   * POST /api/live-classes/{id}/approve
   */
  async approveLiveClass(id: string): Promise<LiveClassItem> {
    const res = await apiClient.post<any>(`/live-classes/${id}/approve`, {});
    return unwrap<LiveClassItem>(res);
  },

  /**
   * Admin: Reschedule & Approve Live Class (Date & Time change ONLY)
   * POST /api/live-classes/{id}/reschedule-approve
   */
  async rescheduleApproveLiveClass(id: string, scheduledAt: string): Promise<LiveClassItem> {
    const res = await apiClient.post<any>(`/live-classes/${id}/reschedule-approve`, {
      scheduledAt,
    });
    return unwrap<LiveClassItem>(res);
  },

  /**
   * Admin: Reject Live Class
   * POST /api/live-classes/{id}/reject
   */
  async rejectLiveClass(id: string, reason?: string): Promise<LiveClassItem> {
    const res = await apiClient.post<any>(`/live-classes/${id}/reject`, { reason });
    return unwrap<LiveClassItem>(res);
  },

  /**
   * Instructor: Start Live Class (Available 15 min before scheduled start time)
   * POST /api/live-classes/{id}/start
   */
  async startLiveClass(id: string): Promise<StartLiveClassResponse> {
    const res = await apiClient.post<any>(`/live-classes/${id}/start`, {});
    return unwrap<StartLiveClassResponse>(res);
  },

  /**
   * Student: Get Enrolled Live Courses
   * GET /api/student/my-courses?productType=LIVE_COURSE&page=0&size=10
   */
  async getStudentLiveCourses(page = 0, size = 10): Promise<any> {
    const res = await apiClient.get<any>("/student/my-courses", {
      params: { productType: "LIVE_COURSE", page, size },
    });
    return unwrap<any>(res);
  },

  /**
   * Student: Get Approved Live Classes for student's enrolled live courses
   * GET /api/student/live-classes
   */
  async getStudentLiveClasses(): Promise<any> {
    try {
      const res = await apiClient.get<any>("/student/live-classes");
      return unwrap<any>(res);
    } catch {
      return [];
    }
  },
};
