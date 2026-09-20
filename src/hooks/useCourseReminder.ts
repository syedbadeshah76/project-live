import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { remindersService, type CourseReminder } from "@/services/reminders.service";

export function useCourseReminder(courseId?: string) {
  const [reminder, setReminder] = useState<CourseReminder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!courseId) return;
    setIsLoading(true);
    try {
      const found = await remindersService.getReminderForCourse(courseId);
      if (mounted.current) setReminder(found);
    } catch (error) {
      console.error("Failed to load course reminder", error);
    } finally {
      if (mounted.current) setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const createReminder = useCallback(async () => {
    if (!courseId || isSaving) return;
    setIsSaving(true);
    try {
      const created = await remindersService.createReminder(courseId);
      if (mounted.current) setReminder(created);
      toast.success("Reminder set for this course");
      return created;
    } catch (error) {
      console.error("Failed to create course reminder", error);
      toast.error(error instanceof Error ? error.message : "Could not set reminder");
      return null;
    } finally {
      if (mounted.current) setIsSaving(false);
    }
  }, [courseId, isSaving]);

  return { reminder, hasReminder: Boolean(reminder), isLoading, isSaving, createReminder, refresh: load };
}
