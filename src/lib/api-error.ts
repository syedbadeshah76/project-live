// ============= API Error Utilities =============
// Converts backend/Axios errors into safe, user friendly messages.

export interface ApiErrorShape {
  message?: string;
  code?: string;
  response?: {
    status?: number;
    data?: {
      status?: number;
      message?: string;
      code?: string;
      errorCode?: string;
      error?: string;
      statusCode?: number;
      errors?: Record<string, string[]>;
    };
  };
}

/** Backend business error codes used by the auth module. */
export const AUTH_ERROR_CODES = {
  EMAIL_ALREADY_REGISTERED: "USER_002",
  INSTRUCTOR_PENDING_APPROVAL: "AUTH_011",
  INSTRUCTOR_REJECTED: "AUTH_012",
} as const;

const STATUS_MESSAGES: Record<number, string> = {
  400: "Some of the details you entered are not valid. Please review and try again.",
  401: "Your session has expired. Please try again.",
  403: "You do not have permission to perform this action.",
  404: "We could not find what you were looking for.",
  409: "This record already exists.",
  422: "Some of the details you entered could not be processed.",
  429: "Too many attempts. Please wait a moment and try again.",
  500: "Something went wrong on our side. Please try again shortly.",
  502: "Our service is temporarily unavailable. Please try again shortly.",
  503: "Our service is temporarily unavailable. Please try again shortly.",
  504: "The server took too long to respond. Please try again.",
};

const isApiErrorShape = (error: unknown): error is ApiErrorShape =>
  typeof error === "object" && error !== null;

/** Extracts the backend business error code, if any. */
export const getApiErrorCode = (error: unknown): string => {
  if (!isApiErrorShape(error)) return "";

  const data = error.response?.data;

  return data?.code || data?.errorCode || error.code || "";
};

export const getApiStatus = (error: unknown): number => {
  if (!isApiErrorShape(error)) return 0;

  return (
    error.response?.status ??
    error.response?.data?.statusCode ??
    error.response?.data?.status ??
    0
  );
};

export const isNetworkError = (error: unknown): boolean => {
  if (!isApiErrorShape(error)) return false;

  return !error.response && Boolean(error.message);
};

/**
 * Returns a clean, user facing message.
 * Business codes win, then field errors,
 * then backend message,
 * then HTTP status fallback,
 * then network fallback,
 * then supplied fallback.
 */
export const getApiError = (
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string => {
  const code = getApiErrorCode(error);

  // Business errors
  if (code === AUTH_ERROR_CODES.EMAIL_ALREADY_REGISTERED) {
    return "Email already registered. Please login with your existing account.";
  }

  if (code === AUTH_ERROR_CODES.INSTRUCTOR_PENDING_APPROVAL) {
    return "Your instructor account is awaiting admin approval.";
  }

  if (code === AUTH_ERROR_CODES.INSTRUCTOR_REJECTED) {
    return "Your instructor account has been rejected.";
  }

  if (!isApiErrorShape(error)) {
    return fallback;
  }

  const data = error.response?.data;

  // Validation errors
  const fieldErrors = data?.errors;

  if (fieldErrors) {
    const first = Object.values(fieldErrors).flat()[0];

    if (first) {
      return first;
    }
  }

  // Backend message
  if (data?.message) {
    return data.message;
  }

  if (data?.error) {
    return data.error;
  }

  // HTTP fallback
  const status = getApiStatus(error);

  if (status && STATUS_MESSAGES[status]) {
    return STATUS_MESSAGES[status];
  }

  // Axios timeout
  if ((error as ApiErrorShape)?.code === "ECONNABORTED") {
    return "The request timed out. Please try again.";
  }

  // Network
  if (isNetworkError(error)) {
    return "Network error. Please check your connection and try again.";
  }

  // Generic JS Error
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

export const isEmailAlreadyRegistered = (error: unknown): boolean =>
  getApiErrorCode(error) === AUTH_ERROR_CODES.EMAIL_ALREADY_REGISTERED ||
  (getApiStatus(error) === 409 &&
    /already/i.test(getApiError(error, "")) &&
    /email|registered/i.test(getApiError(error, "")));

export const isInstructorPendingApproval = (error: unknown): boolean =>
  getApiErrorCode(error) === AUTH_ERROR_CODES.INSTRUCTOR_PENDING_APPROVAL ||
  /awaiting admin approval/i.test(getApiError(error, "")) ||
  /pending approval/i.test(getApiError(error, ""));

export const isInstructorRejected = (error: unknown): boolean =>
  getApiErrorCode(error) === AUTH_ERROR_CODES.INSTRUCTOR_REJECTED ||
  /has been rejected/i.test(getApiError(error, "")) ||
  /rejected/i.test(getApiError(error, ""));

/** Checks if the error is 404 or backend resource not found code (e.g. RES_001). */
export const isResourceNotFound = (error: unknown): boolean =>
  getApiStatus(error) === 404 || getApiErrorCode(error) === "RES_001";

