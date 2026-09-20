import { useEffect, useMemo, useState } from "react";
import type { Meeting } from "@/types/meeting.types";
import { useToast } from "@/hooks/use-toast";

interface UseMeetingRemindersOptions {
  meetings: Meeting[];
  reminderMinutes?: number[]; // e.g. [15, 5]
  onMeetingStart?: (m: Meeting) => void;
}

const meetingDate = (m: Meeting) => new Date(`${m.date}T${m.startTime}:00`);

export function useMeetingReminders({
  meetings = [],
  reminderMinutes = [15, 5],
  onMeetingStart,
}: Partial<UseMeetingRemindersOptions> = {}) {
  const { toast } = useToast();
  const [now, setNow] = useState(() => new Date());
  const [notified, setNotified] = useState<Record<string, Set<number>>>({});
  const [startedNotified, setStartedNotified] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    meetings.forEach((m) => {
      if (m.status !== "approved" && m.status !== "live") return;
      const start = meetingDate(m);
      const diffMin = Math.round((start.getTime() - now.getTime()) / 60000);

      reminderMinutes.forEach((mins) => {
        if (diffMin === mins && !notified[m.id]?.has(mins)) {
          toast({
            title: `Starting in ${mins} min`,
            description: m.title,
          });
          setNotified((prev) => {
            const set = new Set(prev[m.id] ?? []);
            set.add(mins);
            return { ...prev, [m.id]: set };
          });
        }
      });

      if (diffMin <= 0 && !startedNotified.has(m.id)) {
        onMeetingStart?.(m);
        setStartedNotified((prev) => new Set(prev).add(m.id));
      }
    });
  }, [
    meetings,
    now,
    notified,
    startedNotified,
    reminderMinutes,
    onMeetingStart,
    toast,
  ]);

  const countdowns = useMemo(() => {
    const map: Record<string, { minutes: number; isLive: boolean }> = {};
    meetings.forEach((m) => {
      const start = meetingDate(m);
      const end = new Date(start.getTime() + m.duration * 60000);
      const minutes = Math.round((start.getTime() - now.getTime()) / 60000);
      map[m.id] = { minutes, isLive: now >= start && now <= end };
    });
    return map;
  }, [meetings, now]);

  return { countdowns, now };
}

export default useMeetingReminders;
