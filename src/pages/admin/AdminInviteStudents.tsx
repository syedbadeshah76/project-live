// src/pages/admin/AdminInviteStudents.tsx
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { HtmlEditor } from "@/components/admin/HtmlEditor";
import {
  ArrowLeft, Mail, X, Calendar as CalendarIcon, Clock, Users, Folder,
} from "lucide-react";
import { courses } from "@/data/courses";
import { useToast } from "@/hooks/use-toast";
import {
  inviteStudentsService,
  parseEmailList,
  isValidEmail,
  type InviteSchedule,
} from "@/services/invite-students.service";

type Tab = "single" | "bulk" | "csv";

const DEFAULT_SUBJECT = "You’re invited to join Edvanz";
const DEFAULT_MESSAGE =
  "<h2>Welcome to Edvanz</h2><p>We’d love to have you on our platform. Enroll in the recommended course below to get started.</p>";

const AdminInviteStudents = () => {
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("single");

  // Shared fields
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [htmlMessage, setHtmlMessage] = useState(DEFAULT_MESSAGE);
  const [suggestedCourseIds, setSuggestedCourseIds] = useState<string[]>([]);

  // Single
  const [singleEmail, setSingleEmail] = useState("");

  // Bulk
  const [bulkText, setBulkText] = useState("");

  // CSV
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Schedule (frontend-only helper)
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleCourse, setScheduleCourse] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [schedules, setSchedules] = useState<InviteSchedule[]>([]);
  const [activeSchedule, setActiveSchedule] = useState<InviteSchedule | null>(null);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    inviteStudentsService.listSchedules().then(setSchedules).catch(() => setSchedules([]));
  }, []);

  const toggleCourse = (id: string) => {
    setSuggestedCourseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const estimateRecipientsCount = (): number => {
    if (tab === "single") return singleEmail ? 1 : 0;
    if (tab === "bulk") return parseEmailList(bulkText).filter(isValidEmail).length;
    return 0;
  };

  const createSchedule = async () => {
    if (!scheduleCourse.trim() || !scheduleDate || !scheduleTime) {
      toast({
        title: "Missing fields",
        description: "Course title, date and time are required.",
        variant: "destructive",
      });
      return;
    }
    const s = await inviteStudentsService.createSchedule({
      courseTitle: scheduleCourse,
      date: scheduleDate,
      time: scheduleTime,
      recipientsCount: estimateRecipientsCount(),
    });
    setSchedules((prev) => [...prev, s]);
    setActiveSchedule(s);
    setShowSchedule(false);
    setScheduleCourse("");
    setScheduleDate("");
    setScheduleTime("");
    toast({ title: "Schedule created", description: `${s.courseTitle} on ${s.date} at ${s.time}` });
  };

  const submit = async () => {
    if (!htmlMessage.replace(/<[^>]*>/g, "").trim()) {
      toast({
        title: "Message required",
        description: "Write a welcome message before sending.",
        variant: "destructive",
      });
      return;
    }

    const courseId = suggestedCourseIds[0] ?? null;

    try {
      setSubmitting(true);

      if (tab === "single") {
        if (!isValidEmail(singleEmail)) {
          toast({ title: "Invalid email", variant: "destructive" });
          return;
        }
        const res = await inviteStudentsService.sendSingle({
          email: singleEmail,
          courseId,
          htmlMessage,
          subject,
        });
        toast({ title: res.message || "Invitation sent", description: singleEmail });
        setSingleEmail("");
      } else if (tab === "bulk") {
        const emails = parseEmailList(bulkText);
        const invalid = emails.filter((e) => !isValidEmail(e));
        if (invalid.length) {
          toast({
            title: "Invalid emails",
            description: invalid.slice(0, 3).join(", "),
            variant: "destructive",
          });
          return;
        }
        if (emails.length === 0) {
          toast({ title: "Add at least one email", variant: "destructive" });
          return;
        }
        if (emails.length > 10) {
          toast({
            title: "Too many recipients",
            description: "Bulk is capped at 10. Use Import CSV for larger lists.",
            variant: "destructive",
          });
          return;
        }
        const res = await inviteStudentsService.sendBulk({
          emails,
          courseId,
          htmlMessage,
          subject,
        });
        toast({
          title: res.message || "Invitations sent",
          description: `${res.invited ?? emails.length} recipients`,
        });
        setBulkText("");
      } else {
        if (!csvFile) {
          toast({ title: "Choose a CSV file", variant: "destructive" });
          return;
        }
        const res = await inviteStudentsService.sendCsv({
          file: csvFile,
          courseId,
          htmlMessage,
          subject,
        });
        toast({ title: res.message || "CSV invitations sent" });
        setCsvFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }

      setActiveSchedule(null);
    } catch (e) {
      toast({
        title: "Failed to send",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mx-auto max-w-3xl space-y-6"
      >
        <Link
          to="/admin/students"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Students
        </Link>

        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">Invite Students</h1>
          <p className="text-sm text-muted-foreground">Add new students to your platform</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList className="grid w-full grid-cols-3">
              {(["single", "bulk", "csv"] as const).map((t) => (
                <TabsTrigger key={t} value={t}>
                  {t === "single" ? "Single Email" : t === "bulk" ? "Bulk Invite" : "Import CSV"}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Single */}
            <TabsContent value="single" className="space-y-5 pt-6">
              <Field label="Email Address">
                <Input
                  type="email"
                  placeholder="student@example.com"
                  value={singleEmail}
                  onChange={(e) => setSingleEmail(e.target.value)}
                />
              </Field>
              <CourseSelector
                selected={suggestedCourseIds}
                onToggle={toggleCourse}
                label="Suggest a Course (Optional)"
                single
              />
            </TabsContent>

            {/* Bulk */}
            <TabsContent value="bulk" className="space-y-5 pt-6">
              <Field label="Email Addresses (One per line, up to 10)">
                <Textarea
                  rows={5}
                  placeholder={"student@example.com\nstudent2@example.com"}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                />
              </Field>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Tips:</span> You can paste multiple
                emails from a spreadsheet. Each email will be invited separately.
              </p>
              <CourseSelector
                selected={suggestedCourseIds}
                onToggle={toggleCourse}
                label="Suggest a Course (Optional)"
                single
              />
            </TabsContent>

            {/* CSV */}
            <TabsContent value="csv" className="space-y-5 pt-6">
              <div className="space-y-3">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") fileInputRef.current?.click();
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f) setCsvFile(f);
                  }}
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center hover:border-primary/50"
                >
                  <Folder className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm text-foreground">
                    {csvFile ? csvFile.name : "Drop CSV file here or click to select"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    File should contain columns: Email
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  Choose File
                </Button>
              </div>
              <CourseSelector
                selected={suggestedCourseIds}
                onToggle={toggleCourse}
                label="Suggest a Course (Optional)"
                single
              />
            </TabsContent>
          </Tabs>

          {/* Custom message (shared) */}
          <div className="mt-6 space-y-5 border-t border-border pt-6">
            <Field label="Email Subject">
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </Field>

            <Field label="Custom Message (HTML)">
              <HtmlEditor
                value={htmlMessage}
                onChange={setHtmlMessage}
                placeholder="Write the welcome message..."
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Content is delivered to the backend as HTML for email rendering. The invitation link
                is appended automatically by the backend.
              </p>
            </Field>

            {/* Schedule block */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Schedule (optional)</span>
                <Button variant="outline" size="sm" onClick={() => setShowSchedule((s) => !s)}>
                  Schedule
                </Button>
              </div>

              {showSchedule && (
                <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-foreground">Create New Schedule</h4>
                    <button
                      type="button"
                      onClick={() => setShowSchedule(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <Field label="Course Title">
                    <Input
                      value={scheduleCourse}
                      onChange={(e) => setScheduleCourse(e.target.value)}
                    />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Date">
                      <Input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                      />
                    </Field>
                    <Field label="Time">
                      <Input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                      />
                    </Field>
                  </div>
                  <Button size="sm" onClick={createSchedule}>
                    Create Schedule
                  </Button>
                </div>
              )}

              {schedules.length > 0 && (
                <div className="space-y-2">
                  {schedules.map((s) => {
                    const selected = activeSchedule?.id === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setActiveSchedule(selected ? null : s)}
                        className={`w-full rounded-lg border p-3 text-left transition ${
                          selected
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{s.courseTitle}</p>
                            <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3" />
                                {format(new Date(s.date), "MMM d, yyyy")}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {s.time}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Users className="h-3 w-3" /> {s.recipientsCount} students
                              </span>
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">{s.status}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className="mt-6 flex justify-end gap-2 border-t border-border pt-5">
            <Button variant="outline" asChild>
              <Link to="/admin/students">Cancel</Link>
            </Button>
            <Button onClick={submit} disabled={submitting}>
              <Mail className="mr-2 h-4 w-4" />
              {submitting ? "Sending..." : "Send Invitations"}
            </Button>
          </div>
        </div>
      </motion.div>
    </AdminLayout>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-muted-foreground">{label}</label>
    {children}
  </div>
);

const CourseSelector = ({
  selected,
  onToggle,
  label,
  single,
}: {
  selected: string[];
  onToggle: (id: string) => void;
  label: string;
  single?: boolean;
}) => {
  const value = single ? (selected[0] ?? "") : "";
  return (
    <Field label={label}>
      {single ? (
        <Select
          value={value}
          onValueChange={(id) => {
            if (selected[0] === id) return;
            if (selected[0]) onToggle(selected[0]);
            onToggle(id);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a course" />
          </SelectTrigger>
          <SelectContent>
            {courses.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
          {courses.map((c) => {
            const active = selected.includes(String(c.id));
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onToggle(String(c.id))}
                className={`w-full rounded px-2 py-1.5 text-left text-sm transition ${
                  active ? "bg-primary/10 text-primary" : "hover:bg-muted"
                }`}
              >
                {c.title}
              </button>
            );
          })}
        </div>
      )}
    </Field>
  );
};

export default AdminInviteStudents;
