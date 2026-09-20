import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Category name is required")
    .max(100, "Category name must be under 100 characters"),
  subCategory: z
    .string()
    .trim()
    .max(100, "Sub category must be under 100 characters")
    .optional()
    .or(z.literal("")),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(120, "Slug must be under 120 characters")
    .regex(slugRegex, "Use lowercase letters, numbers and hyphens only"),
  description: z
    .string()
    .trim()
    .max(500, "Description must be under 500 characters")
    .optional()
    .or(z.literal("")),
});

export const editCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(100),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(120)
    .regex(slugRegex, "Use lowercase letters, numbers and hyphens only"),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  color: z.string().trim().min(1, "Color is required"),
});

export type CreateCategoryFormValues = z.infer<typeof createCategorySchema>;
export type EditCategoryFormValues = z.infer<typeof editCategorySchema>;
