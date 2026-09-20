/**
 * EZ Copilot Service.
 * Production AI backend integration service.
 *
 * API Contract:
 *   POST https://ezai-dev.edvanz.co/chat
 *   Headers: Content-Type: application/json, Authorization?: Bearer <token>
 *   Body: { "question": string }
 *   Response: { "answer": string, "sources"?: string[], "blocked"?: boolean }
 */

import { authService } from "@/services/auth.service";
import type {
  SendMessageOptions,
  SendMessageRequest,
  SendMessageResponse,
  StudentProfile,
  SuggestedQuestion,
} from "@/types/ezCopilot";

/**
 * Single source of truth base URL across all environments (localhost, UAT, production).
 */
const EZAI_BASE_URL = "https://ezai-dev.edvanz.co";

const isDebugMode = (): boolean => {
  return (
    Boolean(import.meta.env.DEV) ||
    (import.meta.env.VITE_DEBUG_API as string | undefined) === "true"
  );
};

type AuthTokenGetter = () => string | null | undefined;
let tokenGetter: AuthTokenGetter | null = null;

const getAuthToken = (explicitToken?: string): string | null => {
  if (explicitToken) return explicitToken;
  if (tokenGetter) {
    const t = tokenGetter();
    if (t) return t;
  }
  return localStorage.getItem("accessToken");
};

export const ezCopilotService = {
  /**
   * Register a decoupled authorization token getter (e.g. from AuthContext).
   * Prevents hardcoding direct localStorage access in the service layer.
   */
  setAuthTokenGetter(getter: AuthTokenGetter) {
    tokenGetter = getter;
  },

  async getStudentProfile(
    currentUser?: { id?: string; name?: string; email?: string } | null
  ): Promise<StudentProfile> {
    if (currentUser?.id) {
      return {
        id: currentUser.id,
        name: currentUser.name || currentUser.email?.split("@")[0] || "Student",
      };
    }
    try {
      const response = await authService.getCurrentUser();
      const user = (response as any)?.data?.user ?? (response as any)?.data ?? response;
      if (user?.id) {
        return {
          id: String(user.id),
          name: String(user.name || user.email?.split("@")[0] || "Student"),
        };
      }
    } catch {
      // Non-blocking fallback if unauthenticated
    }
    return { id: "anonymous", name: "Student" };
  },

  async getSuggestedQuestions(): Promise<SuggestedQuestion[]> {
    return [
      { id: 1, question: "How can I start learning new topics?" },
      { id: 2, question: "How do I become an AI Engineer?" },
      { id: 3, question: "How can I master Data Structures faster?" },
    ];
  },

  /**
   * Health check endpoint integration.
   * GET https://ezai-dev.edvanz.co/health
   */
  async checkHealth(): Promise<{ status: string }> {
    const endpoint = `${EZAI_BASE_URL}/health`;
    try {
      const res = await fetch(endpoint, { method: "GET" });
      if (res.ok) {
        return (await res.json()) as { status: string };
      }
      return { status: "error" };
    } catch {
      return { status: "offline" };
    }
  },

  /**
   * Input validation: 8,000 character limit.
   */
  validatePrompt(message: string): { valid: boolean; reason?: string } {
    const trimmed = message.trim();
    if (!trimmed) {
      return { valid: false, reason: "Message cannot be empty" };
    }
    if (trimmed.length > 8000) {
      return { valid: false, reason: "Maximum 8000 characters allowed" };
    }
    return { valid: true };
  },

  /**
   * Send message to the backend AI service.
   * Target endpoint: POST https://ezai-dev.edvanz.co/chat
   * Handles timeouts (30s), error statuses (422, 500, network), and authorization headers.
   */
  async sendMessage(
    req: SendMessageRequest,
    options?: SendMessageOptions | string
  ): Promise<SendMessageResponse> {
    const opts: SendMessageOptions =
      typeof options === "string" ? { explicitToken: options } : options || {};

    const promptValidation = this.validatePrompt(req.message);
    if (!promptValidation.valid) {
      throw new Error(promptValidation.reason || "Invalid input");
    }

    const endpoint = `${EZAI_BASE_URL}/chat`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const token = getAuthToken(opts.explicitToken);
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutMs = opts.timeoutMs ?? 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    if (opts.signal) {
      if (opts.signal.aborted) {
        controller.abort();
      } else {
        opts.signal.addEventListener("abort", () => controller.abort());
      }
    }

    const bodyPayload = {
      question: req.message.trim(),
      ...(req.conversationId ? { conversationId: req.conversationId } : {}),
      ...(req.userId ? { userId: req.userId } : {}),
      ...(req.studentId ? { studentId: req.studentId } : {}),
      ...(req.courseId ? { courseId: req.courseId } : {}),
      ...(req.context ? { context: req.context } : {}),
      ...(req.history ? { history: req.history } : {}),
    };

    if (isDebugMode()) {
      console.log("[EZ Copilot Request]", {
        endpoint,
        body: bodyPayload,
        headers: { ...headers, Authorization: token ? "Bearer [REDACTED]" : undefined },
      });
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(bodyPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (isDebugMode()) {
        console.log("[EZ Copilot Response Status]", response.status);
      }

      if (response.status === 422) {
        throw new Error("Please enter a valid message.");
      }

      if (response.status >= 500) {
        throw new Error("I’m having trouble connecting right now. Please try again.");
      }

      if (!response.ok) {
        let errMessage = "I’m having trouble connecting right now. Please try again.";
        try {
          const errData = await response.json();
          if (errData && typeof errData.message === "string") {
            errMessage = errData.message;
          } else if (errData && typeof errData.detail === "string") {
            errMessage = errData.detail;
          }
        } catch {
          // ignore body parse failure
        }
        throw new Error(errMessage);
      }

      const data = await response.json();

      if (isDebugMode()) {
        console.log("[EZ Copilot Response Body]", data);
      }

      const answer =
        typeof data.answer === "string" && data.answer.trim()
          ? data.answer.trim()
          : typeof data.message === "string" && data.message.trim()
          ? data.message.trim()
          : typeof data.response === "string" && data.response.trim()
          ? data.response.trim()
          : typeof data.text === "string" && data.text.trim()
          ? data.text.trim()
          : typeof data.output === "string" && data.output.trim()
          ? data.output.trim()
          : "I’m having trouble retrieving a response right now. Please try again.";

      const sources = Array.isArray(data.sources)
        ? data.sources.filter((s: unknown): s is string => typeof s === "string")
        : [];

      return {
        success: true,
        message: answer,
        answer,
        sources,
        blocked: Boolean(data.blocked),
        conversationId: typeof data.conversationId === "string" ? data.conversationId : undefined,
        messageId: typeof data.messageId === "string" ? data.messageId : undefined,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      if (err instanceof Error) {
        if (err.name === "AbortError") {
          throw new Error("I’m having trouble connecting right now. Please try again.");
        }
        if (
          err.message === "Please enter a valid message." ||
          err.message.includes("trouble") ||
          err.message.includes("longer than expected")
        ) {
          throw err;
        }
      }

      throw new Error("I’m having trouble connecting right now. Please try again.");
    }
  },

  /**
   * Retry sending a failed message.
   */
  async retryMessage(
    req: SendMessageRequest,
    options?: SendMessageOptions | string
  ): Promise<SendMessageResponse> {
    return this.sendMessage(req, options);
  },
};
