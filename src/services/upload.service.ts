// ============= Upload Service =============
import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api.types";
import type {
  DirectUploadParams,
  PresignedUrlRequest,
  PresignedUrlResponse,
} from "@/types/upload.types";
import axios from "axios";
const MOCK_MODE = true;

export interface UploadedFile {
  id: string;
  name: string;
  originalName: string;
  type: "video" | "image" | "document" | "other";
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  duration?: number; // for videos in seconds
  width?: number;
  height?: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export const uploadService = {
  // Upload single file
  async uploadFile(
    file: File,
    type: "video" | "image" | "document" | "resource",
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<ApiResponse<UploadedFile>> {
    if (MOCK_MODE) {
      // Simulate upload progress
      const totalSize = file.size;
      let uploaded = 0;
      const chunkSize = totalSize / 10;

      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        uploaded += chunkSize;
        if (onProgress) {
          onProgress({
            loaded: Math.min(uploaded, totalSize),
            total: totalSize,
            percentage: Math.min(Math.round((uploaded / totalSize) * 100), 100),
          });
        }
      }

      const mockFile: UploadedFile = {
        id: `file-${Date.now()}`,
        name: `${Date.now()}-${file.name}`,
        originalName: file.name,
        type: type === "resource" ? "document" : type,
        mimeType: file.type,
        size: file.size,
        url: URL.createObjectURL(file),
        thumbnailUrl:
          type === "video" || type === "image"
            ? URL.createObjectURL(file)
            : undefined,
        duration: type === "video" ? 600 : undefined,
        uploadedAt: new Date().toISOString(),
        uploadedBy: "1",
      };

      return { success: true, data: mockFile };
    }

    return apiClient.uploadFile<ApiResponse<UploadedFile>>(
      `/uploads/${type}`,
      file,
      "file",
    );
  },
  /**
   * Step 1 — Ask backend for a presigned upload URL.
   * Used by Instructor Registration.
   */
  async getPresignedUrl(
    payload: PresignedUrlRequest,
  ): Promise<PresignedUrlResponse> {
    return apiClient.post<PresignedUrlResponse>(
      "/doc-uploads/presigned-url",
      payload,
    );
  },

  /**
   * Step 2 — Upload directly to AWS S3 using the presigned URL.
   * Used by Instructor Registration.
   */
  async uploadToPresignedUrl({
    presignedUrl,
    file,
    contentType,
    onProgress,
    signal,
  }: DirectUploadParams): Promise<void> {
    await axios.put(presignedUrl, file, {
      headers: {
        "Content-Type": contentType,
      },
      signal,
      timeout: 0,
      transformRequest: [(data: unknown) => data],
      onUploadProgress: (event) => {
        if (!onProgress) return;

        const total = event.total ?? file.size;
        if (!total) return;

        const percent = Math.min(100, Math.round((event.loaded * 100) / total));

        onProgress(percent);
      },
    });
  },

  // Upload multiple files
  async uploadMultiple(
    files: File[],
    type: "video" | "image" | "document" | "resource",
    onProgress?: (fileIndex: number, progress: UploadProgress) => void,
  ): Promise<ApiResponse<UploadedFile[]>> {
    const results: UploadedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const result = await this.uploadFile(files[i], type, (progress) => {
        if (onProgress) onProgress(i, progress);
      });
      if (result.success) {
        results.push(result.data);
      }
    }

    return { success: true, data: results };
  },

  // Get uploaded files
  async getFiles(
    type?: "video" | "image" | "document",
    pagination?: { page?: number; limit?: number },
  ): Promise<ApiResponse<UploadedFile[]>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return {
        success: true,
        data: [
          {
            id: "1",
            name: "sample-video.mp4",
            originalName: "Introduction.mp4",
            type: "video",
            mimeType: "video/mp4",
            size: 52428800,
            url: "https://example.com/videos/sample.mp4",
            thumbnailUrl:
              "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=200&h=120&fit=crop",
            duration: 600,
            uploadedAt: "2024-01-15T10:00:00Z",
            uploadedBy: "2",
          },
          {
            id: "2",
            name: "course-thumbnail.jpg",
            originalName: "thumbnail.jpg",
            type: "image",
            mimeType: "image/jpeg",
            size: 1048576,
            url: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=450&fit=crop",
            thumbnailUrl:
              "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=200&h=120&fit=crop",
            width: 800,
            height: 450,
            uploadedAt: "2024-01-14T15:30:00Z",
            uploadedBy: "2",
          },
        ],
      };
    }

    return apiClient.get<ApiResponse<UploadedFile[]>>("/uploads", {
      params: { type, ...pagination },
    });
  },

  // Delete file
  async deleteFile(fileId: string): Promise<ApiResponse<{ message: string }>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return { success: true, data: { message: "File deleted successfully" } };
    }

    return apiClient.delete<ApiResponse<{ message: string }>>(
      `/uploads/${fileId}`,
    );
  },

  // Get upload URL for large files (resumable uploads)
  async getUploadUrl(
    fileName: string,
    fileSize: number,
    mimeType: string,
  ): Promise<ApiResponse<{ uploadUrl: string; fileId: string }>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return {
        success: true,
        data: {
          uploadUrl: "/uploads/chunked",
          fileId: `file-${Date.now()}`,
        },
      };
    }

    return apiClient.post<ApiResponse<{ uploadUrl: string; fileId: string }>>(
      "/uploads/init",
      {
        fileName,
        fileSize,
        mimeType,
      },
    );
  },

  // Process video (transcode, generate thumbnails)
  async processVideo(
    fileId: string,
  ): Promise<ApiResponse<{ jobId: string; status: string }>> {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return {
        success: true,
        data: { jobId: `job-${Date.now()}`, status: "processing" },
      };
    }

    return apiClient.post<ApiResponse<{ jobId: string; status: string }>>(
      `/uploads/${fileId}/process`,
    );
  },

  // Get processing status
  async getProcessingStatus(jobId: string): Promise<
    ApiResponse<{
      status: "pending" | "processing" | "completed" | "failed";
      progress?: number;
      error?: string;
    }>
  > {
    if (MOCK_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return {
        success: true,
        data: { status: "completed" as const, progress: 100 },
      };
    }

    const response = await apiClient.get<
      ApiResponse<{ status: string; progress?: number; error?: string }>
    >(`/uploads/jobs/${jobId}`);
    return {
      ...response,
      data: {
        ...response.data,
        status: response.data.status as
          | "pending"
          | "processing"
          | "completed"
          | "failed",
      },
    };
  },
};
