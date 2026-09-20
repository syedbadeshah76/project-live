// src/pages/admin/AdminNotifications.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StatsCards } from "@/pages/admin/notifications/StatsCards";
import { FiltersBar } from "@/pages/admin/notifications/FiltersBar";
import { NotificationsTable } from "@/pages/admin/notifications/NotificationsTable";
import { NotificationDetailDialog } from "@/pages/admin/notifications/NotificationDetailDialog";
import { adminNotificationsService } from "@/services/admin-notifications.service";
import type {
  AdminNotification,
  NotificationFilters,
  NotificationStats,
} from "@/types/admin-notification.types";

const PAGE_SIZE = 6;

const EMPTY_STATS: NotificationStats = {
  totalSent: 0,
  studentNotifications: 0,
  instructorNotifications: 0,
  lastSentAt: null,
};

const AdminNotifications = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [stats, setStats] = useState<NotificationStats>(EMPTY_STATS);
  const [filters, setFilters] = useState<NotificationFilters>({
    search: "",
    audience: "all",
      type: "all",
  });
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await adminNotificationsService.getNotifications();
      setNotifications(list);
      setStats(await adminNotificationsService.getStats(list));
    } catch (error) {
      setNotifications([]);
      setStats(EMPTY_STATS);
      toast({
        title: "Failed to load notifications",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
  const q = filters.search.trim().toLowerCase();

  return notifications.filter((n) => {
    if (
      filters.audience !== "all" &&
      n.targetAudience !== filters.audience
    ) {
      return false;
    }

    if (
      filters.type !== "all" &&
      n.type !== filters.type
    ) {
      return false;
    }

    if (
      q &&
      !n.title.toLowerCase().includes(q) &&
      !n.message.toLowerCase().includes(q)
    ) {
      return false;
    }

    return true;
  });
}, [notifications, filters]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedNotifications = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const handleDelete = async (id: string) => {
    const previous = notifications;
    const next = previous.filter((n) => n.id !== id);
    setNotifications(next);
    setStats(await adminNotificationsService.getStats(next));
    if (detailId === id) setDetailId(null);
    try {
      await adminNotificationsService.deleteNotification(id);
      toast({ title: "Notification deleted" });
      void load();
    } catch (error) {
      setNotifications(previous);
      setStats(await adminNotificationsService.getStats(previous));
      toast({
        title: "Failed to delete",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    }
  };

  const detail = detailId ? (notifications.find((n) => n.id === detailId) ?? null) : null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              Send and manage system notifications
            </p>
          </div>
          <Button onClick={() => navigate("/admin/notifications/send")}>
            <Plus className="mr-2 h-4 w-4" />
            Send Notification
          </Button>
        </div>

        <StatsCards stats={stats} loading={loading} />

        <FiltersBar filters={filters} onChange={setFilters} />

        <NotificationsTable
          notifications={pagedNotifications}
          loading={loading}
          onView={(id) => setDetailId(id)}
          onDelete={handleDelete}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {pagedNotifications.length} of {filtered.length} notifications
          </p>
          <div className="flex flex-wrap items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            {Array.from({ length: totalPages }).map((_, index) => (
              <Button
                key={index}
                variant={page === index + 1 ? "default" : "outline"}
                size="sm"
                onClick={() => setPage(index + 1)}
              >
                {index + 1}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>

        <NotificationDetailDialog
          notification={detail}
          open={!!detail}
          onOpenChange={(open) => !open && setDetailId(null)}
          onDelete={handleDelete}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminNotifications;
