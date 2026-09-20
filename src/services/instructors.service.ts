// ============================================================
// Instructors Service
// Backend: GET /api/users/instructors
// Response: [{ id, userId, firstName, lastName }]
//   - `id`         => instructor profile id (used by the admin dropdown)
//   - `userId`     => auth user id (the value /api/courses expects)
// ============================================================
import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/lib/api-client";

export interface InstructorDTO {
  id: string;          // instructor profile id
  userId: string;
  firstName: string;
  lastName: string;
  email?: string;
}

export interface InstructorOption {
  id: string;          // instructor profile id
  userId: string;
  name: string;
  email?: string;
}

export const instructorsService = {
  async list(): Promise<InstructorOption[]> {
    const res = await apiClient.get<ApiResponse<InstructorDTO[]> | InstructorDTO[]>(
      "/users/instructors"
    );
    const raw: any[] = Array.isArray(res) ? res : (res as any)?.data ?? [];
    return raw.map((i: any) => {
      const parsedName =
        i.name ||
        i.fullName ||
        `${(i.firstName || "").trim()} ${(i.lastName || "").trim()}`.trim();
      return {
        id: String(i.id ?? i.instructorId ?? ""),
        userId: String(i.userId ?? i.id ?? ""),
        name: parsedName || "Instructor",
        email: i.email,
      };
    });
  },
  // async getMyProfile(): Promise<any> {
  //   return apiClient.get("/users/instructors/me");
  // },
};
