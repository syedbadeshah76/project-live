import { Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Category } from "@/types/api.types";

interface Props {
  category: Category;
  onView: (c: Category) => void;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
}

export function CategoryCard({ category, onView, onEdit, onDelete }: Props) {
  const isActive = category.status === "active" || category.isActive === true;
  const cardColor = category.color || "#2563EB";
  const courses = category.totalCourses ?? category.courseCount ?? 0;
  const students = category.totalStudents ?? category.studentCount ?? 0;

  return (
    <Card className="overflow-hidden border-border/60 shadow-sm hover:shadow-md transition-shadow">
      <div
        aria-hidden
        className="h-1.5 w-full"
        style={{ backgroundColor: cardColor }}
      />
      <CardContent className="p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            {category.iconUrl ? (
              <img
                src={category.iconUrl}
                alt=""
                className="h-6 w-6 object-contain rounded shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : null}
            <h3 className="text-lg font-semibold text-foreground truncate">
              {category.name}
            </h3>
          </div>
          {(category as any).subCategory ? (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {(category as any).subCategory}
            </p>
          ) : null}
          <p className="mt-3 text-sm text-muted-foreground line-clamp-2 min-h-10">
            {category.description || "No description provided."}
          </p>
        </div>

        <Separator className="my-4" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Courses</p>
            <p className="mt-1 text-lg font-semibold">{courses.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Students</p>
            <p className="mt-1 text-lg font-semibold">
              {students.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mt-3">
          <span
            className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${
              isActive
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {isActive ? "Active" : "Archived"}
          </span>
        </div>

        <Separator className="my-4" />

        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onView(category)}
            aria-label={`View ${category.name}`}
          >
            <Eye className="h-4 w-4 mr-1.5" /> View
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onEdit(category)}
            aria-label={`Edit ${category.name}`}
          >
            <Pencil className="h-4 w-4 mr-1.5" /> Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onDelete(category)}
            aria-label={`Delete ${category.name}`}
          >
            <Trash2 className="h-4 w-4 mr-1.5" /> Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
