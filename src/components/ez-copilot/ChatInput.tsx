import { Send } from "lucide-react";
import { forwardRef, type KeyboardEvent } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  maxLength?: number;
}

export const ChatInput = forwardRef<HTMLTextAreaElement, Props>(function ChatInput(
  { value, onChange, onSubmit, disabled, maxLength = 8000 },
  ref,
) {
  const exceeded = value.length >= maxLength;

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) {
        onSubmit();
      }
    }
  };

  const handleChange = (next: string) => {
    if (next.length <= maxLength) {
      onChange(next);
    } else {
      onChange(next.slice(0, maxLength));
    }
  };

  return (
    <div className="w-full">
      <div className="relative rounded-2xl border border-[#E5E9F2] bg-white px-5 pt-4 pb-12 shadow-sm">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask EZ Copilot anything about your courses, learning, certifications..."
          rows={2}
          className="w-full resize-none border-0 bg-transparent text-[15px] leading-relaxed text-[#1F2937] placeholder:text-[#9CA3AF] focus:outline-none"
          aria-label="Chat message input"
        />
        <div className="absolute bottom-3 left-5 text-[13px] font-medium text-[#2D6BFF]">
          {value.length}/{maxLength}
        </div>
        <button
          type="button"
          onClick={() => !disabled && value.trim() && onSubmit()}
          disabled={disabled || !value.trim()}
          className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#2D6BFF] text-white shadow transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </div>
      {exceeded && (
        <p className="mt-2 text-xs text-red-500">Maximum 8000 characters allowed</p>
      )}
      <p className="mt-3 text-center text-xs text-[#9CA3AF]">
        EZ Copilot can make mistakes. Check important info.
      </p>
    </div>
  );
});
