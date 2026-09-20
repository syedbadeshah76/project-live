/**
 * EZ Copilot chat state — Context Provider.
 *
 * Provides in-memory chat session orchestration for EZ Copilot.
 * Ensures:
 *  1. Strict user session isolation (User A never sees User B's conversation).
 *  2. Fresh conversation initialization upon login and user identity switch.
 *  3. Complete purge of conversation state and localStorage caches upon logout.
 *  4. Smooth navigation survival within an active user session without global persistence.
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import { ezCopilotService } from "@/services/ai/ezCopilotService";
import { useAuth } from "@/contexts/AuthContext";
import type {
  ChatMessage,
  StudentProfile,
  SuggestedQuestion,
} from "@/types/ezCopilot";

/**
 * Remove all legacy and user-scoped EZ Copilot storage keys from localStorage.
 */
export function purgeAllEZCopilotStorage(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith("ezcopilot:") ||
          key.startsWith("edvanz:ezcopilot:") ||
          key === "edvanz:ezcopilot:chat-state:v1")
      ) {
        keysToRemove.push(key);
      }
    }
    for (const k of keysToRemove) {
      localStorage.removeItem(k);
    }
  } catch {
    // Fail silently on storage access restrictions
  }
}

interface EZCopilotContextValue {
  student: StudentProfile | null;
  suggestions: SuggestedQuestion[];
  suggestionsLoading: boolean;
  bootError: string | null;

  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;

  input: string;
  setInput: (value: string) => void;

  isSending: boolean;
  setIsSending: (value: boolean) => void;

  clearConversation: () => void;
}

const EZCopilotContext = createContext<EZCopilotContextValue | undefined>(
  undefined,
);

export function EZCopilotProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id;

  const [student, setStudent] = useState<StudentProfile | null>(() => {
    return user ? { id: user.id, name: user.name || "Student" } : null;
  });
  const [suggestions, setSuggestions] = useState<SuggestedQuestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);

  // In-memory conversation state for the active authenticated session
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInputState] = useState<string>("");
  const [isSending, setIsSending] = useState(false);

  const currentUserIdRef = useRef<string | undefined>(userId);

  // Purge legacy storage keys on mount
  useEffect(() => {
    purgeAllEZCopilotStorage();
  }, []);

  // Synchronize state when user/authentication status changes (login, logout, switch user)
  useEffect(() => {
    const prevUserId = currentUserIdRef.current;
    currentUserIdRef.current = userId;

    if (!isAuthenticated || !userId) {
      // User logged out — clear all conversation state and purge storage
      purgeAllEZCopilotStorage();
      setMessages([]);
      setInputState("");
      setIsSending(false);
      setStudent(null);
      return;
    }

    if (prevUserId !== userId) {
      // Switched to a different user identity — start with a fresh isolated conversation
      purgeAllEZCopilotStorage();
      setMessages([]);
      setInputState("");
      setIsSending(false);
      setStudent({ id: userId, name: user?.name || "Student" });
    } else {
      setStudent({ id: userId, name: user?.name || "Student" });
    }
  }, [userId, isAuthenticated, user?.name]);

  // Bootstrap profile & suggested questions per session
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [profile, qs] = await Promise.all([
          ezCopilotService.getStudentProfile(user),
          ezCopilotService.getSuggestedQuestions(),
        ]);
        if (cancelled) return;
        if (profile?.id && profile.id !== "anonymous") {
          setStudent(profile);
        }
        setSuggestions(qs);
      } catch {
        if (!cancelled) {
          setBootError("Failed to load EZ Copilot. Please refresh.");
        }
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const setInput = (value: string) => setInputState(value);

  const clearConversation = () => {
    setMessages([]);
    setInputState("");
    setIsSending(false);
    purgeAllEZCopilotStorage();
  };

  const value: EZCopilotContextValue = {
    student,
    suggestions,
    suggestionsLoading,
    bootError,
    messages,
    setMessages,
    input,
    setInput,
    isSending,
    setIsSending,
    clearConversation,
  };

  return (
    <EZCopilotContext.Provider value={value}>
      {children}
    </EZCopilotContext.Provider>
  );
}

export function useEZCopilot(): EZCopilotContextValue {
  const ctx = useContext(EZCopilotContext);
  if (!ctx) {
    throw new Error("useEZCopilot must be used within an <EZCopilotProvider>");
  }
  return ctx;
}
