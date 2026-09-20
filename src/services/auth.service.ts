// ============= Authentication Service =============
// Endpoints: POST /auth/login, POST /auth/register, POST /auth/logout,
//            GET /auth/me, POST /auth/refresh, POST /auth/forgot-password,
//            POST /auth/update-password, POST /auth/verify-email
//            GET  /admin/users/instructors/statistics
//            GET  /admin/users/instructors
//            GET  /admin/users/instructors/pending
//            GET  /admin/users/instructors/approved
//            GET  /admin/users/instructors/rejected
//            PATCH /admin/users/instructors/{userId}/approve
//            PATCH /admin/users/instructors/{userId}/reject
import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/lib/api-client";
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
  PasswordResetRequest,
  PasswordUpdateRequest,
  SendOtpRequest,
  VerifyOtpRequest,
  VerifyOtpResponse,
  RegisterUserRequest,
  MessageResponse,
  ResendOtpRequest,
} from "@/types/api.types";
import type { InstructorRegisterRequest } from "@/types/upload.types";
import type {
  InstructorApprovalResult,
  InstructorApprovalUser,
  InstructorStatistics,
} from "@/types/instructor-approval.types";
import { deriveInstructorStatus } from "@/lib/instructor-approval.utils";

const MOCK_MODE = false; // Set to false when backend is ready

const mockUsers: User[] = [
  {
    id: "1",
    name: "John Student",
    email: "student@Edvanz.com",
    role: "student",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    enrolledCourses: ["1", "2", "3"],
    completedCourses: ["4"],
    createdAt: "2024-01-15",
    updatedAt: "2024-01-15",
    isActive: true,
  },
  {
    id: "2",
    name: "Admin User",
    email: "admin@Edvanz.com",
    role: "admin",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    createdAt: "2023-06-01",
    updatedAt: "2023-06-01",
    isActive: true,
  },
  {
    id: "3",
    name: "Sarah Instructor",
    email: "instructor@Edvanz.com",
    role: "instructor",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    createdAt: "2023-08-15",
    updatedAt: "2023-08-15",
    isActive: true,
  },
];

/** The backend returns either a bare array, an { success, data } envelope, or a paged response. */
const unwrapList = <T>(payload: any): T[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.content && Array.isArray(payload.content)) return payload.content;
  if (
    payload.data &&
    payload.data.content &&
    Array.isArray(payload.data.content)
  ) {
    return payload.data.content;
  }
  return [];
};

const unwrapMessage = (
  payload:
    | InstructorApprovalResult
    | ApiResponse<InstructorApprovalResult>
    | null
    | undefined,
  fallback: string,
): InstructorApprovalResult => {
  if (!payload) return { message: fallback };
  if ("message" in payload && typeof payload.message === "string") {
    return { message: payload.message };
  }
  if ("data" in payload && payload.data?.message) {
    return { message: payload.data.message };
  }
  return { message: fallback };
};

/** Resolves Admin user ID from JWT token or session */
function resolveAdminUserId(): string {
  if (typeof window === "undefined") return "";

  // 1. Try decoding JWT token from localStorage "accessToken"
  try {
    const token = window.localStorage.getItem("accessToken");
    if (token && token.includes(".")) {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payloadStr = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
        const payload = JSON.parse(payloadStr);
        const uid = payload?.userId ?? payload?.sub ?? payload?.id;
        if (uid && typeof uid === "string" && !uid.includes("@")) return uid;
      }
    }
  } catch {
    /* ignore token decode errors */
  }

  // 2. Try Edvanz_user, user, or admin_user
  try {
    const raw =
      window.localStorage.getItem("Edvanz_user") ||
      window.localStorage.getItem("user") ||
      window.localStorage.getItem("admin_user");
    if (raw) {
      const parsed = JSON.parse(raw);
      const id = parsed?.id ?? parsed?.userId ?? parsed?.user?.id ?? "";
      if (id && typeof id === "string" && !id.includes("@")) return id;
    }
  } catch {
    /* ignore malformed storage */
  }

  return (
    window.localStorage.getItem("userId") ||
    window.localStorage.getItem("user_id") ||
    window.localStorage.getItem("admin_id") ||
    ""
  );
}

export const authService = {
  async login(
    credentials: LoginRequest,
  ): Promise<ApiResponse<MessageResponse>> {
    if (MOCK_MODE) {
      await new Promise((r) => setTimeout(r, 800));
      return {
        success: true,
        data: {
          message: "OTP sent successfully to your email",
        },
      };
    }

    return apiClient.post<ApiResponse<MessageResponse>>(
      "/auth/login",
      credentials,
    );
  },

  async register(reqData: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      "/auth/register",
      reqData,
    );
    if (response?.data?.accessToken) {
      localStorage.setItem("accessToken", response.data.accessToken);
      localStorage.setItem("refreshToken", response.data.refreshToken);
    }
    return response;
  },

  // POST /auth/send-otp
  async sendOtp(payload: SendOtpRequest): Promise<MessageResponse> {
    return apiClient.post<MessageResponse>("/auth/send-otp", payload);
  },

  // POST /auth/verify-otp
  async verifyLoginOtp(
    email: string,
    otp: string,
  ): Promise<ApiResponse<VerifyOtpResponse>> {
    const payload: VerifyOtpRequest = { email, otp };
    return apiClient.post<ApiResponse<VerifyOtpResponse>>(
      "/auth/verify-otp",
      payload,
    );
  },

  async verifyRegistrationOtp(
    email: string,
    code: string,
  ): Promise<ApiResponse<VerifyOtpResponse>> {
    const payload: VerifyOtpRequest = {
      email,
      code,
      purpose: "email_verification",
    };
    return apiClient.post<ApiResponse<VerifyOtpResponse>>(
      "/auth/verify-otp",
      payload,
    );
  },

  async verifyOtp(payload: VerifyOtpRequest): Promise<VerifyOtpResponse> {
    return apiClient.post<VerifyOtpResponse>("/auth/verify-otp", payload);
  },

  // POST /auth/register  (new Edvanz contract — separate from legacy `register`)
  async registerWithDetails(
    payload: RegisterUserRequest,
  ): Promise<MessageResponse> {
    return apiClient.post<MessageResponse>("/auth/register", payload);
  },

  async registerUser(
    payload: RegisterUserRequest,
  ): Promise<ApiResponse<AuthResponse>> {
    return apiClient.post<ApiResponse<AuthResponse>>(
      "/auth/register",
      payload,
    );
  },

  // POST /auth/register  (instructor contract — sends S3 file keys only)
  async registerInstructor(
    payload: InstructorRegisterRequest,
  ): Promise<MessageResponse> {
    return apiClient.post<MessageResponse>("/auth/register", payload);
  },

  // Post /auth/resend-otp
  async resendOtp(payload: ResendOtpRequest): Promise<MessageResponse> {
    return apiClient.post<MessageResponse>("/auth/resend-otp", payload);
  },
  // -------------------------------------------

  // ============= Admin · Instructor Approvals =============

  // GET /admin/users/instructors/statistics
  async getInstructorStatistics(): Promise<InstructorStatistics> {
    const response = await apiClient.get<
      InstructorStatistics | ApiResponse<InstructorStatistics>
    >("/admin/users/instructors/statistics");
    if (
      response &&
      "data" in response &&
      response.data &&
      typeof response.data === "object" &&
      !Array.isArray(response.data)
    ) {
      return response.data as InstructorStatistics;
    }
    return (response || {}) as InstructorStatistics;
  },

  // GET /admin/users/instructors?size=10
  async getAllInstructors(
    size: number = 10,
  ): Promise<InstructorApprovalUser[]> {
    const response = await apiClient.get(
      `/admin/users/instructors`,
    );
    const list = unwrapList<InstructorApprovalUser>(response);
    return list.map((item) => ({
      ...item,
      status: deriveInstructorStatus(item),
    }));
  },

  // GET /admin/users/instructors/pending
  async getPendingInstructors(): Promise<InstructorApprovalUser[]> {
    const response = await apiClient.get<
      InstructorApprovalUser[] | ApiResponse<InstructorApprovalUser[]>
    >("/admin/users/instructors/pending");
    const list = unwrapList<InstructorApprovalUser>(response);
    return list.map((item) => ({
      ...item,
      status: deriveInstructorStatus({ status: "PENDING", ...item }),
    }));
  },

  // GET /admin/users/instructors/approved?size=20
  async getApprovedInstructors(
    size: number = 20,
  ): Promise<InstructorApprovalUser[]> {
    const response = await apiClient.get(
      `/admin/users/instructors/approved?size=${size}`,
    );
    const list = unwrapList<InstructorApprovalUser>(response);
    return list.map((item) => ({
      ...item,
      status: deriveInstructorStatus({ status: "APPROVED", ...item }),
    }));
  },

  // GET /admin/users/instructors/rejected?size=20
  async getRejectedInstructors(
    size: number = 20,
  ): Promise<InstructorApprovalUser[]> {
    const response = await apiClient.get(
      `/admin/users/instructors/rejected?size=${size}`,
    );
    const list = unwrapList<InstructorApprovalUser>(response);
    return list.map((item) => ({
      ...item,
      status: deriveInstructorStatus({ status: "REJECTED", ...item }),
    }));
  },

  // PATCH /admin/users/instructors/{userId}/approve
  async approveInstructor(userId: string): Promise<InstructorApprovalResult> {
    // const adminUserId = resolveAdminUserId();
    const headers: Record<string, string> = {};
    // if (adminUserId) {
    //   headers["X-User-Id"] = adminUserId;
    // }

    const response = await apiClient.patch<
      InstructorApprovalResult | ApiResponse<InstructorApprovalResult>
    >(
      `/admin/users/instructors/${encodeURIComponent(userId)}/approve`,
      undefined,
      {
        headers,
      },
    );

    return unwrapMessage(response, "Instructor approved successfully");
  },

  // PATCH /admin/users/instructors/{userId}/reject
  async rejectInstructor(
    userId: string,
    rejectionNote: string = "Application rejected",
  ): Promise<InstructorApprovalResult> {
    // const adminUserId = resolveAdminUserId();
    const headers: Record<string, string> = {};
    // if (adminUserId) {
    //   headers["X-User-Id"] = adminUserId;
    // }

    const response = await apiClient.patch<
      InstructorApprovalResult | ApiResponse<InstructorApprovalResult>
    >(
      `/admin/users/instructors/${encodeURIComponent(userId)}/reject`,
      {
        rejectionNote,
      },
      {
        headers,
      },
    );

    return unwrapMessage(response, "Instructor rejected successfully");
  },

  // -------------------------------------------------------------

  async logout(): Promise<void> {
    if (MOCK_MODE) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      return;
    }
    try {
      await apiClient.post("/auth/logout");
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }
  },

  async getCurrentUser(): Promise<ApiResponse<User>> {
    if (MOCK_MODE) {
      await new Promise((r) => setTimeout(r, 300));
      const stored = localStorage.getItem("Edvanz_user");
      if (stored) return { success: true, data: JSON.parse(stored) as User };
      throw { success: false, message: "Not authenticated", statusCode: 401 };
    }

    return apiClient.get<ApiResponse<User>>("/auth/me");
  },

  async me(): Promise<User> {
    const response = await apiClient.get<User | ApiResponse<User>>("/auth/me");
    if ("data" in response && response.data) return response.data;
    return response as User;
  },

  async requestPasswordReset(
    reqData: PasswordResetRequest,
  ): Promise<ApiResponse<{ message: string }>> {
    if (MOCK_MODE) {
      await new Promise((r) => setTimeout(r, 500));
      return { success: true, data: { message: "Password reset email sent" } };
    }
    return apiClient.post<ApiResponse<{ message: string }>>(
      "/auth/forgot-password",
      reqData,
    );
  },

  async forgotPassword(
    payload: PasswordResetRequest,
  ): Promise<ApiResponse<MessageResponse>> {
    return apiClient.post<ApiResponse<MessageResponse>>(
      "/auth/forgot-password",
      payload,
    );
  },

  async resetPassword(
    payload: { token: string; newPassword: string },
  ): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post<ApiResponse<{ message: string }>>(
      "/auth/reset-password",
      payload,
    );
  },

  async updatePassword(
    reqData: PasswordUpdateRequest,
  ): Promise<ApiResponse<{ message: string }>> {
    if (MOCK_MODE) {
      await new Promise((r) => setTimeout(r, 500));
      return {
        success: true,
        data: { message: "Password updated successfully" },
      };
    }
    return apiClient.post<ApiResponse<{ message: string }>>(
      "/auth/update-password",
      reqData,
    );
  },

  async verifyEmail(token: string): Promise<ApiResponse<{ message: string }>> {
    if (MOCK_MODE) {
      await new Promise((r) => setTimeout(r, 500));
      return {
        success: true,
        data: { message: "Email verified successfully" },
      };
    }
    return apiClient.post<ApiResponse<{ message: string }>>(
      "/auth/verify-email",
      { token },
    );
  },
};

export { mockUsers };
