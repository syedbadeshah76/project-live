import { Bell, BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCourseReminder } from "@/hooks/useCourseReminder";

interface CourseReminderButtonProps {
  courseId?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

export function CourseReminderButton({
  courseId,
  className,
  variant = "outline",
  size = "sm",
}: CourseReminderButtonProps) {
  const { hasReminder, isLoading, isSaving, createReminder } = useCourseReminder(courseId);
  const busy = isLoading || isSaving;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("gap-2", className)}
      disabled={!courseId || busy || hasReminder}
      onClick={() => void createReminder()}
      aria-label={hasReminder ? "Reminder already set" : "Set course reminder"}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : hasReminder ? (
        <BellRing className="h-4 w-4" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
      {hasReminder ? "Reminder On" : "Set Reminder"}
    </Button>
  );
}
