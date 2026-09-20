// ============= Upload / Instructor Registration Types =============
// Endpoints:
//   POST /doc-uploads/presigned-url   → { presignedUrl, fileKey }
//   PUT  {presignedUrl}               → binary file (direct to AWS S3)

export type UploadType = "RESUME" | "INTRO_VIDEO";

export interface PresignedUrlRequest {
  fileName: string;
  uploadType: UploadType;
}

export interface PresignedUrlResponse {
  presignedUrl: string;
  fileKey: string;
}

export type UploadStatus =
  | "idle"
  | "requesting"
  | "uploading"
  | "success"
  | "error";

export interface DirectUploadParams {
  presignedUrl: string;
  file: File;
  contentType: string;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

/** Payload accepted by POST /auth/register for the INSTRUCTOR role. */
export interface InstructorRegisterRequest {
  email: string;
  role: "INSTRUCTOR";
  password: string;
  firstName: string;
  lastName: string;
  country: string;
  city: string;
  introVideoFileKey: string;
  resumeFileKey: string;
}
