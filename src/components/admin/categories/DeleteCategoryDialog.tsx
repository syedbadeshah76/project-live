import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/api.types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  onConfirm: (id: string) => Promise<void>;
}

export function DeleteCategoryDialog({
  open,
  onOpenChange,
  category,
  onConfirm,
}: Props) {
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!category) return;
    setSubmitting(true);
    try {
      await onConfirm(category.id);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Are you sure you want to delete
            {category ? ` "${category.name}"` : ""}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. All courses in this category will need
            to be reassigned.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={submitting}
            className={cn(
              buttonVariants({ variant: "destructive" }),
              "min-w-24",
            )}
          >
            {submitting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
