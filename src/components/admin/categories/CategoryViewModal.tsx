import { BookOpen, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { Category } from "@/types/api.types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  onEdit: (c: Category) => void;
}

export function CategoryViewModal({
  open,
  onOpenChange,
  category,
  onEdit,
}: Props) {
  if (!category) return null;
  const isActive = category.status === "active" || category.isActive === true;
  const cardColor = category.color || "#2563EB";
  const courses = category.totalCourses ?? category.courseCount ?? 0;
  const students = category.totalStudents ?? category.studentCount ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle asChild>
            <div className="flex items-center gap-3 min-w-0">
              <span
                aria-hidden
                className="inline-block h-3.5 w-3.5 shrink-0 rounded-full"
                style={{ backgroundColor: cardColor }}
              />
              <span className="truncate text-xl font-semibold">
                {category.name}
              </span>
            </div>
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {category.description || "No description provided."}
          </p>
        </DialogHeader>

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Slug</p>
            <p className="mt-1 text-sm font-medium break-all">
              {category.slug}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <p
              className={`mt-1 text-sm font-medium ${
                isActive ? "text-emerald-600" : "text-slate-600"
              }`}
            >
              {isActive ? "Active" : "Archived"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Courses</p>
            <p className="mt-1 text-sm font-medium">{courses.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Students</p>
            <p className="mt-1 text-sm font-medium">
              {students.toLocaleString()}
            </p>
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="text-sm font-semibold">Courses in this Category</h4>
          <ScrollArea className="mt-2 max-h-56 pr-2">
            <ul className="space-y-2">
              {(category.courses ?? []).length === 0 ? (
                <li className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  No courses yet.
                </li>
              ) : (
                (category.courses ?? []).map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-900"
                  >
                    <BookOpen className="h-4 w-4 shrink-0" />
                    <span className="truncate">{c.title}</span>
                  </li>
                ))
              )}
            </ul>
          </ScrollArea>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="sm:min-w-28"
          >
            Close
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              onEdit(category);
            }}
            className="sm:min-w-28"
          >
            <Pencil className="h-4 w-4 mr-1.5" /> Edit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
