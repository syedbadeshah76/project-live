import { motion } from "framer-motion";

interface CircularProgressProps {
  currentStreak: number;
  completedToday: number;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  currentStreak,
  completedToday,
}) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = currentStreak > 0 ? completedToday / currentStreak : 0;
  const offset = circumference - progress * circumference;

  const getDayLabel = (day: number) => {
    if (day === 1) return "1st";
    if (day === 2) return "2nd";
    if (day === 3) return "3rd";
    return `${day}th`;
  };

  return (
    <div className="relative w-24 h-24">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="hsl(var(--border))"
            strokeWidth="8"
            fill="none"
          />
          <defs>
            <linearGradient id="streak-progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7C6CF3" />
              <stop offset="100%" stopColor="#4F46E5" />
            </linearGradient>
          </defs>
          <motion.circle
            cx="50"
            cy="50"
            r={radius}
            stroke="url(#streak-progress-gradient)"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] text-muted-foreground">Completed</span>
          <span className="text-sm font-bold text-card-foreground">
            {getDayLabel(completedToday)} Day
          </span>
        </div>
      </motion.div>
    </div>
  );
};

export default CircularProgress;
