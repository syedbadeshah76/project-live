import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCart } from "@/contexts/CartContext";
import { useGiftCheckout } from "@/contexts/GiftCheckoutContext";
import { useWallet } from "@/contexts/WalletContext";
import { coursesService } from "@/services/courses.service";
import type { GiftCourseItem } from "@/types/gift.types";
import {
  Trash2,
  Gift,
  ChevronRight,
  ShieldCheck,
  BookOpen,
  Clock,
  Star,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import { GiftSelectionCard } from "@/components/gift/GiftSelectionCard";
import { EzCoinRedemption } from "@/components/wallet/EzCoinRedemption";
import { formatPrice as formatPriceUtil } from "@/lib/utils";

// Static outer wrapper to prevent re-mounting layout & losing input focus on typing
const CartLayout = ({ embedded, children }: { embedded?: boolean; children: React.ReactNode }) =>
  embedded ? <>{children}</> : <MainLayout>{children}</MainLayout>;

const Cart = ({ embedded = false }: { embedded?: boolean } = {}) => {
  const navigate = useNavigate();
  const {
    items,
    subtotal,
    discount,
    total,
    taxAmount,
    currency,
    couponCode,
    removeFromCart,
    applyCoupon,
    removeCoupon,
  } = useCart();

  const formatPrice = (p: number) => formatPriceUtil(p, currency);

  const giftCtx = useGiftCheckout();
  const wallet = useWallet();

  const [couponInput, setCouponInput] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // Gift Course dialog state — binary selection
  const [giftOpen, setGiftOpen] = useState(false);
  const [giftSelected, setGiftSelected] = useState<Set<string>>(new Set());

  // Enriched course metadata fetched dynamically from backend
  const [enrichedDetails, setEnrichedDetails] = useState<
    Record<
      string,
      {
        thumbnail?: string;
        description?: string;
        lessons?: number;
        duration?: string;
        rating?: number;
        reviewCount?: number;
      }
    >
  >({});

  useEffect(() => {
    if (!items.length) return;
    let cancelled = false;

    items.forEach((item) => {
      const targetCourseId = item.courseId || item.productId || item.id;
      if (!targetCourseId) return;

      coursesService
        .getCourse(targetCourseId, item.isLive)
        .then((res: any) => {
          if (cancelled) return;
          const data = res?.data ?? res;
          if (!data || typeof data !== "object") return;

          const thumb =
            data.thumbnailUrl || data.thumbnail || data.image || item.thumbnail;
          const desc =
            data.description ||
            data.shortDescription ||
            (data.title ? `${data.title}` : "");

          const lessons =
            data.totalLessons ??
            data.lessons ??
            (data.modules && Array.isArray(data.modules)
              ? data.modules.reduce(
                  (acc: number, m: any) => acc + (m.lessons?.length || 0),
                  0,
                )
              : data.schedule?.sessionDays
                ? typeof data.schedule.sessionDays === "string"
                  ? data.schedule.sessionDays.split(",").length
                  : Array.isArray(data.schedule.sessionDays)
                    ? data.schedule.sessionDays.length
                    : undefined
                : undefined);

          const mins =
            data.totalDurationMinutes ??
            data.durationMinutes ??
            data.schedule?.sessionDurationMinutes;
          const durStr = mins
            ? `${mins} min`
            : data.duration ?? undefined;

          const rat = Number(data.rating ?? data.avgRating ?? 0);
          const revCount = Number(data.reviewCount ?? data.totalReviews ?? 0);

          setEnrichedDetails((prev) => ({
            ...prev,
            [item.id]: {
              thumbnail: thumb,
              description: desc,
              lessons: lessons,
              duration: durStr,
              rating: rat,
              reviewCount: revCount,
            },
          }));
        })
        .catch(() => {});
    });

    return () => {
      cancelled = true;
    };
  }, [items]);

  const toggleGiftItem = useCallback((courseId: string) => {
    setGiftSelected((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  }, []);

  const giftCount = giftSelected.size;

  const handleGiftContinue = async () => {
    if (giftSelected.size === 0) {
      toast.error("Pick at least one course to gift");
      return;
    }

    try {
      const selectedIds = Array.from(giftSelected);
      const giftCourses: GiftCourseItem[] = selectedIds
        .map((selectedId) => {
          const cartItem = items.find(
            (i) =>
              i.productId === selectedId ||
              (i as any).product_id === selectedId ||
              i.courseId === selectedId ||
              i.id === selectedId
          );
          if (!cartItem) return null;

          const extra = enrichedDetails[cartItem.id] || {};
          const resolvedProductId = (
            cartItem.productId ||
            (cartItem as any).product_id ||
            ""
          ).trim();

          const resolvedCourseId = cartItem.courseId || cartItem.productId || cartItem.id;

          return {
            courseId: resolvedCourseId,
            product_id: resolvedProductId,
            productId: resolvedProductId,
            title: cartItem.title,
            thumbnail: extra.thumbnail || cartItem.thumbnail,
            description: extra.description || "Practical coding skills and course materials.",
            price: cartItem.discountedPrice ?? cartItem.price,
            originalPrice: cartItem.price,
            duration: extra.duration || "Self-paced",
            modules: 1,
            certificate: "After Completion",
            courseType: cartItem.isLive ? "Live Course" : "Recorded Course",
            occurrence: "Flexible",
            lessons: extra.lessons ?? 1,
            rating: extra.rating ?? 5.0,
            instructor: cartItem.instructor,
          } satisfies GiftCourseItem;
        })
        .filter((item): item is GiftCourseItem => item !== null);

      if (giftCourses.length === 0) {
        toast.error("Could not resolve selected courses");
        return;
      }

      giftCtx.setSelectedCourses(giftCourses);
      setGiftOpen(false);
      navigate("/dashboard/gift-course");
    } catch (err) {
      toast.error("Failed to prepare gift selection. Please try again.");
    }
  };

  const handleNormalCheckout = () => {
    giftCtx.deactivateGiftCheckout();
    navigate("/dashboard/checkout");
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }
    setApplyingCoupon(true);
    wallet.clearRedemption();

    const res = await applyCoupon(couponInput);
    const isSuccess = typeof res === "boolean" ? res : res?.success;
    const msg = typeof res === "boolean" ? (res ? "Coupon applied successfully!" : "Invalid coupon code") : res?.message;

    if (isSuccess) {
      toast.success(msg || "Coupon applied successfully!");
      setCouponInput("");
    } else {
      toast.error(msg || "Invalid coupon code");
    }
    setApplyingCoupon(false);
  };

  const handleCouponConflictFromCoins = useCallback(() => {
    if (couponCode) {
      removeCoupon();
      toast.info("Coupon removed — only one discount can be used at a time");
    }
  }, [couponCode, removeCoupon]);

  const prevSubtotalRef = useRef(subtotal);
  const prevItemCountRef = useRef(items.length);

  useEffect(() => {
    if (
      wallet.selectedTier &&
      (prevSubtotalRef.current !== subtotal || prevItemCountRef.current !== items.length)
    ) {
      wallet.clearRedemption();
    }
    prevSubtotalRef.current = subtotal;
    prevItemCountRef.current = items.length;
  }, [subtotal, items.length, wallet]);

  const ezDiscountAmount = wallet.quote?.valid ? wallet.quote.discountAmount : 0;
  const taxableSubtotal = Math.max(0, subtotal - discount - ezDiscountAmount);
  const currentTax = Math.round(taxableSubtotal * 0.18 * 100) / 100;
  const finalTotal = Math.max(0, taxableSubtotal + currentTax);
  const courseTitleForCrumb = items[0]?.title ?? "Course";

  if (items.length === 0) {
    return (
      <CartLayout embedded={embedded}>
        <div className="container py-16">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold">Your cart is empty</h1>
            <p className="mt-2 text-muted-foreground">
              Looks like you haven't added any courses yet.
            </p>
            <Button className="mt-6" asChild>
              <Link to="/courses">Browse Courses</Link>
            </Button>
          </div>
        </div>
      </CartLayout>
    );
  }

  return (
    <CartLayout embedded={embedded}>
      <div className="container px-4 py-6 md:py-8">
        <h1 className="text-2xl md:text-3xl font-bold">Cart</h1>
        <nav className="mt-2 text-sm text-muted-foreground flex items-center flex-wrap gap-1">
          <Link
            to={`/courses/${items[0]?.courseId ?? ""}`}
            className="underline underline-offset-4 hover:text-primary"
          >
            {courseTitleForCrumb}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="underline underline-offset-4 text-foreground">Cart</span>
        </nav>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Items List (2 columns) */}
          <div className="lg:col-span-2">
            <Card className="border-border/60 shadow-sm rounded-2xl">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-base md:text-lg">
                    Items ({items.length})
                  </h2>
                  <button
                    onClick={() => setGiftOpen(true)}
                    className="text-primary text-sm font-medium hover:underline inline-flex items-center gap-1.5"
                  >
                    <Gift className="h-4 w-4" />
                    Gift Course
                  </button>
                </div>

                <div className="space-y-4">
                  {items.map((item) => {
                    const extra = enrichedDetails[item.id] || {};
                    const thumb = extra.thumbnail || item.thumbnail;
                    const desc = extra.description || item.description || "";
                    const lessons = extra.lessons ?? item.totalLessons;
                    const durationStr =
                      extra.duration ||
                      item.duration ||
                      (item.totalDurationMinutes
                        ? `${item.totalDurationMinutes} min`
                        : undefined);
                    const ratingNum = extra.rating ?? item.rating;
                    const reviewCnt = extra.reviewCount ?? item.reviewCount;

                    return (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row gap-4 rounded-xl border border-border/60 p-4 transition-shadow hover:shadow-xs"
                      >
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={item.title}
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                            className="h-32 sm:h-28 w-full sm:w-36 rounded-lg object-cover shrink-0 bg-muted"
                          />
                        ) : (
                          <div className="h-32 sm:h-28 w-full sm:w-36 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 text-white p-3 flex flex-col justify-between shrink-0">
                            <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">
                              {item.isLive ? "Live Course" : "Course"}
                            </span>
                            <span className="text-xs font-semibold line-clamp-2">
                              {item.title}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="font-semibold text-sm sm:text-base leading-snug line-clamp-2">
                                {item.title}
                              </h3>
                              <button
                                onClick={() =>
                                  removeFromCart(
                                    item.productId || item.courseId || item.id
                                  )
                                }
                                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 transition-colors"
                                aria-label="Remove item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            {desc && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {desc}
                              </p>
                            )}
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap pt-1">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              {lessons != null && lessons > 0 && (
                                <span className="inline-flex items-center gap-1">
                                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                                  {lessons} {lessons === 1 ? "Lesson" : "Lessons"}
                                </span>
                              )}
                              {durationStr && (
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  {durationStr}
                                </span>
                              )}
                              {ratingNum != null && ratingNum > 0 ? (
                                <span className="inline-flex items-center gap-1">
                                  <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                                  {ratingNum.toFixed(1)}
                                  {reviewCnt != null && reviewCnt > 0 && (
                                    <span className="text-muted-foreground">
                                      ({reviewCnt})
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1">
                                  <Star className="h-3.5 w-3.5 text-muted-foreground" />
                                  New
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-primary text-base">
                                {formatPrice(item.discountedPrice ?? item.price)}
                              </span>
                              {item.discountedPrice &&
                                item.price > item.discountedPrice && (
                                  <span className="ml-2 text-xs text-muted-foreground line-through">
                                    {formatPrice(item.price)}
                                  </span>
                                )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary (1 column) */}
          <div>
            <Card className="sticky top-24 border-border/60 shadow-sm rounded-2xl">
              <CardContent className="p-4 sm:p-6 space-y-5">
                <h2 className="font-semibold text-base md:text-lg">Order Summary</h2>

                {/* 1. Courses Section */}
                <div className="space-y-2.5 text-sm">
                  {items.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-start justify-between gap-3"
                    >
                      <span className="text-muted-foreground line-clamp-2">
                        {it.title}
                      </span>
                      <span className="font-medium shrink-0">
                        {formatPrice(it.discountedPrice ?? it.price)}
                      </span>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* 2. Applied Coupon Section */}
                {couponCode && (
                  <>
                    <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-primary">
                          {couponCode}{" "}
                          <span className="text-muted-foreground text-xs font-normal">
                            applied
                          </span>
                        </span>
                        <button
                          onClick={removeCoupon}
                          className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Coupon discount active
                      </p>
                    </div>
                    <Separator />
                  </>
                )}

                {/* 3. Coupon Input Section */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter Coupon"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    className="h-10 text-sm rounded-xl"
                  />
                  <Button
                    variant="outline"
                    onClick={handleApplyCoupon}
                    disabled={applyingCoupon}
                    className="border-primary text-primary hover:bg-primary/5 rounded-xl px-4"
                  >
                    Apply
                  </Button>
                </div>

                <Separator />

                {/* 4. EZ Coins Section */}
                <EzCoinRedemption
                  orderAmount={subtotal}
                  onCouponConflict={handleCouponConflictFromCoins}
                />

                {/* 5. Pricing Breakdown */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatPrice(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-destructive font-medium">
                      <span>Coupon Discount {couponCode ? `(${couponCode})` : ""}</span>
                      <span>-{formatPrice(discount)}</span>
                    </div>
                  )}
                  {ezDiscountAmount > 0 && (
                    <div className="flex justify-between text-destructive font-medium">
                      <span>EZ Coins Discount</span>
                      <span>-{formatPrice(ezDiscountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GST / Tax (18%)</span>
                    <span className="font-medium">{formatPrice(currentTax)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-base md:text-lg pt-1">
                    <span>Total</span>
                    <span className="text-primary font-bold">{formatPrice(finalTotal)}</span>
                  </div>
                </div>

                {/* Checkout Button */}
                <Button
                  className="w-full h-11 text-base font-semibold rounded-xl"
                  size="lg"
                  onClick={handleNormalCheckout}
                >
                  Checkout <ChevronRight className="ml-1 h-4 w-4" />
                </Button>

                <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground leading-snug">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  Secure checkout powered by{" "}
                  <span className="text-primary font-medium">Razorpay</span>. Your
                  payment information is encrypted and protected.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Gift Course dialog */}
      <Dialog open={giftOpen} onOpenChange={setGiftOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Choose course you want to gift</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {items.map((it) => {
              const extra = enrichedDetails[it.id] || {};
              const thumb = extra.thumbnail || it.thumbnail;
              const desc = extra.description || it.description || "";
              const lessons = extra.lessons ?? it.totalLessons ?? 1;
              const durationStr = extra.duration || it.duration || (it.totalDurationMinutes ? `${it.totalDurationMinutes} min` : "Self-paced");
              const ratingNum = extra.rating ?? it.rating ?? 5.0;
              const reviewCnt = extra.reviewCount ?? it.reviewCount ?? 0;

              const itemIdentifier = it.productId || (it as any).product_id || it.courseId || it.id;

              return (
                <GiftSelectionCard
                  key={it.id}
                  thumbnail={thumb}
                  title={it.title}
                  description={desc}
                  lessons={lessons}
                  duration={durationStr}
                  rating={ratingNum}
                  ratingCount={reviewCnt}
                  price={it.discountedPrice ?? it.price}
                  originalPrice={it.discountedPrice ? it.price : undefined}
                  currency={currency}
                  isSelected={giftSelected.has(itemIdentifier)}
                  onToggle={() => toggleGiftItem(itemIdentifier)}
                />
              );
            })}
            <div className="flex justify-center pt-2">
              <Button
                onClick={handleGiftContinue}
                disabled={giftCount === 0}
                className="px-8"
              >
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </CartLayout>
  );
};

export default Cart;
