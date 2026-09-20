// src/pages/admin/notifications/SendNotificationForm.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { adminNotificationsService } from "@/services/admin-notifications.service";
import type { TargetAudience,   NotificationType, } from "@/types/admin-notification.types";

const SendNotification = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
const [type, setType] = useState<NotificationType>("GENERAL");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetAudience, setTargetAudience] = useState<TargetAudience>("student");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await adminNotificationsService.createNotification({
        title,
        message,
        targetAudience,
      });
      toast({ title: "Notification sent successfully" });
      navigate("/admin/notifications");
    } catch (error) {
      toast({
        title: "Failed to send notification",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Send Notification</CardTitle>
            <CardDescription>
              Delivered only to users who have push notifications enabled.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Holiday"
                maxLength={150}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tomorrow is a holiday."
                rows={5}
                maxLength={1000}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="audience">Audience</Label>
              <Select
                value={targetAudience}
                onValueChange={(v) => setTargetAudience(v as TargetAudience)}
              >
                <SelectTrigger id="audience">
                  <SelectValue placeholder="Select audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Students</SelectItem>
                  <SelectItem value="instructor">Instructors</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
  <Label htmlFor="type">Type</Label>

  <Select
    value={type}
    onValueChange={(value) => setType(value as NotificationType)}
  >
    <SelectTrigger id="type">
      <SelectValue placeholder="Choose option..." />
    </SelectTrigger>

    <SelectContent>
      <SelectItem value="GENERAL">General</SelectItem>
      <SelectItem value="INFO">Info</SelectItem>
      <SelectItem value="WARNING">Warning</SelectItem>
      <SelectItem value="SUCCESS">Success</SelectItem>
    </SelectContent>
  </Select>
</div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/admin/notifications")}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !title.trim() || !message.trim()}
              >
                {submitting ? "Sending..." : "Send Notification"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </AdminLayout>
  );
};

export default SendNotification;
