// src/pages/instructor/InstructorReferrals.tsx
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Link2, Users, Wallet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { referService, type MyReferralLink } from "@/services/refer.service";

/* ── local interfaces matching backend data models ───────────────────────── */

export interface ReferralEntry {
  id: string;
  fullName: string;
  email: string;
  expertise?: string;
  status: string;
  reward?: number;
}

export interface ReferralSummary {
  total: number;
  pending: number;
  approved: number;
  earnings: number;
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

const initials = (name: string) =>
  name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

/* ── how-it-works rows (static content, matches Figma) ───────────────────── */

const STEPS = [
  {
    icon: Link2,
    title: "Share your referral link",
    description:
      "Invite fellow instructors to join Edvanz using your unique referral link.",
  },
  {
    icon: Users,
    title: "Your instructor joins",
    description:
      "When an instructor joins through your shared link, they become part of our teaching community.",
  },
  {
    icon: Wallet,
    title: "Earn cash rewards",
    description:
      "You receive a cash reward when your referred instructor publishes their first course.",
  },
] as const;

/* ── referral row ────────────────────────────────────────────────────────── */

const ReferralRow = ({ item }: { item: ReferralEntry }) => (
  <div className="flex items-center gap-3 border-b border-border px-6 py-4 last:border-b-0">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
      {initials(item.fullName)}
    </div>

    <div className="min-w-0 flex-1">
      <p className="truncate font-medium text-foreground">{item.fullName}</p>
      <p className="truncate text-sm text-muted-foreground">
        {item.email}
        {item.expertise ? ` · ${item.expertise}` : ""}
      </p>
    </div>

    {item.status === "approved" ? (
      <Badge className="shrink-0 border-0 bg-primary/10 font-medium text-primary">
        {item.reward != null ? `$${item.reward}` : "Approved"}
      </Badge>
    ) : (
      <Badge className="shrink-0 border-0 bg-primary/10 font-medium text-primary">
        Pending
      </Badge>
    )}
  </div>
);

/* ── page ────────────────────────────────────────────────────────────────── */

export default function InstructorReferrals() {
  const { user } = useAuth();

  const [referralCode, setReferralCode] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [referrals, setReferrals] = useState<ReferralEntry[]>([]);
  const [summary, setSummary] = useState<ReferralSummary>({
    total: 0,
    pending: 0,
    approved: 0,
    earnings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await referService.getMyLink();
      const data: MyReferralLink =
        (res as any)?.data?.referralCode ? (res as any).data : (res as any);

      if (data?.referralCode) {
        const code = data.referralCode;
        setReferralCode(code);
        
        // Ensure redirect to signup/register page:
        const signupLink = `${window.location.origin}/register?code=${code}`;
        setReferralLink(signupLink);
      }
      
      setReferrals([]);
      setSummary({
        total: 0,
        pending: 0,
        approved: 0,
        earnings: 0,
      });
    } catch {
      toast.error("Could not load your referrals");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const copyCode = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      toast.success("Referral code copied");
      window.setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error("Could not copy the code");
    }
  };

  const copyLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      toast.success("Referral link copied");
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("Could not copy the link");
    }
  };

  const sendReferral = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Please enter email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      setSending(true);
      const res = await referService.refer(trimmed);
      const message =
        (res as any)?.data?.message ??
        (res as any)?.message ??
        "Referral invitation sent";
      toast.success(message);
      setEmail("");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ?? "Unable to send referral invitation"
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6"
    >
      {/* Refer a New Instructor */}
      <Card className="rounded-xl p-6 md:p-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Refer a New Instructor
        </h1>

        <p className="mt-4 max-w-3xl text-base leading-relaxed text-foreground/80">
          Invite fellow instructors to join <span className="text-primary">Edvanz</span>{" "}
          using your referral link. They get powerful teaching tools, and you earn a
          cash reward when they publish their first course.
        </p>

        <p className="mt-4 text-sm font-medium text-primary">
          Teach together, grow your impact, and achieve more with Edvanz.
        </p>

        {/* Referral info forms */}
        <div className="mt-6 space-y-4">
          {/* <div>
            <p className="text-sm font-semibold">Your referral code</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 font-mono text-sm tracking-widest">
                {loading ? "Loading…" : referralCode || "—"}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={copyCode}
                disabled={loading || !referralCode}
                className="h-9 px-4"
              >
                {copiedCode ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {copiedCode ? "Copied" : "Copy code"}
              </Button>
            </div>
          </div> */}

          <div>
            <p className="text-sm font-semibold">Share your unique referral link</p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                readOnly
                value={loading ? "Generating your link..." : referralLink}
                aria-label="Your referral link"
                onFocus={(e) => e.currentTarget.select()}
                className="h-11 rounded-full bg-muted/40 text-sm text-muted-foreground sm:max-w-xl"
              />
              <Button
                type="button"
                onClick={copyLink}
                disabled={loading || !referralLink}
                className="h-11 gap-2 rounded-full px-6"
              >
                {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedLink ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          {/* Refer by email */}
          {/* <div>
            <p className="text-sm font-semibold">Refer by Email</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendReferral();
                }}
                disabled={sending}
                className="h-11 rounded-full sm:max-w-xs"
              />
              <Button onClick={sendReferral} disabled={sending} className="h-11 rounded-full px-6">
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Invite"
                )}
              </Button>
            </div>
          </div> */}
        </div>
      </Card>

      {/* My Referrals */}
      <Card className="overflow-hidden rounded-xl">
        <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground">My Referrals</h2>
            <p className="text-sm text-muted-foreground">
              Instructors who joined through your link
            </p>
          </div>
          <span aria-hidden className="select-none text-lg text-muted-foreground">
            •••
          </span>
        </div>

        <div className="border-t border-border">
          {loading ? (
            <div className="px-6 py-8 text-sm text-muted-foreground">Loading...</div>
          ) : referrals.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              No referrals yet. Share your link to get started.
            </div>
          ) : (
            referrals.map((item) => <ReferralRow key={item.id} item={item} />)
          )}
        </div>
      </Card>

      {/* How it works */}
      {STEPS.map(({ icon: Icon, title, description }) => (
        <Card key={title} className="rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-foreground">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
        </Card>
      ))}

      {/* Referral earnings */}
      <Card className="rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Wallet className="h-4 w-4" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">Referral earnings</h3>
        </div>

        <p className="mt-4 text-4xl font-bold text-foreground">
          ${loading ? 0 : summary.earnings}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">earned</p>

        <p className="mt-3 text-sm font-medium text-emerald-600">
          ✓ {loading ? 0 : summary.approved} approved referral
          {summary.approved === 1 ? "" : "s"}
        </p>
      </Card>
    </motion.div>
  );
}
