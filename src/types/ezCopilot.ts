export interface SuggestedQuestion {
  id: number;
  question: string;
}

export type ChatRole = "user" | "assistant" | "ai";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  status?: "pending" | "sent" | "error";
  isError?: boolean;
  showSuggestions?: boolean;
  sources?: string[];
  blocked?: boolean;
  conversationId?: string;
  messageId?: string;
}

export interface SendMessageOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  explicitToken?: string;
}

export interface SendMessageRequest {
  message: string;
  studentId?: string;
  userId?: string;
  conversationId?: string;
  courseId?: string;
  context?: Record<string, unknown>;
  history?: Array<{ role: string; content: string }>;
}

export interface SendMessageResponse {
  success: boolean;
  message: string;
  answer?: string;
  sources?: string[];
  blocked?: boolean;
  conversationId?: string;
  messageId?: string;
}

export interface StudentProfile {
  id: string;
  name: string;
}
