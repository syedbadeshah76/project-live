import { useEffect, useState } from "react";
import { announcementService } from "@/services/announcements.service";
import type { Announcement } from "@/types/announcement.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Plus, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  courseId?: string;
}

export const CourseAnnouncementsManager = ({ courseId }: Props) => {
  const { toast } = useToast();

  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    message: "",
  });

  const load = async () => {
    if (!courseId) return;

    setLoading(true);

    try {
      const res = await announcementService.getAnnouncementsByCourse(courseId);
      setItems(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [courseId]);

  const create = async () => {
    if (!courseId) return;

    if (!form.title.trim() || !form.message.trim()) {
      toast({
        title: "Title and message are required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const res = await announcementService.createAnnouncement({
        courseId,
        title: form.title,
        message: form.message,
      });

      if (res.success) {
        setItems((prev) => [res.data, ...prev]);

        setForm({
          title: "",
          message: "",
        });

        toast({
          title: "Announcement published",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
    await announcementService.deleteAnnouncement(id);
  };

  if (!courseId) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5 mt-4">
        <div className="flex items-center gap-2 mb-2">
          <Megaphone className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold">Announcements</h2>
        </div>

        <p className="text-sm text-muted-foreground">
          Announcements become available after the course is created. Save this
          course, then edit it to publish announcements to enrolled students.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mt-4">
      <div className="flex items-center gap-2 mb-1">
        <Megaphone className="h-5 w-5 text-blue-600" />
        <h2 className="font-semibold">Announcements</h2>
      </div>

      <p className="text-sm text-muted-foreground mb-5">
        Send updates to every enrolled student.
      </p>

      <div className="grid gap-3 border border-slate-200 rounded-lg p-4 bg-slate-50/60">
        <div>
          <Label>Title</Label>
          <Input
            value={form.title}
            onChange={(e) =>
              setForm({
                ...form,
                title: e.target.value,
              })
            }
            placeholder="e.g., Live class rescheduled"
          />
        </div>

        <div>
          <Label>Message</Label>

          <Textarea
            value={form.message}
            onChange={(e) =>
              setForm({
                ...form,
                message: e.target.value,
              })
            }
            placeholder="Write your announcement message here..."
            rows={4}
          />
        </div>

        <Button
          onClick={create}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 gap-2 w-fit"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Publish Announcement
        </Button>
      </div>

      <div className="mt-5 space-y-2">
        <p className="text-sm font-medium">Published ({items.length})</p>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-6 text-center">
            No announcements yet.
          </div>
        ) : (
          items.map((a) => (
            <div
              key={a.id}
              className="border border-slate-200 rounded-lg p-3 flex items-start gap-3"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{a.title}</p>

                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-700 border-blue-200"
                  >
                    Active
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground mt-1">
                  {a.message}
                </p>
              </div>

              <Button size="icon" variant="ghost" onClick={() => remove(a.id)}>
                <Trash2 className="h-4 w-4 text-slate-500" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
