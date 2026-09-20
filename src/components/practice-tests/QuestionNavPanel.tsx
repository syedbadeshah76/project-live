interface Props {
  total: number;
  current: number; // 1-based
  answered: Set<number>;
  onJump: (index: number) => void;
}

export function QuestionNavPanel({ total, current, answered, onJump }: Props) {
  const answeredCount = answered.size;
  const unansweredCount = total - answeredCount;
  return (
    <div className="rounded-2xl border border-[#E5E9F2] bg-[#F7F9FF] p-4">
      <div className="mb-4 flex items-center gap-4 text-xs">
        <span className="inline-flex items-center gap-2 text-[#6B7280]">
          <span className="h-4 w-4 rounded border border-[#CBD5E1] bg-white" />
          <strong className="text-[#1F2937]">{unansweredCount}</strong> Unanswered
        </span>
        <span className="inline-flex items-center gap-2 text-[#6B7280]">
          <span className="h-4 w-4 rounded bg-[#2D4BFF]" />
          <strong className="text-[#1F2937]">{answeredCount}</strong> Answered
        </span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: total }).map((_, i) => {
          const idx = i + 1;
          const isCurrent = idx === current;
          const isAnswered = answered.has(idx);
          let cls = "border border-[#CBD5E1] bg-white text-[#2D4BFF]";
          if (isAnswered) cls = "bg-[#2D4BFF] text-white border border-[#2D4BFF]";
          if (isCurrent) cls = "bg-[#1F2937] text-white border border-[#1F2937]";
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onJump(idx)}
              className={`grid h-10 w-10 place-items-center rounded-lg text-sm font-semibold transition-colors ${cls}`}
            >
              {idx}
            </button>
          );
        })}
      </div>
    </div>
  );
}
