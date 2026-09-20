import { z } from "zod";
const MAX_PDF_BYTES = 20 * 1024 * 1024;

const alphaRegex = /[A-Za-z]/;

const cleanText = (v: string) => v.trim().replace(/\s+/g, " ");

const notOnlyDigits = (v: string) => !/^\d+$/.test(v);
const notOnlySymbols = (v: string) => /[a-zA-Z0-9]/.test(v);

export const resourceUploadSchema = z.object({
  title: z
    .string()
    .transform(cleanText)
    .pipe(
      z
        .string()
        .min(5, "Title must be at least 5 characters")
        .max(120, "Title must be under 120 characters")
        .refine(notOnlyDigits, "Title cannot contain only numbers")
        .refine(notOnlySymbols, "Title cannot contain only symbols"),
    ),
  description: z
    .string()
    .transform((v) => v.trim())
    .pipe(
      z
        .string()
        .min(20, "Description must be at least 20 characters")
        .max(500, "Description must be under 500 characters")
        .refine(notOnlyDigits, "Description cannot contain only numbers")
        .refine(notOnlySymbols, "Description cannot contain only symbols"),
    ),
  courseId: z.string().min(1, "Please select a course"),
  file: z
    .instanceof(File, { message: "Please attach a PDF file" })
    .refine((f) => f.type === "application/pdf", "Only PDF files are allowed")
    .refine((f) => f.size <= MAX_PDF_BYTES, "File must be 20 MB or smaller"),
});

export type ResourceUploadFormValues = z.infer<typeof resourceUploadSchema>;

export const titleSchema = z
  .string()
  .transform(cleanText)
  .pipe(
    z
      .string()
      .min(5, "Title must be at least 5 characters")
      .max(100, "Title must be less than 100 characters")
      .refine((v) => alphaRegex.test(v), "Title must contain letters")
      .refine((v) => !/^\d+$/.test(v), "Title cannot be only numbers")
      .refine(
        (v) => !/^[^A-Za-z0-9]+$/.test(v),
        "Title cannot be only symbols",
      ),
  );

export const descriptionSchema = z
  .string()
  .transform(cleanText)
  .pipe(
    z
      .string()
      .min(20, "Description must be at least 20 characters")
      .max(500, "Description must be less than 500 characters")
      .refine((v) => alphaRegex.test(v), "Description must contain letters")
      .refine((v) => !/^\d+$/.test(v), "Description cannot be only numbers")
      .refine(
        (v) => !/^[^A-Za-z0-9]+$/.test(v),
        "Description cannot be only symbols",
      ),
  );

// Base plain ZodObject — safe to call `.partial()` / `.extend()` on this.
// Refinements are applied AFTER, on the derived schemas, because
// `.refine()` turns a ZodObject into a ZodEffects which no longer
// exposes `.partial()` in this Zod version.
export const scheduleMeetingBaseSchema = z.object({
  title: titleSchema,
  courseId: z.string().min(1, "Please select a course"),
  meetingType: z.enum(["zoom", "google_meet", "microsoft_teams", "discord"]),
  date: z.string().min(1, "Please select a date"),
  startTime: z.string().min(1, "Please select a time"),
  duration: z.coerce.number().min(15).max(480).default(60),
  description: descriptionSchema,
});

const notInPastRefinement = (v: { date: string; startTime: string }) => {
  const now = new Date();
  const d = new Date(`${v.date}T${v.startTime}:00`);
  return d.getTime() >= now.getTime();
};

export const scheduleMeetingSchema = scheduleMeetingBaseSchema.refine(
  notInPastRefinement,
  { message: "Scheduled time cannot be in the past", path: ["startTime"] },
);

export type ScheduleMeetingFormValues = z.infer<typeof scheduleMeetingSchema>;

// Derive the draft schema from the base ZodObject (before refinements),
// so `.partial()` is available. Title stays optional as well.
export const draftMeetingSchema = scheduleMeetingBaseSchema.partial().extend({
  title: z.string().optional(),
});

export type DraftMeetingFormValues = z.infer<typeof draftMeetingSchema>;

export const rejectReasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(20, "Please provide a detailed reason (min 20 characters)")
    .max(500, "Reason must be less than 500 characters"),
});
export type RejectReasonValues = z.infer<typeof rejectReasonSchema>;

export const rescheduleSchema = z.object({
  date: z.string().min(1, "Please select a date"),
  startTime: z.string().min(1, "Please select a time"),
  duration: z.coerce.number().min(15).max(480).optional(),
  adminNote: z.string().max(500).optional(),
});
export type RescheduleValues = z.infer<typeof rescheduleSchema>;
