import React, { useRef, useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Play, Star, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { coursesService, type NormalizedCourse } from "@/services/courses.service";
import { enrollmentService } from "@/services/enrollment.service";
import { useCart } from "@/contexts/CartContext";

export interface HandPickedSectionProps {
  title?: string;
  limit?: number;
  excludeCourseId?: string;
  className?: string;
}

/** Small horizontal scroll carousel with arrows for general dashboard sections. */
export const HScroll = ({
  children,
  ariaLabel,
  controlsClassName = "",
  title,
  subHeader,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  controlsClassName?: string;
  title?: React.ReactNode;
  subHeader?: React.ReactNode;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const amount = Math.max(280, el.clientWidth * 0.85);
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  const navButtons = (
    <div className="flex items-center gap-2 shrink-0">
      <button
        type="button"
        onClick={() => scrollBy(-1)}
        className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full border border-border bg-card flex items-center justify-center text-foreground shadow-sm hover:bg-muted active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 shrink-0"
        aria-label="Scroll left"
      >
        <ChevronLeft className="h-4 w-4 shrink-0" />
      </button>
      <button
        type="button"
        onClick={() => scrollBy(1)}
        className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm hover:opacity-90 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 shrink-0"
        aria-label="Scroll right"
      >
        <ChevronRight className="h-4 w-4 shrink-0" />
      </button>
    </div>
  );

  return (
    <div className="relative">
      {title ? (
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-display text-lg md:text-xl font-semibold text-foreground">
            {title}
          </h2>
          {navButtons}
        </div>
      ) : (
        <div className={`absolute right-0 flex items-center gap-2 ${controlsClassName}`}>
          {navButtons}
        </div>
      )}

      {subHeader}

      <div
        ref={ref}
        aria-label={ariaLabel}
        className="flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </div>
  );
};

export const HandPickedSection: React.FC<HandPickedSectionProps> = ({
  title = "Hand Picked For You",
  limit,
  excludeCourseId,
  className = "mt-10",
}) => {
  const [courses, setCourses] = useState<NormalizedCourse[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { addToCart, isInCart } = useCart();

  const loadData = async () => {
    setLoading(true);
    setError(false);
    try {
      const [list, enrolledIds] = await Promise.all([
        coursesService.getHandPickedCourses(),
        enrollmentService.getEnrolledCourseIds().catch(() => new Set<string>()),
      ]);
      setCourses(list);
      setEnrolledCourseIds(enrolledIds);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter out excluded course if specified
  const baseCourses = useMemo(() => {
    return excludeCourseId
      ? courses.filter((c) => String(c.id) !== String(excludeCourseId))
      : courses;
  }, [courses, excludeCourseId]);

  // Extract dynamic category tabs from loaded courses
  const categoryTabs = useMemo(() => {
    const catMap = new Map<string, string>();
    baseCourses.forEach((c) => {
      if (c.categoryId && c.categoryName) {
        catMap.set(String(c.categoryId), c.categoryName);
      }
    });

    const tabs: Array<{ id: string; name: string }> = [
      { id: "all", name: "Related Courses" },
    ];

    catMap.forEach((name, id) => {
      tabs.push({ id, name });
    });

    return tabs;
  }, [baseCourses]);

  // Filter courses based on active category
  const categoryFilteredCourses = useMemo(() => {
    if (activeCategory === "all") return baseCourses;
    return baseCourses.filter((c) => String(c.categoryId) === String(activeCategory));
  }, [baseCourses, activeCategory]);

  const filteredCourses = typeof limit === "number" && limit > 0
    ? categoryFilteredCourses.slice(0, limit)
    : categoryFilteredCourses;

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = Math.max(260, el.clientWidth * 0.85);
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  return (
    <section className={className}>
      {/* Header with Title and Navigation Arrows */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="font-display text-lg md:text-xl font-semibold text-foreground">
          {title}
        </h2>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full border border-border bg-card flex items-center justify-center text-foreground shadow-sm hover:bg-muted active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 shrink-0"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm hover:opacity-90 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 shrink-0"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4 shrink-0" />
          </button>
        </div>
      </div>

      {/* Category Navigation Tabs (Figma structure) */}
      {!loading && !error && categoryTabs.length > 1 && (
        <div className="flex items-center gap-6 overflow-x-auto pb-1 mb-6 scrollbar-none">
          {categoryTabs.map((tab) => {
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id)}
                className={`pb-2 text-sm whitespace-nowrap transition-colors relative font-medium ${
                  isActive
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.name}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="shrink-0 w-[240px] sm:w-[260px] bg-card rounded-2xl border border-border p-3 space-y-3 animate-pulse"
            >
              <div className="aspect-video bg-muted rounded-xl" />
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-8 bg-muted rounded w-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-sm font-medium text-foreground">Failed to load recommendations</p>
          <Button variant="outline" size="sm" onClick={loadData} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No courses available
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {filteredCourses.map((c) => {
            const isEnrolled = enrolledCourseIds.has(String(c.id));
            const targetProductId = String(c.productId || c.product_id || c.id || "").trim();
            const inCart = targetProductId ? isInCart(targetProductId) : isInCart(c.id);
            const formattedPrice = c.price > 0 ? `₹${c.price}` : "Free";
            const isLiveCourse = !!(c.isLive || c.courseType === "LIVE");

            // Format instructor name dynamically (e.g. "Dr. Angela Yu, Instructor")
            const displayInstructor = (() => {
              const name = (c.instructorName || "").trim();
              if (!name || name.toLowerCase() === "instructor") return "";
              if (name.toLowerCase().includes("instructor")) return name;
              return `${name}, Instructor`;
            })();

            return (
              <div
                key={c.id}
                className="snap-start shrink-0 w-[240px] sm:w-[260px] bg-card rounded-2xl border border-border overflow-hidden flex flex-col hover:shadow-md hover:border-primary/40 transition-all"
              >
                {/* Course Thumbnail */}
                <Link to={`/courses/${c.id}`} state={{ isLive: isLiveCourse }} className="block">
                  <div className="aspect-video bg-muted overflow-hidden relative">
                    <img
                      src={c.thumbnailUrl || "/placeholder.svg"}
                      alt={c.title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </Link>

                <div className="p-3 flex-1 flex flex-col">
                  {/* Row 1: Course Title */}
                  <Link to={`/courses/${c.id}`} state={{ isLive: isLiveCourse }}>
                    <h3 className="text-sm font-semibold text-card-foreground line-clamp-2 mb-1.5 hover:text-primary transition-colors">
                      {c.title}
                    </h3>
                  </Link>

                  {/* Row 2: Instructor + Lesson Count — SAME ROW */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5 min-h-[16px]">
                    {displayInstructor ? (
                      <span className="truncate mr-2">{displayInstructor}</span>
                    ) : (
                      <span />
                    )}
                    <span className="flex items-center gap-1 shrink-0">
                      <Play className="h-3 w-3 fill-muted-foreground" />
                      {c.totalLessons} {c.totalLessons === 1 ? "Lesson" : "Lessons"}
                    </span>
                  </div>

                  {/* Row 3: Rating + Price — SAME ROW, NO STRIKE-OUT PRICE */}
                  <div className="flex items-center justify-between text-xs mb-3 mt-auto">
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                      <span className="font-semibold text-card-foreground">
                        {c.avgRating.toFixed(1)}
                      </span>
                      <span className="text-muted-foreground">
                        ({(c.totalReviews ?? c.reviewCount ?? 0).toLocaleString()})
                      </span>
                    </div>
                    <span className="font-semibold text-foreground">
                      {formattedPrice}
                    </span>
                  </div>

                  {/* Row 4: Action Button (Continue Learning / Add To Cart) */}
                  {isEnrolled ? (
                    <Button
                      asChild
                      size="sm"
                      className="w-full h-8 text-xs bg-green-600 hover:bg-green-700 text-white font-medium gap-1"
                    >
                      <Link to={`/dashboard/learn/${c.id}`}>
                        <Play className="h-3 w-3 fill-current" /> Continue Learning
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full h-8 text-xs font-medium"
                      disabled={inCart}
                      onClick={async () => {
                        if (!targetProductId) {
                          if (import.meta.env.DEV) {
                            console.error("[Handpicked] Missing product_id for course:", c);
                          }
                          toast.error("Unable to add to cart. Product information is missing.");
                          return;
                        }

                        await addToCart({
                          id: targetProductId,
                          productId: targetProductId,
                          courseId: c.id,
                          title: c.title,
                          instructor: c.instructorName,
                          price: c.price,
                          discountedPrice: c.price,
                          originalPrice: c.price,
                          rating: c.avgRating,
                          reviews: c.totalReviews ?? c.reviewCount ?? 0,
                          thumbnail: c.thumbnailUrl,
                          isLive: isLiveCourse,
                          productType: isLiveCourse ? "LIVE_COURSE" : "COURSE",
                        });
                      }}
                    >
                      {inCart ? "In Cart" : "Add To Cart"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default HandPickedSection;
