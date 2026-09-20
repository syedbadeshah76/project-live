import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, ClipboardList, Target, Clock, BarChart3, Loader2 } from "lucide-react";
import type { PracticeTestSummary } from "@/types/practiceTest";

export function PracticeTestCard({ test }: { test: PracticeTestSummary }) {
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);

  const handleStart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (starting) return;
    setStarting(true);
    navigate(`/dashboard/practice-tests/${test.id}`);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-5 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 transition-all">
      {/* Left Thumbnail */}
      <div className="relative w-full sm:w-[160px] h-[120px] sm:h-[96px] shrink-0 overflow-hidden rounded-xl bg-muted">
        <img
          src={test.thumbnail}
          alt={test.title}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        {test.difficulty && (
          <span className="absolute top-2 left-2 inline-flex items-center rounded-md bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-white">
            {test.difficulty}
          </span>
        )}
      </div>

      {/* Middle Content */}
      <div className="min-w-0 flex-1 flex flex-col justify-center">
        {test.category && (
          <span className="inline-block bg-blue-50 text-[#1E52D6] font-medium text-[11px] px-2.5 py-0.5 rounded-full mb-1 w-max">
            {test.category}
          </span>
        )}
        <h3 className="text-base sm:text-[17px] font-bold text-foreground line-clamp-2 leading-snug">
          {test.title}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">
          {test.description}
        </p>

        {/* 2-Row Metadata Layout */}
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {/* Row 1 */}
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-[#1E52D6] shrink-0" />
              <span className="font-medium text-foreground">
                {Math.round(Number(test.passPercentage) || 0)}% Pass
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ClipboardList className="h-3.5 w-3.5 text-[#1E52D6] shrink-0" />
              <span className="font-medium text-foreground">{test.questionCount} Questions</span>
            </span>
          </div>

          {/* Row 2 */}
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[#1E52D6] shrink-0" />
              <span className="font-medium text-foreground">{test.durationMinutes}min</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-[#1E52D6] shrink-0" />
              <span className="font-medium text-foreground">
                {Math.round(Number(test.averageScore) || 0)}% avg
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Right CTA Button */}
      <div className="sm:self-center shrink-0 pt-2 sm:pt-0">
        <button
          onClick={handleStart}
          disabled={starting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#1E52D6] hover:bg-[#1946b8] px-5 h-11 text-sm font-semibold text-white shadow-sm transition-all active:scale-95 disabled:opacity-75 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
        >
          {starting ? (
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          ) : (
            <Play className="h-4 w-4 fill-current text-white" />
          )}
          <span>Start Test</span>
        </button>
      </div>
    </div>
  );
}
