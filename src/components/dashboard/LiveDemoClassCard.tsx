// src/components/dashboard/LiveDemoClassCard.tsx
import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Video, Calendar, Clock, Loader2, Sparkles, ExternalLink, ChevronRight, User } from "lucide-react";
import type { DemoClassItem } from "@/types/demoClass";
import { demoClassService, parseDemoDate } from "@/services/demoClass.service";
import { toast as sonnerToast } from "sonner";
import { useToast } from "@/hooks/use-toast";

interface LiveDemoClassCardProps {
  demoClasses: DemoClassItem[];
  onRefresh?: () => void;
  className?: string;
}

export const LiveDemoClassCard: React.FC<LiveDemoClassCardProps> = ({
  demoClasses,
  onRefresh,
  className = "",
}) => {
  const { toast } = useToast();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // Keep current time updated every 15s for live countdown & 15m window precision
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const activeDemo = useMemo(() => {
    if (!demoClasses || demoClasses.length === 0) return null;
    return demoClasses[selectedIndex] || demoClasses[0];
  }, [demoClasses, selectedIndex]);

  if (!activeDemo) {
    return null;
  }

  const startTime = parseDemoDate(activeDemo.scheduledStartAt || (activeDemo as any).scheduledAt);
  const startDate = startTime ? new Date(startTime) : null;

  const durationMin = activeDemo.durationMinutes || 90;
  const endTime = parseDemoDate(activeDemo.scheduledEndAt) || (startTime ? startTime + durationMin * 60 * 1000 : null);

  // Window calculation: Available 15 minutes before start until session ends
  const effectiveEnd = endTime || (startTime ? startTime + durationMin * 60 * 1000 : null);
  const isWithin15MinWindow =
    startTime != null &&
    currentTime >= startTime - 15 * 60 * 1000 &&
    (effectiveEnd == null || currentTime <= effectiveEnd);

  const isLiveNow =
    startTime != null &&
    currentTime >= startTime &&
    (effectiveEnd == null || currentTime <= effectiveEnd);

  const isUpcoming = startTime != null && currentTime < startTime - 15 * 60 * 1000;

  // Formatted date and time strings
  const formattedDate = startDate && !isNaN(startDate.getTime())
    ? startDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "Scheduled";

  const formattedTime = startDate && !isNaN(startDate.getTime())
    ? startDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Soon";

  // Time remaining calculation
  const timeRemainingText = useMemo(() => {
    if (!startTime) return "";
    const diffMs = startTime - currentTime;
    if (diffMs <= 0) {
      return isLiveNow ? "Live Now" : "Session in progress";
    }
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 60) {
      return `Starts in ${diffMins} min${diffMins === 1 ? "" : "s"}`;
    }
    const diffHours = Math.floor(diffMins / 60);
    const remMins = diffMins % 60;
    if (diffHours < 24) {
      return `Starts in ${diffHours}h ${remMins > 0 ? `${remMins}m` : ""}`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `In ${diffDays} day${diffDays === 1 ? "" : "s"}`;
  }, [startTime, currentTime, isLiveNow]);

  const handleJoin = async () => {
    if (!activeDemo.id) return;

    setJoiningId(activeDemo.id);
    try {
      const res = await demoClassService.joinDemoClass(activeDemo.id);
      const joinUrl =
        res?.joinUrl ||
        res?.url ||
        (typeof res === "string" ? res : null) ||
        activeDemo.joinUrl;

      // If instructor started the meeting and joinUrl is valid
      if (joinUrl && typeof joinUrl === "string" && joinUrl.startsWith("http")) {
        sonnerToast.success("Joining Demo Class...");
        window.open(joinUrl, "_blank", "noopener,noreferrer");
      } else {
        // Instructor hasn't started the session yet
        sonnerToast.warning("Wait for the instructor to join the meeting.", {
          description: "The instructor has not started the session yet. Please try again shortly.",
        });
        toast({
          title: "Please wait",
          description: "Wait for the instructor to join the meeting.",
        });
      }
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Wait for the instructor to join the meeting.";

      sonnerToast.warning("Wait for the instructor to join the meeting.", {
        description: errMsg.includes("instructor") ? errMsg : "Wait for the instructor to join the meeting.",
      });
      toast({
        title: "Instructor not joined yet",
        description: "Wait for the instructor to join the meeting.",
      });
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div
      className={`rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50/80 via-white to-blue-50/30 dark:from-blue-950/30 dark:via-card dark:to-blue-950/20 p-4 sm:p-5 md:p-6 shadow-xs transition-all hover:shadow-md ${className}`}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
        {/* Left / Main Info */}
        <div className="space-y-3 flex-1 min-w-0">
          {/* Header section with live badge */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:bg-blue-900/40 dark:text-blue-300 shrink-0">
              <Video className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB] dark:text-blue-400">
              Your Live Demo Class
            </span>

            {isLiveNow ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-900">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                Live Now
              </span>
            ) : isWithin15MinWindow ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                Starting Soon
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100/80 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                {timeRemainingText}
              </span>
            )}
          </div>

          {/* Demo Class / Course Title */}
          <div className="space-y-1">
            <h3 className="font-bold text-base sm:text-lg text-card-foreground leading-snug line-clamp-2">
              {activeDemo.title || activeDemo.courseTitle || "Live Interactive Demo Class"}
            </h3>
            {activeDemo.courseTitle && activeDemo.courseTitle !== activeDemo.title && (
              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
                Course: <span className="font-medium text-foreground">{activeDemo.courseTitle}</span>
              </p>
            )}
          </div>

          {/* Metadata Badges (Date, Time, Instructor) */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground pt-0.5">
            <div className="flex items-center gap-1.5 bg-background/90 dark:bg-muted/40 px-2.5 py-1 rounded-lg border border-border/60">
              <Calendar className="h-3.5 w-3.5 text-[#2563EB] shrink-0" />
              <span className="font-medium text-foreground">{formattedDate}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-background/90 dark:bg-muted/40 px-2.5 py-1 rounded-lg border border-border/60">
              <Clock className="h-3.5 w-3.5 text-[#2563EB] shrink-0" />
              <span className="font-medium text-foreground">{formattedTime}</span>
            </div>
            {activeDemo.instructorName && (
              <div className="flex items-center gap-1.5 bg-background/90 dark:bg-muted/40 px-2.5 py-1 rounded-lg border border-border/60">
                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">Instructor: <span className="text-foreground font-medium">{activeDemo.instructorName}</span></span>
              </div>
            )}
          </div>

          {/* Multi-slot selector if student booked multiple demo classes */}
          {demoClasses.length > 1 && (
            <div className="flex items-center gap-2 pt-1 text-xs">
              <span className="text-xs text-muted-foreground font-medium shrink-0">Your Sessions:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {demoClasses.map((d, i) => (
                  <button
                    key={d.id || i}
                    type="button"
                    onClick={() => setSelectedIndex(i)}
                    className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-colors ${
                      selectedIndex === i
                        ? "bg-[#2563EB] text-white shadow-xs"
                        : "bg-background text-muted-foreground hover:bg-muted border border-border"
                    }`}
                  >
                    Session #{i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right / CTA Action Button */}
        <div className="flex flex-col items-stretch sm:items-end justify-center gap-2 shrink-0 md:min-w-[190px] pt-1 md:pt-0">
          <Button
            type="button"
            onClick={handleJoin}
            disabled={joiningId === activeDemo.id}
            size="lg"
            className={`w-full md:w-auto md:min-w-[180px] h-11 px-6 rounded-xl font-semibold text-sm shadow-xs transition-all ${
              isWithin15MinWindow || isLiveNow
                ? "bg-[#2563EB] hover:bg-blue-700 text-white shadow-blue-500/20 shadow-md"
                : "bg-blue-600/90 hover:bg-blue-600 text-white"
            }`}
          >
            {joiningId === activeDemo.id ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : isLiveNow ? (
              <>
                <Video className="h-4 w-4 mr-2" />
                Join Now
              </>
            ) : isWithin15MinWindow ? (
              <>
                <Video className="h-4 w-4 mr-2" />
                Join Now
              </>
            ) : (
              <>
                <Video className="h-4 w-4 mr-2 opacity-80" />
                Join ({formattedTime})
              </>
            )}
          </Button>

          {activeDemo.liveCourseId && (
            <Link
              to={`/courses/${activeDemo.liveCourseId}`}
              className="flex items-center justify-center md:justify-end gap-1 text-xs text-muted-foreground hover:text-[#2563EB] font-medium transition-colors pt-0.5"
            >
              <span>View course details</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
