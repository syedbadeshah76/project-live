import { useState } from "react";
import { motion } from "framer-motion";
import { meetingService } from "@/services/meeting.service";
import { courses } from "@/data/courses";
import type { CreateMeetingRequest, MeetingType } from "@/types/meeting.types";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Video, Monitor, Globe } from "lucide-react";

interface MeetingFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const meetingTypes: { value: MeetingType; label: string; icon: typeof Video; description: string }[] = [
  { value: "zoom", label: "Zoom", icon: Video, description: "Zoom video conferencing" },
  { value: "google_meet", label: "Google Meet", icon: Globe, description: "Google Meet session" },
  { value: "internal", label: "Internal", icon: Monitor, description: "EDVANZ built-in meeting" },
];

export const MeetingForm = ({ onSuccess, onCancel }: MeetingFormProps) => {
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState<CreateMeetingRequest>({
    title: "",
    description: "",
    courseId: "",
    date: "",
    startTime: "",
    duration: 60,
    meetingType: "zoom",
  });

  const handleSubmit = async () => {
    if (!form.title || !form.courseId || !form.date || !form.startTime) {
      toast({ title: "Validation Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await meetingService.createMeeting(form);
      if (res.success) {
        toast({ title: "Meeting Scheduled! 🎉", description: res.message });
        setForm({ title: "", description: "", courseId: "", date: "", startTime: "", duration: 60, meetingType: "zoom" });
        onSuccess?.();
      }
    } catch {
      toast({ title: "Error", description: "Failed to schedule meeting.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-5"
    >
      {/* Title */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Meeting Title *</label>
        <Input
          placeholder="e.g., React Hooks Masterclass"
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
        />
      </div>

      {/* Course */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Course *</label>
        <Select value={form.courseId} onValueChange={(v) => setForm((p) => ({ ...p, courseId: v }))}>
          <SelectTrigger><SelectValue placeholder="Select a course" /></SelectTrigger>
          <SelectContent>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Meeting Type */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Meeting Type *</label>
        <div className="grid grid-cols-3 gap-2">
          {meetingTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = form.meetingType === type.value;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => setForm((p) => ({ ...p, meetingType: type.value }))}
                className={`
                  flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center
                  ${isSelected
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/30"
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{type.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Date *</label>
          <Input
            type="date"
            value={form.date}
            onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
            min={new Date().toISOString().split("T")[0]}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Start Time *</label>
          <Input
            type="time"
            value={form.startTime}
            onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
          />
        </div>
      </div>

      {/* Duration */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Duration</label>
        <Select value={String(form.duration)} onValueChange={(v) => setForm((p) => ({ ...p, duration: Number(v) }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {[30, 45, 60, 90, 120, 180].map((d) => (
              <SelectItem key={d} value={String(d)}>{d} minutes</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
        <Textarea
          placeholder="What will this meeting cover?"
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        )}
        <Button variant="gradient" onClick={handleSubmit} disabled={submitting} className="flex-1">
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Schedule Meeting
        </Button>
      </div>
    </motion.div>
  );
};
