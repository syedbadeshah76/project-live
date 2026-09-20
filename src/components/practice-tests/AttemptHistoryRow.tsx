import type { AttemptHistoryItem } from "@/types/practiceTest";

export function AttemptHistoryRow({ item }: { item: AttemptHistoryItem }) {
  const passed =
    item.status === "PASS" ||
    item.status === "Passed" ||
    (item as any).passed === true;

  const scoreFormatted = Math.round(Number(item.scorePercentage || 0));

  return (
    <div className="flex items-center justify-between rounded-xl bg-[#F4F6FB] px-4 py-3">
      <span className="text-sm font-medium text-[#4B5563]">
        {formatDate(item.attemptDate)}
      </span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-[#1F2937]">{scoreFormatted}%</span>
        <span
          className={`rounded-full px-3 py-0.5 text-xs font-semibold ${
            passed ? "bg-[#2D4BFF] text-white" : "bg-white text-[#EF4444] border border-[#FECACA]"
          }`}
        >
          {passed ? "Passed" : "Fail"}
        </span>
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}
