import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.03)] rounded-[20px] p-5 sm:p-6 flex items-center justify-between min-h-[105px]",
        className,
      )}
    >
      {/* Background Decorative Organic Wave */}
      <div className="absolute inset-y-0 right-0 w-[55%] pointer-events-none overflow-hidden">
        <svg
          className="h-full w-full"
          viewBox="0 0 160 100"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M 45 0 C 15 35, 65 65, 30 100 L 160 100 L 160 0 Z"
            fill="#EEF4FF"
            className="dark:fill-blue-950/30"
          />
        </svg>
      </div>

      {/* Left Side: Value & Subtitle */}
      <div className="relative z-10 flex flex-col justify-center pr-2 min-w-0">
        <div className="truncate text-2xl sm:text-[26px] font-bold text-blue-600 dark:text-blue-400 tracking-tight leading-none mb-1.5">
          {value}
        </div>
        <div className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">
          {label}
        </div>
      </div>

      {/* Right Side: Circular Icon Badge */}
      <div className="relative z-10 ml-3 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1D4ED8] dark:bg-blue-600 text-white shadow-sm [&>svg]:h-5 [&>svg]:w-5 [&>svg]:stroke-[2.2]">
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}
