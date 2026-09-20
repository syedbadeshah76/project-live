// src/pages/admin/AdminStudentMonitoring.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Search, Eye, Pencil, Calendar as CalendarIcon, X, Users, Loader2 } from "lucide-react";
import {
  adminStudentsService,
  type AdminStudentDetail,
  type AdminStudentRow,
  type StudentStatus,
} from "@/services/admin-students.service";
import { useToast } from "@/hooks/use-toast";

const AVATAR_COLORS = [
  "bg-primary text-primary-foreground",
  "bg-emerald-500 text-white",
  "bg-amber-500 text-white",
  "bg-rose-500 text-white",
  "bg-violet-500 text-white",
];

const initials = (name: string) =>
  name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

const safeDate = (iso: string) => {
  try {
    return format(parseISO(iso), "dd/MM/yyyy");
  } catch {
    return iso;
  }
};

const AdminStudentMonitoring = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [students, setStudents] = useState<AdminStudentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | StudentStatus>("all");
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [viewingId, setViewingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminStudentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editStatus, setEditStatus] = useState<StudentStatus>("Active");

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminStudentsService.listStudents({
        search: search || undefined,
        status: statusFilter,
        joinedFrom: range?.from ? format(range.from, "yyyy-MM-dd") : undefined,
        joinedTo: range?.to
          ? format(range.to, "yyyy-MM-dd")
          : range?.from
            ? format(range.from, "yyyy-MM-dd")
            : undefined,
        page: 0,
        size: 100,
      });
      setStudents(res.data);
      setTotal(res.total);
    } catch (e) {
      setStudents([]);
      setTotal(0);
      toast({
        title: "Failed to load students",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, range?.from, range?.to, toast]);

  // Debounce search + refetch on filter change
  useEffect(() => {
    const t = setTimeout(fetchStudents, 250);
    return () => clearTimeout(t);
  }, [fetchStudents]);

  const loadDetail = async (id: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const d = await adminStudentsService.getStudent(id);
      if (d) {
        setDetail(d);
        setEditStatus(d.status);
      } else {
        toast({ title: "Student not found", variant: "destructive" });
      }
    } catch (e) {
      toast({
        title: "Failed to load student",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const openView = async (id: string) => {
    setEditingId(null);
    setViewingId(id);
    await loadDetail(id);
  };

  const openEdit = async (id: string) => {
    setViewingId(null);
    setEditingId(id);
    await loadDetail(id);
  };

  const closeModals = () => {
    setViewingId(null);
    setEditingId(null);
    setDetail(null);
    setDetailLoading(false);
  };

  const saveStatus = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      await adminStudentsService.updateStatus(detail.id, editStatus);
      toast({ title: "Student updated", description: `${detail.name} is now ${editStatus}.` });
      closeModals();
      fetchStudents();
    } catch (e) {
      toast({
        title: "Update failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const rangeLabel = useMemo(() => {
    if (!range?.from) return "Choose option...";
    if (range.to && range.to.getTime() !== range.from.getTime()) {
      return `${format(range.from, "MMM d")} – ${format(range.to, "MMM d")}`;
    }
    return format(range.from, "MMM d, yyyy");
  }, [range]);

  const dialogOpen = Boolean(viewingId || editingId);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Students</h1>
            <p className="text-sm text-muted-foreground">
              Manage and monitor all student accounts
            </p>
          </div>
          <Button onClick={() => navigate("/admin/students/invite")}>
            <Users className="mr-2 h-4 w-4" />
            Invite student
          </Button>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Search Students</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by student name or email..."
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Sort by (Joined Date)</label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal">
                    <span className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      {rangeLabel}
                    </span>
                    {range?.from && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRange(undefined);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.stopPropagation();
                            setRange(undefined);
                          }
                        }}
                        className="rounded p-0.5 hover:bg-muted"
                      >
                        <X className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="range" selected={range} onSelect={setRange} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Showing {students.length} of {total} student{total === 1 ? "" : "s"}
          </p>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Courses</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Joined Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s, i) => (
                  <motion.tr
                    key={s.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.2) }}
                    className="border-b border-border last:border-0"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className={AVATAR_COLORS[i % AVATAR_COLORS.length]}>
                            {initials(s.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground">{s.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{s.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{s.coursesCount}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <Progress value={s.overallProgress} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground w-9 text-right">
                          {s.overallProgress}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{safeDate(s.joinedDate)}</TableCell>
                    <TableCell>
                      {s.status === "Active" ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15">
                          Active
                        </Badge>
                      ) : s.status === "Suspended" ? (
                        <Badge className="bg-rose-500/15 text-rose-600 hover:bg-rose-500/15">
                          Suspended
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openView(s.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s.id)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading students...
            </div>
          )}

          {!loading && students.length === 0 && (
            <div className="flex flex-col items-center gap-2 p-10">
              <Users className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No students found.</p>
            </div>
          )}
        </div>
      </div>

      {/* View / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeModals()}>
        <DialogContent className="max-w-xl rounded-3xl p-6 sm:p-8">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-2xl font-bold">
              {detail?.name ?? (detailLoading ? "Loading..." : "Student Details")}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">{detail?.email}</p>
          </DialogHeader>

          {detailLoading && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Loading details...
            </div>
          )}

          {detail && !detailLoading && (
            <div className="space-y-6 pt-2">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatBox label="Enrolled Courses" value={String(detail.coursesCount)} />
                <StatBox label="Completed" value={String(detail.completedCourses ?? 0)} />
                <StatBox label="Progress" value={`${detail.overallProgress}%`} valueClass="text-[#2457D6]" />
                <StatBox
                  label="Total Spent"
                  value={
                    typeof detail.totalSpent === "number" && detail.totalSpent > 0
                      ? `$ ${detail.totalSpent.toFixed(2)}`
                      : "$ 0"
                  }
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">Join Date</label>
                  <Input
                    className="h-11 rounded-xl bg-muted/30 font-medium text-foreground"
                    value={safeDate(detail.joinedDate)}
                    readOnly
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">Status</label>
                  <Select
                    value={editStatus}
                    onValueChange={(v) => setEditStatus(v as StudentStatus)}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-background">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                      <SelectItem value="Suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {detail.enrolledCourses && detail.enrolledCourses.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <h4 className="text-sm font-semibold text-foreground">Enrolled Courses Detail</h4>
                  <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
                    {detail.enrolledCourses.map((c) => (
                      <div key={c.id} className="flex items-center gap-3">
                        <p className="flex-1 truncate text-sm text-foreground/80 font-medium">{c.title}</p>
                        <Progress value={c.progress} className="h-2 w-24" />
                        <span className="w-10 text-right text-xs font-semibold text-primary">
                          {c.progress}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModals}
                  className="w-full sm:w-44 h-11 rounded-2xl border-slate-200 text-slate-700 font-medium"
                >
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={saveStatus}
                  disabled={saving}
                  className="w-full sm:w-44 h-11 rounded-2xl bg-[#2457D6] hover:bg-[#1d46ad] text-white font-semibold"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

const StatBox = ({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) => (
  <div className="rounded-2xl border border-[#2457D6]/10 bg-[#EBF1FF]/50 p-4">
    <p className="text-xs font-medium text-muted-foreground">{label}</p>
    <p className={`text-xl font-bold text-foreground mt-1 ${valueClass ?? ""}`}>{value}</p>
  </div>
);

export default AdminStudentMonitoring;
