import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  reviewsService,
  type CourseReview,
  type ReviewScope,
} from "@/services/reviews.service";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Star,
  Eye,
  Check,
  X,
  Loader2,
  Clock,
  BookOpen,
  Globe,
} from "lucide-react";

type StatusFilter = "all" | "pending" | "approved" | "rejected";
type ScopeTab = "all" | ReviewScope;

const initials = (n = "") =>
  n
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

const Stars = ({ n }: { n: number }) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < n ? "fill-blue-600 text-blue-600" : "text-slate-300"
        }`}
      />
    ))}
  </div>
);

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  const mo = Math.floor(d / 30);
  return `${mo} month${mo === 1 ? "" : "s"} ago`;
};

const AdminReviewApproval = () => {
  const { toast } = useToast();
  const [scope, setScope] = useState<ScopeTab>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [allItems, setAllItems] = useState<CourseReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [viewing, setViewing] = useState<CourseReview | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reviewsService.adminList({});
      if (res.success) setAllItems(res.data);
    } catch {
      toast({ title: "Failed to load reviews", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const scoped = useMemo(
    () => (scope === "all" ? allItems : allItems.filter((r) => r.scope === scope)),
    [allItems, scope],
  );

  const items = useMemo(
    () => (status === "all" ? scoped : scoped.filter((r) => r.status === status)),
    [scoped, status],
  );

  const tabCounts = useMemo(
    () => ({
      all: allItems.length,
      course: allItems.filter((r) => r.scope === "course").length,
      website: allItems.filter((r) => r.scope === "website").length,
    }),
    [allItems],
  );

  const statCounts = useMemo(
    () => ({
      pending: scoped.filter((r) => r.status === "pending").length,
      approved: scoped.filter((r) => r.status === "approved").length,
      rejected: scoped.filter((r) => r.status === "rejected").length,
    }),
    [scoped],
  );

  const approve = async (id: string) => {
    setBusy(id);
    try {
      const res = await reviewsService.approve(id);
      if (res.success) {
        toast({ title: "Review approved" });
        setAllItems((p) =>
          p.map((r) => (r.id === id ? { ...r, status: "approved" } : r)),
        );
        setViewing((v: CourseReview | null) => (v && v.id === id ? { ...v, status: "approved" } : v));
      }
    } finally {
      setBusy(null);
    }
  };

  const reject = async (id: string) => {
    setBusy(id);
    try {
      const res = await reviewsService.reject(id);
      if (res.success) {
        toast({ title: "Review rejected" });
        setAllItems((p) =>
          p.map((r) => (r.id === id ? { ...r, status: "rejected" } : r)),
        );
        setViewing((v: CourseReview | null) => (v && v.id === id ? { ...v, status: "rejected" } : v));
      }
    } finally {
      setBusy(null);
    }
  };

  const scopeTabs: { key: ScopeTab; label: string; count: number }[] = [
    { key: "all", label: "All Reviews", count: tabCounts.all },
    { key: "course", label: "Course Reviews", count: tabCounts.course },
    { key: "website", label: "Website Reviews", count: tabCounts.website },
  ];

  const chips: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">
            Review &amp; Rating Approval
          </h1>
          <p className="text-slate-500 mt-2">
            Manage course and website reviews &amp; ratings before they appear
            publicly on the platform
          </p>
        </div>

        {/* Scope tabs */}
        <div className="border-b border-slate-200 mb-6">
          <div className="flex gap-8">
            {scopeTabs.map((t) => {
              const active = scope === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setScope(t.key)}
                  className={`pb-3 -mb-px text-sm font-medium border-b-2 transition ${
                    active
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t.label} ({t.count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            label="Pending Reviews"
            value={statCounts.pending}
            icon={<Clock className="h-5 w-5 text-amber-600" />}
            iconBg="bg-amber-100"
          />
          <StatCard
            label="Approved"
            value={statCounts.approved}
            icon={<Check className="h-5 w-5 text-emerald-600" />}
            iconBg="bg-emerald-100"
          />
          <StatCard
            label="Rejected"
            value={statCounts.rejected}
            icon={<X className="h-5 w-5 text-red-600" />}
            iconBg="bg-red-100"
          />
        </div>

        {/* Status chips */}
        <div className="flex flex-wrap gap-3 mb-6">
          {chips.map((c) => {
            const active = status === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setStatus(c.key)}
                className={`text-sm px-5 py-2 rounded-lg border transition ${
                  active
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-blue-600 border-blue-200 hover:border-blue-400"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="border border-slate-200 rounded-xl p-12 text-center text-slate-500 bg-white">
            No reviews found for this filter.
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((r) => (
              <ReviewCard
                key={r.id}
                review={r}
                busy={busy === r.id}
                onView={() => setViewing(r)}
                onApprove={() => approve(r.id)}
                onReject={() => reject(r.id)}
              />
            ))}
          </div>
        )}

        {/* View dialog */}
        <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Review Details</DialogTitle>
            </DialogHeader>
            {viewing && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={viewing.userAvatar} />
                    <AvatarFallback>{initials(viewing.userName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold text-slate-900">
                      {viewing.userName}
                    </div>
                    <div className="text-sm text-slate-500">
                      {viewing.userEmail}
                    </div>
                  </div>
                </div>
                {viewing.courseName && (
                  <div className="text-sm">
                    <span className="text-slate-500">Course: </span>
                    <span className="font-medium text-slate-900">
                      {viewing.courseName}
                    </span>
                  </div>
                )}
                <Stars n={viewing.rating} />
                <p className="text-slate-700 leading-relaxed">
                  {viewing.reviewText}
                </p>
                <div className="text-xs text-slate-400">
                  {timeAgo(viewing.createdAt)}
                </div>
                <div className="flex gap-2 pt-2">
                  {viewing.status !== "rejected" && (
                    <Button
                      variant="outline"
                      onClick={() => reject(viewing.id)}
                      disabled={busy === viewing.id}
                      className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  )}
                  {viewing.status !== "approved" && (
                    <Button
                      onClick={() => approve(viewing.id)}
                      disabled={busy === viewing.id}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {busy === viewing.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-1" />
                      )}
                      Approve
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

const StatCard = ({
  label,
  value,
  icon,
  iconBg,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
}) => (
  <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-start justify-between">
    <div>
      <div className="text-sm text-slate-600 mb-2">{label}</div>
      <div className="text-3xl font-semibold text-slate-900">{value}</div>
    </div>
    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${iconBg}`}>
      {icon}
    </div>
  </div>
);

const ReviewCard = ({
  review: r,
  busy,
  onView,
  onApprove,
  onReject,
}: {
  review: CourseReview;
  busy: boolean;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
}) => {
  const isCourse = r.scope === "course";
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md mb-3 ${
              isCourse
                ? "bg-blue-50 text-blue-600"
                : "bg-purple-50 text-purple-600"
            }`}
          >
            {isCourse ? (
              <BookOpen className="h-3.5 w-3.5" />
            ) : (
              <Globe className="h-3.5 w-3.5" />
            )}
            {isCourse ? "Course Review" : "Website Review"}
          </div>
          <h3 className="font-semibold text-slate-900 text-lg">
            {r.courseName || "EDVANZ Platform"}
          </h3>
          <div className="text-sm text-slate-500 mt-1">
            by {r.userName}
            {r.userEmail && ` ( ${r.userEmail} )`}
          </div>
          <p className="text-slate-600 mt-3 leading-relaxed">{r.reviewText}</p>
          <div className="text-xs text-slate-400 mt-3">
            {timeAgo(r.createdAt)}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <Stars n={r.rating} />
          {r.status === "pending" && (
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full mt-2">
              <Clock className="h-3 w-3" /> Pending
            </span>
          )}
          {r.status === "approved" && (
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full mt-2">
              <Check className="h-3 w-3" /> Approved
            </span>
          )}
          {r.status === "rejected" && (
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-red-50 text-red-700 px-2.5 py-1 rounded-full mt-2">
              <X className="h-3 w-3" /> Rejected
            </span>
          )}

          <div className="flex flex-col gap-2 mt-1 w-32">
            <button
              onClick={onView}
              className="inline-flex items-center justify-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
            >
              <Eye className="h-3.5 w-3.5" /> View
            </button>
            {r.status !== "approved" && (
              <button
                onClick={onApprove}
                disabled={busy}
                className="inline-flex items-center justify-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Approved
              </button>
            )}
            {r.status !== "rejected" && (
              <button
                onClick={onReject}
                disabled={busy}
                className="inline-flex items-center justify-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition disabled:opacity-60"
              >
                <X className="h-3.5 w-3.5" /> Reject
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReviewApproval;
