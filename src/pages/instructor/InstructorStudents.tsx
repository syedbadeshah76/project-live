import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Users, CheckCircle2, Sparkles, TrendingUp, Filter, Download } from "lucide-react";
import {
  instructorService,
  type InstructorStudentDetail,
  type InstructorStudentsStats,
  type InstructorStudentStatus,
} from "@/services/instructor.service";
import { toast } from "sonner";
import { format } from "date-fns";

const PAGE_SIZE = 6;

const statusStyles: Record<InstructorStudentStatus, string> = {
  active: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  completed: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  inactive: "bg-slate-200 text-slate-600 hover:bg-slate-200",
};

const safeDate = (v: string) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : format(d, "MMM d, yyyy");
};

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <Card className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.03)] rounded-[20px]">
      {/* Background Decorative Organic Wave */}
      <div className="absolute inset-y-0 right-0 w-[55%] pointer-events-none overflow-hidden">
        <svg
          className="h-full w-full"
          viewBox="0 0 160 100"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M 45 0 C 15 35, 65 65, 30 100 L 160 100 L 160 0 Z"
            fill="#EEF4FF"
            className="dark:fill-blue-950/30"
          />
        </svg>
      </div>

      <CardContent className="relative z-10 p-5 sm:p-6 flex items-center justify-between min-h-[105px]">
        {/* Left Side: Value & Subtitle */}
        <div className="flex flex-col justify-center pr-2">
          <span className="text-2xl sm:text-[26px] font-bold text-blue-600 dark:text-blue-400 tracking-tight leading-none mb-1.5">
            {value}
          </span>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">
            {label}
          </span>
        </div>

        {/* Right Side: Circular Icon Badge */}
        <div className="h-12 w-12 rounded-full bg-[#1D4ED8] dark:bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0 ml-3 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:stroke-[2.2]">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

const InstructorStudents = () => {
  const [students, setStudents] = useState<InstructorStudentDetail[]>([]);
  const [stats, setStats] = useState<InstructorStudentsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | InstructorStudentStatus>("all");
  const [page, setPage] = useState(1); // UI is 1-based
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selected, setSelected] = useState<InstructorStudentDetail | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await instructorService.getStudents(
          undefined,
          { page: page - 1, size: PAGE_SIZE },
          statusFilter === "all" ? undefined : statusFilter,
        );
        if (!alive) return;
        setStudents(res.data.students);
        setStats(res.data.stats);
        setTotalPages(res.data.meta.totalPages || 1);
        setTotalItems(res.data.meta.totalItems || res.data.students.length);
      } catch (e) {
        console.error(e);
        if (!alive) return;
        toast.error("Failed to load students");
        setStudents([]);
        setTotalPages(1);
        setTotalItems(0);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [page, statusFilter]);

  const handleExport = () => {
    const header = ["Student", "Email", "Course", "Progress", "Joined", "Status"];
    const rows = students.map((s) => [
      s.name, s.email, s.courseName, `${s.progress}%`, safeDate(s.enrolledDate), s.status,
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "students.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported CSV");
  };

  const statCards = [
    { label: "Total Students", value: (stats?.totalStudents ?? 0).toLocaleString(), icon: Users },
    { label: "Active Students", value: (stats?.activeStudents ?? 0).toLocaleString(), icon: CheckCircle2 },
    { label: "New This Month", value: (stats?.newThisMonth ?? 0).toLocaleString(), icon: Sparkles },
    { label: "Avg. Progress", value: `${stats?.avgProgress ?? 0}%`, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Students</h1>
        <p className="text-sm text-slate-500">Manage enrolled students across all courses</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon }) => (
          <StatCard key={label} label={label} value={value} icon={Icon} />
        ))}
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-700">
        + Student enrollments flow in from Student Portal automatically
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">All Students</CardTitle>
          <div className="flex items-center gap-2">
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" /> Filter
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-40 p-1">
                {(["all", "active", "inactive", "completed"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setStatusFilter(opt);
                      setPage(1);
                      setFilterOpen(false);
                    }}
                    className={`w-full rounded px-3 py-1.5 text-left text-sm hover:bg-slate-100 ${
                      statusFilter === opt ? "font-medium text-blue-600" : "text-slate-700"
                    }`}
                  >
                    {opt === "all" ? "All Status" : opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!students.length}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-slate-500">
                      Loading students…
                    </TableCell>
                  </TableRow>
                ) : students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-slate-500">
                      No students found
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((s) => (
                    <TableRow key={`${s.id}-${s.courseId}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-blue-100 text-xs text-blue-700">
                              {s.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-slate-900">{s.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">{s.email}</TableCell>
                      <TableCell className="text-slate-600">{s.courseName || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={s.progress} className="h-2 w-24" />
                          <span className="text-xs text-slate-600">{s.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">{safeDate(s.enrolledDate)}</TableCell>
                      <TableCell>
                        <Badge className={statusStyles[s.status]}>
                          {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setSelected(s)}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-slate-500">
              Showing {students.length} of {totalItems} students
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      {selected.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-left">{selected.name}</DialogTitle>
                    <p className="text-sm text-slate-500">{selected.email}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge className={statusStyles[selected.status]}>
                        {selected.status.charAt(0).toUpperCase() + selected.status.slice(1)}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        Joined {safeDate(selected.enrolledDate)}
                      </span>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <h4 className="mb-3 text-sm font-medium text-slate-900">Course Information</h4>
                  <p className="text-xs text-slate-500">Course</p>
                  <p className="mb-3 text-sm text-slate-800">{selected.courseName || "—"}</p>
                  <p className="text-xs text-slate-500">Progress</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Progress value={selected.progress} className="h-2 flex-1" />
                    <span className="text-xs text-slate-600">{selected.progress}%</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InstructorStudents;
