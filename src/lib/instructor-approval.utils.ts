// ============= Instructor Approval Helpers =============
import type { InstructorApprovalUser } from "@/types/instructor-approval.types";

/** Backend can send null, the literal string "null", or an empty value. */
export const isUsableUrl = (url: string | null | undefined): url is string => {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (
    !trimmed ||
    trimmed.toLowerCase() === "null" ||
    trimmed.toLowerCase() === "undefined" ||
    trimmed.toLowerCase().endsWith("/null")
  ) {
    return false;
  }
  return true;
};

export const isValidMediaUrl = isUsableUrl;

/**
 * Extracts clean filename from S3 key or URL.
 * Strips UUID prefix if present.
 * Example: "00000000-.../03967d9b-d72d-448e-ace6-707ef5dbb87d_Nazma_Khanam_UpdatedResume.pdf"
 * Output: "Nazma_Khanam_UpdatedResume.pdf"
 */
export const extractResumeFilename = (
  fileKeyOrUrl: string | null | undefined,
  defaultName: string = "Resume.pdf",
): string => {
  if (!fileKeyOrUrl || typeof fileKeyOrUrl !== "string") return defaultName;
  const trimmed = fileKeyOrUrl.trim();
  if (!trimmed || trimmed.toLowerCase() === "null" || trimmed.toLowerCase() === "undefined") {
    return defaultName;
  }

  const parts = trimmed.split("/").filter(Boolean);
  let filename = parts.pop() || defaultName;

  if (filename.includes("?")) {
    filename = filename.split("?")[0];
  }

  try {
    filename = decodeURIComponent(filename);
  } catch {
    // Keep as is if decode fails
  }

  // Strip UUID prefix if present, e.g. "03967d9b-d72d-448e-ace6-707ef5dbb87d_Nazma_Khanam_UpdatedResume.pdf"
  const uuidPrefixRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}_/;
  if (uuidPrefixRegex.test(filename)) {
    filename = filename.replace(uuidPrefixRegex, "");
  }

  return filename.trim() || defaultName;
};

export const extractFilenameFromUrl = extractResumeFilename;

export const downloadFileFromUrl = async (
  url: string,
  defaultFilename: string,
): Promise<void> => {
  if (!url || typeof url !== "string") return;

  const filename = extractResumeFilename(url, defaultFilename);

  try {
    const response = await fetch(url, { mode: "cors" });
    if (response.ok) {
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = filename;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();

      setTimeout(() => {
        if (document.body.contains(anchor)) {
          document.body.removeChild(anchor);
        }
        URL.revokeObjectURL(blobUrl);
      }, 100);
      return;
    }
  } catch (e) {
    console.warn("Direct blob download failed, falling back to direct anchor download", e);
  }

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    if (document.body.contains(anchor)) {
      document.body.removeChild(anchor);
    }
  }, 100);
};

export const getFullName = (instructor: InstructorApprovalUser): string => {
  if (instructor.fullName && instructor.fullName.trim()) {
    return instructor.fullName.trim();
  }
  const nameParts = [instructor.firstName, instructor.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return nameParts || instructor.email || "Instructor";
};

export const getLocation = (instructor: InstructorApprovalUser): string => {
  const parts = [instructor.city, instructor.country].filter((val) => Boolean(val && val.trim() && val.toLowerCase() !== "null"));
  if (parts.length > 0) return parts.join(", ");
  return "Not specified";
};

export const getInstructorAppliedTimestamp = (
  instructor: InstructorApprovalUser,
): string | null => {
  return (
    instructor.registeredAt ||
    instructor.appliedAt ||
    instructor.createdAt ||
    instructor.submissionTimestamp ||
    null
  );
};

export const formatDate = (value: string | null | undefined): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

/** Formats applied date consistently: "Applied 2024-06-10" */
export const formatAppliedDate = (timestamp?: string | null): string => {
  if (!timestamp) return "Applied Date —";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Applied Date —";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `Applied ${year}-${month}-${day}`;
};

export const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const timeAgo = (value: string | null | undefined): string => {
  if (!value) return "recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  const hours = Math.floor((Date.now() - date.getTime()) / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
};

const isPopulated = (val: string | null | undefined): val is string => {
  if (!val || typeof val !== "string") return false;
  const trimmed = val.trim().toLowerCase();
  return trimmed !== "" && trimmed !== "null" && trimmed !== "undefined";
};

/**
 * Derives instructor status from backend object properties in strict priority order:
 * 1. instructor.status (if non-empty)
 * 2. instructor.approvalStatus (if non-empty)
 * 3. instructor.rejectedAt (if populated) -> REJECTED
 * 4. instructor.approvedAt (if populated) -> APPROVED
 * 5. Default -> PENDING
 */
export const deriveInstructorStatus = (
  instructor?: InstructorApprovalUser | string | null,
): "PENDING" | "APPROVED" | "REJECTED" => {
  if (!instructor) return "PENDING";

  if (typeof instructor === "string") {
    const s = instructor.trim().toUpperCase();
    if (s.includes("APPROV") || s === "ACTIVE") return "APPROVED";
    if (s.includes("REJECT") || s === "DECLINED") return "REJECTED";
    return "PENDING";
  }

  if (isPopulated(instructor.status)) {
    const s = instructor.status.trim().toUpperCase();
    if (s.includes("APPROV") || s === "ACTIVE") return "APPROVED";
    if (s.includes("REJECT") || s === "DECLINED") return "REJECTED";
    if (s.includes("PEND")) return "PENDING";
  }

  if (isPopulated(instructor.approvalStatus)) {
    const s = instructor.approvalStatus.trim().toUpperCase();
    if (s.includes("APPROV") || s === "ACTIVE") return "APPROVED";
    if (s.includes("REJECT") || s === "DECLINED") return "REJECTED";
    if (s.includes("PEND")) return "PENDING";
  }

  if (isPopulated(instructor.rejectedAt)) {
    return "REJECTED";
  }

  if (isPopulated(instructor.approvedAt)) {
    return "APPROVED";
  }

  return "PENDING";
};

export const getInstructorStatusInfo = (
  instructorOrStatus?: InstructorApprovalUser | string | null,
) => {
  const status = deriveInstructorStatus(instructorOrStatus);

  if (status === "APPROVED") {
    return {
      status,
      label: "Approved",
      badgeClass:
        "bg-emerald-100 text-emerald-800 border-emerald-200 font-medium px-2.5 py-0.5 rounded-full text-xs",
    };
  }

  if (status === "REJECTED") {
    return {
      status,
      label: "Rejected",
      badgeClass:
        "bg-red-100 text-red-800 border-red-200 font-medium px-2.5 py-0.5 rounded-full text-xs",
    };
  }

  return {
    status,
    label: "Pending",
    badgeClass:
      "bg-amber-100 text-amber-800 border-amber-200 font-medium px-2.5 py-0.5 rounded-full text-xs",
  };
};

export const matchesQuery = (
  instructor: InstructorApprovalUser,
  query: string,
): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    getFullName(instructor).toLowerCase().includes(q) ||
    instructor.email.toLowerCase().includes(q)
  );
};
