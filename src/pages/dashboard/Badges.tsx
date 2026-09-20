import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Award, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BadgeCanvas, LockedBadge } from "@/components/badges/BadgeCanvas";
import { badgesService, type StudentBadge } from "@/services/badges.service";
import { enrollmentService } from "@/services/enrollment.service";

const Badges = () => {
  const [badges, setBadges] = useState<StudentBadge[]>([]);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [bRes, eRes] = await Promise.all([
          badgesService.getMyBadges(),
          enrollmentService.getMyEnrollments?.().catch(() => ({ data: [] as any[] })) ??
          Promise.resolve({ data: [] as any[] }),
        ]);
        setBadges(bRes.data);
        setEnrolledCount((eRes as any).data?.length ?? 0);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const lockedCount = Math.max(0, enrolledCount - badges.length);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" /> Badges & Achievements
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Earn a unique stamp every time you complete a course.
          </p>
        </div>
        <div className="flex gap-3">
          <Stat label="Earned" value={badges.length} />
          <Stat label="Locked" value={lockedCount} muted />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
        </div>
      ) : badges.length === 0 && lockedCount === 0 ? (
        <div className="text-center py-20 border border-dashed rounded-2xl">
          <Award className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-lg font-semibold">No badges yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Complete a course to earn your first stamp.
          </p>
          <Button asChild><Link to="/dashboard/courses">Browse my courses</Link></Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {badges.map((b) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border rounded-2xl p-5 flex flex-col items-center text-center"
            >
              <Link to={`/dashboard/badges/${b.id}`} className="hover:scale-[1.02] transition">
                <BadgeCanvas
                  courseTitle={b.courseTitle}
                  completionDate={b.earnedDate}
                  size={220}
                />
              </Link>
              <h3 className="font-semibold text-sm mt-3">{b.courseTitle}</h3>
              <p className="text-xs text-muted-foreground">
                Earned {new Date(b.earnedDate).toLocaleDateString(undefined, {
                  day: "numeric", month: "short", year: "numeric",
                })}
              </p>
              <Button asChild size="sm" variant="outline" className="mt-3 w-full">
                <Link to={`/dashboard/badges/${b.id}`}>View badge</Link>
              </Button>
            </motion.div>
          ))}
          {Array.from({ length: lockedCount }).map((_, i) => (
            <div
              key={`locked-${i}`}
              className="bg-card border rounded-2xl p-5 flex flex-col items-center text-center"
            >
              <LockedBadge size={220} />
              <h3 className="font-semibold text-sm mt-3 text-muted-foreground inline-flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" /> Complete a course to unlock
              </h3>
              <p className="text-xs text-muted-foreground">Keep learning to earn your stamp</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Stat = ({ label, value, muted }: { label: string; value: number; muted?: boolean }) => (
  <div className={`px-4 py-2 rounded-xl border text-center ${muted ? "bg-muted/40" : "bg-primary/5 border-primary/30"}`}>
    <div className={`text-xl font-bold ${muted ? "text-muted-foreground" : "text-primary"}`}>{value}</div>
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
  </div>
);

export default Badges;
