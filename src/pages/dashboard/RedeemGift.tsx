import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Gift,
  PlaySquare,
  Clock,
  Star,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  User,
  Mail,
  Phone,
  Calendar,
  Hash,
} from "lucide-react";
import { toast } from "sonner";
import { giftService } from "@/services/gift.service";
import type { GiftHistoryItem } from "@/types/gift.types";

/**
 * Redeem Gift Page — Fully Backend-Integrated & Production-Ready.
 * Uses product_id to load course details and student_id / recipient data dynamically.
 * Eliminates all dummy fallbacks and hardcoded content.
 */
const RedeemGift = () => {
  const { giftId: routeGiftId } = useParams<{ giftId?: string }>();
  const navigate = useNavigate();

  const [inputCode, setInputCode] = useState(routeGiftId || "");
  const [activeGiftId, setActiveGiftId] = useState<string | null>(routeGiftId || null);
  const [giftData, setGiftData] = useState<GiftHistoryItem | null>(null);
  const [loading, setLoading] = useState<boolean>(!!routeGiftId);
  const [redeeming, setRedeeming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Consolidated Loader — Loads gift details and hydrates course & student metadata via product_id / student_id
  const loadGiftDetails = useCallback(async (targetId: string) => {
    if (!targetId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const rawGift = await giftService.getGiftDetails(targetId.trim());
      const hydrated = await giftService.hydrateGiftItem(rawGift);
      setGiftData(hydrated);
    } catch (err: any) {
      setError(err?.message || "Unable to load gift details. Please check the code and try again.");
      setGiftData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (routeGiftId) {
      setActiveGiftId(routeGiftId);
      loadGiftDetails(routeGiftId);
    }
  }, [routeGiftId, loadGiftDetails]);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputCode.trim();
    if (!trimmed) {
      toast.error("Please enter a valid gift code");
      return;
    }
    setActiveGiftId(trimmed);
    loadGiftDetails(trimmed);
  };

  const handleRedeem = async () => {
    if (!giftData) return;
    setRedeeming(true);
    try {
      await giftService.redeemGift(giftData.giftId);
      toast.success("Gift redeemed successfully! Course added to My Courses.");
      
      // Update local state to REDEEMED
      setGiftData((prev) => (prev ? { ...prev, status: "REDEEMED" } : null));

      // Navigate to My Courses
      navigate("/dashboard/courses");
    } catch (err: any) {
      toast.error(err?.message || "Could not redeem gift. Please try again or contact support.");
    } finally {
      setRedeeming(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const senderInitials = (giftData?.senderName || giftData?.sender?.name || "GS")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 md:px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            <Gift className="h-8 w-8 text-[#2563EB] shrink-0" />
            Redeem Course Gift
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Unlock your gifted course and start learning immediately.
          </p>
        </div>
      </div>

      {/* Code Entry Bar */}
      <Card className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-xs">
        <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Enter gift code (e.g. GIFT-827391)"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              className="pl-10 h-11 text-sm font-mono rounded-xl border-slate-200"
            />
          </div>
          <Button type="submit" disabled={loading} className="h-11 px-6 rounded-xl font-semibold bg-[#2563EB] hover:bg-blue-700 text-white">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Verify Code"}
          </Button>
        </form>
      </Card>

      {/* Main Content Area */}
      {loading ? (
        <RedeemGiftSkeleton />
      ) : error ? (
        <Card className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">Gift Information Unavailable</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">{error}</p>
          <div className="flex justify-center gap-3">
            {activeGiftId && (
              <Button variant="outline" onClick={() => loadGiftDetails(activeGiftId)} className="rounded-xl font-semibold">
                <RefreshCw className="h-4 w-4 mr-2" /> Retry
              </Button>
            )}
            <Button variant="ghost" onClick={() => navigate("/dashboard/orders")} className="rounded-xl font-semibold">
              Back to Order History
            </Button>
          </div>
        </Card>
      ) : giftData ? (
        <div className="space-y-6">
          {/* Card 1: Sender & Message */}
          <Card className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3.5">
              <Avatar className="h-12 w-12 border border-slate-100 shrink-0">
                <AvatarImage src={giftData.senderAvatar || giftData.sender?.avatar} alt={giftData.senderName || giftData.sender?.name} />
                <AvatarFallback className="bg-blue-50 text-[#2563EB] font-semibold text-base">
                  {senderInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Gifted By</p>
                <h3 className="font-bold text-lg text-slate-900 leading-tight">
                  {giftData.senderName || giftData.sender?.name || "Gift Sender"}
                </h3>
              </div>
            </div>

            {giftData.giftMessage && (
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-sm text-slate-600 leading-relaxed italic">
                "{giftData.giftMessage}"
              </div>
            )}
          </Card>

          {/* Card 2: Course Information */}
          <Card className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
              {giftData.courseThumbnail || giftData.course?.thumbnail ? (
                <img
                  src={giftData.courseThumbnail || giftData.course?.thumbnail}
                  alt={giftData.courseTitle || giftData.course?.title}
                  className="w-full sm:w-44 h-44 sm:h-28 rounded-xl object-cover shrink-0 bg-slate-100"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="w-full sm:w-44 h-44 sm:h-28 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 p-4 flex items-center justify-center text-white text-sm font-bold text-center shrink-0">
                  {giftData.courseTitle || giftData.course?.title}
                </div>
              )}

              <div className="flex-1 min-w-0 space-y-2">
                <h2 className="text-lg md:text-xl font-bold text-slate-900 leading-snug line-clamp-2">
                  {giftData.courseTitle || giftData.course?.title || "Gifted Course"}
                </h2>
                {giftData.courseDescription && (
                  <p className="text-xs md:text-sm text-slate-500 line-clamp-2 leading-relaxed">
                    {giftData.courseDescription}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-600 font-medium">
                  {Number(giftData.lessons) > 0 && (
                    <span className="flex items-center gap-1.5">
                      <PlaySquare className="h-4 w-4 text-[#2563EB]" />
                      {giftData.lessons} Lessons
                    </span>
                  )}
                  {giftData.duration && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-slate-400" />
                      {giftData.duration}
                    </span>
                  )}
                  {Number(giftData.rating) > 0 && (
                    <span className="flex items-center gap-1 font-semibold text-slate-800">
                      <Star className="h-4 w-4 fill-[#2563EB] text-[#2563EB]" />
                      {giftData.rating}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Card 3: Recipient & Gift Metadata */}
          <Card className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-base text-slate-900 border-b border-slate-100 pb-2">
              Gift Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs sm:text-sm">
              <div className="space-y-1">
                <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                  <User className="h-3.5 w-3.5" /> Recipient Name
                </span>
                <p className="font-semibold text-slate-900">{giftData.recipientName || "N/A"}</p>
              </div>

              <div className="space-y-1">
                <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                  <Mail className="h-3.5 w-3.5" /> Recipient Email
                </span>
                <p className="font-semibold text-slate-900 truncate">{giftData.recipientEmail || "N/A"}</p>
              </div>

              {giftData.recipientPhone && (
                <div className="space-y-1">
                  <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                    <Phone className="h-3.5 w-3.5" /> Recipient Phone
                  </span>
                  <p className="font-semibold text-slate-900">{giftData.recipientPhone}</p>
                </div>
              )}

              <div className="space-y-1">
                <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                  <Calendar className="h-3.5 w-3.5" /> Gift Date
                </span>
                <p className="font-semibold text-slate-900">{formatDate(giftData.giftDate || giftData.createdAt)}</p>
              </div>

              <div className="space-y-1">
                <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                  <Hash className="h-3.5 w-3.5" /> Reference ID
                </span>
                <p className="font-semibold font-mono text-slate-900 truncate">{giftData.giftId}</p>
              </div>
            </div>
          </Card>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <Button variant="ghost" onClick={() => navigate("/dashboard/orders")} className="w-full sm:w-auto font-semibold">
              Back to Order History
            </Button>

            {giftData.status === "REDEEMED" ? (
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Button disabled className="h-11 px-6 rounded-xl font-semibold bg-slate-100 text-slate-600 border-transparent shadow-none">
                  <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" /> Gift Redeemed
                </Button>
                <Button onClick={() => navigate("/dashboard/courses")} className="h-11 px-6 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs">
                  Go to My Courses <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            ) : giftData.status === "EXPIRED" ? (
              <Button disabled className="h-11 px-8 rounded-xl font-semibold bg-red-100 text-red-700 border-transparent shadow-none cursor-not-allowed">
                Gift Expired
              </Button>
            ) : giftData.status === "PROCESSING" ? (
              <Button disabled className="h-11 px-8 rounded-xl font-semibold bg-amber-100 text-amber-800 border-transparent shadow-none cursor-not-allowed">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Gift Processing
              </Button>
            ) : (
              <Button
                onClick={handleRedeem}
                disabled={redeeming}
                className="w-full sm:w-auto h-11 px-8 rounded-xl font-semibold bg-[#2563EB] hover:bg-blue-700 text-white shadow-xs"
              >
                {redeeming ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Gift className="h-4 w-4 mr-2" />}
                {redeeming ? "Redeeming..." : "Redeem Gift"}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <Card className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-[#2563EB]">
            <Gift className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-1">Enter a Gift Code</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            Enter the gift code above to load course details, gift message, and redeem your gifted course.
          </p>
          <Button variant="outline" onClick={() => navigate("/dashboard/orders")} className="rounded-xl font-semibold">
            Back to Order History
          </Button>
        </Card>
      )}
    </div>
  );
};

function RedeemGiftSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading gift details">
      <Card className="rounded-2xl border border-slate-200 p-6 space-y-3 bg-white">
        <div className="flex items-center gap-3.5">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-4 w-5/6" />
      </Card>

      <Card className="rounded-2xl border border-slate-200 p-6 bg-white">
        <div className="flex flex-col sm:flex-row gap-5 items-center">
          <Skeleton className="w-full sm:w-44 h-44 sm:h-28 rounded-xl" />
          <div className="space-y-3 w-full flex-1">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <div className="flex gap-4 pt-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default RedeemGift;
