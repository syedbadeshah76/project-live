import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { Loader2, AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";
import {
  scheduleMeetingSchema,
  type ScheduleMeetingFormValues,
} from "@/lib/meeting-validation";
import { MEETING_PLATFORMS } from "@/constants/meeting.constants";
import { meetingService } from "@/services/meeting.service";
import { liveClassService } from "@/services/liveClassService";
import { liveCoursesService } from "@/services/liveCourses.service";
import { useAuth } from "@/contexts/AuthContext";
import { demoClassService } from "@/services/demoClass.service";
import type {
  CreateMeetingRequest,
  InstructorCourseOption,
  MeetingPlatform,
} from "@/types/meeting.types";
import { DraftConfirmationDialog } from "./DraftConfirmationDialog";

const todayStr = () => new Date().toISOString().slice(0, 10);

// Map validated form output → exact service payload.
const toCreatePayload = (
  values: ScheduleMeetingFormValues,
): CreateMeetingRequest => ({
  title: values.title,
  description: values.description,
  courseId: values.courseId,
  date: values.date,
  startTime: values.startTime,
  duration: values.duration,
  meetingType: values.meetingType,
});

export const ScheduleMeetingForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const draftId = params.get("draftId");

  const [courses, setCourses] = useState<InstructorCourseOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, touchedFields, isDirty, isValid },
  } = useForm<ScheduleMeetingFormValues>({
    resolver: zodResolver(scheduleMeetingSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      description: "",
      courseId: "",
      meetingType: "zoom",
      date: "",
      startTime: "",
      duration: 60,
    },
  });

  useEffect(() => {
    let cancelled = false;
    demoClassService
      .getInstructorLiveCourses(user)
      .then((list) => {
        if (!cancelled) {
          setCourses(list);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCourses([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!draftId) return;
    meetingService.getMeetingById(draftId).then((r) => {
      if (r.success && r.data) {
        const d = r.data;
        reset({
          title: d.title,
          description: d.description,
          courseId: d.courseId,
          meetingType: "zoom",
          date: d.date,
          startTime: d.startTime,
          duration: d.duration,
        });
      }
    });
  }, [draftId, reset]);

  const dateValue = watch("date");
  const minTime =
    dateValue === todayStr()
      ? new Date().toTimeString().slice(0, 5)
      : undefined;

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const scheduledAt = values.date && values.startTime 
        ? `${values.date}T${values.startTime.length === 5 ? values.startTime + ':00' : values.startTime}`
        : new Date().toISOString();

      // Call exact backend API for Create Live Class
      await liveClassService.createLiveClass({
        liveCourseId: values.courseId,
        title: values.title,
        description: values.description,
        provider: "ZOOM",
        scheduledAt,
      }).catch(async () => {
        // Fallback to meetingService if server endpoint responds differently
        const payload = toCreatePayload(values);
        if (draftId) {
          await meetingService.updateDraft({ id: draftId, ...payload });
          await meetingService.submitForApproval(draftId);
        } else {
          await meetingService.createMeeting(payload);
        }
      });

      toast({
        title: "Submitted for Admin Approval",
        description: "Your live class has been submitted and is pending review.",
      });
      navigate("/instructor/meetings");
    } catch {
      toast({ title: "Failed to submit", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  });

  const handleCancel = () => {
    if (isDirty) setConfirmOpen(true);
    else navigate("/instructor/meetings");
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    const values = watch();
    try {
      const payload = toCreatePayload(values);
      if (draftId)
        await meetingService.updateDraft({ id: draftId, ...payload });
      else await meetingService.saveDraft(payload);
      toast({ title: "Draft saved" });
      navigate("/instructor/meetings");
    } catch {
      toast({ title: "Failed to save draft", variant: "destructive" });
    } finally {
      setSavingDraft(false);
      setConfirmOpen(false);
    }
  };

  const fieldState = (name: keyof ScheduleMeetingFormValues) => {
    const err = errors[name]?.message as string | undefined;
    const touched = touchedFields[name];
    return { err, touched };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto p-6 space-y-6"
    >
      <button
        type="button"
        onClick={handleCancel}
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Class
      </button>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              Admin Approval Required
            </p>
            <p className="text-xs text-amber-800 mt-1">
              Live class requests are reviewed by Admin before going live. This
              typically takes 24–48 hours.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">
          Schedule a Live Class
        </h1>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Title */}
          <Field label="Title" required {...fieldState("title")}>
            <Input
              placeholder="e.g. React Hooks Deep Dive"
              {...register("title")}
            />
          </Field>

          {/* Course */}
          <Field label="Course" required {...fieldState("courseId")}>
            <Controller
              control={control}
              name="courseId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
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
              )}
            />
          </Field>

          {/* Platform */}
          <Field label="Meeting Platform" required {...fieldState("meetingType")}>
            <Controller
              control={control}
              name="meetingType"
              render={({ field }) => (
                <Select
                  value="zoom"
                  onValueChange={(v) => field.onChange("zoom" as MeetingPlatform)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Zoom" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zoom">Zoom</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Date" required {...fieldState("date")}>
              <Input type="date" min={todayStr()} {...register("date")} />
            </Field>
            <Field label="Start Time" required {...fieldState("startTime")}>
              <Input type="time" min={minTime} {...register("startTime")} />
            </Field>
            <Field
              label="Duration (minutes)"
              required
              {...fieldState("duration")}
            >
              <Input
                type="number"
                min={15}
                max={480}
                {...register("duration", { valueAsNumber: true })}
              />
            </Field>
          </div>

          <Field label="Description" required {...fieldState("description")}>
            <Textarea
              rows={4}
              placeholder="What will you cover?"
              {...register("description")}
            />
          </Field>

          <div className="flex items-center justify-between pt-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !isValid}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Submit for Admin Approval
            </Button>
          </div>
          <p className="text-xs text-orange-600 text-right">
            <AlertTriangle className="inline h-3 w-3 mr-1" />
            Goes to Admin → Live Class Approvals for review.
          </p>
        </form>
      </div>

      <DraftConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onSaveDraft={handleSaveDraft}
        onDiscard={() => navigate("/instructor/meetings")}
      />
      {savingDraft && <p className="text-xs text-gray-500">Saving draft…</p>}
    </motion.div>
  );
};

interface FieldProps {
  label: string;
  required?: boolean;
  helper?: string;
  err?: string;
  touched?: boolean;
  children: React.ReactNode;
}
const Field = ({
  label,
  required,
  helper,
  err,
  touched,
  children,
}: FieldProps) => (
  <div>
    <label className="text-xs font-semibold text-gray-500 tracking-wider mb-1.5 block">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    <div className="flex items-center justify-between mt-1 min-h-[16px]">
      {err ? (
        <p className="text-xs text-red-600">{err}</p>
      ) : touched ? (
        <p className="text-xs text-green-600 inline-flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Looks good
        </p>
      ) : (
        <span />
      )}
      {helper && <p className="text-xs text-gray-400">{helper}</p>}
    </div>
  </div>
);
