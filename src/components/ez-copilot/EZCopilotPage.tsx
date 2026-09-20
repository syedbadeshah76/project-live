import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ezCopilotService } from "@/services/ai/ezCopilotService";
import { profileService, type ProfileData } from "@/services/profile.service";
import { useEZCopilot } from "@/contexts/EZCopilotContext";
import type { ChatMessage, SuggestedQuestion } from "@/types/ezCopilot";

import { AIMessage } from "./AIMessage";
import { ChatInput } from "./ChatInput";
import { SuggestedQuestionCard } from "./SuggestedQuestionCard";
import { TypingIndicator } from "./TypingIndicator";
import { UserMessage } from "./UserMessage";

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function EZCopilotPage() {
  const {
    student,
    suggestions,
    bootError,
    messages,
    setMessages,
    input,
    setInput,
    isSending,
    setIsSending,
  } = useEZCopilot();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    profileService.getProfile().then((res) => {
      if (res.success) setProfile(res.data);
    }).catch(() => { });
  }, []);

  // Auto-scroll on new message or sending state change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  // Scroll-to-bottom button visibility
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - (el.scrollTop + el.clientHeight);
    setShowScrollBtn(dist > 200);
  };

  const activeControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () =>
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  const focusInput = () =>
    requestAnimationFrame(() => inputRef.current?.focus());

  const performSend = useCallback(
    async (text: string, isRetry: boolean = false) => {
      const validation = ezCopilotService.validatePrompt(text);
      if (!validation.valid) {
        if (validation.reason) toast.error(validation.reason);
        return;
      }

      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
      }

      const controller = new AbortController();
      activeControllerRef.current = controller;

      const trimmed = text.trim();

      if (!isRetry) {
        const userMsg: ChatMessage = {
          id: makeId(),
          role: "user",
          content: trimmed,
          createdAt: Date.now(),
        };
        setMessages((m) => [...m, userMsg]);
        setInput("");
      }

      setIsSending(true);
      try {
        const res = await ezCopilotService.sendMessage(
          {
            message: trimmed,
            studentId: student?.id,
            userId: student?.id,
          },
          { signal: controller.signal }
        );

        setMessages((m) => [
          ...m,
          {
            id: makeId(),
            role: "ai",
            content: res.message,
            // sources: res.sources,
            blocked: res.blocked,
            conversationId: res.conversationId,
            messageId: res.messageId,
            createdAt: Date.now(),
          },
        ]);
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          return;
        }

        const errorMessage =
          err instanceof Error
            ? err.message
            : "I’m having trouble connecting right now. Please try again.";

        setMessages((m) => [
          ...m,
          {
            id: makeId(),
            role: "ai",
            content: errorMessage,
            createdAt: Date.now(),
            isError: true,
          },
        ]);
      } finally {
        if (activeControllerRef.current === controller) {
          activeControllerRef.current = null;
        }
        setIsSending(false);
        focusInput();
      }
    },
    [student?.id, setMessages, setInput, setIsSending],
  );

  /**
   * Populate the textarea input with the suggested question and focus it,
   * allowing the user to edit or send manually via Enter/Send button.
   */
  const handleSelectSuggestion = (q: SuggestedQuestion) => {
    setInput(q.question);
    focusInput();
  };

  const handleSubmit = () => performSend(input);

  const handleEditUserMessage = (msg: ChatMessage) => {
    setInput(msg.content);
    focusInput();
  };

  const handleRetry = async (aiMsg: ChatMessage) => {
    const idx = messages.findIndex((m) => m.id === aiMsg.id);
    if (idx < 0) return;

    const prevUser = [...messages.slice(0, idx)]
      .reverse()
      .find((m) => m.role === "user");

    if (!prevUser) return;

    // Remove the failed AI message and re-send without duplicating user message
    setMessages((m) => m.filter((x) => x.id !== aiMsg.id));
    await performSend(prevUser.content, true);
  };

  const handleRegenerate = async (aiMsg: ChatMessage) => {
    const idx = messages.findIndex((m) => m.id === aiMsg.id);
    if (idx < 0) return;

    const prevUser = [...messages.slice(0, idx)]
      .reverse()
      .find((m) => m.role === "user");

    if (!prevUser) return;

    setMessages((m) => m.filter((x) => x.id !== aiMsg.id));
    await performSend(prevUser.content, true);
  };

  const hasConversation = messages.length > 0;

  const greeting = useMemo(
    () => `Hello ${profile?.firstName || "Student"}`,
    [profile?.firstName],
  );
  

  return (
    <div className="flex h-[calc(100vh-64px)] w-full flex-col bg-[#F7F9FC]">
      {/* Scrollable chat / empty state */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-y-auto"
      >
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-10">
          {bootError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {bootError}
            </div>
          )}

          {!hasConversation && !bootError && (
            <div className="pt-8 sm:pt-16">
              <p className="text-[18px] font-semibold text-[#1F2937]">
                {greeting} <span aria-hidden>👋</span>
              </p>
              <h1 className="mt-3 text-[28px] font-semibold leading-tight text-[#0F172A] sm:text-[34px]">
                Where would you like to start?
              </h1>
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {suggestions.length === 0
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-[140px] animate-pulse rounded-2xl border border-[#E5E9F2] bg-white"
                      />
                    ))
                  : suggestions.map((q) => (
                      <SuggestedQuestionCard
                        key={q.id}
                        item={q}
                        onSelect={handleSelectSuggestion}
                      />
                    ))}
              </div>
            </div>
          )}

          {hasConversation && (
            <div className="flex flex-col gap-6 pb-4">
              {messages.map((m) =>
                m.role === "user" ? (
                  <UserMessage
                    key={m.id}
                    content={m.content}
                    onEdit={() => handleEditUserMessage(m)}
                  />
                ) : (
                  <AIMessage
                    key={m.id}
                    content={m.content}
                    isError={m.isError}
                    blocked={m.blocked}
                    // sources={m.sources}
                    suggestions={m.showSuggestions ? suggestions : undefined}
                    onSuggestionSelect={handleSelectSuggestion}
                    onRegenerate={() => handleRegenerate(m)}
                    onRetry={() => handleRetry(m)}
                  />
                ),
              )}
              {isSending && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-[#E5E9F2] bg-[#F7F9FC]">
        <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 lg:px-10">
          <div className="relative">
            {showScrollBtn && hasConversation && (
              <button
                type="button"
                onClick={scrollToBottom}
                className="absolute -top-14 left-1/2 z-10 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full bg-[#2D6BFF] text-white shadow-md transition-opacity hover:opacity-90"
                aria-label="Scroll to latest message"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            )}
            <ChatInput
              ref={inputRef}
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              disabled={isSending}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
