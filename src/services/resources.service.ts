// ============= Course Resources Service =============
// Backend-ready: GET /api/courses/{courseId}/resources
import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api.types";
import type { CourseResource } from "@/types/resource.types";

export const resourcesService = {
  async getResourcesByCourse(_courseId: string, _courseName = "Course"): Promise<ApiResponse<CourseResource[]>> {
    return { success: true, data: [] };
  },

  async getAllForStudent(): Promise<ApiResponse<CourseResource[]>> {
    return { success: true, data: [] };
  },

  downloadResource(resource: CourseResource) {
    if (!resource?.url) return;
    // Triggers browser download for the given URL.
    const a = document.createElement("a");
    a.href = resource.url;
    a.download = resource.title;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },
};
