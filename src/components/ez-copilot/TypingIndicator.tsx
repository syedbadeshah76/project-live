export function TypingIndicator() {
  return (
    <div className="flex w-full justify-start">
      <div className="flex items-center gap-3 rounded-2xl border border-[#E5E9F2] bg-white px-5 py-4 text-sm text-[#6B7280] shadow-sm">
        <span className="flex gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-[#2D6BFF] [animation-delay:-0.3s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-[#2D6BFF] [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-[#2D6BFF]" />
        </span>
        EZ AI is thinking...
      </div>
    </div>
  );
}
