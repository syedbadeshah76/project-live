import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { meetingService } from "@/services/meeting.service";
import { courses } from "@/data/courses";
import type { MeetingType, MeetingParticipant } from "@/types/meeting.types";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Video, Monitor, Globe, Calendar as CalendarIcon,
  Clock, Users, Plus, X, Mail, Bell, Loader2,
} from "lucide-react";

const meetingTypes: {
  value: MeetingType; label: string; icon: typeof Video; description: string;
}[] = [
  { value: "zoom", label: "Video Call", icon: Video, description: "Auto-generated Zoom link" },
  { value: "google_meet", label: "Google Meet", icon: Globe, description: "Google Meet session" },
  { value: "internal", label: "In-person / Internal", icon: Monitor, description: "Edvanz meeting room" },
];

const initials = (n: string) =>
  n.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

const AdminScheduleMeeting = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [participantEmail, setParticipantEmail] = useState("");
  const [participantName, setParticipantName] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    courseId: "",
    meetingType: "zoom" as MeetingType,
    date: "",
    startTime: "",
    duration: 60,
    participants: [] as MeetingParticipant[],
    notifications: {
      sendInvitations: true,
      sendReminder15Min: true,
      sendFollowUp: false,
    },
  });

  const addParticipant = () => {
    const email = participantEmail.trim();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "Invalid email", variant: "destructive" });
      return;
    }
    if (form.participants.some((p) => p.email === email)) {
      toast({ title: "Participant already added", variant: "destructive" });
      return;
    }
    setForm((f) => ({
      ...f,
      participants: [
        ...f.participants,
        {
          id: `p-${Date.now()}`,
          name: participantName.trim() || email.split("@")[0],
          email,
        },
      ],
    }));
    setParticipantEmail("");
    setParticipantName("");
  };

  const removeParticipant = (id: string) =>
    setForm((f) => ({ ...f, participants: f.participants.filter((p) => p.id !== id) }));

  const submit = async () => {
    if (!form.title || !form.date || !form.startTime) {
      toast({ title: "Title, date and start time are required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await meetingService.createMeeting(
        {
          title: form.title,
          description: form.description,
          courseId: form.courseId || undefined,
          date: form.date,
          startTime: form.startTime,
          duration: form.duration,
          meetingType: form.meetingType,
          participants: form.participants,
          notifications: form.notifications,
        },
        { createdBy: "admin" }
      );
      if (res.success) {
        toast({ title: "Meeting scheduled 🎉", description: res.message });
        navigate("/admin/meetings");
      }
    } catch {
      toast({ title: "Failed to schedule meeting", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate("/admin/meetings")}
          className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1 mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Meetings
        </button>

        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Schedule New Meeting</h1>
        <p className="text-muted-foreground mb-6">
          Create a Zoom meeting, invite participants, and send automatic notifications.
        </p>

        {/* Basic Information */}
        <section className="bg-card rounded-2xl border shadow-card p-6 mb-6">
          <h2 className="font-semibold text-lg mb-1">Basic Information</h2>
          <p className="text-sm text-muted-foreground mb-5">Meeting title, description, and course context</p>

          <div className="space-y-4">
            <div>
              <Label>Meeting Title *</Label>
              <Input
                placeholder="e.g., Weekly Instructor Sync"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                rows={4}
                placeholder="Provide agenda and context for participants…"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Course (optional)</Label>
              <Select
                value={form.courseId || undefined}
                onValueChange={(v) => setForm({ ...form, courseId: v })}
              >
                <SelectTrigger><SelectValue placeholder="Link to a course" /></SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Meeting Details */}
        <section className="bg-card rounded-2xl border shadow-card p-6 mb-6">
          <h2 className="font-semibold text-lg mb-1">Meeting Details</h2>
          <p className="text-sm text-muted-foreground mb-5">Choose meeting type, date and time</p>

          {/* Type */}
          <div className="mb-5">
            <Label>Meeting Type *</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
              {meetingTypes.map((t) => {
                const active = form.meetingType === t.value;
                const Icon = t.icon;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm({ ...form, meetingType: t.value })}
                    className={`text-left rounded-xl border p-4 transition ${
                      active
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={`font-medium text-sm ${active ? "text-primary" : ""}`}>{t.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{t.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div>
              <Label className="flex items-center gap-1"><CalendarIcon className="h-3.5 w-3.5" /> Date *</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <Label className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Start Time *</Label>
              <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            </div>
            <div>
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                min={15}
                step={15}
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: Number(e.target.value) || 60 })}
              />
            </div>
          </div>

          {/* Participants */}
          <div>
            <Label className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Participants</Label>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 mt-1">
              <Input
                placeholder="Full name (optional)"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
              />
              <Input
                placeholder="email@example.com"
                type="email"
                value={participantEmail}
                onChange={(e) => setParticipantEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addParticipant(); } }}
              />
              <Button type="button" onClick={addParticipant} className="gap-1"><Plus className="h-4 w-4" /> Add</Button>
            </div>

            {form.participants.length > 0 && (
              <div className="mt-4 space-y-2">
                {form.participants.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 border rounded-lg p-3 bg-muted/30">
                    <Avatar className="h-9 w-9"><AvatarFallback>{initials(p.name)}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {p.email}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">Invited</Badge>
                    <Button size="icon" variant="ghost" onClick={() => removeParticipant(p.id)}>
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Notification Settings */}
        <section className="bg-card rounded-2xl border shadow-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Notification Settings</h2>
          </div>
          {[
            { key: "sendInvitations", label: "Send invitation emails to participants", desc: "Email + in-app bell notification" },
            { key: "sendReminder15Min", label: "Send reminder 15 minutes before start", desc: "Helps participants show up on time" },
            { key: "sendFollowUp", label: "Send follow-up after meeting", desc: "Recording link and next steps" },
          ].map((opt) => (
            <label key={opt.key} className="flex items-start gap-3 py-2 cursor-pointer">
              <Checkbox
                checked={form.notifications[opt.key as keyof typeof form.notifications]}
                onCheckedChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    notifications: { ...f.notifications, [opt.key]: !!v },
                  }))
                }
              />
              <div className="flex-1">
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
            </label>
          ))}
        </section>

        <div className="flex flex-col sm:flex-row justify-end gap-2">
          <Button variant="outline" onClick={() => navigate("/admin/meetings")}>Cancel</Button>
          <Button onClick={submit} disabled={submitting} className="gap-2">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Schedule Meeting
          </Button>
        </div>
      </motion.div>
    </AdminLayout>
  );
};

export default AdminScheduleMeeting;
