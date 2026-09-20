import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { streakService } from "@/services/streak.service";

interface StreakProgressButtonProps {
  onClick: () => void;
  className?: string;
}

export const StreakProgressButton = ({
  onClick,
  className = "",
}: StreakProgressButtonProps) => {
  const [percent, setPercent] = useState<number>(20);
  const [streakDays, setStreakDays] = useState<number>(35);

  useEffect(() => {
    streakService
      .getStreakData?.()
      .then((res: any) => {
        const p = res?.data?.streakProgress;
        const s = res?.data?.currentStreak;

        if (typeof p === "number") {
          setPercent(Math.max(0, Math.min(100, p)));
        }

        if (typeof s === "number") {
          setStreakDays(s);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <button
      onClick={onClick}
      aria-label={`Learning streak ${streakDays} days, course progress ${percent}%`}
      className={`
        flex items-center
        justify-between
        w-[396px]
        h-[50px]
        px-4
        rounded-xl
        border
        border-[#CDDBFF]
        bg-[#E9EFFF]
        hover:opacity-90
        transition-all
        ${className}
      `}
    >
      {/* Left Text */}
      <div className="flex items-center gap-3">
     <span className="text-[16px] font-semibold text-[#2453D4] whitespace-nowrap">
  Streak Progress
</span>

        {/* Streak Circle */}
  <div className="relative flex items-center justify-center">
  <Flame
    className="w-[40px] h-[80px] fill-[#2453D4] text-[#2453D4]  scale-x-[-1]"
    strokeWidth={1.5}
  />

<span className="absolute text-white text-xs font-bold mt-4">
  {streakDays}
</span>
</div>
      </div>

      {/* Progress Bar */}
      <div className="relative w-[170px] h-[14px] bg-white rounded-full overflow-hidden border border-[#CDDBFF]">
        <div
          className="absolute left-0 top-0 h-full bg-[#2453D4] rounded-full transition-all duration-500 flex items-center justify-center"
          style={{
            width: `${Math.max(percent, 10)}%`,
          }}
        >
          <span className="text-[10px] text-white font-semibold">
            {percent}%
          </span>
        </div>
      </div>
    </button>
  );
};