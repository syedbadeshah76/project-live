import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import active_streak from "../assets/active_streak.png";
import inactive_strak from "../assets/inactive_streak.png";
import streaklogo from "../assets/streak_logo.png";
import streak_fire from "../assets/streak_fire.png";
import CircularProgress from "./streak/CircularProgress";
import ezcoin from "../assets/ez_coin.png"
import ez_coin1 from "../assets/ez_coin_1.png"
import {
  Target,
  Trophy,
  BookOpen,
  Upload,
  Eye,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Flame,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { streakService, type StreakData } from "@/services/streak.service";

const Streak = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  const fetchStreak = async () => {
    try {
      const res = await streakService.getStreakData();
      if (res.success) setData(res.data);
    } catch (err) {
      console.error("Failed to load streak data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStreak();
  }, []);

  const handleClaimReward = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      await streakService.claimReward("next");
      await fetchStreak();
    } catch (err) {
      console.error("Failed to claim reward:", err);
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Skeleton className="lg:col-span-8 h-56 rounded-2xl" />
          <Skeleton className="lg:col-span-4 h-56 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-6">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-68 rounded-2xl" />
          </div>
        </div>
        <Skeleton className="h-44 rounded-2xl" />
      </main>
    );
  }

  if (!data) return null;

  const {
    currentStreak,
    completedToday,
    streakProgress,
    coins,
    weeklyActivity,
    todaysGoal,
    assignment,
    milestones,
    badges,
    calendarStats,
    monthlyComparison,
  } = data;

  const gaugeProgress = Math.max(0, Math.min(100, streakProgress));
  const gaugeArcLength = 157;
  const gaugeOffset = gaugeArcLength - (gaugeProgress / 100) * gaugeArcLength;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6">
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-card rounded-2xl border border-border p-6 md:p-7">
          <div className="flex items-center gap-2 mb-5">
            <img src={streaklogo} alt="streak icon" className="h-6 w-6" />
            <span className="text-xl font-semibold text-[#604BD6]">Streak Hero</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center gap-4">
              <img src={streak_fire} alt="streak fire" className="h-14 w-14 shrink-0" />
              <div>
                <h2 className="text-3xl font-bold text-card-foreground">{currentStreak} Day Streak</h2>
                <p className="text-sm text-muted-foreground mt-1">Progress towards the next milestone</p>
              </div>
            </div>
            <CircularProgress currentStreak={currentStreak} completedToday={completedToday} />
          </div>
        </div>

        <div className="lg:col-span-4 bg-card rounded-2xl border border-border p-6 md:p-7">
          <div className="flex items-center gap-2 mb-5">
            <BookOpen className="h-5 w-5 text-card-foreground" />
            <h3 className="font-semibold text-card-foreground">Assignment</h3>
          </div>

          {assignment ? (
            <div className="flex flex-col h-[calc(100%-2rem)]">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 rounded-lg bg-[#604BD6]/10 shrink-0">
                  <BookOpen className="h-4 w-4 text-[#604BD6]" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-card-foreground">{assignment.title}</p>
                  <p className="text-xs text-muted-foreground mt-2">Assignment {assignment.assignmentNumber}</p>
                  <p className="text-xs text-muted-foreground mt-1">Submit before 5th July</p>
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between">
                <button className="text-sm text-[#604BD6] hover:underline inline-flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  View
                </button>
                <Button size="sm" className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Upload className="h-4 w-4 mr-1" />
                  Upload
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No assignments due</p>
          )}
        </div>
      </section>

<section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
  {/* LEFT SIDE */}
  <div className="lg:col-span-4 flex flex-col gap-6">
    
    {/* COINS WALLET */}
    <div className="bg-white rounded-[28px] p-7 border border-[#ECECEC] shadow-sm">
      <div className="flex items-center gap-2 mb-8">
        <div className="h-5 w-5 rounded-full overflow-hidden">
          <img
            src={ezcoin}
            alt="EZ Coin"
            className="h-full w-full object-cover"
          />
        </div>

        <h3 className="text-[15px] font-semibold text-[#1E1E1E] font-[Montserrat]">
          Coins Wallet
        </h3>
      </div>

      <div className="flex items-center gap-5">
        <img
          src={ez_coin1}
          alt="EZ Coin"
          className="h-[72px] w-[80px] object-contain"
        />

        <h2 className="text-[26px] leading-none font-bold text-[#1E1E1E] font-[Montserrat]">
          {coins} Coins
        </h2>
      </div>
    </div>

    {/* STREAK PROGRESS */}
    <div className="bg-white rounded-[28px] p-7 border h-[340px] border-[#ECECEC] shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <Flame className="h-5 w-5 text-[#2954D1]" />

        <h3 className="text-[15px] font-semibold text-[#1E1E1E] font-[Montserrat]">
          Streak Progress
        </h3>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* LEFT */}
        <div className="flex flex-col items-start">
          <h2 className="text-[40px] leading-none font-bold text-[#2954D1] font-[Montserrat]">
            {streakProgress}%
          </h2>

          <div className="mt-5 bg-[#DCE7FF] rounded-full px-4 py-1 flex items-center gap-1 ">
            <span className="text-[#2954D1] text-[13px] font-semibold">
              {monthlyComparison}%
            </span>

            <span className="text-[#2954D1] text-[18px]">
              ▲
            </span>
          </div>

          <p className="text-[#1E1E1E] text-[14px] mt-4 font-medium">
            Compared to last month
          </p>
        </div>

        {/* GAUGE */}
        <div className="relative w-[220px] h-[240px] ">
          <svg
            className="w-full h-full "
            viewBox="0 0 220 150"
          >
            {/* Background */}
            <path
              d="M25 120 A85 85 0 0 1 195 120"
              fill="none"
              stroke="#ECECEC"
              strokeWidth="16"
              strokeLinecap="round"
            />

            {/* Progress */}
            <motion.path
              d="M25 120 A85 85 0 0 1 195 120"
              fill="none"
              stroke="#2954D1"
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray="267"
              initial={{ strokeDashoffset: 267 }}
              animate={{
                strokeDashoffset:
                  267 - (267 * streakProgress) / 100,
              }}
              transition={{
                duration: 1.4,
                ease: "easeOut",
              }}
            />

            {/* Needle */}
            <line
              x1="110"
              y1="120"
              x2="155"
              y2="55"
              stroke="#B9C9FF"
              strokeWidth="6"
              strokeLinecap="round"
            />

            {/* Center Dot */}
            <circle
              cx="110"
              cy="120"
              r="13"
              fill="white"
              stroke="#2954D1"
              strokeWidth="6"
            />
          </svg>
        </div>
      </div>
    </div>
  </div>

  {/* CENTER */}
  <div className="lg:col-span-4 flex flex-col gap-6">
    
    {/* TODAY GOAL */}
    <div className="bg-white rounded-[18px] p-7  border border-[#ECECEC] shadow-sm ]">
      <div className="flex items-center gap-2 mb-8">
        <Target className="h-5 w-5 text-[#2954D1]" />

        <h3 className="text-[24px] font-semibold text-[#1E1E1E] font-[Montserrat]">
          Today&apos;s Goal
        </h3>
      </div>

      {todaysGoal && (
        <div className="flex flex-col h-full">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <h2 className="text-[14px] leading-[42px] text-[#2954D1] font-bold font-[Montserrat]">
                {todaysGoal.courseTitle}
              </h2>

              <p className="text-[12px] text-[#2954D1] font-semibold ">
                Lesson {todaysGoal.lessonNumber}
              </p>
            </div>

            <span className="text-[14px] text-[#2954D1] font-semibold whitespace-nowrap">
              {todaysGoal.duration} mins
            </span>
          </div>

          <div className="w-full h-3 bg-[#ECECEC] rounded-full overflow-hidden mb-10">
            <div
              className="h-full bg-[#2954D1] rounded-full"
              style={{
                width: `${todaysGoal.progress}%`,
              }}
            />
          </div>

          <div className="flex items-center justify-between mt-[2px] gap-4 flex-wrap">
            <Button
              size="lg"
              onClick={() =>
                navigate(`/learn/${todaysGoal.courseId}`)
              }
              className="bg-[#2954D1] hover:bg-[#2954D1]/90 rounded-xl px-2 h-[32px] text-white text-[12px] font-semibold"
            >
              Continue Learning
            </Button>

            <button className="text-[#2954D1] underline text-[14px] font-medium">
              View Goals
            </button>
          </div>
        </div>
      )}
    </div>

    {/* MILESTONES */}
    <div className="bg-white rounded-[28px] p-7 border border-[#ECECEC] shadow-sm">
      <div className="flex items-center gap-2 mb-8">
        <Trophy className="h-5 w-5 text-[#2954D1]" />

        <h3 className="text-[15px] font-semibold text-[#1E1E1E] font-[Montserrat]">
          Milestones
        </h3>
      </div>

      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-[22px] leading-[30px] font-bold text-[#1E1E1E]">
            Next Milestone in{" "}
            <span className="text-[#2954D1]">
              {milestones.daysToNext} DAYS
            </span>
          </h2>

          <p className="text-[14px] font-semibold text-[#1E1E1E] mt-2">
            for {milestones.coinsReward} more coins
          </p>
        </div>

        <img
          src={ez_coin1}
          alt="coin"
          className="w-[70px] h-[70px]"
        />
      </div>

      <div className="w-full h-3 bg-[#ECECEC] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#2954D1] rounded-full"
          style={{
            width: `${milestones.progress}%`,
          }}
        />
      </div>
    </div>
  </div>

  {/* RIGHT */}
  <div className="lg:col-span-4 flex flex-col gap-4">
    
    {/* CALENDAR */}
    <div className="bg-white rounded-[28px] p-7 border border-[#ECECEC] shadow-sm">
      <div className="flex items-center justify-between mb-7">
        <button>
          <ChevronLeft className="h-5 w-5 text-[#2954D1]" />
        </button>

        <span className="text-[#2954D1] underline text-[18px] font-semibold">
          {new Date(calendarStats.currentDate).toLocaleDateString(
            "en-US",
            {
              month: "long",
              day: "numeric",
              year: "numeric",
            }
          )}
        </span>

        <button>
          <ChevronRight className="h-5 w-5 text-[#2954D1]" />
        </button>
      </div>

      <h2 className="text-[20px] leading-[28px] font-bold text-[#1E1E1E]">
        {calendarStats.daysWithoutBreak} Days without a break
      </h2>

      <p className="text-[10px] text-[#8E8E8E] mt-3 mb-8">
        The record is {calendarStats.recordDays} Days without a break
      </p>

      <div className="grid grid-cols-7 gap-2 mb-8">
        {weeklyActivity.map((day) => (
          <div
            key={day.shortName}
            className={`rounded h-[62px] w-9 flex flex-col items-center justify-center gap-1 ${
              day.active
                ? "bg-[#1E52D6] text-white"
                : "bg-[#F1F1F1] text-[#BDBDBD]"
            }`}
          >
            <span className="text-[7px] font-semibold">
              {day.shortName}
            </span>

            <div className="w-5 h-6 text-[#FAFAFA]">
              {day.active ? (
                <img
                  src={active_streak}
                  alt=""
                  className="w-full h-full"
                />
              ) : (
                <img
                  src={inactive_strak}
                  alt=""
                  className="w-full h-full"
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <ul className="space-y-3">
        <li className="flex items-center gap-3 text-[14px] text-[#4A4A4A]">
          <span className="w-2 h-2 rounded-full bg-[#2954D1]" />
          {calendarStats.classesCovered} Classes covered
        </li>

        <li className="flex items-center gap-3 text-[14px] text-[#4A4A4A]">
          <span className="w-2 h-2 rounded-full bg-[#2954D1]" />
          {calendarStats.assignmentsCompleted} Assignments completed
        </li>
      </ul>
    </div>

    {/* FEED */}
    <div className="bg-white rounded-[28px] p-7 border border-[#ECECEC] shadow-sm min-h-[120px]">
      <div className="flex items-center gap-2 mb-8">
        <Calendar className="h-5 w-5 text-[#2954D1]" />

        <h3 className="text-[15px] font-semibold text-[#1E1E1E] font-[Montserrat]">
          Feed
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="text-left border-b border-[#ECECEC]">
              <th className="pb-4 text-[#2954D1] font-semibold">
                Name
              </th>

              <th className="pb-4 text-[#2954D1] font-semibold text-center">
                Place
              </th>

              <th className="pb-4 text-[#2954D1] font-semibold text-right">
                Points
              </th>
            </tr>
          </thead>

          {/* <tbody>
            {leaderboard?.map((user, index) => (
              <tr
                key={index}
                className="border-b border-[#F3F3F3]"
              >
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />

                    <span className="font-medium text-[#1E1E1E]">
                      {user.name}
                    </span>
                  </div>
                </td>

                <td className="text-center font-medium">
                  {user.rank}
                </td>

                <td className="text-right font-semibold">
                  {user.points}
                </td>
              </tr>
            ))}
          </tbody> */}
        </table>
      </div>
    </div>
  </div>
</section>

      <section className="bg-card rounded-2xl border border-border p-6">
        <h3 className="text-base font-semibold text-card-foreground mb-4">Badges</h3>
        <div className="flex gap-4 overflow-x-auto pb-1">
          {badges.map((badge) => (
            <motion.div
              key={badge.id}
              whileHover={{ scale: 1.04 }}
              transition={{ duration: 0.2 }}
              className={`relative min-w-[140px] rounded-2xl p-4 text-center border ${
                badge.earned ? "bg-card border-border" : "bg-muted/70 border-border"
              }`}
            >
              <img
                src={badge.icon}
                alt={badge.title}
                className={`mx-auto mb-3 h-10 w-10 ${badge.earned ? "" : "opacity-50"}`}
              />
              <p className={`text-xs font-medium ${badge.earned ? "text-card-foreground" : "text-muted-foreground"}`}>
                {badge.title}
              </p>

              {!badge.earned && (
                <div className="absolute inset-0 rounded-2xl bg-background/35 backdrop-blur-[1px] flex items-center justify-center">
                  <span className="text-lg">🔒</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Streak;
