export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export const CATEGORY_COLOR_PALETTE: string[] = [
  "#2563EB", // Blue (Edvanz primary)
  "#DC2626", // Red / Security
  "#000000", // Black / Dark
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#8B5CF6", // Violet
  "#0EA5E9", // Sky
  "#EC4899", // Pink
  "#14B8A6", // Teal
  "#6366F1", // Indigo
  "#64748B", // Slate
];
