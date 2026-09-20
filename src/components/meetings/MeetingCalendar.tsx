import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Meeting } from "@/types/meeting.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Users,
  Video,
  X,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday } from "date-fns";

interface MeetingCalendarProps {
  meetings: Meeting[];
  loading?: boolean;
  onMeetingClick?: (meeting: Meeting) => void;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-400",
  approved: "bg-green-500",
  rejected: "bg-red-400",
  cancelled: "bg-muted-foreground/40",
};

const statusBadge: Record<string, { className: string; label: string }> = {
  pending: { className: "bg-amber-100 text-amber-700", label: "Pending" },
  approved: { className: "bg-green-100 text-green-700", label: "Approved" },
  rejected: { className: "bg-red-100 text-red-700", label: "Rejected" },
  cancelled: { className: "bg-muted text-muted-foreground", label: "Cancelled" },
};

const meetingTypeBadge: Record<string, { className: string; label: string }> = {
  zoom: { className: "bg-blue-100 text-blue-700", label: "Zoom" },
  google_meet: { className: "bg-green-100 text-green-700", label: "Google Meet" },
  internal: { className: "bg-purple-100 text-purple-700", label: "Internal" },
};

export const MeetingCalendar = ({ meetings, loading, onMeetingClick }: MeetingCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const meetingsByDate = useMemo(() => {
    const map: Record<string, Meeting[]> = {};
    meetings.forEach((m) => {
      if (!map[m.date]) map[m.date] = [];
      map[m.date].push(m);
    });
    return map;
  }, [meetings]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days: Date[] = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const selectedDateMeetings = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return meetingsByDate[dateStr] || [];
  }, [selectedDate, meetingsByDate]);

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (loading) {
    return (
      <div className="bg-card rounded-2xl shadow-card p-4 md:p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-16 md:h-24 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Calendar */}
      <div className="bg-card rounded-2xl shadow-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg md:text-xl font-semibold text-card-foreground">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }}>
              Today
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {weekdays.map((day) => (
            <div key={day} className="p-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayMeetings = meetingsByDate[dateStr] || [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const today = isToday(day);

            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(isSelected ? null : day)}
                className={`
                  relative min-h-[60px] md:min-h-[90px] p-1.5 md:p-2 border-b border-r border-border text-left transition-colors
                  ${!isCurrentMonth ? "bg-muted/30" : "hover:bg-muted/50"}
                  ${isSelected ? "bg-primary/5 ring-2 ring-primary/30 ring-inset" : ""}
                `}
              >
                <span className={`
                  text-xs md:text-sm font-medium inline-flex items-center justify-center w-6 h-6 md:w-7 md:h-7 rounded-full
                  ${!isCurrentMonth ? "text-muted-foreground/40" : "text-card-foreground"}
                  ${today ? "bg-primary text-primary-foreground" : ""}
                `}>
                  {format(day, "d")}
                </span>

                {/* Meeting dots / pills */}
                {dayMeetings.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {dayMeetings.slice(0, 2).map((m) => (
                      <div
                        key={m.id}
                        className={`hidden md:block text-[10px] leading-tight px-1.5 py-0.5 rounded truncate text-white ${statusColors[m.status]}`}
                        title={m.title}
                      >
                        {m.startTime} {m.title}
                      </div>
                    ))}
                    {/* Mobile: just dots */}
                    <div className="flex gap-0.5 md:hidden">
                      {dayMeetings.slice(0, 3).map((m) => (
                        <div key={m.id} className={`w-1.5 h-1.5 rounded-full ${statusColors[m.status]}`} />
                      ))}
                    </div>
                    {dayMeetings.length > 2 && (
                      <span className="hidden md:block text-[10px] text-muted-foreground">+{dayMeetings.length - 2} more</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Panel */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card rounded-2xl shadow-card p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-semibold text-card-foreground">
                  {format(selectedDate, "EEEE, MMMM d, yyyy")}
                </h3>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedDate(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {selectedDateMeetings.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">No meetings scheduled for this day</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDateMeetings.map((meeting) => {
                    const badge = statusBadge[meeting.status];
                    const typeBadge = meetingTypeBadge[meeting.meetingType];
                    return (
                      <div
                        key={meeting.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 md:p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors cursor-pointer"
                        onClick={() => onMeetingClick?.(meeting)}
                      >
                        <div className={`w-1 sm:w-1.5 sm:self-stretch rounded-full shrink-0 ${statusColors[meeting.status]}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h4 className="font-semibold text-card-foreground text-sm">{meeting.title}</h4>
                            <Badge variant="outline" className={`text-[10px] ${badge.className}`}>{badge.label}</Badge>
                            {typeBadge && <Badge variant="outline" className={`text-[10px] ${typeBadge.className}`}>{typeBadge.label}</Badge>}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{meeting.startTime} • {meeting.duration}m</span>
                            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{meeting.instructorName}</span>
                            <span className="flex items-center gap-1"><Video className="h-3 w-3" />{meeting.courseName}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
