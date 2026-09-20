import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { cartService, type BackendCart } from "@/services/cart.service";
import { couponService } from "@/services/coupon.service";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CartItem {
  id: string;
  productId?: string;
  courseId: string;
  title: string;
  thumbnail: string;
  instructor: string;
  price: number;
  discountedPrice?: number;
  productType?: "COURSE" | "LIVE_COURSE";
  isLive?: boolean;
  selectedSchedule?: { day: string; time: string };
  description?: string;
  totalLessons?: number;
  duration?: string;
  totalDurationMinutes?: number;
  rating?: number;
  reviewCount?: number;
}

export interface AppliedCoupon {
  code: string;
  discountAmount: number;
  discountType?: string;
  message?: string;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  discount: number;
  total: number;
  currency: string;
  couponCode: string | null;
  couponDiscount: number;
  appliedCoupon: AppliedCoupon | null;
  loading: boolean;
  cartId: string | null;
  addToCart: (item: CartItem) => Promise<void>;
  removeFromCart: (courseId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  isInCart: (courseId: string) => boolean;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const mapBackendToItems = (cart: BackendCart): CartItem[] =>
  (cart.items || []).map((it: any) => {
    const pId = it.productId || it.courseId || "";
    const thumb = it.productThumbnail || it.thumbnailUrl || it.thumbnail || it.imageUrl || it.image || "";
    const rawPrice = Number(it.price ?? 0);
    const rawOrig = Number(it.originalPrice ?? 0);
    const effectivePrice = rawPrice > 0 ? rawPrice : rawOrig > 0 ? rawOrig : 0;
    const effectiveOrig = rawOrig > 0 ? rawOrig : effectivePrice;

    return {
      id: pId,
      productId: pId,
      courseId: it.courseId || pId,
      title: it.productName || it.courseName || "Untitled Product",
      thumbnail: thumb,
      instructor: it.instructorName || it.instructor || "",
      price: effectiveOrig,
      discountedPrice: effectivePrice,
      productType: it.productType,
      isLive: it.productType === "LIVE_COURSE",
      totalLessons: it.totalLessons ?? it.lessonsCount ?? it.lessons,
      duration: it.duration ?? it.totalDuration,
      totalDurationMinutes: it.totalDurationMinutes ?? it.sessionDurationMinutes,
      rating: it.rating ?? it.avgRating,
      reviewCount: it.reviewCount ?? it.totalReviews,
      description: it.description,
    };
  });

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartId, setCartId] = useState<string | null>(null);
  const [subtotal, setSubtotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [currency, setCurrency] = useState<string>("INR");
  const [loading, setLoading] = useState(false);

  const applyBackendCart = useCallback((cart: BackendCart) => {
    setCartId(cart.id);
    setCurrency(cart.currency || "INR");
    const backendItems = mapBackendToItems(cart);
    setItems(backendItems);

    const computedSub =
      cart.subtotal && cart.subtotal > 0
        ? cart.subtotal
        : backendItems.reduce(
            (sum, x) => sum + Number(x.discountedPrice ?? x.price ?? 0),
            0
          );
    const computedTax =
      cart.taxAmount && cart.taxAmount > 0
        ? cart.taxAmount
        : Math.round(computedSub * 0.18 * 100) / 100;
    setSubtotal(computedSub);
    setTaxAmount(computedTax);
    setTotalAmount(
      cart.totalAmount && cart.totalAmount > 0
        ? cart.totalAmount
        : computedSub + computedTax
    );
  }, []);

  const refresh = useCallback(async () => {
    const hasToken = !!localStorage.getItem("accessToken");
    if (!hasToken && !isAuthenticated && !user) {
      return;
    }
    setLoading(true);
    try {
      const cart = await cartService.getCart();
      applyBackendCart(cart);
    } catch (e) {
      // silently ignore if not logged in
    } finally {
      setLoading(false);
    }
  }, [applyBackendCart, isAuthenticated, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addToCart = useCallback(
    async (item: CartItem) => {
      setLoading(true);
      const targetId = item.productId || item.id || item.courseId;
      if (!targetId) {
        toast.error("Product ID not found");
        setLoading(false);
        return;
      }
      try {
        const cart = await cartService.addToCart(targetId);
        applyBackendCart(cart);
        toast.success("Added to cart");
      } catch (e: any) {
        const errCode = e?.response?.data?.code;
        const errMsg = e?.response?.data?.message || e?.message || "Failed to add to cart";
        if (errCode === "CRT_004" || (errMsg && errMsg.toLowerCase().includes("already have access"))) {
          toast.info("You already have access to this course!");
          return;
        }
        toast.error(errMsg);
      } finally {
        setLoading(false);
      }
    },
    [applyBackendCart]
  );

  const removeFromCart = useCallback(
    async (idOrCourseId: string) => {
      setLoading(true);
      const match = items.find(
        (x) => x.productId === idOrCourseId || x.courseId === idOrCourseId || x.id === idOrCourseId
      );
      const targetProductId = match?.productId || match?.id || idOrCourseId;

      setItems((prev) => {
        const next = prev.filter(
          (x) =>
            x.productId !== idOrCourseId &&
            x.courseId !== idOrCourseId &&
            x.id !== idOrCourseId &&
            x.productId !== targetProductId &&
            x.courseId !== targetProductId &&
            x.id !== targetProductId
        );
        const newSub = next.reduce(
          (sum, x) => sum + Number(x.discountedPrice ?? x.price ?? 0),
          0
        );
        const newTax = Math.round(newSub * 0.18 * 100) / 100;
        setSubtotal(newSub);
        setTaxAmount(newTax);
        setTotalAmount(newSub + newTax);
        return next;
      });

      try {
        await cartService.removeItem(targetProductId);
        await refresh();
      } catch (e: any) {
        toast.error(e?.message || "Failed to remove item");
        await refresh();
      } finally {
        setLoading(false);
      }
    },
    [items, refresh]
  );

  const clearCart = useCallback(async () => {
    setLoading(true);
    try {
      await cartService.clearCart();
      setItems([]);
      setCartId(null);
      setSubtotal(0);
      setTaxAmount(0);
      setTotalAmount(0);
      setAppliedCoupon(null);
      setCouponCode(null);
      setCouponDiscount(0);
    } catch (e: any) {
      toast.error(e.message || "Failed to clear cart");
    } finally {
      setLoading(false);
    }
  }, []);

  const isInCart = useCallback(
    (idOrCourseId: string) =>
      items.some((i) => i.productId === idOrCourseId || i.courseId === idOrCourseId || i.id === idOrCourseId),
    [items]
  );

  // Validate coupon via backend API POST /api/coupons/validate
  const applyCoupon = useCallback(
    async (code: string): Promise<{ success: boolean; message: string }> => {
      const cleanCode = code.trim();
      if (!cleanCode) {
        return { success: false, message: "Please enter a coupon code" };
      }

      const currentSubtotal = items.reduce(
        (sum, x) => sum + (x.discountedPrice ?? x.price ?? 0),
        0
      );

      try {
        const res = await couponService.validateCoupon(
          cleanCode,
          currentSubtotal > 0 ? currentSubtotal : subtotal
        );

        if (res.success && res.data?.valid) {
          const discountAmt = res.data.discount;
          const couponInfo: AppliedCoupon = {
            code: cleanCode,
            discountAmount: discountAmt,
            discountType: res.data.coupon?.discountType,
            message: res.data.message,
          };
          setAppliedCoupon(couponInfo);
          setCouponCode(cleanCode);
          setCouponDiscount(discountAmt);
          return {
            success: true,
            message: res.data.message || "Coupon applied successfully",
          };
        } else {
          const errorMsg =
            res.data?.message || res.message || "Invalid or expired coupon code";
          return { success: false, message: errorMsg };
        }
      } catch (err: any) {
        const errMsg =
          err?.response?.data?.message || err?.message || "Failed to validate coupon";
        return { success: false, message: errMsg };
      }
    },
    [items, subtotal]
  );

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponCode(null);
    setCouponDiscount(0);
  }, []);

  // Auto-remove coupon if cart becomes empty
  useEffect(() => {
    if (items.length === 0 && appliedCoupon) {
      removeCoupon();
    }
  }, [items.length, appliedCoupon, removeCoupon]);

  const discount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const taxableSubtotal = Math.max(0, subtotal - discount);
  const currentTax = Math.round(taxableSubtotal * 0.18 * 100) / 100;
  const total = Math.max(0, taxableSubtotal + currentTax);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount: items.length,
        subtotal,
        taxAmount: currentTax,
        totalAmount: total,
        discount,
        total,
        currency,
        couponCode,
        couponDiscount,
        appliedCoupon,
        loading,
        cartId,
        addToCart,
        removeFromCart,
        clearCart,
        isInCart,
        applyCoupon,
        removeCoupon,
        refresh,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
