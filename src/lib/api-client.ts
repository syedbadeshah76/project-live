// ============= Axios API Client Configuration =============
// This file sets up Axios with interceptors for JWT auth.
// When connecting  Java Spring Boot backend, just change the BASE_URL
// and set MOCK_MODE = false in each service file.

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";
// console.log("API URL =", import.meta.env.VITE_API_URL);
// console.log("BASE_URL =", BASE_URL);

// Create Axios instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Request interceptor — attaches JWT token & Tenant ID to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    const tenantId =
      localStorage.getItem("tenantId") ||
      localStorage.getItem("tenant_id") ||
      "00000000-0000-0000-0000-000000000001";

    // If body is FormData, delete default Content-Type header so browser/Axios generates boundary automatically
    if (config.data instanceof FormData) {
      if (config.headers) {
        if (typeof (config.headers as any).delete === "function") {
          (config.headers as any).delete("Content-Type");
          (config.headers as any).delete("content-type");
        } else {
          delete (config.headers as any)["Content-Type"];
          delete (config.headers as any)["content-type"];
        }
      }
    }

    if (config.headers && typeof (config.headers as any).set === "function") {
      if (token) {
        (config.headers as any).set("Authorization", `Bearer ${token}`);
      }
      (config.headers as any).set("X-Tenant-Id", tenantId);
    } else {
      config.headers = config.headers || {};
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
      config.headers["X-Tenant-Id"] = tenantId;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor — unwraps AxiosResponse.data and handles 401/token refresh
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried, attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
            refreshToken,
          });
          const newToken = data?.data?.accessToken;
          if (newToken) {
            localStorage.setItem("accessToken", newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh failed — clear tokens and redirect to login
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("Edvanz_user");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

// Upload helper — builds FormData and posts with progress tracking
(api as any).uploadFile = async function <T = any>(
  url: string,
  file: File,
  fieldName = "file",
  onProgress?: (progress: number) => void,
): Promise<T> {
  const formData = new FormData();
  formData.append(fieldName, file);
  return this.post(url, formData, {
    onUploadProgress: onProgress
      ? (e: any) => onProgress(Math.round((e.loaded * 100) / (e.total || 1)))
      : undefined,
  });
};

// ============= Helper Types =============
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
  statusCode: number;
}

export function unwrapData<T>(response: unknown): T {
  if (
    response &&
    typeof response === "object" &&
    "success" in response &&
    "data" in response
  ) {
    return (response as any).data as T;
  }
  return response as T;
}

export function unwrapArray<T>(response: unknown): T[] {
  const data = unwrapData<unknown>(response);
  return Array.isArray(data) ? (data as T[]) : [];
}

export function extractAvatarUrl(source: any): string {
  if (!source || typeof source !== "object") return "";

  const check = (val: any): string | null =>
    typeof val === "string" && val.trim() && !val.startsWith("blob:")
      ? val.trim()
      : null;

  const direct =
    check(source.avatarUrl) ||
    check(source.avatar) ||
    check(source.profilePicture) ||
    check(source.profileImage) ||
    check(source.imageUrl);
  if (direct) return direct;

  if (source.profile && typeof source.profile === "object") {
    const nested =
      check(source.profile.avatarUrl) ||
      check(source.profile.avatar) ||
      check(source.profile.profilePicture) ||
      check(source.profile.profileImage) ||
      check(source.profile.imageUrl);
    if (nested) return nested;
  }

  if (source.instructor && typeof source.instructor === "object") {
    const instructorNested = extractAvatarUrl(source.instructor);
    if (instructorNested) return instructorNested;
  }

  if (source.instructorProfile && typeof source.instructorProfile === "object") {
    const instProfileNested = extractAvatarUrl(source.instructorProfile);
    if (instProfileNested) return instProfileNested;
  }

  if (source.user && typeof source.user === "object") {
    const userNested = extractAvatarUrl(source.user);
    if (userNested) return userNested;
  }

  if (source.data && typeof source.data === "object") {
    const dataNested = extractAvatarUrl(source.data);
    if (dataNested) return dataNested;
  }

  return "";
}

// Type-safe client that reflects the response interceptor unwrapping .data
interface ApiClient {
  get<T = any>(url: string, config?: any): Promise<T>;
  post<T = any>(url: string, data?: any, config?: any): Promise<T>;
  put<T = any>(url: string, data?: any, config?: any): Promise<T>;
  patch<T = any>(url: string, data?: any, config?: any): Promise<T>;
  delete<T = any>(url: string, config?: any): Promise<T>;
  uploadFile<T = any>(
    url: string,
    file: File,
    fieldName?: string,
    onProgress?: (progress: number) => void,
  ): Promise<T>;
}

const apiClient = api as unknown as ApiClient;
export { apiClient };
export default apiClient;

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
