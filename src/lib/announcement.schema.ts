import { z } from "zod";

export const announcementSchema = z.object({
  courseId: z
    .string({ required_error: "Please select a course" })
    .trim()
    .min(1, "Please select a course"),

  htmlContent: z
    .string({ required_error: "Announcement is required" })
    .trim()
    .min(5, "Announcement must be at least 5 characters"),
});

export type AnnouncementFormValues = z.infer<typeof announcementSchema>;
