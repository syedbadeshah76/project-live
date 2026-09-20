// src/components/announcements/AnnouncementForm.tsx
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import HtmlEditor from "@/components/admin/HtmlEditor";
import {
  announcementSchema,
  type AnnouncementFormValues,
} from "@/lib/announcement.schema";
import type { Announcement, EligibleCourseOption } from "@/types/announcement.types";

interface Props {
  courses: EligibleCourseOption[];
  coursesLoading?: boolean;
  isSubmitting?: boolean;
  /** When set, the form edits an existing announcement */
  editing?: Announcement | null;
  onCancelEdit?: () => void;
  onSubmit: (values: AnnouncementFormValues) => Promise<boolean>;
}

export const AnnouncementForm = ({
  courses,
  coursesLoading = false,
  isSubmitting = false,
  editing = null,
  onCancelEdit,
  onSubmit,
}: Props) => {
  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { courseId: "", htmlContent: "" },
  });

  useEffect(() => {
    if (editing) {
      form.reset({ courseId: editing.courseId, htmlContent: editing.htmlContent });
    } else {
      form.reset({ courseId: "", htmlContent: "" });
    }
  }, [editing, form]);

  const handleSubmit = async (values: AnnouncementFormValues) => {
    const ok = await onSubmit(values);
    if (ok && !editing) form.reset({ courseId: "", htmlContent: "" });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="courseId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Select Course
              </FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={coursesLoading || !!editing}
              >
                <FormControl>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={coursesLoading ? "Loading courses…" : "Choose option..."} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.courseId} value={c.courseId}>
                      {c.courseName} ({c.courseType === "live" ? "Live" : "Recorded"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="htmlContent"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Announcement
              </FormLabel>
              <FormControl>
                <HtmlEditor
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Write your announcement… (headings, links and formatting are supported)"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting} className="h-11">
            <Send className="mr-2 h-4 w-4" />
            {isSubmitting
              ? editing
                ? "Updating…"
                : "Sending…"
              : editing
                ? "Update Announcement"
                : "Send Announcement"}
          </Button>
          {editing && (
            <Button type="button" variant="ghost" className="h-11" onClick={onCancelEdit}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
};

export default AnnouncementForm;
