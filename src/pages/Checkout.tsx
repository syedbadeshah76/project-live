import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useGiftCheckout } from "@/contexts/GiftCheckoutContext";
import { useWallet } from "@/contexts/WalletContext";
import { orderService } from "@/services/order.service";
import { razorpayService } from "@/services/razorpay.service";
import { giftService } from "@/services/gift.service";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { EzCoinRedemption } from "@/components/wallet/EzCoinRedemption";
import { coursesService } from "@/services/courses.service";
import { formatPrice } from "@/lib/utils";
import {
  Lock,
  ShieldCheck,
  ShoppingBag,
  ArrowLeft,
  IndianRupee,
  Gift,
  BookOpen,
  Clock,
  Star,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

const CourseItemImage = ({ src, alt }: { src?: string; alt: string }) => {
  const [imgError, setImgError] = useState(false);

  if (!src || imgError) {
    return (
      <div className="h-32 sm:h-28 w-full sm:w-36 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex flex-col items-center justify-center p-2 shrink-0 text-center shadow-xs">
        <BookOpen className="h-7 w-7 mb-1 opacity-90" />
        <span className="text-[11px] font-medium leading-tight line-clamp-2 px-1">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setImgError(true)}
      className="h-32 sm:h-28 w-full sm:w-36 rounded-lg object-cover shrink-0"
    />
  );
};

const Checkout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const cart = useCart();
  const giftCtx = useGiftCheckout();
  const wallet = useWallet();

  const [loading, setLoading] = useState(false);

  // Determine checkout mode
  const isGiftParam = searchParams.get("mode") === "gift";
  const isGiftMode =
    (isGiftParam || giftCtx.isGiftCheckout) &&
    giftCtx.selectedCourses.length > 0;

  // Deactivate gift mode if user entered normal checkout path
  useEffect(() => {
    if (!isGiftParam && !isGiftMode && giftCtx.isGiftCheckout) {
      giftCtx.deactivateGiftCheckout();
    }
  }, [isGiftParam, isGiftMode, giftCtx]);

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
    if (!cart.items.length) return;
    let cancelled = false;

    cart.items.forEach((item) => {
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
              rating: rat > 0 ? rat : undefined,
              reviewCount: revCount > 0 ? revCount : undefined,
            },
          }));
        })
        .catch(() => {});
    });

    return () => {
      cancelled = true;
    };
  }, [cart.items]);

  // Display items: gift courses (gift mode) or cart items (normal mode)
  const displayItems = useMemo(() => {
    if (isGiftMode) {
      return giftCtx.selectedCourses.map((c) => ({
        courseId: c.courseId,
        title: c.title,
        thumbnail: c.thumbnail,
        description: c.description || "",
        instructor: c.instructor || "EDVANZ Instructor",
        lessons: c.lessons,
        duration: c.duration,
        rating: c.rating,
        reviewCount: undefined as number | undefined,
        price: c.originalPrice,
        discountedPrice: c.price,
        isGift: true,
      }));
    }
    return cart.items.map((i) => {
      const extra = enrichedDetails[i.id] || {};
      return {
        courseId: i.courseId || i.id,
        title: i.title,
        thumbnail: extra.thumbnail || i.thumbnail,
        description: extra.description || i.description || "",
        instructor: i.instructor || "EDVANZ Instructor",
        lessons: extra.lessons ?? i.totalLessons,
        duration: extra.duration ?? i.duration,
        rating: extra.rating ?? i.rating,
        reviewCount: extra.reviewCount ?? i.reviewCount,
        price: i.price,
        discountedPrice: i.discountedPrice,
        isGift: false,
      };
    });
  }, [isGiftMode, giftCtx.selectedCourses, cart.items, enrichedDetails]);

  // Calculate Subtotal, Taxable Amount, Tax & Final Totals
  const subtotal = useMemo(() => {
    if (isGiftMode) {
      return giftCtx.selectedCourses.reduce((sum, c) => sum + c.price, 0);
    }
    return cart.subtotal;
  }, [isGiftMode, giftCtx.selectedCourses, cart.subtotal]);

  const couponDiscount = isGiftMode ? 0 : cart.discount;
  const ezDiscountAmount = isGiftMode ? 0 : wallet.quote?.valid ? wallet.quote.discountAmount : 0;
  
  // Taxable amount = Subtotal - Coupon Discount - EZ Coins Discount
  const taxableAmount = Math.max(0, subtotal - couponDiscount - ezDiscountAmount);
  
  // Tax (18%) on taxable amount
  const taxAmount = Math.round(taxableAmount * 0.18 * 100) / 100;

  // Final Total = Taxable amount + Tax
  const totalAmount = Math.max(0, taxableAmount + taxAmount);

  // ============= Coupon/Coin Mutual Exclusivity (Checkout) =============

  // Called by EzCoinRedemption when user selects a tier — clear coupon
  const handleCouponConflictFromCoins = useCallback(() => {
    if (cart.couponCode) {
      cart.removeCoupon();
      toast.info("Coupon removed — only one discount can be used at a time");
    }
  }, [cart]);

  // ============= Quote Invalidation on Subtotal Change =============
  const prevSubtotalRef = useRef(subtotal);

  useEffect(() => {
    if (wallet.selectedTier && prevSubtotalRef.current !== subtotal) {
      wallet.clearRedemption();
    }
    prevSubtotalRef.current = subtotal;
  }, [subtotal, wallet]);

  // ============= Normal Checkout Payment Flow (Razorpay — preserved 100%) =============
  const handleNormalPay = async () => {
    if (cart.items.length === 0) return;
    setLoading(true);

    try {
      // Determine checkout payload — mutually exclusive coupon vs coins
      const coinsToRedeem = wallet.appliedCoins > 0 ? wallet.appliedCoins : null;
      const couponCode = coinsToRedeem ? "" : (cart.couponCode || "");

      const order = await orderService.checkout(couponCode, coinsToRedeem);
      const init = await razorpayService.initiate(order.id);

      openRazorpayCheckout({
        keyId: init.razorpayKeyId,
        orderId: init.razorpayOrderId,
        amount: Math.round(totalAmount * 100),
        currency: init.currency,
        courseName:
          cart.items.length === 1
            ? cart.items[0].title
            : `${cart.items.length} Courses — EDVANZ`,
        customerName: user?.name,
        customerEmail: user?.email,
        onSuccess: async (response) => {
          try {
            // console.log("response from coming from the razp", response);
            const payment = await razorpayService.verify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              orderId: order.id,
            });

            if (payment.status !== "CAPTURED") {
              throw new Error("Payment not captured");
            }

            sessionStorage.setItem(
              "edvanz_last_payment",
              JSON.stringify({
                orderId: order.id,
                orderNumber: order.orderNumber,
                paymentId: payment.id,
                courses: cart.items.map((i) => ({
                  id: i.courseId,
                  title: i.title,
                })),
                amount: payment.amount,
                currency: payment.currency,
                paidAt: payment.createdAt,
              }),
            );

            await cart.clearCart();
            wallet.clearRedemption();
            toast.success("Payment successful! 🎉");
            navigate(`/dashboard/payment-success/${payment.id}`);
          } catch (err: any) {
            // console.log("VERIFY ERROR:", err);
            sessionStorage.setItem(
              "edvanz_payment_error",
              JSON.stringify({
                message: err.message || "Verification failed",
                code: "VERIFY_FAILED",
              }),
            );
            toast.error("Payment verification failed.");
            navigate("/dashboard/payment-failed");
          } finally {
            setLoading(false);
          }
        },
        onFailure: (error) => {
          sessionStorage.setItem(
            "edvanz_payment_error",
            JSON.stringify({
              message: error?.description || "Payment failed",
              code: error?.code,
            }),
          );
          toast.error(error?.description || "Payment failed.");
          setLoading(false);
          navigate("/dashboard/payment-failed");
        },
        onDismiss: () => {
          setLoading(false);
          toast.info("Payment cancelled");
        },
      });
    } catch (e: any) {
      toast.error(e.message || "Could not initiate payment.");
      setLoading(false);
    }
  };

  // ============= Gift Checkout Payment Flow (creates gifts ONLY after payment verification) =============
  const handleGiftPay = async () => {
    if (giftCtx.selectedCourses.length === 0) return;

    // Validate product_id for EVERY selected course — NO fallback to courseId!
    const validation = giftCtx.validateProductIds();
    if (!validation.isValid) {
      const missingCourseNames = validation.missingCourses
        .map((c) => `"${c.title || c.courseId}"`)
        .join(", ");
      if (import.meta.env.DEV) {
        console.error(
          "[Gift Checkout] Missing product_id in selected gift courses:",
          validation.missingCourses.map((c) => ({
            courseId: c.courseId,
            product_id: c.product_id,
            productId: c.productId,
            title: c.title,
          })),
        );
      }
      toast.error(
        `Unable to create gift. Product information is missing${
          missingCourseNames ? ` for: ${missingCourseNames}` : "."
        }`,
      );
      return;
    }

    setLoading(true);

    try {
      const order = await orderService.checkout(cart.couponCode || "");
      giftCtx.setGiftOrderId(order.id);

      const init = await razorpayService.initiate(order.id);

      openRazorpayCheckout({
        keyId: init.razorpayKeyId,
        orderId: init.razorpayOrderId,
        amount: Math.round(totalAmount * 100),
        currency: init.currency,
        courseName:
          giftCtx.selectedCourses.length === 1
            ? `Gift: ${giftCtx.selectedCourses[0].title}`
            : `Gift: ${giftCtx.selectedCourses.length} Courses — EDVANZ`,
        customerName: user?.name,
        customerEmail: user?.email,
        onSuccess: async (response) => {
          try {
            const payment = await razorpayService.verify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              orderId: order.id,
            });

            if (payment.status !== "CAPTURED") {
              throw new Error("Payment not captured");
            }

            // Re-validate product IDs strictly before making API call
            const currentValidation = giftCtx.validateProductIds();
            if (!currentValidation.isValid) {
              throw new Error(
                "Unable to create gift. Product information is missing.",
              );
            }

            // Defensive dev logging
            if (import.meta.env.DEV) {
              console.log("[Gift Checkout] Sending createGift payload:", {
                productIds: currentValidation.productIds,
                selectedCourses: giftCtx.selectedCourses.map((c) => ({
                  courseId: c.courseId,
                  product_id: c.product_id,
                  productId: c.productId,
                  title: c.title,
                })),
                recipientName: giftCtx.recipientName,
                recipientEmail: giftCtx.recipientEmail,
                recipientPhone: giftCtx.recipientPhone,
                giftMessage: giftCtx.giftMessage,
              });
            }

            // ONLY after payment verification — create gifts on backend (single atomic request)
            const giftResponse = await giftService.createGift({
              productIds: currentValidation.productIds,
              recipientName: giftCtx.recipientName,
              recipientEmail: giftCtx.recipientEmail,
              recipientPhone: giftCtx.recipientPhone,
              giftMessage: giftCtx.giftMessage,
            });

            // Store results in context for success tracking
            giftCtx.setGiftCreationResults(
              giftCtx.selectedCourses.map((c) => ({
                courseId: c.courseId,
                courseTitle: c.title,
                status: "success" as const,
                giftId: giftResponse.giftId,
              })),
            );

            sessionStorage.setItem(
              "edvanz_last_payment",
              JSON.stringify({
                orderId: order.id,
                orderNumber: order.orderNumber,
                paymentId: payment.id,
                courses: giftCtx.selectedCourses.map((c) => ({
                  id: c.courseId,
                  title: c.title,
                })),
                amount: payment.amount,
                currency: payment.currency,
                paidAt: payment.createdAt,
                isGiftPayment: true,
                recipientName: giftCtx.recipientName,
                recipientEmail: giftCtx.recipientEmail,
                giftMessage: giftCtx.giftMessage,
              }),
            );

            await cart.clearCart();
            toast.success("Payment successful! 🎉");
            navigate(`/dashboard/payment-success/${payment.id}`);
          } catch (err: any) {
            sessionStorage.setItem(
              "edvanz_payment_error",
              JSON.stringify({
                message: err.message || "Verification failed",
                code: "VERIFY_FAILED",
              }),
            );
            toast.error("Payment verification failed.");
            setLoading(false);
            navigate("/dashboard/payment-failed");
          }
        },
        onFailure: (error) => {
          sessionStorage.setItem(
            "edvanz_payment_error",
            JSON.stringify({
              message: error?.description || "Payment failed",
              code: error?.code,
            }),
          );
          toast.error(error?.description || "Payment failed.");
          setLoading(false);
          navigate("/dashboard/payment-failed");
        },
        onDismiss: () => {
          setLoading(false);
          toast.info("Payment cancelled");
        },
      });
    } catch (e: any) {
      toast.error(e.message || "Could not initiate payment.");
      setLoading(false);
    }
  };

  const handlePay = isGiftMode ? handleGiftPay : handleNormalPay;

  if (displayItems.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Nothing to checkout</h2>
        <p className="text-muted-foreground mt-2">
          Add some courses to your cart first.
        </p>
        <Button asChild className="mt-6">
          <Link to="/courses">Browse Courses</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container px-4 py-6 md:py-8">
      {/* Breadcrumbs */}
      <nav className="mb-4 text-sm text-muted-foreground flex items-center flex-wrap gap-1">
        <Link to="/dashboard" className="hover:text-foreground">
          Dashboard
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/dashboard/cart" className="hover:text-foreground">
          Cart
        </Link>
        <ChevronRight className="h-3 w-3" />
        {isGiftMode ? (
          <>
            <Link to="/dashboard/gift-course" className="hover:text-foreground">
              Gift a Course
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">Checkout</span>
          </>
        ) : (
          <span className="text-foreground font-medium">Checkout</span>
        )}
      </nav>

      {/* Header & Back Button */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to={isGiftMode ? "/dashboard/gift-course" : "/dashboard/cart"}
          className="p-2 rounded-lg border border-border/60 hover:bg-muted transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold">Checkout</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Items List Card (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border/60 shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center justify-between">
                <span>Items ({displayItems.length})</span>
                {isGiftMode && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    <Gift className="h-3.5 w-3.5" /> Gift Checkout Mode
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {displayItems.map((item) => (
                <div
                  key={item.courseId}
                  className="flex flex-col sm:flex-row gap-4 rounded-xl border border-border/60 p-4 transition-shadow hover:shadow-xs"
                >
                  <CourseItemImage src={item.thumbnail} alt={item.title} />
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm sm:text-base leading-snug line-clamp-2">
                          {item.title}
                        </h3>
                        {item.isGift ? (
                          <Gift className="h-4 w-4 text-primary shrink-0 mt-1" />
                        ) : (
                          <button
                            onClick={() => cart.removeFromCart(item.courseId)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 transition-colors"
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {item.description ? (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {item.lessons ? (
                          <span className="inline-flex items-center gap-1">
                            <BookOpen className="h-3.5 w-3.5 text-primary" />
                            {item.lessons} Lessons
                          </span>
                        ) : null}
                        {item.duration ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {item.duration}
                          </span>
                        ) : null}
                        {item.rating && item.rating > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            {item.rating.toFixed(1)}
                            {item.reviewCount ? ` (${item.reviewCount})` : ""}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-primary text-base">
                          {formatPrice(item.discountedPrice || item.price, cart.currency)}
                        </span>
                        {item.discountedPrice && item.price > item.discountedPrice && (
                          <span className="ml-2 text-xs text-muted-foreground line-through">
                            {formatPrice(item.price, cart.currency)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Order Summary & Payment Panel (1 col) */}
        <div className="space-y-4">
          {/* Order Summary Card */}
          <Card className="border-border/60 shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg font-semibold">
                {isGiftMode ? "Gift Summary" : "Order Summary"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {/* Gift Recipient Section (ONLY in Gift Mode) */}
              {isGiftMode ? (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 font-semibold text-primary">
                    <Gift className="h-4 w-4" />
                    Recipient Information
                  </div>
                  <div className="text-xs space-y-1 text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Name:</span>{" "}
                      {giftCtx.recipientName}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Email:</span>{" "}
                      {giftCtx.recipientEmail}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Phone:</span>{" "}
                      {giftCtx.recipientPhone}
                    </p>
                    {giftCtx.giftMessage && (
                      <p className="pt-1 italic">"{giftCtx.giftMessage}"</p>
                    )}
                  </div>
                </div>
              ) : (
                /* Normal Checkout Item List Breakdown */
                <div className="space-y-2 text-sm">
                  {cart.items.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-start justify-between gap-3"
                    >
                      <span className="text-muted-foreground line-clamp-1">
                        {it.title}
                      </span>
                      <span className="font-medium shrink-0">
                        {formatPrice(it.discountedPrice ?? it.price, cart.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <Separator />

              {/* EZ Coins Section — Fixed Tier Selection (Normal Checkout only) */}
              {!isGiftMode && (
                <EzCoinRedemption
                  orderAmount={subtotal}
                  onCouponConflict={handleCouponConflictFromCoins}
                />
              )}

              {/* Pricing Breakdown */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">
                    {formatPrice(subtotal, cart.currency)}
                  </span>
                </div>
                {couponDiscount > 0 && !isGiftMode && (
                  <div className="flex justify-between text-destructive">
                    <span>Coupon Discount</span>
                    <span>-{formatPrice(couponDiscount, cart.currency)}</span>
                  </div>
                )}
                {ezDiscountAmount > 0 && !isGiftMode && (
                  <div className="flex justify-between text-destructive">
                    <span>Estimated EZ Coins Discount</span>
                    <span>-{formatPrice(ezDiscountAmount, cart.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST / Tax (18%)</span>
                  <span className="font-medium">
                    {formatPrice(taxAmount, cart.currency)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base md:text-lg pt-1">
                  <span>Total Payable</span>
                  <span className="text-primary font-bold">
                    {formatPrice(totalAmount, cart.currency)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Panel Card */}
          <Card className="border-border/60 shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg font-semibold">
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <p className="text-xs text-muted-foreground">
                Secure online payment powered by <span className="font-semibold text-foreground">Razorpay</span> (UPI, Cards, Netbanking, Wallets).
              </p>

              <Button
                onClick={handlePay}
                disabled={loading}
                className="w-full h-12 text-base font-semibold rounded-xl"
                size="lg"
              >
                {loading ? (
                  "Processing..."
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Pay {formatPrice(totalAmount, cart.currency)}
                  </>
                )}
              </Button>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/50 p-3 rounded-xl">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <p>
                  Secure 256-bit SSL encryption. 30-Day Money Back Guarantee.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
