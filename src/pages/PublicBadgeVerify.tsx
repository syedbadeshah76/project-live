import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ShieldCheck, XCircle, ExternalLink } from "lucide-react";
import { BadgeCanvas } from "@/components/badges/BadgeCanvas";
import { badgesService, type StudentBadge } from "@/services/badges.service";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

/** Public, unauthenticated badge-verification page. */
const PublicBadgeVerify = () => {
  const { token } = useParams<{ token: string }>();
  const [badge, setBadge] = useState<(StudentBadge & { holderName: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    if (!token) return;
    badgesService
      .getBadgeByShareToken(token)
      .then((res) => {
        setBadge(res.data);
        setValid(true);
      })
      .catch(() => setValid(false))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-card border rounded-2xl p-8 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="font-bold text-primary text-xl">EDVANZ</Link>
          <span className="text-xs text-muted-foreground">Badge Verification</span>
        </div>

        {loading ? (
          <Skeleton className="h-80 rounded-xl" />
        ) : !valid || !badge ? (
          <div className="text-center py-16">
            <XCircle className="h-14 w-14 mx-auto text-destructive mb-3" />
            <h1 className="text-xl font-bold">Badge not found</h1>
            <p className="text-sm text-muted-foreground mt-1">
              This verification link is invalid or has been revoked.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="flex justify-center">
              <BadgeCanvas
                courseTitle={badge.courseTitle}
                completionDate={badge.earnedDate}
                size={280}
              />
            </div>
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full text-xs font-semibold">
                <ShieldCheck className="h-3.5 w-3.5" /> Verified by EDVANZ
              </span>
              <h1 className="text-2xl font-bold">{badge.courseTitle}</h1>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Earned by</dt>
                  <dd className="font-semibold">{badge.holderName}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Completion date</dt>
                  <dd className="font-semibold">
                    {new Date(badge.earnedDate).toLocaleDateString(undefined, {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Issued by</dt>
                  <dd className="font-semibold">EDVANZ LMS</dd>
                </div>
              </dl>
              <Button asChild className="w-full mt-3">
                <Link to="/">Explore EDVANZ <ExternalLink className="ml-1 h-3.5 w-3.5" /></Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicBadgeVerify;
