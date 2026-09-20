import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Gift, Clock, Star, PlaySquare, Loader2, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { giftService } from "@/services/gift.service";
import type { GiftHistoryItem } from "@/types/gift.types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Tab = "Courses" | "Voucher" | "EZ Coins";

/**
 * Redeem Center — Redesigned to match the Figma pixel-by-pixel.
 * Integrates directly with GET /api/gifts/history.
 * Renders two-card grouped gift sections (Sender Card + Course Card) inside an outer container.
 * Features robust target production schema extraction with seamless fallback support.
 */
export default function RedeemCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("Courses");
  const [loading, setLoading] = useState(true);
  const [gifts, setGifts] = useState<GiftHistoryItem[]>([]);
  const [pendingGiftId, setPendingGiftId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch gift history directly from GET /api/gifts/history and hydrate via coursesService & usersService
  const fetchGifts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rawData = await giftService.getGiftHistory();
      const rawList = Array.isArray(rawData) ? rawData : [];
      const hydrated = await Promise.all(
        rawList.map((g) => giftService.hydrateGiftItem(g))
      );
      setGifts(hydrated);
    } catch (err: any) {
      setError(err?.message || "Failed to load gift history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGifts();
  }, [fetchGifts]);

  const visibleGifts = useMemo(() => {
    if (tab !== "Courses") return [];
    return gifts;
  }, [gifts, tab]);

  // Handle gift redemption
  const handleRedeem = async (gift: GiftHistoryItem) => {
    if (!user || (gift.status !== "PENDING" && gift.status !== "NOT_REDEEMED")) return;
    setPendingGiftId(gift.giftId);
    try {
      await giftService.redeemGift(gift.giftId);
      toast.success("Gift redeemed! Course added to My Courses.");

      // Update local status immediately
      setGifts((prev) =>
        prev.map((g) => (g.giftId === gift.giftId ? { ...g, status: "REDEEMED" } : g))
      );

      // Refresh history in background
      fetchGifts();

      // Navigate user to My Courses
      navigate("/dashboard/courses");
    } catch (err: any) {
      toast.error(err?.message || "Could not redeem gift");
    } finally {
      setPendingGiftId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 md:px-6">
      {/* Top Header matching Figma */}
      <h1 className="flex items-center gap-2.5 text-2xl md:text-3xl font-bold mb-6 text-slate-900 tracking-tight">
        <Gift className="h-8 w-8 text-[#2563EB] shrink-0" />
        Redeem Gift
      </h1>

      <div className="space-y-6 bg-[#FFFFFF] md:p-6 rounded-2xl">
        {/* Pill Navigation Bar matching Figma */}
        <div className="flex flex-wrap gap-2.5">
          {/* {(["Courses", "Voucher", "EZ Coins"] as Tab[]).map((t) => ( */}
                      {(["Courses"] as Tab[]).map((t) => (

            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-10 py-2.5 text-sm font-semibold rounded-full border transition-all duration-200 cursor-pointer",
                tab === t
                  ? "bg-[#2563EB] text-white border-[#2563EB] shadow-xs"
                  : "border-[#2563EB] text-[#2563EB] bg-white hover:bg-blue-50/50"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Main Body */}
        {loading ? (
          <RedeemSkeletonLoader />
        ) : error ? (
          <Card className="py-16 text-center bg-white rounded-[24px] border border-slate-100 p-8 shadow-xs">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
              <RefreshCw className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">Failed to load gift details</h3>
            <p className="text-sm text-slate-500 mb-5 max-w-sm mx-auto">{error}</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={fetchGifts} className="rounded-xl font-semibold border-slate-200">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Button variant="ghost" onClick={() => navigate("/dashboard/orders")} className="rounded-xl font-semibold">
                Back to Order History
              </Button>
            </div>
          </Card>
        ) : tab !== "Courses" ? (
          <Card className="py-16 text-center bg-white rounded-[24px] border border-slate-100 p-8 shadow-xs text-slate-500 text-sm font-medium">
            No {tab.toLowerCase()} available right now.
          </Card>
        ) : visibleGifts.length === 0 ? (
          <RedeemEmptyState onGoToOrders={() => navigate("/dashboard/orders")} />
        ) : (
          <div className="space-y-6">
            {visibleGifts.map((gift) => (
              <GiftGroupSection
                key={gift.giftId}
                gift={gift}
                onRedeem={handleRedeem}
                onGoToCourses={() => navigate("/dashboard/courses")}
                isPendingRedeem={pendingGiftId === gift.giftId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Gift Group Section — Wraps Sender Card & Course Card inside a grouped container matching Figma.
 */
function GiftGroupSection({
  gift,
  onRedeem,
  onGoToCourses,
  isPendingRedeem,
}: {
  gift: GiftHistoryItem;
  onRedeem: (gift: GiftHistoryItem) => void;
  onGoToCourses: () => void;
  isPendingRedeem: boolean;
}) {
  const senderName =
    gift.sender?.name ||
    gift.senderName ||
    "Gift Sender";

  const senderAvatar =
    gift.sender?.avatar ||
    gift.senderAvatar ||
    "";

  const giftMessage =
    gift.giftMessage ||
    "No personal message attached to this gift.";

  const courseTitle =
    gift.courseTitle ||
    gift.course?.title ||
    "Gifted Course";

  const courseThumbnail =
    gift.courseThumbnail ||
    gift.course?.thumbnail ||
    "";

  const courseDescription =
    gift.courseDescription ||
    gift.course?.description ||
    "";

  const lessons = gift.lessons ?? gift.course?.lessons ?? 0;
  const duration = gift.duration || gift.course?.duration || "Self-paced";
  const rating = gift.rating ?? gift.course?.rating ?? 5.0;
  const enrolledCount = gift.enrolledCount ?? gift.course?.enrolledCount ?? 0;

  return (
    <div className="bg-[#F8FAFC] md:bg-slate-50/70 border border-slate-100 rounded-[24px] p-4 md:p-6 space-y-4 shadow-2xs">
      {/* Card 1: Sender Card */}
      <GiftSenderCard
        senderName={senderName}
        senderAvatar={senderAvatar}
        giftMessage={giftMessage}
      />

      {/* Card 2: Course Card */}
      <GiftCourseCard
        gift={gift}
        title={courseTitle}
        thumbnail={courseThumbnail}
        description={courseDescription}
        lessons={lessons}
        duration={duration}
        rating={rating}
        enrolledCount={enrolledCount}
        onRedeem={onRedeem}
        onGoToCourses={onGoToCourses}
        isPendingRedeem={isPendingRedeem}
      />
    </div>
  );
}

/**
 * Card 1: Sender Information Card matching Figma
 */
function GiftSenderCard({
  senderName,
  senderAvatar,
  giftMessage,
}: {
  senderName: string;
  senderAvatar: string;
  giftMessage: string;
}) {
  const initials = senderName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card className="rounded-[20px] border border-slate-100/90 bg-white p-5 md:p-6 shadow-2xs">
      <div className="space-y-3">
        {/* Top Row: Avatar + Name directly next to avatar */}
        <div className="flex items-center gap-3.5">
          <Avatar className="h-12 w-12 border border-slate-100 shrink-0">
            <AvatarImage src={senderAvatar} alt={senderName} className="object-cover" />
            <AvatarFallback className="bg-blue-50 text-[#2563EB] font-semibold text-base">
              {initials}
            </AvatarFallback>
          </Avatar>
          <p className="font-semibold text-lg text-slate-900 leading-tight">
            {senderName}
          </p>
        </div>

        {/* Message */}
        <p className="text-[15px] md:text-base text-slate-500 leading-relaxed font-normal">
          {giftMessage}
        </p>
      </div>
    </Card>
  );
}

/**
 * Card 2: Course Information Card matching Figma
 */
function GiftCourseCard({
  gift,
  title,
  thumbnail,
  description,
  lessons,
  duration,
  rating,
  enrolledCount,
  onRedeem,
  onGoToCourses,
  isPendingRedeem,
}: {
  gift: GiftHistoryItem;
  title: string;
  thumbnail: string;
  description: string;
  lessons: number | string;
  duration: string;
  rating: number;
  enrolledCount: number;
  onRedeem: (gift: GiftHistoryItem) => void;
  onGoToCourses: () => void;
  isPendingRedeem: boolean;
}) {
  return (
    <Card className="rounded-[20px] border border-slate-100/90 bg-white p-4 md:p-5 shadow-2xs overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 md:gap-6">
        {/* Left: Thumbnail & Content */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1 min-w-0">
          {/* Thumbnail Image */}
          {thumbnail ? (
            <div className="relative w-full sm:w-[140px] h-44 sm:h-[84px] shrink-0 rounded-[14px] overflow-hidden bg-slate-100">
              <img
                src={thumbnail}
                alt={title}
                className="w-full h-full object-cover rounded-[14px]"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          ) : (
            <div className="w-full sm:w-[140px] h-44 sm:h-[84px] shrink-0 rounded-[14px] bg-gradient-to-br from-blue-600 to-indigo-700 p-3 flex items-center justify-center text-white text-xs font-bold text-center">
              {title}
            </div>
          )}

          {/* Center Details */}
          <div className="space-y-1 flex-1 min-w-0">
            <h3 className="font-semibold text-base md:text-lg text-slate-900 truncate leading-snug">
              {title}
            </h3>
            {description && (
              <p className="text-xs md:text-sm text-slate-500 line-clamp-2 leading-relaxed font-normal">
                {description}
              </p>
            )}

            {/* Metadata Row */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500 font-medium">
              {Number(lessons) > 0 && (
                <span className="flex items-center gap-1.5">
                  <PlaySquare className="h-3.5 w-3.5 text-[#2563EB]" />
                  {lessons} Lessons
                </span>
              )}
              {duration && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  {duration}
                </span>
              )}
              {Number(rating) > 0 && (
                <span className="flex items-center gap-1 font-semibold text-slate-700">
                  <Star className="h-3.5 w-3.5 fill-[#2563EB] text-[#2563EB]" />
                  {rating} {enrolledCount > 0 && <span className="text-slate-400 font-normal">({enrolledCount})</span>}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Redeem / Action Button */}
        <div className="w-full sm:w-auto shrink-0 pt-2 sm:pt-0">
          <GiftStatusButton
            status={gift.status}
            isPendingRedeem={isPendingRedeem}
            onClick={() => onRedeem(gift)}
            onGoToCourses={onGoToCourses}
            courseTitle={title}
          />
        </div>
      </div>
    </Card>
  );
}

/**
 * Reusable Gift Status Button supporting PENDING, REDEEMED, EXPIRED, PROCESSING
 */
function GiftStatusButton({
  status,
  isPendingRedeem,
  onClick,
  onGoToCourses,
  courseTitle,
}: {
  status: string;
  isPendingRedeem: boolean;
  onClick: () => void;
  onGoToCourses: () => void;
  courseTitle: string;
}) {
  if (status === "REDEEMED") {
    return (
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          disabled
          className="w-full sm:w-auto h-[44px] px-5 text-sm font-semibold rounded-[12px] bg-slate-100 text-slate-600 border-transparent shadow-none"
        >
          Gift Redeemed
        </Button>
        <Button
          onClick={onGoToCourses}
          className="w-full sm:w-auto h-[44px] px-5 text-sm font-semibold rounded-[12px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
        >
          Go to My Courses
        </Button>
      </div>
    );
  }

  if (status === "EXPIRED") {
    return (
      <Button
        disabled
        className="w-full sm:w-auto h-[44px] px-7 text-sm font-semibold rounded-[12px] bg-red-100 text-red-700 border-transparent shadow-none cursor-not-allowed"
      >
        Gift Expired
      </Button>
    );
  }

  if (status === "PROCESSING") {
    return (
      <Button
        disabled
        className="w-full sm:w-auto h-[44px] px-7 text-sm font-semibold rounded-[12px] bg-amber-100 text-amber-800 border-transparent shadow-none cursor-not-allowed"
      >
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Gift Processing
      </Button>
    );
  }

  return (
    <Button
      disabled={isPendingRedeem}
      onClick={onClick}
      className="w-full sm:w-auto h-[44px] px-7 text-sm font-semibold rounded-[12px] bg-[#2563EB] text-white hover:bg-blue-700 transition-colors shadow-xs"
      aria-label={`Redeem gift for ${courseTitle}`}
    >
      {isPendingRedeem ? (
        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
      ) : (
        "Redeem Gift"
      )}
    </Button>
  );
}

/**
 * Polished Empty State matching Figma guidelines
 */
function RedeemEmptyState({ onGoToOrders }: { onGoToOrders?: () => void }) { return ( <Card className="py-20 px-4 text-center bg-white rounded-[24px] border border-slate-100 p-8 shadow-xs space-y-4"> <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-[#2563EB]"> <Gift className="h-10 w-10" /> </div> <div className="space-y-1"> <h3 className="text-xl font-bold text-slate-900"> No gifts yet </h3> <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed"> You haven’t received any gifted courses yet. When someone sends you a course, it will appear here. </p> </div> {onGoToOrders && ( <div className="pt-2"> <Button variant="outline" onClick={onGoToOrders} className="rounded-xl font-semibold border-slate-200" > Back to Order History </Button> </div> )} </Card> ); }

/**
 * Skeleton Loader matching final two-card group layout
 */
function RedeemSkeletonLoader() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading gifts">
      {[1, 2, 3].map((idx) => (
        <div key={idx} className="bg-slate-50/70 border border-slate-100 rounded-[24px] p-4 md:p-6 space-y-4">
          {/* Sender Card Skeleton */}
          <Card className="rounded-[20px] border border-slate-100 p-5 md:p-6 space-y-3 bg-white">
            <div className="flex items-center gap-3.5">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-5 w-40" />
            </div>
            <Skeleton className="h-4 w-5/6" />
          </Card>

          {/* Course Card Skeleton */}
          <Card className="rounded-[20px] border border-slate-100 p-4 md:p-5 bg-white">
            <div className="flex flex-col sm:flex-row gap-5 items-center justify-between">
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                <Skeleton className="w-full sm:w-[140px] h-44 sm:h-[84px] rounded-[14px]" />
                <div className="space-y-2.5 w-full flex-1">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-4/5" />
                  <div className="flex gap-4 pt-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </div>
              <Skeleton className="w-full sm:w-28 h-[44px] rounded-[12px] shrink-0" />
            </div>
          </Card>
        </div>
      ))}
    </div>
  );
}
