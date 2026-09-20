// src/pages/dashboard/ReferFriend.tsx
import { useEffect, useState } from "react";
import { Copy, Link2, UserPlus, Gift, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/contexts/WalletContext";
import {
  referService,
  type MyReferralLink,
  type MyReferralDetails,
  type ReferredItem,
} from "@/services/refer.service";
import { useAuth } from "@/contexts/AuthContext";
import { unwrapData } from "@/lib/api-client";
import { toast } from "sonner";
import avatarImg from "@/assets/avatar_referafriend.png";
import coin2 from "@/assets/ez_coin_2.png";
import coin1 from "@/assets/ez_coin_1.png";

function getInitials(name?: string): string {
  if (!name) return "MD";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function ReferFriend() {
  const { user } = useAuth();
  const { currentBalance, loading: loadingWallet } = useWallet();

  const [referral, setReferral] = useState<MyReferralLink | null>(null);
  const [loadingLink, setLoadingLink] = useState(true);
  const [referralDetails, setReferralDetails] = useState<MyReferralDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchReferralData = async () => {
      try {
        const linkRes = await referService.getMyLink();
        const linkData = unwrapData<MyReferralLink>(linkRes);
        if (mounted && linkData?.referralCode) setReferral(linkData);
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? "Unable to load your referral code");
      } finally {
        if (mounted) setLoadingLink(false);
      }

      try {
        const detailsRes = await referService.getMyDetails();
        const detailsData = unwrapData<MyReferralDetails>(detailsRes);
        if (mounted && detailsData) {
          setReferralDetails(detailsData);
        }
      } catch {
        /* silent failure for details */
      } finally {
        if (mounted) setLoadingDetails(false);
      }
    };

    fetchReferralData();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const link =
    referral?.referralLink ??
    (referralDetails?.referralCode
      ? `${window.location.origin}/register?code=${referralDetails.referralCode}`
      : "");

  const copy = async (value: string, label: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`);
    }
  };

  const infoSteps = [
    {
      icon: Link2,
      title: "Share your referral link",
      body: "Invite your friends to join the ",
      link: "EDVANZ",
      rest: " using your unique referral link.",
    },
    {
      icon: UserPlus,
      title: "Your friend Joins",
      body: "When your friend joins ",
      link: "EDVANZ",
      rest: " through your shared link, they become a part of our community.",
    },
    {
      icon: Gift,
      title: "You both earn reward",
      body: "As a token of appreciation, both you and your friend will receive ",
      link: "5 EZ Coins",
      rest: " each.",
    },
  ];

  return (
    <div className="w-full p-4 md:p-6">
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-5">
        {/* ================= LEFT COLUMN ================= */}
        <div className="flex flex-col gap-4 lg:col-span-8 lg:gap-5">
          {/* ---------- Hero card ---------- */}
          <section className="relative overflow-hidden rounded-xl border border-border bg-card p-5 md:p-6">
            <div className="relative z-10 max-w-[600px]">
              <h1 className="text-[22px] font-bold leading-tight tracking-tight text-primary md:text-[24px]">
                Refer a Learner. Earn EZ Coins.
              </h1>

              <p className="mt-3 text-[12px] leading-[1.65] text-muted-foreground md:text-[14px]">
                Invite learners to join <span className="font-semibold text-primary">Edvanz</span>{" "}
                using your referral link. Your friends get up to{" "}
                <span className="font-semibold text-primary">20% OFF</span> on their first course,
                and you earn rewards on every successful enrollment.
              </p>

              <p className="mt-3 text-[14px] font-semibold leading-[1.5] text-primary md:text-[15px]">
                Learn together, grow faster, and achieve more with Edvanz.
              </p>

              <div className="mt-5">
                <p className="text-[13px] font-semibold text-foreground">
                  Share your unique referral link
                </p>

                <div className="mt-2 flex items-center gap-3 ">
                  <Input
                    readOnly
                    value={loadingLink ? "Loading your referral link…" : link}
                    aria-label="Your referral link"
                    className="h-9 min-w-0 flex-1 rounded-lg border-border bg-card px-3 text-[13px] text-foreground shadow-none focus-visible:ring-1 focus-visible:ring-primary/40 md:max-w-[420px]"
                  />
                  <Button
                    onClick={() => copy(link, "Referral link")}
                    disabled={loadingLink || !link}
                    className="h-9 shrink-0 gap-2 rounded-lg px-5 text-[13px] font-semibold shadow-sm"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </Button>
                </div>
              </div>
            </div>

            {/* Illustration anchored bottom-right */}
            <img
              src={avatarImg}
              alt="Learner sharing a referral link with a megaphone"
              loading="lazy"
              width={500}
              height={500}
              className="pointer-events-none absolute bottom-0 right-3 hidden h-[150px] w-auto select-none object-contain xl:block"
            />
          </section>

          {/* ---------- Your Referrals ---------- */}
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-[17px] font-bold tracking-tight text-foreground">Your Referrals</h2>

            <div className="mt-3 max-h-[260px] space-y-3 overflow-y-auto pr-2">
              {loadingDetails ? (
                <div className="flex items-center justify-center py-8 text-[13px] text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                  Loading your referrals...
                </div>
              ) : !referralDetails?.referrals || referralDetails.referrals.length === 0 ? (
                <p className="py-8 text-center text-[13px] text-muted-foreground">
                  No referrals yet. Share your link to start earning rewards!
                </p>
              ) : (
                referralDetails.referrals.map((r: ReferredItem) => (
                  <div
                    key={r.referralId || r.referredUserId}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {r.profilePicture ? (
                        <img
                          src={r.profilePicture}
                          alt={r.name || "Learner"}
                          className="h-9 w-9 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                          {getInitials(r.name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-foreground">
                          {r.name || r.email || "Learner"}
                        </p>
                        <p className="truncate text-[12px] text-muted-foreground">
                          {r.displayStatus || "New Learner signed up referred by you"}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1.5">
                      <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary text-[7px] font-bold leading-none text-primary-foreground">
                        <img src={coin2} alt="" />
                      </span>
                      <span className="text-[12px] font-semibold text-primary">
                        5 EZ <span className="font-medium">Coins</span>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* ================= RIGHT COLUMN ================= */}
        <div className="flex flex-col gap-4 lg:col-span-4 lg:gap-5">
          {/* ---------- 3 info step cards ---------- */}
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3">
            {infoSteps.map((step) => (
              <div key={step.title} className="rounded-lg border border-border bg-muted/30 px-3 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    <step.icon className="h-3 w-3" />
                  </span>
                  <h3 className="text-[12px] font-bold leading-tight text-foreground">
                    {step.title}
                  </h3>
                </div>
                <p className="mt-1 text-[10px] leading-[1.55] text-muted-foreground">
                  {step.body}
                  <span className="font-semibold text-primary">{step.link}</span>
                  {step.rest}
                </p>
              </div>
            ))}
          </div>

          {/* ---------- Coins Wallet ---------- */}
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary text-[7px] font-bold leading-none text-primary-foreground">
                <img src={coin1} alt="ez_coin_heading" />
              </span>
              <h2 className="text-[16px] font-bold tracking-tight text-foreground">Coins Wallet</h2>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary text-[16px] font-bold leading-none text-primary-foreground ring-4 ring-primary/20">
                <img src={coin2} alt="ez_coin_logo" />
              </span>
              <div className="text-[30px] font-bold leading-none tracking-tight text-foreground">
                {loadingWallet ? (
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                ) : (
                  `${currentBalance} Coins`
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

