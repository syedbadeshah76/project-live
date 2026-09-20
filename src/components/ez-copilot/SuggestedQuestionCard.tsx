import { Send } from "lucide-react";
import type { SuggestedQuestion } from "@/types/ezCopilot";

interface Props {
  item: SuggestedQuestion;
  onSelect: (q: SuggestedQuestion) => void;
}

export function SuggestedQuestionCard({ item, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="group flex w-full flex-col items-start gap-6 rounded-2xl border border-[#E5E9F2] bg-gradient-to-br from-white to-[#EEF2FF] p-5 text-left transition-all hover:border-[#2D6BFF] hover:shadow-md"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2D6BFF] text-white shadow-sm">
        <Send className="h-4 w-4" strokeWidth={2.25} />
      </span>
      <span className="text-[14px] leading-snug text-[#1F2937]">
        {item.question}
      </span>
    </button>
  );
}
