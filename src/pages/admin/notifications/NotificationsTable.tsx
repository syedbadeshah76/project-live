import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, Trash2 } from "lucide-react";
import {
  AUDIENCE_BADGE_CLASSES,
  AUDIENCE_LABELS,
  formatDate,
} from "./notification-utils";
import type { AdminNotification } from "@/types/admin-notification.types";

interface NotificationsTableProps {
  notifications: AdminNotification[];
  loading?: boolean;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotificationsTable({
  notifications,
  loading,
  onView,
  onDelete,
}: NotificationsTableProps) {
  const emptyText = loading ? "Loading notifications..." : "No notifications found.";

  return (
    <div className="rounded-xl border bg-card">
      {/* Desktop */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Audience</TableHead>
              <TableHead>Sent Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notifications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : (
              notifications.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="max-w-md">
                    <p className="font-medium">{n.title}</p>
                    <p className="truncate text-sm text-muted-foreground">{n.message}</p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={AUDIENCE_BADGE_CLASSES[n.targetAudience]}
                    >
                      {AUDIENCE_LABELS[n.targetAudience]}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(n.sentAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onView(n.id)}
                        aria-label={`View ${n.title}`}
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onDelete(n.id)}
                        aria-label={`Delete ${n.title}`}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        {notifications.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">{emptyText}</div>
        ) : (
          <div className="divide-y">
            {notifications.map((n) => (
              <div key={n.id} className="space-y-3 p-4">
                <div>
                  <p className="font-medium">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <Badge
                    variant="secondary"
                    className={AUDIENCE_BADGE_CLASSES[n.targetAudience]}
                  >
                    {AUDIENCE_LABELS[n.targetAudience]}
                  </Badge>
                  <span className="text-muted-foreground">{formatDate(n.sentAt)}</span>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onView(n.id)}
                    aria-label={`View ${n.title}`}
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onDelete(n.id)}
                    aria-label={`Delete ${n.title}`}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationsTable;
