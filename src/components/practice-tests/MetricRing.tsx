import type { ReactNode } from "react";

interface Props {
  label: string;
  icon: ReactNode;
  value: number; // 0-100 percentage
  centerText: string;
  subtext: string;
  color?: string;
}

export function MetricRing({
  label,
  icon,
  value,
  centerText,
  subtext,
  color = "#2D4BFF",
}: Props) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="rounded-2xl border border-[#E5E9F2] bg-white p-4">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#E5E9F2] bg-[#F7F9FF] px-3 py-1 text-xs font-semibold text-[#2D4BFF]">
        {icon} {label}
      </div>
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16">
          <svg
            width={64}
            height={64}
            viewBox="0 0 64 64"
            className="-rotate-90"
          >
            <circle
              cx={32}
              cy={32}
              r={r}
              stroke="#E5E9F2"
              strokeWidth={5}
              fill="none"
            />
            <circle
              cx={32}
              cy={32}
              r={r}
              stroke={color}
              strokeWidth={5}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 800ms ease-out" }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-base font-bold text-[#1F2937]">
            {centerText}
          </div>
        </div>
        <div className="text-sm text-[#4B5563]">{subtext}</div>
      </div>
    </div>
  );
}
