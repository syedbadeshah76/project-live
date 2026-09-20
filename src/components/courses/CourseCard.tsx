import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, Clock, Users, BookOpen } from "lucide-react";
import { Course } from "@/data/courses";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatPrice } from "@/lib/utils";
import { instructorsService } from "@/services/instructors.service";
import { reviewsService } from "@/services/reviews.service";
import { enrollmentService } from "@/services/enrollment.service";

interface CourseCardProps {
  course: Course;
  index?: number;
  showType?: boolean;
  /** Pre-fetched set of enrolled courseIds — avoids per-card API calls */
  enrolledCourseIds?: Set<string>;
}

export const CourseCard = ({ course, index = 0, enrolledCourseIds }: CourseCardProps) => {
  const levelColors = {
    Beginner: "bg-green-100 text-green-700 border-green-200",
    Intermediate: "bg-blue-100 text-blue-700 border-blue-200",
    Advanced: "bg-purple-100 text-purple-700 border-purple-200",
  };
  const { addToCart, isInCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [resolvedInstructorName, setResolvedInstructorName] = useState<string>("");
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    // If enrolledCourseIds were passed as a prop, use them directly (no API call)
    if (enrolledCourseIds) {
      setIsEnrolled(enrolledCourseIds.has(String(course.id)));
      return;
    }

    // Otherwise, fetch enrollment status for this specific course if user is logged in
    if (!isAuthenticated || !course.id) return;
    let cancelled = false;
    enrollmentService
      .checkEnrollment(String(course.id))
      .then((res) => {
        if (!cancelled && res?.data?.isEnrolled) {
          setIsEnrolled(true);
        }
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [course.id, isAuthenticated, enrolledCourseIds]);

  useEffect(() => {
    let cancelled = false;

    // 1. Resolve Instructor Name via instructorsService
    const rawInstructor =
      typeof course.instructor === "object"
        ? (course.instructor as any)?.name
        : (course as any).instructorName || course.instructor;
    const instId =
      (course as any).instructorId ||
      (course as any).instructorUserId ||
      (typeof course.instructor === "object" ? (course.instructor as any)?.userId || (course.instructor as any)?.id : undefined);

    instructorsService
      .list()
      .then((list) => {
        if (cancelled) return;
        const targetId = String(instId || "").trim();
        const targetRaw = String(rawInstructor || "").trim();
        const match = list.find(
          (i) =>
            (targetId && (String(i.id) === targetId || String(i.userId) === targetId)) ||
            (targetRaw && (String(i.id) === targetRaw || String(i.userId) === targetRaw)) ||
            (targetRaw && targetRaw !== "Instructor" && i.name.toLowerCase().includes(targetRaw.toLowerCase()))
        );
        if (match && match.name) {
          setResolvedInstructorName(match.name);
        } else if (targetRaw && !targetRaw.startsWith("inst-") && !targetRaw.startsWith("user-") && targetRaw.toLowerCase() !== "instructor") {
          setResolvedInstructorName(targetRaw);
        } else {
          setResolvedInstructorName("Instructor");
        }
      })
      .catch(() => {
        if (!cancelled && rawInstructor && !rawInstructor.startsWith("inst-") && rawInstructor !== "Instructor") {
          setResolvedInstructorName(rawInstructor);
        }
      });

    // 2. Fetch Review Summary & Review Count via reviewsService
    if (course.id) {
      reviewsService
        .getReviewSummary(course.id)
        .then((res) => {
          if (cancelled) return;
          if (res?.success && res.data) {
            setReviewCount(res.data.totalReviews ?? 0);
            if (typeof res.data.avgRating === "number" && res.data.avgRating > 0) {
              setAvgRating(res.data.avgRating);
            }
          }
        })
        .catch(() => {
          reviewsService
            .getByCourse(course.id)
            .then((res) => {
              if (cancelled) return;
              const list = Array.isArray(res?.data) ? res.data : [];
              setReviewCount(list.length);
            })
            .catch(() => {
              if (!cancelled) {
                setReviewCount((course as any).reviewCount ?? 0);
              }
            });
        });
    }

    return () => {
      cancelled = true;
    };
  }, [course.id, course.instructor, (course as any).instructorId, (course as any).reviewCount]);

  const rawInst =
    resolvedInstructorName ||
    (typeof course.instructor === "object"
      ? (course.instructor as any)?.name
      : (course as any).instructorName || course.instructor) ||
    "";

  const displayInstructorText = (() => {
    const trimmed = String(rawInst || "").trim();
    if (!trimmed || trimmed.toLowerCase() === "instructor") {
      return "Instructor";
    }
    if (trimmed.toLowerCase().includes("instructor")) {
      return trimmed;
    }
    return `${trimmed}, Instructor`;
  })();

  const displayReviewCount =
    reviewCount !== null
      ? reviewCount
      : typeof (course as any).reviewCount === "number"
        ? (course as any).reviewCount
        : 0;

  const displayRating =
    avgRating !== null ? avgRating : typeof course.rating === "number" ? course.rating : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Link
        to={`/courses/${course.id}`}
        state={{ isLive: !!((course as any).courseType === "LIVE" || (course as any).isLive || (course as any).type === "LIVE") }}
        className="block group"
      >
        <div className="bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 h-full flex flex-col">
          {/* Thumbnail */}
          <div className="relative aspect-video overflow-hidden">
            <img
              src={course.thumbnail}
              alt={course.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            {/* Live / Recorded Badge Overlay */}
            {((course as any).courseType === "LIVE" || (course as any).isLive || (course as any).type === "LIVE") ? (
              <Badge className="absolute top-3 left-3 bg-white/95 text-primary border border-primary/20 backdrop-blur-sm text-xs font-semibold px-2.5 py-0.5 shadow-sm z-10">
                Live
              </Badge>
            ) : (
              <Badge className="absolute top-3 left-3 bg-white/95 text-sky-700 border border-sky-200 backdrop-blur-sm text-xs font-semibold px-2.5 py-0.5 shadow-sm z-10">
                Recorded
              </Badge>
            )}
          </div>

          {/* Content */}
          <div className="p-5 flex-1 flex flex-col">
            <p className="text-sm text-primary font-medium mb-2">
              {typeof course.category === "object"
                ? (course.category as any)?.name
                : course.category}
            </p>
            <h3 className="font-display font-semibold text-lg text-card-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
              {course.title}
            </h3>

            {/* Stats */}
            <div className="flex items-center justify-between mb-4">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground truncate">
                  {displayInstructorText}
                </p>
              </div>

              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {course.level || (course as any).difficulty || "Beginner"}
              </span>
            </div>
            {/* -------------------------------------------------- */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-sm">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span className="font-semibold text-card-foreground">
                  {displayRating.toFixed(1)}
                </span>
                <span className="text-muted-foreground">
                  ({displayReviewCount.toLocaleString()})
                </span>
              </div>
              {(() => {
                const rawDisc = Number((course as any).discountedPrice ?? (course as any).discountPrice ?? 0);
                const rawPrice = Number(course.price ?? 0);
                const rawBase = Number((course as any).basePrice ?? 0);
                const effectivePrice = rawDisc > 0 ? rawDisc : rawPrice > 0 ? rawPrice : rawBase > 0 ? rawBase : 0;
                const courseCurrency = (course as any).currency || (course as any).currencyCode;
                const formattedPrice = effectivePrice > 0 ? formatPrice(effectivePrice, courseCurrency) : "Free";
                return (
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-sm text-card-foreground">
                      {formattedPrice}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Footer — conditional: enrolled vs not enrolled */}
            {(() => {
              const isLive = !!((course as any).courseType === "LIVE" || (course as any).isLive || (course as any).type === "LIVE");
              const targetProductId = String((course as any).productId || (course as any).product_id || (course as any).liveCourseId || course.id || "").trim();
              const rawDisc = Number((course as any).discountedPrice ?? (course as any).discountPrice ?? 0);
              const rawPrice = Number(course.price ?? 0);
              const rawBase = Number((course as any).basePrice ?? 0);
              const effectivePrice = rawDisc > 0 ? rawDisc : rawPrice > 0 ? rawPrice : rawBase > 0 ? rawBase : 0;
              const inCart = targetProductId ? isInCart(targetProductId) : isInCart(course.id);

              if (isEnrolled) {
                return (
                  <div className="pt-4 mt-auto border-t border-border">
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (isLive) {
                          navigate(`/courses/${course.id}`, { state: { isLive: true } });
                        } else {
                          navigate(`/learn/${course.id}`);
                        }
                      }}
                    >
                      {isLive ? "View Live Class" : "Continue Learning"}
                    </Button>
                  </div>
                );
              }

              if (effectivePrice <= 0) {
                return (
                  <div className="pt-4 mt-auto border-t border-border">
                    <Button
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!isAuthenticated) {
                          toast.info("Please log in to enroll");
                          navigate("/login");
                          return;
                        }
                        try {
                          await orderService.freeEnroll(course.id, targetProductId || course.id);
                          toast.success("Enrolled successfully!");
                          setIsEnrolled(true);
                        } catch {
                          toast.error("Failed to enroll");
                        }
                      }}
                    >
                      Enroll
                    </Button>
                  </div>
                );
              }

              return (
                <div className="pt-4 mt-auto border-t border-border">
                  <Button
                    className="w-full"
                    disabled={inCart}
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      if (!targetProductId) {
                        toast.error("Product ID not found for this course");
                        return;
                      }

                      await addToCart({
                        id: targetProductId,
                        productId: targetProductId,
                        courseId: course.id,
                        title: course.title,
                        thumbnail: course.thumbnail,
                        instructor:
                          typeof course.instructor === "object"
                            ? course.instructor?.name ?? ""
                            : course.instructor ?? "",
                        price: effectivePrice,
                        discountedPrice: effectivePrice,
                        originalPrice: (course as any).strikeOutPrice || (course as any).originalPrice || effectivePrice,
                        isLive,
                        productType: isLive ? "LIVE_COURSE" : "COURSE",
                      });
                    }}
                  >
                    {inCart ? "Added to Cart" : "Add To Cart"}
                  </Button>
                </div>
              );
            })()}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

