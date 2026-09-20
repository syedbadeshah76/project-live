import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  instructorDashboardService,
  type CreateLiveSessionPayload,
  type LiveSession,
} from "@/services/instructor-dashboard.service";
import { instructorService } from "@/services/instructor.service";

interface CourseOption {
  id: string;
  title: string;
}

interface ScheduleSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduled: (session: LiveSession) => void;
  initialSession?: LiveSession | null;
}

const emptyForm: CreateLiveSessionPayload = {
  title: "",
  courseId: "",
  date: "",
  startTime: "",
  endTime: "",
  description: "",
};

export const ScheduleSessionDialog = ({
  open,
  onOpenChange,
  onScheduled,
  initialSession,
}: ScheduleSessionDialogProps) => {
  const [form, setForm] = useState<CreateLiveSessionPayload>(emptyForm);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(initialSession);

  useEffect(() => {
    if (!open) return;

    setError(null);

    if (initialSession) {
      setForm({
        title: initialSession.title,
        courseId: initialSession.courseId,
        date: initialSession.date,
        startTime: initialSession.startTime,
        endTime: initialSession.endTime,
        description: initialSession.description ?? "",
      });
    } else {  
      setForm(emptyForm);
    }

    (async () => {
      try {
        const res = await instructorService.getMyCourses();
        const list = (res.data ?? []).map((c: { id: string; title: string }) => ({
          id: c.id,
          title: c.title,
        }));
        setCourses(list);
      } catch (err) {
        console.error("Failed to load courses:", err);
      }
    })();
  }, [open, initialSession]);

  const update = <K extends keyof CreateLiveSessionPayload>(
    key: K,
    value: CreateLiveSessionPayload[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) return setError("Session title is required.");
    if (!form.courseId) return setError("Please select a course.");
    if (!form.date) return setError("Please pick a date.");
    if (!form.startTime || !form.endTime)
      return setError("Please set start and end time.");
    if (form.endTime <= form.startTime)
      return setError("End time must be after start time.");

    setSubmitting(true);
    try {
      const res = isEditing && initialSession
        ? await instructorDashboardService.updateLiveSession(
            initialSession.id,
            form,
          )
        : await instructorDashboardService.scheduleLiveSession(form);
      onScheduled(res.data);
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to save live session:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Live Session" : "Schedule New Session"}
          </DialogTitle>
          <DialogDescription>
            Fill in the details below to {isEditing ? "update" : "schedule"} a
            live class for your learners.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="session-title">Session Title</Label>
            <Input
              id="session-title"
              placeholder="e.g. Live Q&A Session"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="session-course">Course</Label>
            <Select
              value={form.courseId}
              onValueChange={(v) => update("courseId", v)}
            >
              <SelectTrigger id="session-course">
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="session-date">Date</Label>
              <Input
                id="session-date"
                type="date"
                value={form.date}
                onChange={(e) => update("date", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-start">Start Time</Label>
              <Input
                id="session-start"
                type="time"
                value={form.startTime}
                onChange={(e) => update("startTime", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-end">End Time</Label>
              <Input
                id="session-end"
                type="time"
                value={form.endTime}
                onChange={(e) => update("endTime", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="session-description">Description</Label>
            <Textarea
              id="session-description"
              placeholder="What will you cover in this session?"
              rows={3}
              value={form.description ?? ""}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Schedule Session"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleSessionDialog;
