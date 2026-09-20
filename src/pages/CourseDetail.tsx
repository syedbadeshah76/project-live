import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";

import { MainLayout } from "@/components/layout/MainLayout";
import { StudentChromeLayout } from "@/components/dashboard/StudentChromeLayout";
import { HandPickedSection } from "@/components/dashboard/HandPickedSection";
import { coursesService } from "@/services/courses.service";
import { enrollmentService } from "@/services/enrollment.service";
import { instructorsService } from "@/services/instructors.service";
import { reviewsService, type CourseReview } from "@/services/reviews.service";
import { orderService } from "@/services/order.service";
import { demoClassService, parseDemoDate } from "@/services/demoClass.service";
import type { DemoClassItem } from "@/types/demoClass";
import { BookFreeDemoModal } from "@/components/courses/BookFreeDemoModal";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/utils";
import { useWishlist } from "@/contexts/WishlistContext";
import { useGiftCheckout } from "@/contexts/GiftCheckoutContext";
import type { GiftCourseItem } from "@/types/gift.types";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MdIosShare } from "react-icons/md";
import { BsStopwatch } from "react-icons/bs";
// import { FaCheck } from "react-[#1E52D6]"; // or fa6
import { FaCheck as FaCheckIcon } from "react-icons/fa6";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import {
  Star,
  ArrowLeft,
  Heart,
  FileText,
  Clock,
  Layers,
  Calendar,
  Award,
  ChevronUp,
  ChevronDown,
  Play,
  Lock,
  X,
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  BookOpen,
  Gift,
  Loader2,
} from "lucide-react";
import type { Course } from "@/types/api.types";

type Lesson = {
  id: string;
  title: string;
  duration: string;
  videoDurationSeconds?: number;
  videoUrl?: string;
  isFreePreview?: boolean;
  previewEnabled?: boolean;
};
type Module = {
  id: string;
  title: string;
  duration: string;
  lessons: Lesson[];
};

const formatDuration = (seconds?: number) => {
  if (!seconds || seconds <= 0) return "0min";
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}min` : `${h}h`;
};

const normalizeCurriculum = (sections: any[]): Module[] => {
  if (!Array.isArray(sections)) return [];
  return sections.map((s: any, mi: number) => {
    const lessons = (s.lessons ?? s.items ?? []).map((l: any) => ({
      id: String(l.id ?? l.lessonId ?? ""),
      title: l.title ?? "",
      duration: formatDuration(
        l.videoDurationSeconds ?? (l.durationMinutes ? l.durationMinutes * 60 : undefined) ?? l.duration,
      ),
      videoDurationSeconds: l.videoDurationSeconds ?? (l.durationMinutes ? l.durationMinutes * 60 : undefined),
      videoUrl: l.videoUrl,
      previewEnabled: !!(l.previewEnabled || l.isPreview || l.isFreePreview),
      isFreePreview: !!(l.previewEnabled || l.isPreview || l.isFreePreview),
    }));
    const totalSec = lessons.reduce(
      (sum: number, l: any) => sum + (l.videoDurationSeconds || 0),
      0,
    );
    const modSec = s.durationMinutes ? s.durationMinutes * 60 : totalSec;
    return {
      id: String(s.id ?? s.moduleId ?? `m-${mi}`),
      title: `${String(mi + 1).padStart(2, "0")}: ${s.title ?? "Module"}`,
      duration: formatDuration(modSec || totalSec),
      lessons,
    };
  });
};

const StarRow = ({ rating, size = 4 }: { rating: number; size?: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        className={`h-${size} w-${size} ${
          i <= Math.round(rating)
            ? "fill-[#1E52D6] text-[#1E52D6]"
            : "text-muted-foreground/30"
        }`}
      />
    ))}
  </div>
);

const StarInput = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((i) => (
      <button
        key={i}
        type="button"
        onClick={() => onChange(i)}
        aria-label={`${i} stars`}
      >
        <Star
          className={`h-6 w-6 ${
            i <= value
              ? "fill-[#1E52D6] text-[#1E52D6]"
              : "text-muted-foreground/40"
          }`}
        />
      </button>
    ))}
  </div>
);

const unwrap = <T,>(res: any): T => {
  if (res == null) return res;
  if (Array.isArray(res)) return res as T;
  if (res.data !== undefined) return res.data as T;
  return res as T;
};

const CourseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const { addToCart, isInCart, currency: cartCurrency } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { setSelectedCourses } = useGiftCheckout();
  const navigate = useNavigate();
  const { toast } = useToast();
  const Layout =
    isAuthenticated && user?.role === "student"
      ? StudentChromeLayout
      : MainLayout;

  const [course, setCourse] = useState<Course | null>(null);
  const [resolvedInstructorName, setResolvedInstructorName] = useState("");
  const [loadingCourse, setLoadingCourse] = useState(true);
  const [curriculum, setCurriculum] = useState<Module[]>([]);
  const [relatedCourses, setRelatedCourses] = useState<Course[]>([]);
  const [instructorOtherCourses, setInstructorOtherCourses] = useState<
    Course[]
  >([]);

  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollmentCount, setEnrollmentCount] = useState<number | null>(null);
  const [loadingEnrollmentCount, setLoadingEnrollmentCount] = useState(false);
  const [openModule, setOpenModule] = useState<number | null>(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null);

  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [reviewsVisible, setReviewsVisible] = useState(2);
  const [summary, setSummary] = useState<{ avg: number; total: number } | null>(
    null,
  );
  const [myReview, setMyReview] = useState<CourseReview | null>(null);
  const [draftRating, setDraftRating] = useState(5);
  const [draftText, setDraftText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [writeOpen, setWriteOpen] = useState(false);

  const [hasBookedDemo, setHasBookedDemo] = useState<boolean>(() => {
    try {
      if (!id) return false;
      return localStorage.getItem(`demo_booked_${id}`) === "true";
    } catch {
      return false;
    }
  });
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [demoClasses, setDemoClasses] = useState<DemoClassItem[]>(() => {
    try {
      if (!id) return [];
      const cached = localStorage.getItem(`demo_classes_${id}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loadingDemoClasses, setLoadingDemoClasses] = useState(false);
  const [joiningDemo, setJoiningDemo] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [selectedDay, setSelectedDay] = useState<string>("MON");
  const [selectedTime, setSelectedTime] = useState<string>("10:30 AM");
  const [isAddedToCart, setIsAddedToCart] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (id && localStorage.getItem(`demo_booked_${id}`) === "true") {
      setHasBookedDemo(true);
    }
  }, [id]);

  const loadDemoClasses = useCallback(async () => {
    if (!id) return;
    setLoadingDemoClasses(true);
    try {
      const list = await demoClassService.getDemoClassesByCourse(id);
      if (Array.isArray(list)) {
        setDemoClasses(list);
        try {
          localStorage.setItem(`demo_classes_${id}`, JSON.stringify(list));
        } catch {}
        const anyBooked = list.some((d) => d.booked);
        if (anyBooked) {
          setHasBookedDemo(true);
          localStorage.setItem(`demo_booked_${id}`, "true");
        }
      }
    } catch (err) {
      console.error("Failed to load demo classes for course:", err);
    } finally {
      setLoadingDemoClasses(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadDemoClasses();
    }
  }, [id, loadDemoClasses]);

  const recRef = useRef<HTMLDivElement>(null);

  const isStudent = user?.role === "student";
  const isAdminOrInstructor = isAuthenticated && !isStudent;
  const wishlisted = id ? isInWishlist(id) : false;

  const location = useLocation();
  const isLiveHint = !!(location.state?.isLive || location.state?.courseType === "LIVE" || location.state?.courseType === "Live Course");

  /* ---- Load course detail ---- */
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoadingCourse(true);
    setResolvedInstructorName("");
    coursesService
      .getCourse(id, isLiveHint)
      .then((res: any) => {
        if (cancelled) return;
        let data: any = null;
        if (res?.success && res.data) {
          data = res.data;
        } else if (res?.id || res?.title) {
          data = res;
        }
        setCourse(data);
        if (data?.modules && Array.isArray(data.modules) && data.modules.length > 0) {
          setCurriculum(normalizeCurriculum(data.modules));
        }
      })
      .catch(() => !cancelled && setCourse(null))
      .finally(() => !cancelled && setLoadingCourse(false));
    return () => {
      cancelled = true;
    };
  }, [id, isLiveHint]);

  useEffect(() => {
    if (!course) return;
    const c: any = course;
    const instructorUserId =
      c.instructorUserId ??
      c.instructorId ??
      (typeof c.instructor === "object" ? c.instructor?.userId ?? c.instructor?.id : c.instructor);

    if (!instructorUserId) return;

    let cancelled = false;
    instructorsService
      .list()
      .then((instructors) => {
        if (cancelled) return;
        const instructor = instructors.find(
          (i) =>
            String(i.userId) === String(instructorUserId) ||
            String(i.id) === String(instructorUserId),
        );
        setResolvedInstructorName(instructor?.name ?? "");
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [course]);

  /* ---- Load curriculum (modules + lessons) ---- */
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    coursesService
      .getCourseCurriculum(id)
      .then(async (res: any) => {
        const sections = res?.data ?? res ?? [];
        if (Array.isArray(sections) && sections.length > 0) {
          // If lessons are not embedded, fetch per module
          const enriched = await Promise.all(
            sections.map(async (s: any) => {
              if (s.lessons?.length) return s;
              try {
                const lRes: any = await coursesService.getLessonsByModule(
                  s.id ?? s.moduleId,
                );
                return { ...s, lessons: lRes?.data ?? lRes ?? [] };
              } catch {
                return { ...s, lessons: [] };
              }
            }),
          );
          if (!cancelled) setCurriculum(normalizeCurriculum(enriched));
        }
      })
      .catch(() => {
        /* Keep curriculum intact if course.modules was already loaded */
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  /* ---- Enrollment check ---- */
  useEffect(() => {
    if (!id || !isAuthenticated || !isStudent) return;
    enrollmentService
      .checkEnrollment(id)
      .then((res: any) => {
        if (res?.success) setIsEnrolled(!!res.data?.isEnrolled);
      })
      .catch(() => {});
  }, [id, isAuthenticated, isStudent]);

  /* ---- Load enrollment count ---- */
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoadingEnrollmentCount(true);
    enrollmentService
      .getCourseEnrollmentCount(id)
      .then((res: any) => {
        if (cancelled) return;
        const count = typeof res?.data?.count === "number" ? res.data.count : null;
        setEnrollmentCount(count);
      })
      .catch(() => {
        if (!cancelled) setEnrollmentCount(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingEnrollmentCount(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  /* ---- Reviews + summary ---- */
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    reviewsService
      .getByCourse(id)
      .then((res: any) => {
        if (cancelled) return;
        const response = unwrap<any>(res);

        const list = Array.isArray(response)
          ? response
          : response
          ? [response]
          : [];

        // normalize field names coming from backend
        const normalized = list.map((r: any) => ({
          id: String(r.id ?? r.reviewId),
          userId: r.userId,
          userName: r.userName ?? r.user?.name ?? "Student",
          userAvatar: r.userAvatar ?? r.user?.avatar,
          rating: Number(r.rating ?? 0),
          reviewText: r.reviewText ?? r.text ?? "",
          createdAt: r.createdAt ?? new Date().toISOString(),
          helpfulCount: Number(r.helpfulCount ?? r.helpful ?? 0),
          notHelpfulCount: Number(r.notHelpfulCount ?? 0),
          userCurrentVote: r.userCurrentVote ?? "NONE",
          courseId: r.courseId,
          courseName: r.courseName,
          status: r.status,
        }));

        setReviews(normalized);
      })
      .catch(() => !cancelled && setReviews([]));
  }, [id]);

  useEffect(() => {
    if (!course) return;
    const instructorId =
      (course as any).instructorId ?? (course as any).instructor?.id;
    if (!instructorId) return;
    coursesService
      .getCourses({ instructorId } as any)
      .then((res: any) => {
        const data = res?.data ?? res ?? [];
        const list = (Array.isArray(data) ? data : []).filter(
          (c: any) => String(c.id) !== String(course.id),
        );
        setInstructorOtherCourses(list);
      })
      .catch(() => setInstructorOtherCourses([]));
  }, [course]);

  useEffect(() => {
    if (!course) return;
    const cObj: any = course;
    const targetPId = cObj.productId || cObj.product_id || cObj.id;
    const inCartStatus = Boolean(
      (targetPId && isInCart(targetPId)) || (cObj.id && isInCart(cObj.id))
    );
    setIsAddedToCart(inCartStatus);
  }, [course, isInCart]);

  const totalLectures = curriculum.reduce((s, m) => s + m.lessons.length, 0);

  const reviewStats = {
    avg:
      summary?.avg ??
      (reviews.length
        ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
        : ((course as any)?.rating ?? 0)),
    total: summary?.total ?? reviews.length,
  };

  /* ---------- Loading / not-found ---------- */
  if (loadingCourse) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
          <h1 className="text-2xl font-bold">Course not found</h1>
          <Button asChild>
            <Link to="/courses">Back to Courses</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const c: any = course;
  const isLive = !!(
    c.isLive === true ||
    c.isLive === "true" ||
    String(c.courseType || "").toUpperCase().includes("LIVE") ||
    String(c.type || "").toUpperCase().includes("LIVE") ||
    c.productType === "LIVE_COURSE" ||
    c.liveCourseStatus != null ||
    c.meetingPlatform != null ||
    c.sessionDays != null ||
    c.sessionStartTime != null ||
    (c.schedule && typeof c.schedule === "object" && Object.keys(c.schedule).length > 0) ||
    demoClasses.length > 0 ||
    isLiveHint
  );
  const courseType = c.courseType ?? (isLive ? "Live Course" : "Recorded Course");
  const moduleCount = Array.isArray(c.modules)
    ? c.modules.length
    : curriculum.length;

  const formatDayName = (d: string) => {
    const clean = d.trim().toUpperCase();
    const map: Record<string, string> = {
      MON: "Mon",
      MONDAY: "Mon",
      TUE: "Tue",
      TUES: "Tue",
      TUESDAY: "Tue",
      WED: "Wed",
      WEDNESDAY: "Wed",
      THU: "Thu",
      THUR: "Thu",
      THURS: "Thu",
      THURSDAY: "Thu",
      FRI: "Fri",
      FRIDAY: "Fri",
      SAT: "Sat",
      SATURDAY: "Sat",
      SUN: "Sun",
      SUNDAY: "Sun",
    };
    return map[clean] || (d.length > 3 ? `${d.slice(0, 3)}` : d);
  };

  const rawDays = c.schedule?.sessionDays || c.schedule?.daysOfWeek || ["MON", "WED", "FRI"];
  const daysArray = Array.isArray(rawDays)
    ? rawDays
    : typeof rawDays === "string"
    ? rawDays.split(",")
    : ["MON", "WED", "FRI"];
  const formattedDaysList = daysArray.map((d: string) => formatDayName(d)).filter(Boolean);
  const daysFormatted = formattedDaysList.join(", ");

  const rawOcc = c.occurrence;
  const occurrence = (() => {
    if (typeof rawOcc === "string" && rawOcc.trim()) {
      if (rawOcc.includes(",")) {
        return rawOcc.split(",").map((d) => formatDayName(d)).join(", ");
      }
      return rawOcc;
    }
    return isLive
      ? `${formattedDaysList.length || 3} Days / Week (${daysFormatted || "Mon, Wed, Fri"})`
      : "3 Days / Week";
  })();

  const certificate = c.certificate ?? "After Completion";
  const tagline = c.tagline ?? c.description;
  const rawDiscPrice = Number((c as any).discountedPrice ?? (c as any).discountPrice ?? 0);
  const rawPrice = Number(c.price ?? 0);
  const rawBasePrice = Number((c as any).basePrice ?? 0);
  const price = rawDiscPrice > 0 ? rawDiscPrice : rawPrice > 0 ? rawPrice : rawBasePrice > 0 ? rawBasePrice : 0;
  const originalPrice = Number(
    c.strikeOutPrice ?? c.originalPrice ?? (rawBasePrice > price ? rawBasePrice : Math.round(price * 1.2)),
  );
  const formattedPrice = price > 0 ? `₹${price}` : "Free";
  const strikePriceVal = (c as any).strikeOutPrice ?? (c as any).originalPrice;
  const formattedStrikePrice =
    strikePriceVal != null && Number(strikePriceVal) > price
      ? `₹${strikePriceVal}`
      : originalPrice > price
      ? `₹${originalPrice}`
      : null;

  const instructorName =
    resolvedInstructorName ||
    (typeof c.instructor === "object"
      ? c.instructor?.name
      : c.instructorName ?? "Instructor");
  const instructorAvatar =
    (typeof c.instructor === "object" && c.instructor?.avatar) ||
    c.instructorAvatar;
  const thumbnail = c.thumbnailUrl ?? c.thumbnail ?? "";
  const fallbackStudentsCount = Number(c.totalStudents ?? c.students ?? c.enrolledCount ?? 0);
  const studentsCount = enrollmentCount !== null ? enrollmentCount : fallbackStudentsCount;
  const totalMins = Number(c.totalDurationMinutes ?? c.totalDuration ?? c.durationMinutes ?? 0);
  const durationHours = c.duration ?? c.totalDurationHours ?? (totalMins > 0 ? Math.round((totalMins / 60) * 10) / 10 : 0);
  const durationDisplay = totalMins > 0
    ? (totalMins >= 60 ? `${(totalMins / 60).toFixed(1)} Hours` : `${totalMins} Mins`)
    : `${durationHours} Hours`;

  const learningOutcomes: string[] = c.learningOutcomes?.length
    ? c.learningOutcomes
    : [];
  const requirements: string[] = c.requirements?.length ? c.requirements : [];

  /* ---------- Actions ---------- */
  const targetProductId = (c as any).productId || (c as any).product_id || c.id;
  const isItemInCart = Boolean(
    (targetProductId && isInCart(targetProductId)) || (c?.id && isInCart(c.id))
  );

  const cartPayload = {
    id: targetProductId,
    productId: targetProductId,
    courseId: c.id,
    title: c.title,
    thumbnail,
    instructor: instructorName,
    price,
    discountedPrice: price,
    originalPrice,
    isLive,
    productType: isLive ? ("LIVE_COURSE" as const) : ("COURSE" as const),
    selectedSchedule: isLive ? { day: selectedDay, time: selectedTime } : undefined,
  };

  const bookedDemo =
    demoClasses.find((d) => d.booked) ||
    (hasBookedDemo && demoClasses.length > 0 ? demoClasses[0] : null) ||
    (demoClasses.length > 0 ? demoClasses[0] : null);

  const isDemoLiveNow = (() => {
    if (!bookedDemo) return false;
    const start = parseDemoDate(
      bookedDemo.scheduledStartAt || (bookedDemo as any).scheduledAt || (bookedDemo as any).scheduled_at
    );
    if (!start) return false;
    const durationMin = bookedDemo.durationMinutes || 90;
    const end = parseDemoDate(bookedDemo.scheduledEndAt) || (start + durationMin * 60 * 1000);
    // Live / available from 15 mins before start time until session end
    return currentTime >= start - 15 * 60 * 1000 && currentTime <= end;
  })();

  const handleJoinDemo = async (demoId?: string) => {
    const targetId = demoId || bookedDemo?.id;
    if (!targetId) {
      toast({ title: "Demo class not found", variant: "destructive" });
      return;
    }
    setJoiningDemo(true);
    try {
      const res = await demoClassService.joinDemoClass(targetId);
      const joinUrl =
        res?.joinUrl ||
        res?.url ||
        (typeof res === "string" ? res : null) ||
        bookedDemo?.joinUrl;

      if (joinUrl && typeof joinUrl === "string" && joinUrl.startsWith("http")) {
        sonnerToast.success("Joining Demo Class...");
        window.open(joinUrl, "_blank", "noopener,noreferrer");
      } else {
        sonnerToast.warning("Wait for the instructor to join the meeting.", {
          description: "The instructor has not started the session yet. Please try again shortly.",
        });
        toast({
          title: "Please wait",
          description: "Wait for the instructor to join the meeting.",
        });
      }
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Wait for the instructor to join the meeting.";

      sonnerToast.warning("Wait for the instructor to join the meeting.", {
        description: errMsg.includes("instructor") ? errMsg : "Wait for the instructor to join the meeting.",
      });
      toast({
        title: "Instructor not joined yet",
        description: "Wait for the instructor to join the meeting.",
      });
    } finally {
      setJoiningDemo(false);
    }
  };

  const handleBookingSuccess = (demoClassId: string) => {
    if (id) {
      localStorage.setItem(`demo_booked_${id}`, "true");
    }
    try {
      const prevDemos = JSON.parse(localStorage.getItem("edvanz_booked_demos") || "[]");
      if (Array.isArray(prevDemos) && !prevDemos.includes(demoClassId)) {
        prevDemos.push(demoClassId);
        localStorage.setItem("edvanz_booked_demos", JSON.stringify(prevDemos));
      }
    } catch {}
    setHasBookedDemo(true);
    setDemoClasses((prev) =>
      prev.map((d) => (d.id === demoClassId ? { ...d, booked: true } : d))
    );
    loadDemoClasses();
  };

  const handleAddToCart = async () => {
    if (!targetProductId) {
      toast({
        title: "Product ID error",
        description: "Product ID not found for this course.",
        variant: "destructive",
      });
      return;
    }
    if (!isAuthenticated) {
      localStorage.setItem("edvanz_pending_cart", JSON.stringify(cartPayload));
      toast({
        title: "Please sign in",
        description: "Sign in to add courses to your cart.",
      });
      navigate("/login");
      return;
    }
    if (!isStudent) return;
    setIsAddedToCart(true);
    try {
      await addToCart(cartPayload);
    } catch (error) {
      setIsAddedToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!targetProductId) {
      toast({
        title: "Product ID error",
        description: "Product ID not found for this course.",
        variant: "destructive",
      });
      return;
    }
    if (!isAuthenticated) {
      localStorage.setItem("edvanz_pending_cart", JSON.stringify(cartPayload));
      toast({
        title: "Please sign in",
        description: "Sign in to purchase this course.",
      });
      navigate("/login");
      return;
    }
    if (!isStudent) return;
    setIsAddedToCart(true);
    try {
      await addToCart(cartPayload);
    } catch (error) {}
    navigate("/cart");
  };

  const handleFreeEnroll = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Please sign in",
        description: "Sign in to enroll in this course.",
      });
      navigate("/login");
      return;
    }
    if (!isStudent || !c) return;

    try {
      const order = await orderService.freeEnroll(c.id, targetProductId);
      if (order) {
        toast.success("You are enrolled! Start learning now.");
        setIsEnrolled(true);
      }
    } catch (error: any) {
      toast({
        title: "Enrollment failed",
        description: error?.message || "Could not enroll in the course.",
      });
    }
  };

  const handleToggleWishlist = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (wishlisted) {
      removeFromWishlist(c.id);
    } else {
      addToWishlist({
        id: `wish-${c.id}`,
        courseId: c.id,
        title: c.title,
        thumbnail,
        instructor: instructorName,
        price,
        rating: c.rating,
        students: studentsCount,
        level: c.level,
        category: c.category,
      });
    }
  };

  const handlePlayLesson = (lesson: Lesson | undefined, locked: boolean) => {
    if (!lesson) return;
    if (locked) {
      toast({ title: "Locked", description: "Enroll to unlock this lesson." });
      return;
    }
    setPreviewLesson(lesson);
    setPreviewOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!isAuthenticated || !user) {
      navigate("/login");
      return;
    }
    if (!draftText.trim()) {
      toast({ title: "Write something first" });
      return;
    }
    setSubmitting(true);
    try {
      const res: any = await reviewsService.addReview({
        courseId: c.id,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        rating: draftRating,
        text: draftText.trim(),
      });
      if (res.success) {
        const newReview = {
          id: String(res.data?.id ?? res.data?.reviewId ?? `review-${Date.now()}`),
          userId: user.id,
          userName: user.name ?? "Student",
          userAvatar: user.avatar,
          rating: draftRating,
          reviewText: draftText.trim(),
          createdAt: new Date().toISOString(),
          helpfulCount: 0,
          notHelpfulCount: 0,
          userCurrentVote: "NONE",
          courseId: c.id,
          courseName: c.title,
          status: "approved",
        };

        setReviews((prev) => [newReview, ...prev]);
        setDraftText("");
        setDraftRating(5);
        setWriteOpen(false);
        toast({
          title: "Review submitted",
          description: "Your review has been posted successfully.",
        });
      }
    } catch (e: any) {
      toast({
        title: "Error submitting review",
        description: "Failed to post your review. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const scrollRec = (dir: "left" | "right") => {
    if (!recRef.current) return;
    recRef.current.scrollBy({
      left: dir === "right" ? 300 : -300,
      behavior: "smooth",
    });
  };

  const handpicked = relatedCourses;

  return (
    <Layout>
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-4 md:py-6 overflow-x-hidden">
        <Link
          to="/courses"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Courses
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ============ LEFT COLUMN ============ */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6 min-w-0 w-full">
            {/* Video hero */}
            <div className="bg-card rounded-2xl overflow-hidden border border-border shadow-sm">
              <div className="relative aspect-video bg-muted">
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt={c.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 text-center">
                    <div className="max-w-md">
                      <h2 className="text-xl md:text-2xl font-bold mb-2">{c.title}</h2>
                      <p className="text-xs text-white/80 line-clamp-2">{tagline}</p>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <button
                    onClick={() => {
                      const promoUrl = (c as any).promoVideoUrl || (c as any).previewVideo;
                      if (promoUrl) {
                        handlePlayLesson(
                          { id: "promo", title: `${c.title} Preview`, videoUrl: promoUrl, previewEnabled: true, isFreePreview: true },
                          false,
                        );
                      } else {
                        handlePlayLesson(curriculum[0]?.lessons[0], false);
                      }
                    }}
                    className="flex flex-col items-center gap-2 group"
                    aria-label="Preview course"
                  >
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                      <Play className="h-6 w-6 sm:h-7 sm:w-7 text-primary fill-primary ml-1" />
                    </div>
                    <span className="text-white text-sm sm:text-base font-semibold drop-shadow">
                      Preview Course
                    </span>
                  </button>
                </div>
                <button
                  onClick={() => navigate("/courses")}
                  className="absolute top-3 right-3 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4 sm:p-5">
                <h1 className="text-xl sm:text-2xl font-display font-bold mb-2 break-words">
                  {c.title}
                </h1>
                <p className="text-muted-foreground text-xs sm:text-sm break-words">{tagline}</p>
              </div>
            </div>

            {/* Instructor + stats */}
            <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 bg-card rounded-2xl border border-border p-4 sm:p-5">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-10 w-10 sm:h-11 sm:w-11 shrink-0">
                  <AvatarImage src={instructorAvatar} />
                  <AvatarFallback>{instructorName.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="font-semibold text-sm sm:text-base truncate">{instructorName}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm">
                <span className="text-muted-foreground">
                  {loadingEnrollmentCount && enrollmentCount === null ? (
                    <span className="inline-block w-16 h-4 bg-muted animate-pulse rounded" />
                  ) : (
                    `Enrolled by ${studentsCount.toLocaleString()} Students`
                  )}
                </span>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-[#1E52D6] text-[#1E52D6]" />
                  <span className="font-semibold">
                    {reviewStats.avg.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">
                    ({reviewStats.total})
                  </span>
                </div>
              </div>
            </div>

            {/* About */}
            <section className="bg-card rounded-2xl border border-border p-4 sm:p-5">
              <h2 className="font-display text-base sm:text-lg font-bold mb-3">
                About Course
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4 break-words">
                <strong className="text-foreground">{c.title}</strong> —{" "}
                {c.description}
              </p>
              {learningOutcomes.length > 0 && (
                <div className="grid sm:grid-cols-2 gap-2">
                  {learningOutcomes.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs sm:text-sm">
                      <FaCheckIcon className="text-primary mt-1 shrink-0" />
                      <span className="break-words">{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Course Content */}
            <section className="bg-card rounded-2xl border border-border p-4 sm:p-5">
              <h2 className="font-display text-base sm:text-lg font-bold mb-1">
                Course Content
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                {totalLectures} Lectures · {durationDisplay} · {moduleCount}{" "}
                Modules
              </p>
              <div className="space-y-2">
                {curriculum.map((mod, mi) => {
                  const isOpen = openModule === mi;
                  const moduleLocked = !isEnrolled && mi > 0;
                  return (
                    <div
                      key={mod.id}
                      className="border border-border rounded-xl overflow-hidden"
                    >
                      <button
                        onClick={() => setOpenModule(isOpen ? null : mi)}
                        className="w-full flex items-center justify-between px-3.5 sm:px-4 py-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 text-left min-w-0 pr-2">
                          {moduleLocked && (
                            <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <span className="font-medium text-xs sm:text-sm truncate">{mod.title}</span>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground shrink-0">
                          <span>{mod.duration}</span>
                          {isOpen ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </button>
                      {isOpen && !moduleLocked && (
                        <div className="border-t border-border">
                          {mod.lessons.map((lesson) => {
                            const lessonLocked =
                              !isEnrolled && !lesson.isFreePreview;
                            return (
                              <button
                                key={lesson.id}
                                onClick={() =>
                                  handlePlayLesson(lesson, lessonLocked)
                                }
                                className="w-full flex items-center justify-between px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm hover:bg-muted/50 transition-colors text-left"
                              >
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                  {lessonLocked ? (
                                    <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                                  ) : (
                                    <Play className="h-4 w-4 text-primary shrink-0" />
                                  )}
                                  <span className="truncate">{lesson.title}</span>
                                  {lesson.isFreePreview && (
                                    <span className="text-[10px] font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded shrink-0">
                                      FREE
                                    </span>
                                  )}
                                </div>
                                <span className="text-muted-foreground text-xs shrink-0">
                                  {lesson.duration}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {!isEnrolled && (
                <p className="text-xs text-center text-muted-foreground mt-4">
                  Enroll to unlock the full course content
                </p>
              )}
            </section>

            {/* Requirements */}
            {requirements.length > 0 && (
              <section className="bg-card rounded-2xl border border-border p-4 sm:p-5">
                <h2 className="font-display text-base sm:text-lg font-bold mb-3">
                  Requirements
                </h2>
                <ul className="space-y-2 text-xs sm:text-sm">
                  {requirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span className="break-words">{req}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Reviews */}
            <section className="bg-card rounded-2xl border border-border p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h2 className="font-display text-base sm:text-lg font-bold">Testimonials</h2>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <StarRow rating={reviewStats.avg} />
                  <span className="font-semibold">
                    {reviewStats.avg.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">
                    ({reviewStats.total.toLocaleString()} reviews)
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {reviews.slice(0, reviewsVisible).map((r: any) => (
                  <div
                    key={r.id}
                    className="border border-border rounded-xl p-3.5 sm:p-4"
                  >
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-8 w-8 sm:h-9 sm:w-9 shrink-0">
                          <AvatarImage src={r.userAvatar} />
                          <AvatarFallback>
                            {r.userName?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs sm:text-sm truncate">{r.userName}</p>
                          <p className="text-[11px] sm:text-xs text-muted-foreground">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <StarRow rating={r.rating} />
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-3 break-words">
                      {r.reviewText || r.text}
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Helpful?</span>
                      <button
                        onClick={async () => {
                          if (!isAuthenticated) return navigate("/login");
                          try {
                            const res: any = await reviewsService.voteHelpful(r.id);
                            const data = unwrap<any>(res);
                            if (data) {
                              setReviews((prev) =>
                                prev.map((x: any) =>
                                  x.id === r.id
                                    ? {
                                        ...x,
                                        helpfulCount: data.helpfulCount ?? x.helpfulCount,
                                        notHelpfulCount: data.notHelpfulCount ?? x.notHelpfulCount,
                                        userCurrentVote: data.userCurrentVote ?? x.userCurrentVote,
                                      }
                                    : x,
                                ),
                              );
                            }
                          } catch (err: any) {
                            const msg = err?.response?.data?.message || err?.message || "Could not vote";
                            toast({ title: msg, variant: "destructive" });
                          }
                        }}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border ${
                          r.userCurrentVote === "HELPFUL"
                            ? "border-primary text-primary bg-primary/5"
                            : "border-border text-muted-foreground hover:text-primary hover:border-primary"
                        }`}
                      >
                        <ThumbsUp className="h-3 w-3" />
                        {r.helpfulCount ?? 0}
                      </button>
                      <button
                        onClick={async () => {
                          if (!isAuthenticated) return navigate("/login");
                          try {
                            const res: any = await reviewsService.voteNotHelpful(r.id);
                            if (res?.success) {
                              setReviews((prev) =>
                                prev.map((x: any) =>
                                  x.id === r.id ? { ...x, ...res.data } : x,
                                ),
                              );
                            }
                          } catch (err: any) {
                            const msg = err?.response?.data?.message || err?.message || "Could not vote";
                            toast({ title: msg, variant: "destructive" });
                          }
                        }}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border ${
                          r.userCurrentVote === "NOT_HELPFUL"
                            ? "border-destructive text-destructive bg-destructive/5"
                            : "border-border text-muted-foreground hover:text-destructive hover:border-destructive"
                        }`}
                      >
                        <ThumbsDown className="h-3 w-3" />
                        {r.notHelpfulCount ?? 0}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 mt-4">
                <Dialog open={writeOpen} onOpenChange={setWriteOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">Write a review</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Write a review</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-2">Your rating</p>
                        <StarInput
                          value={draftRating}
                          onChange={setDraftRating}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">Your review</p>
                        <Textarea
                          value={draftText}
                          onChange={(e) => setDraftText(e.target.value)}
                          placeholder="Share your experience..."
                          rows={5}
                        />
                      </div>
                      <Button
                        className="w-full"
                        onClick={handleSubmitReview}
                        disabled={submitting}
                      >
                        {submitting ? "Posting..." : "Post review"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {reviewsVisible < reviews.length && (
                  <button
                    onClick={() => setReviewsVisible((n) => n + 4)}
                    className="text-primary font-medium hover:underline text-xs sm:text-sm"
                  >
                    Show More
                  </button>
                )}
              </div>
            </section>

            {/* Instructor other courses */}
            {instructorOtherCourses.length > 0 && (
              <section className="bg-card rounded-2xl border border-border p-4 sm:p-5">
                <p className="text-xs sm:text-sm mb-4">
                  Featured courses by{" "}
                  <span className="text-primary font-semibold">
                    {instructorName}
                  </span>
                </p>
                <div className="space-y-2">
                  {instructorOtherCourses.slice(0, 4).map((oc: any) => (
                    <Link
                      key={oc.id}
                      to={`/courses/${oc.id}`}
                      className="flex items-center gap-3 p-2 rounded-xl border border-border hover:bg-muted/50 transition-colors min-w-0"
                    >
                      <img
                        src={oc.thumbnailUrl ?? oc.thumbnail}
                        alt={oc.title}
                        className="w-14 h-10 sm:w-16 sm:h-12 rounded object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium truncate">
                          {oc.title}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-[#1E52D6] text-[#1E52D6]" />
                            {oc.rating ?? 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {oc.lessons ?? oc.totalLessons ?? 0} Lessons
                          </span>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm font-bold shrink-0">
                        {formatPrice(Number(oc.basePrice ?? oc.price ?? 0), (oc as any)?.currency || cartCurrency)}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ============ RIGHT SIDEBAR ============ */}
          <aside className="lg:col-span-5 xl:col-span-4 space-y-4 lg:sticky lg:top-20 lg:self-start min-w-0 w-full">
            <div className="bg-card rounded-2xl border border-border p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm sm:text-base">This course includes</h3>
                <button aria-label="Share">
                  <MdIosShare className="text-primary h-5 w-5" />
                </button>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm">
                {[
                  { icon: FileText, label: "Course Type:", value: courseType },
                  {
                    icon: Clock,
                    label: "Duration:",
                    value: durationDisplay,
                  },
                  { icon: Layers, label: "Modules:", value: moduleCount },
                  { icon: Calendar, label: "Occurrence:", value: occurrence },
                  { icon: Award, label: "Certificate:", value: certificate },
                ].map((row) => (
                  <li
                    key={row.label}
                    className="flex items-start justify-between gap-2.5"
                  >
                    <span className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground shrink-0 pt-0.5">
                      <row.icon className="h-4 w-4 shrink-0" />
                      {row.label}
                    </span>
                    <span className="font-medium text-right break-words max-w-[60%] leading-snug">
                      {row.value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-card rounded-2xl border border-border p-4 sm:p-5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="text-xl sm:text-2xl font-bold text-primary truncate">
                    {formattedPrice}
                  </span>
                  {formattedStrikePrice && (
                    <span className="text-xs sm:text-sm text-muted-foreground line-through shrink-0">
                      {formattedStrikePrice}
                    </span>
                  )}
                </div>
                <button onClick={handleToggleWishlist} aria-label="Wishlist" className="shrink-0 p-1">
                  <Heart
                    className={`h-5 w-5 ${
                      wishlisted
                        ? "fill-[#1E52D6] text-[#1E52D6]"
                        : "text-primary"
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-[#1E52D6] flex items-center gap-1 mb-4">
                <BsStopwatch className="text-primary shrink-0" /> Hurry!! only 7 days
                left on this price
              </p>

              {isAdminOrInstructor ? (
                <div className="text-center py-3 text-xs sm:text-sm text-muted-foreground rounded-lg bg-muted/50">
                  {user?.role === "admin" ? "Admin view" : "Instructor view"} —
                  enrollment not available
                </div>
              ) : isEnrolled ? (
                <Button size="lg" className="w-full text-xs sm:text-sm" asChild>
                  <Link to={`/learn/${c.id}`}>Continue Learning</Link>
                </Button>
              ) : price <= 0 ? (
                <Button size="lg" className="w-full text-xs sm:text-sm" onClick={handleFreeEnroll}>
                  Start Learning
                </Button>
              ) : (
                <div className="space-y-2">
                  {isItemInCart || isAddedToCart ? (
                    <Button size="lg" className="w-full text-xs sm:text-sm" asChild>
                      <Link to="/cart">Go to Cart</Link>
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className="w-full text-xs sm:text-sm"
                      onClick={handleAddToCart}
                    >
                      Add To Cart
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full border-primary text-primary bg-[#EBF1FF] text-xs sm:text-sm"
                    onClick={handleBuyNow}
                  >
                    Buy Now
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between mt-4 text-xs sm:text-sm">
                <button className="font-semibold text-muted-foreground underline">
                  Apply Coupon
                </button>
                <button
                  className="flex items-center gap-1 font-semibold text-muted-foreground underline hover:text-primary"
                  onClick={() => {
                    if (!user) {
                      toast({
                        title: "Please log in to gift a course",
                        variant: "destructive",
                      });
                      navigate("/login");
                      return;
                    }
                    const giftItem: GiftCourseItem = {
                      courseId: c.id,
                      product_id: targetProductId,
                      productId: targetProductId,
                      title: c.title,
                      thumbnail: thumbnail,
                      description: tagline || c.description || "Practical coding skills and course materials.",
                      price: price,
                      originalPrice: originalPrice,
                      duration: durationDisplay,
                      modules: moduleCount,
                      certificate: certificate,
                      courseType: courseType,
                      occurrence: occurrence,
                      lessons: c.lessons ?? c.totalLessons ?? 0,
                      rating: c.rating ?? 5.0,
                      instructor: instructorName,
                    };
                    setSelectedCourses([giftItem]);
                    navigate("/dashboard/gift-course");
                  }}
                >
                  <Gift className="h-4 w-4" />
                  Gift Course
                </button>
              </div>
              <div className="flex items-center gap-2 mt-3 w-full">
                <Input placeholder="Enter Coupon" className="h-9 text-xs sm:text-sm flex-1 min-w-0" />
                <Button
                  variant="outline"
                  className="h-9 border-primary text-primary shrink-0 text-xs sm:text-sm"
                >
                  Apply
                </Button>
              </div>

              {/* Live Course Free Demo Box */}
              {isLive && (
                <div className="border-t border-border mt-5 pt-4 space-y-1.5">
                  <h4 className="font-bold text-sm text-[#2563EB]">Book a Free Demo Class</h4>
                  <p className="text-xs text-muted-foreground">
                    See how your instructor teaches before you commit.
                  </p>
                  {isDemoLiveNow && bookedDemo ? (
                    <Button
                      size="lg"
                      disabled={joiningDemo}
                      className="w-full bg-[#2563EB] hover:bg-blue-700 text-white font-semibold h-11 rounded-xl shadow-xs mt-2 transition-colors text-xs sm:text-sm"
                      onClick={() => handleJoinDemo(bookedDemo.id)}
                    >
                      {joiningDemo ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Joining...
                        </>
                      ) : (
                        "Join Now"
                      )}
                    </Button>
                  ) : bookedDemo?.booked || hasBookedDemo ? (
                    <Button
                      size="lg"
                      className="w-full bg-[#2563EB] hover:bg-blue-700 text-white font-semibold h-11 rounded-xl shadow-xs mt-2 transition-colors text-xs sm:text-sm"
                      onClick={() => setDemoModalOpen(true)}
                    >
                      Booked
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className="w-full bg-[#2563EB] hover:bg-blue-700 text-white font-semibold h-11 rounded-xl shadow-xs mt-2 transition-colors text-xs sm:text-sm"
                      onClick={() => setDemoModalOpen(true)}
                    >
                      Free Demo
                    </Button>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* Handpicked */}
        <HandPickedSection excludeCourseId={id} />
      </div>

      {/* Preview modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewLesson?.title || "Preview"}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video rounded-xl overflow-hidden bg-black">
            <video
              src={
                previewLesson?.videoUrl ||
                "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
              }
              controls
              autoPlay
              className="w-full h-full"
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {previewLesson?.isFreePreview
              ? "Free preview · Enroll to access all lessons"
              : "Preview"}
          </p>
        </DialogContent>
      </Dialog>

      {/* Live Course Free Demo Modal */}
      <BookFreeDemoModal
        open={demoModalOpen}
        onOpenChange={setDemoModalOpen}
        demoClasses={demoClasses}
        courseTitle={c?.title}
        courseDescription={tagline || c?.description}
        onBookingSuccess={handleBookingSuccess}
      />
    </Layout>
  );
};

export default CourseDetail;
