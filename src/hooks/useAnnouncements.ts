// src/hooks/useAnnouncements.ts
// Plain React hooks — no TanStack Query.
import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { announcementService, mapAnnouncement } from "@/services/announcements.service";
import type {
  Announcement,
  CreateAnnouncementRequest,
  EligibleCourseOption,
} from "@/types/announcement.types";

export function useEligibleCourses() {
  const { user } = useAuth();
  const [data, setData] = useState<EligibleCourseOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const courses = await announcementService.getEligibleCourses(user?.id);
        if (alive) setData(courses);
      } catch (e: any) {
        if (alive) {
          setError(e?.message || "Failed to load courses");
          setData([]);
        }
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  return { data, isLoading, error };
}

export function useAnnouncements(courses?: EligibleCourseOption[]) {
  const [data, setData] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const coursesRef = useRef<EligibleCourseOption[] | undefined>(courses);
  coursesRef.current = courses;

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await announcementService.getAnnouncements(coursesRef.current);
      setData(list);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load announcements");
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // wait until courses have resolved (undefined = caller not passing them)
    if (courses !== undefined && courses.length === 0) {
      setData([]);
      setIsLoading(false);
      return;
    }
    void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetch, courses?.length]);

  const addLocal = useCallback((a: Announcement) => {
    setData((prev) => [a, ...prev]);
  }, []);

  const updateLocal = useCallback((a: Announcement) => {
    setData((prev) => prev.map((x) => (x.id === a.id ? a : x)));
  }, []);

  const removeLocal = useCallback((id: string) => {
    setData((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return { data, isLoading, error, refetch, addLocal, updateLocal, removeLocal };
}

export function useAnnouncementMutations(courses: EligibleCourseOption[]) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const findCourse = (id: string) => courses.find((c) => c.courseId === id);

  const create = async (payload: CreateAnnouncementRequest): Promise<Announcement | null> => {
    setIsSubmitting(true);
    try {
      const raw = await announcementService.createAnnouncement(payload);
      toast({ title: "Announcement posted", description: "Students will see it in their notifications." });
      return mapAnnouncement(raw, findCourse(raw.courseId ?? payload.courseId));
    } catch (e: any) {
      toast({ title: "Failed to post announcement", description: e?.message, variant: "destructive" });
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const update = async (id: string, htmlContent: string, courseId: string): Promise<Announcement | null> => {
    setIsSubmitting(true);
    try {
      const raw = await announcementService.updateAnnouncement(id, { htmlContent });
      toast({ title: "Announcement updated" });
      return mapAnnouncement(raw, findCourse(raw.courseId ?? courseId));
    } catch (e: any) {
      toast({ title: "Failed to update announcement", description: e?.message, variant: "destructive" });
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const remove = async (id: string): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      await announcementService.deleteAnnouncement(id);
      toast({ title: "Announcement deleted" });
      return true;
    } catch (e: any) {
      toast({ title: "Failed to delete announcement", description: e?.message, variant: "destructive" });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { create, update, remove, isSubmitting };
}
