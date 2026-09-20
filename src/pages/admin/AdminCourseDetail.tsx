import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Edit, Trash2, Users, Star, Clock, Share2, Download,
  BookOpen, BarChart3, Loader2,
} from "lucide-react";
import { coursesService } from "@/services/courses.service";
import { instructorsService } from "@/services/instructors.service";
import { reviewsService } from "@/services/reviews.service";
import { enrollmentService } from "@/services/enrollment.service";
import { categoriesService } from "@/services/categories.service";
import { useToast } from "@/hooks/use-toast";

type CourseView = {
  id: string;
  title: string;
  description: string;
  instructor: string;
  category: string;
  level: string;
  language: string;
  status: "Published" | "Draft" | "Archived";
  students: number;
  rating: number;
  lessonsCount: number;
  duration: string;
  price: number;
  strikeOutPrice: number;
  thumbnail: string;
  learningOutcomes: string[];
  requirements: string[];
  modules: Array<{ id: string; title: string; lessons: number; hours: number }>;
  createdAt?: string;
  updatedAt?: string;
};

const AdminCourseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const isInstructor = location.pathname.startsWith("/instructor");
  const Layout = isInstructor ? ({ children }: any) => <>{children}</> : AdminLayout;
  const coursesPath = isInstructor ? "/instructor/courses" : "/admin/courses";

  const [course, setCourse] = useState<CourseView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch main course data (Recorded or Live)
        const res: any = await coursesService.getCourse(id);
        const c: any = res?.data ?? res;
        if (!c || (!c.id && !c.title)) throw new Error("Course not found");

        const courseId = String(c.id ?? id);
        const instructorId = String(
          c.instructorId ??
          c.instructorUserId ??
          c.createdById ??
          (typeof c.instructor === "object" ? c.instructor?.id || c.instructor?.userId : c.instructor) ??
          ""
        );
        const categoryId = String(
          c.categoryId ??
          c.subcategoryId ??
          (typeof c.category === "object" ? c.category?.id : c.category) ??
          ""
        );

        // 2. Fetch parallel enrichment details from individual services
        const [instructorsRes, reviewSummaryRes, enrollmentRes, categoryRes, modulesRes] =
          await Promise.allSettled([
            instructorsService.list(),
            reviewsService.getReviewSummary(courseId),
            enrollmentService.getCourseEnrollmentCount(courseId),
            categoryId ? categoriesService.getCategoryById(categoryId) : categoriesService.getCategories(),
            c.modules?.length ? Promise.resolve({ data: c.modules }) : coursesService.getModulesByCourse(courseId),
          ]);

        // A. Resolve Instructor Name via instructors.service.ts
        let resolvedInstructorName = "";
        if (instructorsRes.status === "fulfilled" && Array.isArray(instructorsRes.value)) {
          const list = instructorsRes.value;
          const match = list.find(
            (i) =>
              (instructorId && (String(i.id) === instructorId || String(i.userId) === instructorId)) ||
              (typeof c.instructor === "string" && (String(i.id) === c.instructor || String(i.userId) === c.instructor))
          );
          if (match && match.name) {
            resolvedInstructorName = match.name;
          }
        }
        if (!resolvedInstructorName) {
          const rawInst =
            (typeof c.instructor === "object" ? c.instructor?.name : undefined) ||
            c.instructorName ||
            (typeof c.instructor === "string" && !c.instructor.includes("-") ? c.instructor : "");
          resolvedInstructorName = rawInst || "—";
        }

        // B. Resolve Rating via reviews.service.ts
        let resolvedRating = Number(c.rating ?? c.avgRating ?? 0);
        if (reviewSummaryRes.status === "fulfilled" && reviewSummaryRes.value?.data) {
          const summary = reviewSummaryRes.value.data;
          if (typeof summary.avgRating === "number" && summary.avgRating > 0) {
            resolvedRating = summary.avgRating;
          }
        }

        // C. Resolve Students/Enrollment Count via enrollment.service.ts
        let resolvedStudents = Number(c.students ?? c.enrolledCount ?? c.totalStudents ?? 0);
        if (enrollmentRes.status === "fulfilled" && enrollmentRes.value?.data) {
          const count = enrollmentRes.value.data.count;
          if (typeof count === "number") {
            resolvedStudents = count;
          }
        }

        // D. Resolve Category Name via categories.service.ts
        let resolvedCategoryName = "";
        if (typeof c.category === "object" && c.category?.name) {
          resolvedCategoryName = c.category.name;
        } else if (categoryRes.status === "fulfilled" && categoryRes.value?.data) {
          const catData: any = categoryRes.value.data;
          if (catData.name) {
            resolvedCategoryName = catData.name;
          } else if (Array.isArray(catData)) {
            const found = catData.find((cat: any) => String(cat.id) === categoryId || String(cat.slug) === categoryId);
            if (found && found.name) resolvedCategoryName = found.name;
          }
        }
        if (!resolvedCategoryName) {
          resolvedCategoryName =
            (typeof c.category === "string" && !c.category.includes("-") ? c.category : undefined) ||
            c.categoryName ||
            "—";
        }

        // E. Resolve Modules & Duration calculations
        let modules: any[] = [];
        if (modulesRes.status === "fulfilled") {
          const mData: any = (modulesRes.value as any)?.data ?? modulesRes.value;
          modules = Array.isArray(mData) ? mData : [];
        }

        const totalLessons = modules.reduce(
          (a: number, m: any) => a + (Array.isArray(m.lessons) ? m.lessons.length : (m.lessonCount ?? 0)),
          0,
        );
        const totalSec = modules.reduce(
          (a: number, m: any) =>
            a +
            (Array.isArray(m.lessons)
              ? m.lessons.reduce((s: number, l: any) => s + (l.videoDurationSeconds ?? 0), 0)
              : 0),
          0,
        );

        const view: CourseView = {
          id: courseId,
          title: c.title ?? "Untitled",
          description: c.description ?? "",
          instructor: resolvedInstructorName,
          category: resolvedCategoryName,
          level: c.level ? String(c.level).charAt(0) + String(c.level).slice(1).toLowerCase() : "—",
          language: c.language ?? "English",
          status:
            c.status === "PUBLISHED" || c.status === "Published"
              ? "Published"
              : c.status === "ARCHIVED"
              ? "Archived"
              : "Draft",
          students: resolvedStudents,
          rating: resolvedRating,
          lessonsCount: totalLessons || Number(c.lessons ?? c.lessonCount ?? 0),
          duration:
            totalSec > 0
              ? `${(totalSec / 3600).toFixed(1)}h`
              : c.duration ?? "—",
          price: Number(c.basePrice ?? c.price ?? 0),
          strikeOutPrice: Number(c.strikeOutPrice ?? c.discountPrice ?? 0),
          thumbnail: c.thumbnailUrl ?? c.thumbnail ?? "",
          learningOutcomes: Array.isArray(c.learningOutcomes) ? c.learningOutcomes : (c.whatYouWillLearn ?? []),
          requirements: Array.isArray(c.requirements) ? c.requirements : [],
          modules: modules.map((m: any, i: number) => ({
            id: String(m.id ?? i),
            title: m.title ?? `Module ${i + 1}`,
            lessons: Array.isArray(m.lessons) ? m.lessons.length : (m.lessonCount ?? 0),
            hours: Array.isArray(m.lessons)
              ? Math.max(
                  1,
                  Math.round(
                    m.lessons.reduce((s: number, l: any) => s + (l.videoDurationSeconds ?? 0), 0) / 3600,
                  ),
                )
              : 1,
          })),
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        };
        if (!alive) return;
        setCourse(view);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.response?.data?.message ?? e?.message ?? "Course not found");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const handleDelete = async () => {
    if (!course) return;
    if (!confirm("Delete this course? This cannot be undone.")) return;
    try {
      await coursesService.deleteCourse(course.id);
      toast({ title: "Course deleted", variant: "destructive" });
      navigate(coursesPath);
    } catch (e: any) {
      toast({
        title: "Delete failed",
        description: e?.response?.data?.message ?? e?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }
  if (error || !course) {
    return (
      <Layout>
        <div className="text-center py-20 text-muted-foreground">
          {error ?? "Course not found."}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Link
        to={coursesPath}
        className="inline-flex items-center gap-2 text-primary text-sm mb-4 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Courses
      </Link>

      <div className="bg-gradient-to-br from-violet-200 to-violet-300 rounded-2xl h-44 md:h-56 mb-6 flex items-center justify-center overflow-hidden">
        {course.thumbnail
          ? <img src={course.thumbnail} alt={course.title} className="h-full w-full object-cover" />
          : <BookOpen className="h-20 w-20 text-white/80" />}
      </div>

      <div className="bg-card rounded-2xl border border-border p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-display text-2xl font-bold text-foreground">{course.title}</h1>
              <Badge className="bg-emerald-100 text-emerald-700 border-0">
                {course.status === "Published" ? "Active" : course.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-1">Instructor:</p>
            <p className="font-medium text-sm mb-3">{course.instructor}</p>
            <p className="text-sm text-muted-foreground max-w-3xl">{course.description}</p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Button onClick={() => navigate(`${coursesPath}/${course.id}/edit`)} className="gap-2">
              <Edit className="h-4 w-4" /> Edit
            </Button>
            {/* <Button variant="outline" className="gap-2 text-red-500 border-red-200 hover:bg-red-50" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button> */}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-6 border-t border-border">
          <Stat icon={Users} value={course.students.toLocaleString()} label="Students" />
          <Stat icon={Star} value={course.rating.toString()} label="Review" />
          <Stat icon={BookOpen} value={course.lessonsCount.toString()} label="Lessons" />
          <Stat icon={Clock} value={course.duration} label="Total Duration" />
          <div className="md:col-span-1">
            <p className="text-xl font-bold text-primary">${course.price.toFixed(2)}</p>
            {course.strikeOutPrice > course.price && (
              <p className="text-xs text-muted-foreground line-through">
                ${course.strikeOutPrice.toFixed(2)}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {course.learningOutcomes.length > 0 && (
            <Section title="What You'll Learn">
              <ul className="space-y-2">
                {course.learningOutcomes.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Course Sections">
            {course.modules.length === 0 ? (
              <p className="text-sm text-muted-foreground">No modules yet.</p>
            ) : (
              <div className="space-y-3">
                {course.modules.map((s) => (
                  <div
                    key={s.id}
                    className="border border-border rounded-xl p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-sm">{s.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.lessons} lessons · {s.hours} hours
                      </p>
                    </div>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </Section>

          {course.requirements.length > 0 && (
            <Section title="Requirements">
              <ul className="space-y-2">
                {course.requirements.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        <aside className="space-y-4">
          <div className="bg-card rounded-2xl border border-border p-6">
            <h3 className="font-semibold mb-4">Course Information</h3>
            <InfoRow label="Category" value={course.category} />
            <InfoRow label="Level" value={course.level} />
            <InfoRow label="Language" value={course.language} />
            {course.createdAt && <InfoRow label="Created" value={new Date(course.createdAt).toLocaleDateString()} />}
            {course.updatedAt && <InfoRow label="Last Updated" value={new Date(course.updatedAt).toLocaleDateString()} />}
          </div>
          <Button variant="outline" className="w-full gap-2">
            <Share2 className="h-4 w-4" /> Share
          </Button>
          <Button variant="outline" className="w-full gap-2">
            <Download className="h-4 w-4" /> Export
          </Button>
        </aside>
      </div>
    </Layout>
  );
};

function Stat({ icon: Icon, value, label }: { icon: any; value: string; label: string }) {
  return (
    <div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
        <Icon className="h-3 w-3" /> {label}
      </p>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <h3 className="font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-2 border-b border-border last:border-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export default AdminCourseDetail;
