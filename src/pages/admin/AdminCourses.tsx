import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Eye, Edit, Star, BookOpen, Loader2, LayoutGrid, List, BookOpen as BookIcon } from "lucide-react";
import { coursesService } from "@/services/courses.service";
import { categoriesService } from "@/services/categories.service";
import { instructorsService } from "@/services/instructors.service";
import type { Category } from "@/types/api.types";
import { useToast } from "@/hooks/use-toast";

type AdminStatus = "Active" | "Draft" | "Archived";

interface AdminCourseRow {
  id: string;
  title: string;
  instructorName: string;
  category: string;
  categoryId?: string;
  status: "Published" | "Draft" | "Archived";
  adminStatus: AdminStatus;
  students: number;
  lessons: number;
  rating: number;
  ratingCount: number;
  price: number;
  thumbnail: string;
}

const unwrap = <T,>(res: any): T => (res && typeof res === "object" && "data" in res ? res.data : res) as T;

const toRow = (c: any, instructorLookup?: Map<string, string>): AdminCourseRow => {
  const isDraft =
    c.status === "DRAFT" ||
    c.status === "Draft" ||
    c.approvalStatus === "DRAFT" ||
    c.isPublished === false;

  const isArchived =
    c.status === "ARCHIVED" ||
    c.status === "Archived";

  const status: "Published" | "Draft" | "Archived" = isDraft
    ? "Draft"
    : isArchived
    ? "Archived"
    : "Published";

  const catId = typeof c.category === "object" ? c.category?.id : c.categoryId ?? c.category_id;
  const catName = typeof c.category === "string" ? c.category : c.category?.name ?? c.categoryName ?? "General";

  const instId = String(c.instructorId ?? c.instructorUserId ?? (typeof c.instructor === "object" ? c.instructor?.id || c.instructor?.userId : c.instructor) ?? "");
  const directName = typeof c.instructor === "string" && !c.instructor.startsWith("inst-") && !c.instructor.startsWith("user-") && !c.instructor.match(/^[0-9a-fA-F]{8}/)
    ? c.instructor
    : c.instructor?.name ?? c.instructorName ?? "";

  const instructorName = (instructorLookup?.get(instId) || directName || "Instructor").trim();

  return {
    id: String(c.id || c.courseId || ""),
    title: c.title ?? "Untitled Course",
    instructorName: instructorName || "Instructor",
    category: catName,
    categoryId: catId ? String(catId) : undefined,
    status,
    adminStatus: status === "Published" ? "Active" : status === "Archived" ? "Archived" : "Draft",
    students: Number(c.students ?? c.studentCount ?? c.enrolledCount ?? 0),
    lessons: Number(c.lessons ?? c.lessonCount ?? c.totalLessons ?? c.lessonsCount ?? 0),
    rating: Number(c.rating ?? c.avgRating ?? c.averageRating ?? 0),
    ratingCount: Number(c.ratingCount ?? c.reviewCount ?? c.reviewsCount ?? 0),
    price: Number(c.basePrice ?? c.price ?? 0),
    thumbnail: c.thumbnailUrl ?? c.thumbnail ?? "",
  };
};

const AdminCourses = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [list, setList] = useState<AdminCourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mainCategories, setMainCategories] = useState<Category[]>([]);
  const [catsLoading, setCatsLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<"all" | AdminStatus>("all");
  const [view, setView] = useState<"grid" | "table">("grid");

  // Fetch Main Categories (Main Categories only: !parentId)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setCatsLoading(true);
        const res = await categoriesService.getCategories({ limit: 500 });
        if (res.success && Array.isArray(res.data)) {
          const mains = res.data.filter((c) => !c.parentId);
          if (alive) setMainCategories(mains);
        }
      } catch {
        // Fallback
      } finally {
        if (alive) setCatsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Fetch Courses
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch instructors for lookup & courses in parallel
        const [instRes, approvedRes, adminRes] = await Promise.allSettled([
          instructorsService.list().catch(() => []),
          coursesService.getApprovedCourses(),
          coursesService.getAdminCourses(0, 100),
        ]);

        const instMap = new Map<string, string>();
        if (instRes.status === "fulfilled" && Array.isArray(instRes.value)) {
          instRes.value.forEach((i: any) => {
            const name = i.name || `${i.firstName || ""} ${i.lastName || ""}`.trim();
            if (i.id && name) instMap.set(String(i.id), name);
            if (i.userId && name) instMap.set(String(i.userId), name);
          });
        }

        const extractList = (resObj: any): any[] => {
          if (!resObj) return [];
          const d = unwrap<any>(resObj) ?? resObj;
          return Array.isArray(d)
            ? d
            : (d?.courses ?? d?.content ?? d?.items ?? d?.data ?? []);
        };

        let courseList: any[] = [];
        if (approvedRes.status === "fulfilled") {
          const arr = extractList(approvedRes.value);
          if (arr.length > 0) {
            courseList = arr.map((c: any) => ({
              ...c,
              approvalStatus: c.approvalStatus || "APPROVED",
              isApproved: true,
            }));
          }
        }

        if (courseList.length === 0 && adminRes.status === "fulfilled") {
          const arr = extractList(adminRes.value);
          if (arr.length > 0) courseList = arr;
        }

        if (courseList.length === 0) {
          try {
            const fallback = await coursesService.getCourses();
            const arr = extractList(fallback);
            if (arr.length > 0) courseList = arr;
          } catch {
            // ignore
          }
        }

        if (!alive) return;
        setList(courseList.map((c) => toRow(c, instMap)));
      } catch (e: any) {
        console.error("Failed to load courses", e);
        if (!alive) return;
        const msg = e?.response?.data?.message ?? e?.message ?? "Failed to load courses";
        setError(msg);
        toast({ title: "Failed to load courses", description: msg, variant: "destructive" });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [toast]);

  const filtered = useMemo(
    () =>
      list.filter((c) => {
        const q = query.trim().toLowerCase();
        const matchQ =
          !q ||
          c.title?.toLowerCase().includes(q) ||
          c.instructorName?.toLowerCase().includes(q);

        let matchCat = category === "all";
        if (!matchCat) {
          const selectedCat = mainCategories.find((cat) => cat.id === category);
          matchCat =
            c.categoryId === category ||
            c.category === category ||
            (selectedCat != null &&
              c.category.toLowerCase() === selectedCat.name.toLowerCase());
        }

        const matchStatus = status === "all" || c.adminStatus === status;
        return matchQ && matchCat && matchStatus;
      }),
    [list, query, category, status, mainCategories]
  );

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Courses</h1>
            <p className="text-sm text-muted-foreground">
              Manage and organize all courses on your platform
            </p>
          </div>
          <Button onClick={() => navigate("/admin/courses/new")} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Course
          </Button>
        </div>

        {/* Filters card */}
        <div className="rounded-lg border bg-primary/5 p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Search Courses</label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by course name or instructor..."
                  className="pl-9 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1 bg-white">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {catsLoading ? (
                    <SelectItem value="loading" disabled>
                      Loading categories...
                    </SelectItem>
                  ) : mainCategories.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No categories available
                    </SelectItem>
                  ) : (
                    mainCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger className="mt-1 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3 text-sm text-muted-foreground">
            {loading ? "Loading…" : `Showing ${filtered.length} courses`}
          </div>
        </div>

        {/* View toggle */}
        <div className="flex justify-end">
          <div className="inline-flex overflow-hidden rounded-md border">
            <button
              onClick={() => setView("grid")}
              className={
                (view === "grid"
                  ? "bg-primary text-primary-foreground "
                  : "bg-white text-primary hover:bg-primary/5 ") +
                "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium"
              }
            >
              <LayoutGrid className="h-4 w-4" />
              Grid View
            </button>
            <button
              onClick={() => setView("table")}
              className={
                (view === "table"
                  ? "bg-primary text-primary-foreground "
                  : "bg-white text-primary hover:bg-primary/5 ") +
                "inline-flex items-center gap-1.5 border-l px-3 py-1.5 text-sm font-medium"
              }
            >
              <List className="h-4 w-4" />
              Table View
            </button>
          </div>
        </div>

        {/* Loading / error */}
        {loading && (
          <div className="rounded-lg border bg-white py-16 text-center">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Loading courses…</p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border bg-white py-16 text-center text-red-600">
            {error}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <div className="rounded-lg border bg-white py-16 text-center text-muted-foreground">
            <BookOpen className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p>No courses found.</p>
          </div>
        )}

        {/* Grid view */}
        {!loading && !error && filtered.length > 0 && view === "grid" && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <div
                key={c.id}
                className="overflow-hidden rounded-lg border bg-white transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-[16/10] bg-muted">
                  {c.thumbnail ? (
                    <img
                      src={c.thumbnail}
                      alt={c.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-primary/10">
                      <BookIcon className="h-10 w-10 text-primary/40" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-foreground">
                    {c.title}
                  </h3>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="truncate pr-2">{c.instructorName}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded bg-muted px-1.5 py-0.5">
                      <BookIcon className="h-3 w-3" />
                      {c.lessons} Lessons
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-4 w-4 fill-primary text-primary" />
                      <span className="font-medium">{c.rating.toFixed(1)}</span>
                      {c.ratingCount > 0 && (
                        <span className="text-xs text-muted-foreground">({c.ratingCount})</span>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      ${c.price.toFixed(2)}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button asChild size="sm" variant="outline" className="gap-1 border-primary/30 text-primary hover:bg-primary/5">
                      <Link to={`/admin/courses/${c.id}`}>
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="gap-1 border-primary/30 text-primary hover:bg-primary/5">
                      <Link to={`/admin/courses/${c.id}/edit`}>
                        <Edit className="h-3.5 w-3.5" />
                        Edit
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Table view */}
        {!loading && !error && filtered.length > 0 && view === "table" && (
          <div className="overflow-hidden rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Instructor</TableHead>
                  <TableHead>Lessons</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.title}</div>
                      <div className="text-xs text-muted-foreground">{c.category}</div>
                    </TableCell>
                    <TableCell className="text-sm">{c.instructorName}</TableCell>
                    <TableCell className="text-sm">{c.lessons}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 fill-primary text-primary" />
                        {c.rating.toFixed(1)}
                      </div>
                    </TableCell>
                    <TableCell>${c.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button size="icon" variant="ghost" asChild>
                          <Link to={`/admin/courses/${c.id}`} aria-label="View">
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button size="icon" variant="ghost" asChild>
                          <Link to={`/admin/courses/${c.id}/edit`} aria-label="Edit">
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminCourses;
