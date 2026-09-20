// ============= Course Resource Types =============
// Maps to Spring Boot endpoint GET /api/courses/{courseId}/resources

export type ResourceKind = "pdf" | "video" | "image" | "doc" | "zip" | "link" | "other";

export interface CourseResource {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  kind: ResourceKind;
  /** Public/signed URL */
  url: string;
  sizeBytes?: number;
  uploadedBy: string;
  uploadedAt: string;
  order: number;
}
