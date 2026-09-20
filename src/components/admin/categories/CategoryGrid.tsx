import { FolderOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryCard } from "./CategoryCard";
import type { Category } from "@/types/api.types";

interface Props {
  categories: Category[];
  loading: boolean;
  onView: (c: Category) => void;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
  onCreate: () => void;
}

export function CategoryGrid({
  categories,
  loading,
  onView,
  onEdit,
  onDelete,
  onCreate,
}: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="h-1.5 w-full bg-muted" />
            <CardContent className="p-5 space-y-4">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-10 w-full" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-muted">
          <FolderOpen className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">No categories found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Try adjusting your filters, or create a new category to get started.
        </p>
        <Button className="mt-5" onClick={onCreate}>
          <Plus className="h-4 w-4 mr-2" /> Create Category
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {categories.map((c) => (
        <CategoryCard
          key={c.id}
          category={c}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
