// src/contexts/WishlistContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { wishlistService, type WishlistItemDTO } from "@/services/wishlist.service";
import { useAuth } from "@/contexts/AuthContext";

export interface WishlistItem {
  id: string;
  productId?: string;
  courseId: string;
  title: string;
  thumbnail: string;
  instructor: string;
  price: number;
  discountedPrice?: number;
  rating: number;
  students: number;
  level: string;
  category: string;
  lessons?: number;
  reviewsCount?: number;
}

interface WishlistContextType {
  items: WishlistItem[];
  itemCount: number;
  loading: boolean;
  addToWishlist: (item: WishlistItem) => Promise<void>;
  removeFromWishlist: (courseId: string) => Promise<void>;
  toggleWishlist: (item: WishlistItem) => Promise<boolean>;
  isInWishlist: (courseId: string) => boolean;
  clearWishlist: () => Promise<void>;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const LS_KEY = "edvanz_wishlist";

const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? (n as number) : fallback;
};

const normalizeDTO = (d: WishlistItemDTO, existing?: WishlistItem): WishlistItem => ({
  id: d.id ?? d.wishlistId ?? existing?.id ?? `wl-${d.courseId}`,
  productId: (d as any).productId ? String((d as any).productId) : existing?.productId,
  courseId: String(d.courseId),
  title: d.title ?? d.courseTitle ?? existing?.title ?? "",
  thumbnail: d.thumbnailUrl ?? d.thumbnail ?? existing?.thumbnail ?? "",
  instructor: d.instructor ?? d.instructorName ?? existing?.instructor ?? "",
  price: num(d.price ?? d.basePrice ?? existing?.price, 0),
  discountedPrice:
    d.discountedPrice != null
      ? num(d.discountedPrice)
      : d.effectivePrice != null
        ? num(d.effectivePrice)
        : existing?.discountedPrice,
  rating: num(d.rating ?? d.avgRating ?? existing?.rating, 0),
  students: num(d.students ?? d.enrollmentCount ?? d.totalStudents ?? existing?.students, 0),
  level: d.level ?? existing?.level ?? "",
  category: d.category ?? d.categoryName ?? existing?.category ?? "Other",
  lessons: d.lessons ?? d.totalLessons ?? existing?.lessons,
  reviewsCount: d.reviewsCount ?? d.totalReviews ?? existing?.reviewsCount,
});

const readLocal = (): WishlistItem[] => {
  try {
    const stored = localStorage.getItem(LS_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>(readLocal);
  const [loading, setLoading] = useState(false);

  const syncedForUser = useRef<string | null>(null);
  const isStudent = !!user && user.role === "student";

  // Persist locally for guests / offline resilience
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items]);

  const refreshWishlist = useCallback(async () => {
    if (!isStudent) return;
    setLoading(true);
    try {
      const dtos = await wishlistService.list();
      setItems((prev) => {
        const byId = new Map(prev.map((i) => [i.courseId, i]));
        return dtos.map((d) => normalizeDTO(d, byId.get(String(d.courseId))));
      });
    } catch (e) {
      console.warn("[wishlist] backend sync failed, falling back to local", e);
    } finally {
      setLoading(false);
    }
  }, [isStudent]);

  // Sync once per login; clear cache on logout
  useEffect(() => {
    if (!user) {
      syncedForUser.current = null;
      return;
    }
    if (!isStudent) return;
    if (syncedForUser.current === user.id) return;
    syncedForUser.current = user.id;
    void refreshWishlist();
  }, [user, isStudent, refreshWishlist]);

  // Optimistically add locally and then sync via backend toggle.
  // The backend exposes only list/status/toggle, so add may call toggle when needed.
  const addToWishlist = useCallback(
    async (item: WishlistItem) => {
      const normalized: WishlistItem = { ...item, courseId: String(item.courseId) };
      const already = items.some((i) => i.courseId === normalized.courseId);
      if (!already) setItems((prev) => [...prev, normalized]);
      if (!isStudent) return;
      try {
        const res = await wishlistService.add(normalized.courseId);
        if (!res) {
          setItems((prev) => prev.filter((i) => i.courseId !== normalized.courseId));
        }
      } catch (e) {
        console.warn("[wishlist] add failed", e);
        if (!already) setItems((prev) => prev.filter((i) => i.courseId !== normalized.courseId));
      }
    },
    [isStudent, items]
  );

  // Optimistically remove locally and then call toggle backend to un-wishlist.
  // No DELETE endpoint exists, so remove is a toggle-only operation.
  const removeFromWishlist = useCallback(
    async (courseId: string) => {
      const id = String(courseId);
      const snapshot = items;
      setItems((prev) => prev.filter((i) => i.courseId !== id));
      if (!isStudent) return;
      try {
        const res = await wishlistService.remove(id);
        if (res.wishlisted) {
          setItems(snapshot);
        }
      } catch (e) {
        console.warn("[wishlist] remove failed", e);
        setItems(snapshot);
      }
    },
    [isStudent, items]
  );

  const toggleWishlist = useCallback(
    async (item: WishlistItem) => {
      const id = String(item.courseId);
      const present = items.some((i) => i.courseId === id);
      if (present) {
        await removeFromWishlist(id);
        return false;
      }
      await addToWishlist(item);
      return true;
    },
    [items, addToWishlist, removeFromWishlist]
  );

  const isInWishlist = useCallback(
    (courseId: string) => items.some((item) => item.courseId === String(courseId)),
    [items]
  );

  const clearWishlist = useCallback(async () => {
    const snapshot = items;
    setItems([]);
    if (!isStudent) return;
    try {
      // Clearing will remove each course through the toggle-only endpoint.
      await Promise.all(snapshot.map((i) => wishlistService.remove(i.courseId)));
    } catch (e) {
      console.warn("[wishlist] clear failed", e);
      void refreshWishlist();
    }
  }, [items, isStudent, refreshWishlist]);

  const value = useMemo<WishlistContextType>(
    () => ({
      items,
      itemCount: items.length,
      loading,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      isInWishlist,
      clearWishlist,
      refreshWishlist,
    }),
    [
      items,
      loading,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      isInWishlist,
      clearWishlist,
      refreshWishlist,
    ]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used within WishlistProvider");
  return context;
};
