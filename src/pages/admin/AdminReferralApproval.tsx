import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Users, CheckCircle2, Clock, MapPin, Briefcase, Star, X, User, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { referralService, type Referral, type ReferralStatus } from "@/services/referral.service";

const tabs: { id: "pending" | "approved" | "rejected"; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

const StatCard = ({
  label, value, icon: Icon,
}: { label: string; value: number; icon: typeof Users }) => (
  <Card className="flex items-center justify-between p-5">
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold text-foreground">{value}</p>
    </div>
    <div className="rounded-full border border-border p-3 text-muted-foreground">
      <Icon className="h-5 w-5" />
    </div>
  </Card>
);

export default function AdminReferralApproval() {
  const [items, setItems] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [selected, setSelected] = useState<Referral | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await referralService.listAll();
      setItems(res.data);
    } catch {
      toast.error("Could not load referrals");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const stats = useMemo(() => ({
    total: items.length,
    approved: items.filter((r) => r.status === "approved").length,
    pending: items.filter((r) => r.status === "pending").length,
  }), [items]);

  const filtered = items.filter((r) => r.status === tab);

  const review = async (status: ReferralStatus) => {
    if (!selected) return;
    if (status === "rejected" && !rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    setActionLoading(true);
    try {
      await referralService.review(selected.id, status as "approved" | "rejected", rejectionReason || undefined);
      toast.success(
        status === "approved"
          ? "Referral approved — instructor account activated"
          : "Referral rejected — user notified"
      );
      setSelected(null);
      setRejecting(false);
      setRejectionReason("");
      await load();
    } catch {
      toast.error("Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
        className="mx-auto max-w-7xl space-y-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Referral Approval</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage referrals, approve applications, and monitor platform quality
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total Referrals" value={stats.total} icon={Users} />
          <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} />
          <StatCard label="Pending Review" value={stats.pending} icon={Clock} />
        </div>

        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors " +
                (tab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-foreground hover:bg-muted")
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {loading ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">Loading...</Card>
          ) : filtered.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No {tab} referrals right now.
            </Card>
          ) : (
            filtered.map((r) => (
              <Card key={r.id} className="p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-foreground">{r.fullName}</h3>
                    <p className="text-sm text-muted-foreground">{r.email}</p>
                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                      {r.location && (
                        <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{r.location}</span>
                      )}
                      {typeof r.experienceYears === "number" && (
                        <span className="inline-flex items-center gap-1.5"><Briefcase className="h-4 w-4" />{r.experienceYears} years experience</span>
                      )}
                      {typeof r.rating === "number" && (
                        <span className="inline-flex items-center gap-1.5"><Star className="h-4 w-4" />{r.rating} rating</span>
                      )}
                    </div>
                    {r.tags && r.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {r.tags.map((t) => (
                          <Badge key={t} className="border-0 bg-primary/10 font-medium text-primary">{t}</Badge>
                        ))}
                      </div>
                    )}
                    {r.bio && <p className="mt-3 text-sm text-foreground">{r.bio}</p>}
                    <p className="mt-3 text-xs text-muted-foreground">
                      Referred by {r.referrerName} · {new Date(r.submittedAt).toISOString().slice(0, 10)}
                    </p>
                  </div>
                  <Button onClick={() => { setSelected(r); setRejecting(false); setRejectionReason(""); }} className="shrink-0">
                    Review Details →
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </motion.div>

      {/* Review popup */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setRejecting(false); } }}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selected.fullName}</DialogTitle>
                <p className="text-sm text-muted-foreground">{selected.email}</p>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <User className="h-4 w-4" /> Profile Information
                  </div>
                  <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/40 p-4 text-sm">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Email</p>
                      <p className="mt-1 flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{selected.email}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Phone</p>
                      <p className="mt-1 flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{selected.phone || "—"}</p>
                    </div>
                    {selected.location && (
                      <div className="col-span-2">
                        <p className="text-xs uppercase text-muted-foreground">Location</p>
                        <p className="mt-1 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{selected.location}</p>
                      </div>
                    )}
                  </div>
                </div>

                {selected.bio && (
                  <div>
                    <p className="text-sm font-medium">About</p>
                    <p className="mt-1 text-sm text-muted-foreground">{selected.bio}</p>
                  </div>
                )}

                {selected.tags && selected.tags.length > 0 && (
                  <div>
                    <p className="text-sm font-medium">Areas of Expertise</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selected.tags.map((t) => (
                        <Badge key={t} className="border-0 bg-primary/10 font-medium text-primary">{t}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <Users className="h-4 w-4" /> Referral Information
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Referred By</p>
                      <p className="mt-1">{selected.referrerName}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Submission Date</p>
                      <p className="mt-1">{new Date(selected.submittedAt).toISOString().slice(0, 10)}</p>
                    </div>
                  </div>
                </div>

                {rejecting && (
                  <div>
                    <p className="mb-1 text-sm font-medium">Reason for rejection</p>
                    <Textarea
                      rows={3}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Share why this referral is being rejected..."
                    />
                  </div>
                )}

                {selected.status === "pending" && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Button
                      onClick={() => (rejecting ? setRejecting(false) : void review("approved"))}
                      disabled={actionLoading}
                      className="bg-green-600 text-white hover:bg-green-700"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Approve Application
                    </Button>
                    <Button
                      onClick={() => (rejecting ? void review("rejected") : setRejecting(true))}
                      disabled={actionLoading}
                      className="bg-red-600 text-white hover:bg-red-700"
                    >
                      <X className="mr-2 h-4 w-4" /> {rejecting ? "Confirm Rejection" : "Reject Application"}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
