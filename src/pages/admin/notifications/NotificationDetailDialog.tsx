import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AUDIENCE_BADGE_CLASSES,
  AUDIENCE_LABELS,
  formatDate,
} from "./notification-utils";
import type { AdminNotification } from "@/types/admin-notification.types";

interface NotificationDetailDialogProps {
  notification: AdminNotification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => void;
}

export function NotificationDetailDialog({
  notification,
  open,
  onOpenChange,
  onDelete,
}: NotificationDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{notification?.title ?? "Notification"}</DialogTitle>
          <DialogDescription>
            {notification ? formatDate(notification.sentAt) : ""}
          </DialogDescription>
        </DialogHeader>

        {notification && (
          <div className="space-y-4">
            <Badge
              variant="secondary"
              className={AUDIENCE_BADGE_CLASSES[notification.targetAudience]}
            >
              {AUDIENCE_LABELS[notification.targetAudience]}
            </Badge>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {notification.message}
            </p>
            <p className="text-xs text-muted-foreground">
              Delivered only to users with push notifications enabled.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {notification && (
            <Button variant="destructive" onClick={() => onDelete(notification.id)}>
              Delete
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default NotificationDetailDialog;
