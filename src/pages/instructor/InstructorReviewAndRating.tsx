// src/pages/instructor/InstructorReviewAndRating.tsx
import { useEffect, useMemo, useState } from "react";
import { Star, Award, Inbox, CheckCircle2 } from "lucide-react";
// import { InstructorLayout } from "@/components/instructor/InstructorLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { reviewsService } from "@/services/reviews.service";
import { useAuth } from "@/contexts/AuthContext";

type ReviewRow = {
  id: string;
  courseId: string;
  courseName: string;
  userId?: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  reviewText: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected" | string;
};

const unwrap = <T,>(res: any): T => {
  if (res == null) return res;
  if (Array.isArray(res)) return res as T;
  if (res.data !== undefined) return res.data as T;
  return res as T;
};

const StarRow = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        className={`h-3.5 w-3.5 ${
          i <= Math.round(rating)
            ? "fill-[#1E52D6] text-[#1E52D6]"
            : "text-muted-foreground/30"
        }`}
      />
    ))}
  </div>
);

const StatCard = ({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string | number;
  Icon: React.ComponentType<{ className?: string }>;
}) => (
  <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-2xl sm:text-3xl font-bold tracking-tight">{value}</p>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">{label}</p>
      </div>
      <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </div>
    </div>
    <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/5" />
  </div>
);

const StatusPill = ({ status }: { status: string }) => {
  const s = (status || "").toLowerCase();
  if (s === "rejected")
    return <Badge variant="destructive">Rejected</Badge>;
  return (
    <Badge className="bg-primary text-primary-foreground hover:bg-primary">
      Published
    </Badge>
  );
};

const InstructorReviewAndRating = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [overallRating, setOverallRating] = useState<number>(0);
  const [totalReviews, setTotalReviews] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const res = await reviewsService.getInstructorReviews();
        if (cancelled) return;

        if (res?.success && res.data) {
          const list: ReviewRow[] = (res.data.reviews || []).map((rv: any) => {
            const userName =
              rv.userName ??
              rv.studentName ??
              rv.name ??
              rv.user?.name ??
              rv.student?.name ??
              rv.studentDetails?.name ??
              rv.studentDetails?.studentName ??
              rv.studentDetails?.fullName ??
              rv.user?.fullName ??
              rv.student?.fullName ??
              ([rv.firstName, rv.lastName].filter(Boolean).join(" ").trim() || "Student");

            const courseName =
              rv.courseName ??
              rv.courseTitle ??
              rv.course?.title ??
              rv.course?.name ??
              "Course";

            return {
              id: String(rv.id || rv.reviewId || Math.random()),
              courseId: String(rv.courseId || ""),
              courseName,
              userId: rv.userId || rv.studentId,
              userName,
              userAvatar: rv.userAvatar || rv.studentAvatar || rv.user?.avatar || rv.student?.avatar,
              rating: Number(rv.rating ?? 0),
              reviewText: rv.reviewText || rv.text || "",
              createdAt: rv.createdAt || new Date().toISOString(),
              status: rv.status || "approved",
            };
          });

          setReviews(list);
          setOverallRating(res.data.overallRating ?? 0);
          setTotalReviews(res.data.totalReviews ?? list.length);
        } else {
          setReviews([]);
          setOverallRating(0);
          setTotalReviews(0);
        }
      } catch {
        if (!cancelled) {
          setReviews([]);
          setOverallRating(0);
          setTotalReviews(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const stats = useMemo(() => {
    const published = totalReviews || reviews.length;
    return {
      avg: overallRating || (reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0),
      total: totalReviews || reviews.length,
      published,
    };
  }, [reviews, overallRating, totalReviews]);

  return (
    // <InstructorLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <header>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            Review &amp; Ratings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here you can see your reviews and ratings
          </p>
        </header>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <StatCard
            label="Overall Ratings"
            value={stats.avg ? stats.avg.toFixed(1) : "0.0"}
            Icon={Star}
          />
          <StatCard label="Total Reviews" value={stats.total} Icon={Inbox} />
          <StatCard
            label="Published"
            value={stats.published}
            Icon={CheckCircle2}
          />
        </div>

        {/* Info banners */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs sm:text-sm text-primary">
          All student reviews are published immediately to the storefront. Admin approval is no longer required.
        </div>

        {/* Recent Reviews */}
        <section className="rounded-2xl border border-border bg-card">
          <div className="px-4 sm:px-5 py-4 border-b border-border">
            <h2 className="font-semibold">Recent Reviews</h2>
          </div>

          <div className="p-3 sm:p-4 space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border p-4 flex items-start gap-3"
                >
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))
            ) : reviews.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">
                <Award className="h-8 w-8 mx-auto mb-2 opacity-40" />
                No reviews yet. Once students review your courses, they’ll
                appear here.
              </div>
            ) : (
              reviews.map((r) => (
                <article
                  key={r.id}
                  className="rounded-xl border border-border p-3 sm:p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={r.userAvatar} alt={r.userName} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {r.userName?.charAt(0)?.toUpperCase() ?? "S"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {r.userName}
                          </p>
                          <div className="mt-0.5">
                            <StarRow rating={r.rating} />
                          </div>
                        </div>
                        <div className="shrink-0">
                          <StatusPill status={r.status} />
                        </div>
                      </div>

                      {r.reviewText && (
                        <p className="mt-2 text-sm text-foreground/90">
                          <span className="text-muted-foreground">“</span>
                          {r.reviewText}
                          <span className="text-muted-foreground">”</span>
                        </p>
                      )}

                      <p className="mt-1.5 text-xs text-muted-foreground truncate">
                        {r.courseName}
                      </p>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
  );
  {/* </InstructorLayout> */}
};

export default InstructorReviewAndRating;
