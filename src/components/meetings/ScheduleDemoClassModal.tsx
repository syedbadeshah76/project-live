// src/components/meetings/ScheduleDemoClassModal.tsx
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { demoClassService } from "@/services/demoClass.service";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { Loader2 } from "lucide-react";

interface ScheduleDemoClassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const ScheduleDemoClassModal: React.FC<ScheduleDemoClassModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [liveCourseId, setLiveCourseId] = useState("");
  const [meetingPlatform, setMeetingPlatform] = useState("ZOOM");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");

  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Today's date string YYYY-MM-DD for min constraint
  const todayStr = new Date().toISOString().slice(0, 10);

  // Load instructor's own Live Courses
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoadingCourses(true);

    demoClassService
      .getInstructorLiveCourses(user)
      .then((list) => {
        if (cancelled) return;
        setCourses(list);
        if (list.length === 1 && !liveCourseId) {
          setLiveCourseId(list[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed to load courses for demo:", err);
      })
      .finally(() => {
        if (!cancelled) setLoadingCourses(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, user]);

  const resetForm = () => {
    setTitle("");
    setLiveCourseId("");
    setMeetingPlatform("ZOOM");
    setDate("");
    setTime("");
    setDescription("");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({ title: "Validation Error", description: "Class title is required.", variant: "destructive" });
      return;
    }

    if (!liveCourseId) {
      toast({ title: "Validation Error", description: "Please select a Live Course.", variant: "destructive" });
      return;
    }

    if (!date) {
      toast({ title: "Validation Error", description: "Please select a date.", variant: "destructive" });
      return;
    }

    if (!time) {
      toast({ title: "Validation Error", description: "Please select a start time.", variant: "destructive" });
      return;
    }

    // Format scheduledAt ISO string (e.g. 2026-08-30T16:50:00)
    const formattedTime = time.length === 5 ? `${time}:00` : time;
    const scheduledAt = `${date}T${formattedTime}`;

    setSubmitting(true);
    try {
      const payload = {
        liveCourseId,
        title: title.trim(),
        description: description.trim(),
        scheduledAt,
        duration: 90,
        provider: (meetingPlatform || "ZOOM").toUpperCase(),
      };

      const result = await demoClassService.createDemoClass(payload);

      try {
        const itemWithMeta = {
          ...result,
          liveCourseId,
          title: title.trim(),
          scheduledStartAt: scheduledAt,
          scheduledAt,
          courseTitle: courses.find((c) => c.id === liveCourseId)?.title || "Live Course",
        };
        const cached = JSON.parse(localStorage.getItem("edvanz_cached_demo_classes") || "[]");
        const updated = [itemWithMeta, ...(Array.isArray(cached) ? cached : [])];
        localStorage.setItem("edvanz_cached_demo_classes", JSON.stringify(updated));

        const courseCached = JSON.parse(localStorage.getItem(`demo_classes_${liveCourseId}`) || "[]");
        localStorage.setItem(`demo_classes_${liveCourseId}`, JSON.stringify([itemWithMeta, ...(Array.isArray(courseCached) ? courseCached : [])]));
      } catch {}

      toast({
        title: "Demo Class Scheduled",
        description: "Your Live Demo Class has been scheduled successfully!",
      });
      sonnerToast.success("Live Demo Class scheduled successfully!");

      resetForm();
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error("Error creating demo class:", err);
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to schedule demo class. Please try again.";
      toast({
        title: "Failed to Schedule",
        description: errMsg,
        variant: "destructive",
      });
      sonnerToast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] p-6 sm:p-7 rounded-2xl bg-white border border-slate-100 shadow-2xl">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-xl font-bold text-slate-900 text-left">
            Schedule a Live Demo Class
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Class Title */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              CLASS TITLE
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Advanced UI/UX Design Patterns"
              className="h-11 rounded-xl border-slate-200 text-sm focus-visible:ring-[#2563EB] placeholder:text-slate-400"
              required
            />
          </div>

          {/* Select Course */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              SELECT COURSE
            </label>
            <Select value={liveCourseId} onValueChange={setLiveCourseId} disabled={!loadingCourses && courses.length === 0}>
              <SelectTrigger className="w-full h-11 rounded-xl border-slate-200 text-sm focus:ring-[#2563EB] bg-white">
                <SelectValue
                  placeholder={
                    loadingCourses
                      ? "Loading courses..."
                      : courses.length === 0
                      ? "No live courses found"
                      : "Choose option..."
                  }
                />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 max-h-56">
                {courses.length === 0 ? (
                  <div className="py-3 px-3 text-xs text-slate-500 text-center">
                    {loadingCourses ? "Loading courses..." : "No live courses available"}
                  </div>
                ) : (
                  courses.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-sm py-2">
                      {c.title}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {!loadingCourses && courses.length === 0 && (
              <p className="text-[11px] text-amber-600 mt-1.5">
                ⚠️ You haven't created any Live Courses yet. Please create a Live Course first.
              </p>
            )}
          </div>

          {/* Meeting Platform */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              MEETING PLATFORM
            </label>
            <Select value={meetingPlatform} onValueChange={setMeetingPlatform}>
              <SelectTrigger className="w-full h-11 rounded-xl border-slate-200 text-sm focus:ring-[#2563EB] bg-white">
                <SelectValue placeholder="Choose option..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                <SelectItem value="ZOOM" className="text-sm py-2">
                  Zoom
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                DATE
              </label>
              <Input
                type="date"
                min={todayStr}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 rounded-xl border-slate-200 text-sm focus-visible:ring-[#2563EB] bg-white"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                TIME
              </label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-11 rounded-xl border-slate-200 text-sm focus-visible:ring-[#2563EB] bg-white"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              DESCRIPTION
            </label>
            <Textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will you cover in this free demo session?"
              className="rounded-xl border-slate-200 text-sm focus-visible:ring-[#2563EB] resize-none placeholder:text-slate-400"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 h-11 rounded-xl border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || (!loadingCourses && courses.length === 0)}
              className="flex-1 h-11 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-semibold shadow-xs transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
