import React from "react";
import { Copy, RefreshCw, RotateCcw, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import type { SuggestedQuestion } from "@/types/ezCopilot";
import { MessageSources } from "./MessageSources";
import { SuggestedQuestionCard } from "./SuggestedQuestionCard";

interface Props {
  content: string;
  isError?: boolean;
  blocked?: boolean;
  sources?: string[];
  suggestions?: SuggestedQuestion[];
  onRegenerate?: () => void;
  onRetry?: () => void;
  onSuggestionSelect?: (q: SuggestedQuestion) => void;
}

function parseInlineMarkdown(text: string): React.ReactNode[] {
  const pattern = /(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g;
  const parts = text.split(pattern);

  return parts.map((part, idx) => {
    if (!part) return null;

    if (part.startsWith("[") && part.includes("](")) {
      const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (match) {
        return (
          <a
            key={idx}
            href={match[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#2D6BFF] underline hover:text-[#1D4ED8]"
          >
            {match[1]}
          </a>
        );
      }
    }

    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={idx}
          className="rounded bg-[#F3F4F6] px-1.5 py-0.5 font-mono text-xs text-[#E11D48]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={idx} className="font-semibold text-[#0F172A]">
          {parseInlineMarkdown(part.slice(2, -2))}
        </strong>
      );
    }

    if (
      ((part.startsWith("*") && part.endsWith("*")) ||
        (part.startsWith("_") && part.endsWith("_"))) &&
      part.length >= 2
    ) {
      return (
        <em key={idx} className="italic text-[#374151]">
          {parseInlineMarkdown(part.slice(1, -1))}
        </em>
      );
    }

    return part;
  });
}

function renderMarkdownContent(content: string) {
  if (!content) return null;

  const blocks = content.split(/(```[\s\S]*?```)/g);

  return blocks.map((block, bIdx) => {
    if (block.startsWith("```") && block.endsWith("```")) {
      const firstLineEnd = block.indexOf("\n");
      let code = "";
      let lang = "";
      if (firstLineEnd !== -1) {
        lang = block.slice(3, firstLineEnd).trim();
        code = block.slice(firstLineEnd + 1, -3);
      } else {
        code = block.slice(3, -3);
      }
      return (
        <div key={bIdx} className="my-3 overflow-x-auto rounded-lg bg-[#1E293B] p-4 font-mono text-xs text-[#E2E8F0]">
          {lang && <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">{lang}</div>}
          <pre className="whitespace-pre">{code.trim()}</pre>
        </div>
      );
    }

    const lines = block.split("\n");
    const elements: React.ReactNode[] = [];
    let currentList: { type: "ul" | "ol"; items: React.ReactNode[] } | null = null;

    const flushList = (key: string) => {
      if (!currentList) return;
      if (currentList.type === "ul") {
        elements.push(
          <ul key={key} className="my-2 ml-5 list-disc space-y-1">
            {currentList.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={key} className="my-2 ml-5 list-decimal space-y-1">
            {currentList.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ol>
        );
      }
      currentList = null;
    };

    lines.forEach((line, lIdx) => {
      const trimmed = line.trim();

      if (!trimmed) {
        flushList(`list-${bIdx}-${lIdx}`);
        return;
      }

      if (trimmed.startsWith("### ")) {
        flushList(`list-${bIdx}-${lIdx}`);
        elements.push(
          <h3 key={`h3-${bIdx}-${lIdx}`} className="mt-3 mb-1 text-base font-semibold text-[#0F172A]">
            {parseInlineMarkdown(trimmed.slice(4))}
          </h3>
        );
        return;
      }
      if (trimmed.startsWith("## ")) {
        flushList(`list-${bIdx}-${lIdx}`);
        elements.push(
          <h2 key={`h2-${bIdx}-${lIdx}`} className="mt-4 mb-1.5 text-lg font-bold text-[#0F172A]">
            {parseInlineMarkdown(trimmed.slice(3))}
          </h2>
        );
        return;
      }
      if (trimmed.startsWith("# ")) {
        flushList(`list-${bIdx}-${lIdx}`);
        elements.push(
          <h1 key={`h1-${bIdx}-${lIdx}`} className="mt-4 mb-2 text-xl font-extrabold text-[#0F172A]">
            {parseInlineMarkdown(trimmed.slice(2))}
          </h1>
        );
        return;
      }

      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const itemContent = parseInlineMarkdown(trimmed.slice(2));
        if (currentList && currentList.type === "ul") {
          currentList.items.push(itemContent);
        } else {
          flushList(`list-${bIdx}-${lIdx}`);
          currentList = { type: "ul", items: [itemContent] };
        }
        return;
      }

      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        const itemContent = parseInlineMarkdown(numMatch[2]);
        if (currentList && currentList.type === "ol") {
          currentList.items.push(itemContent);
        } else {
          flushList(`list-${bIdx}-${lIdx}`);
          currentList = { type: "ol", items: [itemContent] };
        }
        return;
      }

      flushList(`list-${bIdx}-${lIdx}`);
      elements.push(
        <p key={`p-${bIdx}-${lIdx}`} className="my-1 whitespace-pre-wrap">
          {parseInlineMarkdown(line)}
        </p>
      );
    });

    flushList(`list-final-${bIdx}`);
    return <React.Fragment key={bIdx}>{elements}</React.Fragment>;
  });
}

export function AIMessage({
  content,
  isError,
  sources,
  suggestions,
  onRegenerate,
  onRetry,
  onSuggestionSelect,
}: Props) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied successfully");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const feedback = (helpful: boolean) =>
    toast.success(helpful ? "Thanks for your feedback" : "Thanks, we'll improve");

  return (
    <div className="flex w-full justify-start">
      <div
        className={`max-w-[85%] rounded-2xl border bg-white px-6 py-5 text-[15px] leading-relaxed shadow-sm ${
          isError ? "border-red-200 bg-red-50/50 text-red-700" : "border-[#E5E9F2] text-[#1F2937]"
        }`}
      >
        <div>{renderMarkdownContent(content)}</div>

        {/* Grounding sources section */}
        <MessageSources sources={sources} />

        {/* Suggested questions */}
        {suggestions && suggestions.length > 0 && onSuggestionSelect && (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {suggestions.map((s) => (
              <SuggestedQuestionCard key={s.id} item={s} onSelect={onSuggestionSelect} />
            ))}
          </div>
        )}

        {/* Action bar */}
        <div className="mt-4 flex items-center gap-3 text-[#6B7280]">
          {isError && onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center gap-1.5 rounded bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-200"
              aria-label="Retry message"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </button>
          ) : (
            onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                className="rounded p-1 transition-colors hover:bg-[#F3F4F6] hover:text-[#2D6BFF]"
                aria-label="Regenerate response"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="rounded p-1 transition-colors hover:bg-[#F3F4F6] hover:text-[#2D6BFF]"
            aria-label="Copy response"
          >
            <Copy className="h-4 w-4" />
          </button>

          {!isError && (
            <>
              <button
                type="button"
                onClick={() => feedback(true)}
                className="rounded p-1 transition-colors hover:bg-[#F3F4F6] hover:text-[#2D6BFF]"
                aria-label="Helpful"
              >
                <ThumbsUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => feedback(false)}
                className="rounded p-1 transition-colors hover:bg-[#F3F4F6] hover:text-[#2D6BFF]"
                aria-label="Not helpful"
              >
                <ThumbsDown className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
