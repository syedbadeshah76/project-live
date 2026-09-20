// src/pages/dashboard/Wishlist.tsx
import { useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useWishlist, type WishlistItem } from "@/contexts/WishlistContext";
import { useCart } from "@/contexts/CartContext";
import { ChevronLeft, ChevronRight, Heart, Loader2, Star, X } from "lucide-react";
import { toast } from "sonner";

const Wishlist = () => {
  const { items, loading, removeFromWishlist } = useWishlist();
  const { addToCart, isInCart } = useCart();

  // Group items by category
  const grouped = useMemo(() => {
    return items.reduce<Record<string, WishlistItem[]>>((acc, item) => {
      const key = item.category || "Other";
      (acc[key] ||= []).push(item);
      return acc;
    }, {});
  }, [items]);

  const handleAddToCart = async (item: WishlistItem) => {
    try {
      const targetProductId = (item as any).productId || item.courseId;
      await addToCart({
        id: targetProductId,
        productId: targetProductId,
        courseId: item.courseId,
        title: item.title,
        thumbnail: item.thumbnail,
        instructor: item.instructor,
        price: item.price,
        discountedPrice: item.discountedPrice,
      });
      toast.success("Added to cart!");
    } catch {
      toast.error("Could not add to cart");
    }
  };

  const handleRemove = async (courseId: string) => {
    try {
      await removeFromWishlist(courseId);
      toast.success("Removed from wishlist");
    } catch {
      toast.error("Could not remove from wishlist");
    }
  };

  if (loading && items.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <div className="flex max-w-sm flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Heart className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Your wishlist is empty</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Save courses you're interested in for later.
          </p>
          <Button asChild className="mt-5">
            <Link to="/courses">Browse Courses</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 md:px-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Wishlist</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Save courses you're interested in for later.
        </p>
      </div>

      {/* Category sections */}
      <div className="space-y-10">
        {Object.entries(grouped).map(([category, courses]) => (
          <CategorySection
            key={category}
            category={category}
            courses={courses}
            onRemove={handleRemove}
            onAddToCart={handleAddToCart}
            isInCart={isInCart}
          />
        ))}
      </div>
    </div>
  );
};

interface CategorySectionProps {
  category: string;
  courses: WishlistItem[];
  onRemove: (courseId: string) => void;
  onAddToCart: (item: WishlistItem) => void;
  isInCart: (courseId: string) => boolean;
}

const CategorySection = ({
  category,
  courses,
  onRemove,
  onAddToCart,
  isInCart,
}: CategorySectionProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <section>
      {/* Section header */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">{category}</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label="Scroll left"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label="Scroll right"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:bg-primary/90"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Horizontal scroller */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {courses.map((item) => (
          <CourseCard
            key={item.courseId}
            item={item}
            onRemove={onRemove}
            onAddToCart={onAddToCart}
            inCart={isInCart(item.courseId)}
          />
        ))}
      </div>
    </section>
  );
};

interface CourseCardProps {
  item: WishlistItem;
  onRemove: (courseId: string) => void;
  onAddToCart: (item: WishlistItem) => void;
  inCart: boolean;
}

const CourseCard = ({ item, onRemove, onAddToCart, inCart }: CourseCardProps) => {
  return (
    <article className="group w-[240px] shrink-0 overflow-hidden rounded-lg border border-border bg-card">
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : null}
        <button
          type="button"
          onClick={() => onRemove(item.courseId)}
          aria-label="Remove from wishlist"
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-card/90 text-foreground opacity-0 backdrop-blur-sm transition hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="p-3">
        <Link
          to={`/courses/${item.courseId}`}
          className="line-clamp-2 text-sm font-semibold text-foreground hover:underline"
        >
          {item.title}
        </Link>

        {/* Instructor + lessons */}
        <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate">{item.instructor}</span>
          <span className="shrink-0">{item.lessons ?? 12} Lessons</span>
        </div>

        {/* Rating + price */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            <span className="font-medium text-foreground">{item.rating}</span>
            <span>({item.reviewsCount ?? item.students})</span>
          </div>
          <div className="text-sm font-bold text-foreground">
            ${item.discountedPrice ?? item.price}
          </div>
        </div>

        {/* CTA */}
        <Button
          onClick={() => onAddToCart(item)}
          disabled={inCart}
          className="mt-3 h-9 w-full rounded-md text-xs font-semibold"
        >
          {inCart ? "In Cart" : "Add To Cart"}
        </Button>
      </div>
    </article>
  );
};

export default Wishlist;
