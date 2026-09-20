import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { notificationsService } from "@/services/notifications.service";
import type { UserNotification } from "@/types/admin-notification.types";

export const NotificationsPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchUnreadCount = async () => {
    try {
      const count = await notificationsService.unreadCount();
      setUnreadCount(count);
    } catch {
      /* ignore non-blocking error */
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    // Poll unread count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleOpen = async () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      setLoading(true);
      try {
        const list = await notificationsService.list();
        setNotifications(list);
        setUnreadCount(list.filter((n) => !n.read).length);
      } catch {
        /* ignore non-blocking error */
      } finally {
        setLoading(false);
      }
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.notificationId === id || (n as any).id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* ignore non-blocking error */
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      /* ignore non-blocking error */
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationsService.deleteNotification(id);
      const target = notifications.find((x) => x.notificationId === id || (x as any).id === id);
      setNotifications((prev) => prev.filter((x) => x.notificationId !== id && (x as any).id !== id));
      if (target && !target.read) setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* ignore non-blocking error */
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (Number.isNaN(diff) || diff < 0) return "Just now";
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 hover:bg-muted rounded-full transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/20 sm:bg-transparent"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="
                z-50 bg-background border border-border shadow-xl rounded-xl
                flex flex-col overflow-hidden
                fixed left-1/2 -translate-x-1/2 top-16
                w-[calc(100vw-2rem)] max-w-sm
                max-h-[calc(100vh-5rem)]
                sm:absolute sm:left-auto sm:right-0 sm:translate-x-0 sm:top-full sm:mt-2
                sm:w-96 sm:max-w-none sm:max-h-[480px]
              "
            >
              {/* Fixed header */}
              <div className="flex items-center justify-between px-4 py-3 border-b shrink-0 bg-background z-10">
                <h3 className="font-semibold text-sm">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable list */}
              <div
                tabIndex={0}
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y focus:outline-none"
              >
                {loading ? (
                  <div className="p-6 flex items-center justify-center">
                    <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No notifications
                  </div>
                ) : (
                  <ul className="divide-y">
                    {notifications.map((notif) => {
                      const notifId = notif.notificationId || (notif as any).id;
                      const isUnread = !notif.read;
                      return (
                        <li
                          key={notifId}
                          className={`px-4 py-3 hover:bg-muted/40 transition-colors ${
                            isUnread ? "bg-primary/5 font-medium" : ""
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-[11px] text-muted-foreground">
                                  {getTimeAgo(notif.createdAt)}
                                </span>
                                {isUnread && (
                                  <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                                )}
                              </div>
                              <p className="text-sm font-semibold leading-snug truncate">
                                {notif.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {notif.message}
                              </p>
                            </div>
                            <div className="flex flex-col gap-1 shrink-0">
                              {isUnread && (
                                <button
                                  onClick={() => handleMarkRead(notifId)}
                                  className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                                  title="Mark as read"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(notifId)}
                                className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
