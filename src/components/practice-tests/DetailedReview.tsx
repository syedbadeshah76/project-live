import { Check, X, Info, AlertTriangle } from "lucide-react";
import type { ReviewQuestion } from "@/types/practiceTest";

export function DetailedReview({ review }: { review: ReviewQuestion[] }) {
  if (!review || review.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        No detailed review data available for this attempt.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-5">
      {review.map((q) => {
        const isAnswered = q.selectedOptionId != null || (q.selectedAnswers && q.selectedAnswers.length > 0);
        const isStudentCorrect = q.isCorrect ?? (q.selectedOptionId === q.correctOptionId);
        const isMultiple =
          q.type === "MULTIPLE_CHOICE" ||
          (q as any).type === "multiple" ||
          (q as any).questionType === "MULTIPLE_CHOICE" ||
          (q.correctAnswers && q.correctAnswers.length > 1);

        return (
          <div key={q.id} className="rounded-2xl border border-[#E5E9F2] bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-bold text-[#2D4BFF]">
                  Question {q.index}
                </div>
                {isMultiple && (
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-[#2D4BFF]">
                    Multiple Choice
                  </span>
                )}
              </div>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                  !isAnswered
                    ? "bg-slate-100 text-slate-600"
                    : isStudentCorrect
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                {!isAnswered ? (
                  "Unanswered"
                ) : isStudentCorrect ? (
                  <>
                    <Check className="h-3 w-3" /> Correct
                  </>
                ) : (
                  <>
                    <X className="h-3 w-3" /> Wrong
                  </>
                )}
              </span>
            </div>

            <p className="text-sm font-semibold text-[#1F2937] leading-relaxed">{q.text}</p>

            <div className="grid gap-2.5 md:grid-cols-2">
              {q.options.map((o) => {
                const isCorrectOption =
                  o.id === q.correctOptionId ||
                  (q.correctAnswers && q.correctAnswers.includes(o.id));
                const isSelectedOption =
                  o.id === q.selectedOptionId ||
                  (q.selectedAnswers && q.selectedAnswers.includes(o.id));
                const isWrongPick = isSelectedOption && !isCorrectOption;

                let style = "border-[#E5E9F2] bg-[#F7F9FF] text-[#1F2937]";
                if (isCorrectOption) style = "border-emerald-300 bg-emerald-50/80 text-emerald-900 font-medium";
                if (isWrongPick) style = "border-rose-300 bg-rose-50/80 text-rose-900 font-medium";

                return (
                  <div
                    key={o.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition-all ${style}`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold shrink-0 ${
                          isCorrectOption
                            ? "bg-emerald-600 text-white"
                            : isWrongPick
                            ? "bg-rose-600 text-white"
                            : "bg-white text-[#2D4BFF] border border-slate-200"
                        }`}
                      >
                        {o.id}
                      </span>
                      <span>{o.text}</span>
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSelectedOption && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/80 border border-slate-200 text-slate-700">
                          Your Answer
                        </span>
                      )}
                      {isCorrectOption && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
                      {isWrongPick && <X className="h-4 w-4 text-rose-600 shrink-0" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Explanation section for correct & wrong answers */}
            <div className="pt-2 space-y-2">
              {q.explanation && (
                <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-3 text-xs text-slate-700 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#2D4BFF]">
                    <Info className="h-3.5 w-3.5" /> Explanation (Correct Answer)
                  </div>
                  <p className="leading-relaxed">{q.explanation}</p>
                </div>
              )}

              {!isStudentCorrect && isAnswered && q.wrongExplanation && (
                <div className="rounded-xl bg-amber-50/60 border border-amber-100 p-3 text-xs text-amber-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" /> Why Your Answer Was Incorrect
                  </div>
                  <p className="leading-relaxed">{q.wrongExplanation}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
