import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
  Video,
  Play,
  RotateCcw,
  Inbox,
  AlertTriangle,
  Loader2,
  Check,
  X,
  BookOpen,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { coursesService } from "@/services/courses.service";
import { instructorsService } from "@/services/instructors.service";
import { categoriesService } from "@/services/categories.service";
import { getApiError } from "@/lib/api-error";

export type CourseFilterTab = "all" | "pending" | "approved" | "rejected";

export interface AdminCourseItem {
  id: string;
  title: string;
  description?: string;
  instructorId?: string;
  instructorName?: string;
  instructor?: any;
  categoryId?: string;
  categoryName?: string;
  category?: any;
  level?: string;
  mode?: string;
  courseType?: "RECORDED" | "LIVE" | string;
  status?: string;
  approvalStatus?: string;
  basePrice?: number;
  price?: number;
  strikeOutPrice?: number;
  currency?: string;
  createdAt?: string;
  submittedAt?: string;
  updatedAt?: string;
  thumbnailUrl?: string;
  modules?: any[];
  [key: string]: any;
}

interface VideoLesson {
  id: string;
  title: string;
  videoUrl?: string;
  videoDurationSeconds?: number;
  durationFormatted?: string;
  moduleTitle?: string;
  order?: number;
}

export interface CourseCounts {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

interface AdminCourseApprovalsProps {
  onUpdateCount?: (counts: CourseCounts) => void;
  onRefreshCount?: () => void;
}

export const AdminCourseApprovals = ({
  onUpdateCount,
  onRefreshCount,
}: AdminCourseApprovalsProps) => {
  const { toast } = useToast();

  const [activeFilter, setActiveFilter] = useState<CourseFilterTab>("pending");
  const [courses, setCourses] = useState<AdminCourseItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [listError, setListError] = useState<string>("");

  // Counts & Stats
  const [stats, setStats] = useState({
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    avgTime: "2.4h",
  });

  // Instructor and Category lookup caches
  const [instructorsMap, setInstructorsMap] = useState<Record<string, string>>({});
  const [categoriesMap, setCategoriesMap] = useState<Record<string, string>>({});

  // Review Videos Modal state
  const [reviewCourse, setReviewCourse] = useState<AdminCourseItem | null>(null);
  const [reviewLessons, setReviewLessons] = useState<VideoLesson[]>([]);
  const [activeVideo, setActiveVideo] = useState<VideoLesson | null>(null);
  const [loadingReviewVideos, setLoadingReviewVideos] = useState(false);

  // Rejection Modal state
  const [rejectingCourse, setRejectingCourse] = useState<AdminCourseItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submittingActionId, setSubmittingActionId] = useState<string | null>(null);

  // Helper to safely extract arrays from various API response shapes
  const extractArray = useCallback((res: any): any[] => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.data?.content)) return res.data.content;
    if (Array.isArray(res.content)) return res.content;
    if (Array.isArray(res.courses)) return res.courses;
    if (Array.isArray(res.data?.courses)) return res.data.courses;
    return [];
  }, []);

  // Helper to extract total count from numbers, totalElements, or arrays
  const extractCount = useCallback(
    (res: any): number => {
      if (!res) return 0;
      if (typeof res === "number") return res;
      if (typeof res.totalElements === "number") return res.totalElements;
      if (typeof res.data?.totalElements === "number") return res.data.totalElements;
      if (typeof res.data?.totalItems === "number") return res.data.totalItems;
      if (typeof res.data?.total === "number") return res.data.total;
      if (typeof res.total === "number") return res.total;
      if (typeof res.count === "number") return res.count;
      if (typeof res.data?.count === "number") return res.data.count;
      const arr = extractArray(res);
      return arr.length;
    },
    [extractArray],
  );

  // Format seconds to mm:ss or hh:mm:ss
  const formatDuration = (seconds?: number): string => {
    if (!seconds || seconds <= 0) return "05:30";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs}:${remMins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Load enrichment metadata (instructors, categories)
  useEffect(() => {
    let mounted = true;
    const loadMetadata = async () => {
      try {
        const [instRes, catRes] = await Promise.allSettled([
          instructorsService.list(),
          categoriesService.getCategories(),
        ]);

        if (!mounted) return;

        if (instRes.status === "fulfilled" && Array.isArray(instRes.value)) {
          const map: Record<string, string> = {};
          instRes.value.forEach((inst: any) => {
            const id = String(inst.id || inst.userId || "");
            const name = inst.name || `${inst.firstName || ""} ${inst.lastName || ""}`.trim();
            if (id && name) map[id] = name;
          });
          setInstructorsMap(map);
        }

        if (catRes.status === "fulfilled") {
          const catData = extractArray(catRes.value);
          const map: Record<string, string> = {};
          catData.forEach((cat: any) => {
            const id = String(cat.id || cat.slug || "");
            const name = cat.name || cat.title || "";
            if (id && name) map[id] = name;
          });
          setCategoriesMap(map);
        }
      } catch {
        // Non-blocking enrichment
      }
    };

    void loadMetadata();
    return () => {
      mounted = false;
    };
  }, [extractArray]);

  // Load counts for all categories
  const loadGlobalCounts = useCallback(async () => {
    setLoadingStats(true);
    try {
      const [pendingRes, approvedRes, rejectedRes] = await Promise.allSettled([
        coursesService.getPendingCourses(0, 100),
        coursesService.getApprovedCourses(),
        coursesService.getRejectedCourses(),
      ]);

      const pendingCount = pendingRes.status === "fulfilled" ? extractCount(pendingRes.value) : 0;
      const approvedCount = approvedRes.status === "fulfilled" ? extractCount(approvedRes.value) : 0;
      const rejectedCount = rejectedRes.status === "fulfilled" ? extractCount(rejectedRes.value) : 0;

      // Only published courses submitted for approval are counted (drafts are excluded)
      const totalPublished = pendingCount + approvedCount + rejectedCount;

      setStats({
        pendingCount,
        approvedCount,
        rejectedCount,
        avgTime: "2.4h",
      });

      if (onUpdateCount) {
        onUpdateCount({
          total: totalPublished,
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount,
        });
      }

      if (onRefreshCount) onRefreshCount();
    } catch {
      // Non-blocking
    } finally {
      setLoadingStats(false);
    }
  }, [extractCount, onUpdateCount, onRefreshCount]);

  // Load course list based on active filter
  // Load course list based on active filter
  const loadCourses = useCallback(
    async (filter: CourseFilterTab, options?: { silent?: boolean }) => {
      if (!options?.silent) setLoadingList(true);
      setListError("");
      try {
        let rawRes: any;
        if (filter === "all") {
          // Fetch pending, approved, and rejected lists in parallel to accurately determine approval status
          const [pRes, aRes, rRes, adminRes] = await Promise.allSettled([
            coursesService.getPendingCourses(0, 100),
            coursesService.getApprovedCourses(),
            coursesService.getRejectedCourses(),
            coursesService.getAdminCourses(0, 100),
          ]);

          const pArr = (pRes.status === "fulfilled" ? extractArray(pRes.value) : []).map((c: any) => ({
            ...c,
            approvalStatus: "PENDING",
          }));
          const aArr = (aRes.status === "fulfilled" ? extractArray(aRes.value) : []).map((c: any) => ({
            ...c,
            approvalStatus: "APPROVED",
            isApproved: true,
          }));
          const rArr = (rRes.status === "fulfilled" ? extractArray(rRes.value) : []).map((c: any) => ({
            ...c,
            approvalStatus: "REJECTED",
          }));

          const approvedIds = new Set(aArr.map((c: any) => String(c.id || c.courseId || "")));
          const rejectedIds = new Set(rArr.map((c: any) => String(c.id || c.courseId || "")));

          const adminArr = adminRes.status === "fulfilled" ? extractArray(adminRes.value) : [];
          const nonDraftAdmin = adminArr
            .filter((c: any) => {
              const st = (c.status || "").toUpperCase();
              const appSt = (c.approvalStatus || "").toUpperCase();
              return st !== "DRAFT" && appSt !== "DRAFT";
            })
            .map((c: any) => {
              const cid = String(c.id || c.courseId || "");
              if (rejectedIds.has(cid) || c.approvalStatus === "REJECTED" || c.status === "REJECTED") {
                return { ...c, approvalStatus: "REJECTED" };
              }
              if (approvedIds.has(cid) || c.approvalStatus === "APPROVED" || c.status === "APPROVED" || c.isApproved === true || c.approved === true) {
                return { ...c, approvalStatus: "APPROVED", isApproved: true };
              }
              return { ...c, approvalStatus: "PENDING" };
            });

          if (nonDraftAdmin.length > 0) {
            setCourses(nonDraftAdmin);
          } else {
            setCourses([...pArr, ...aArr, ...rArr]);
          }
        } else if (filter === "approved") {
          rawRes = await coursesService.getApprovedCourses();
          const list = extractArray(rawRes).map((c: any) => ({
            ...c,
            approvalStatus: "APPROVED",
            isApproved: true,
          }));
          setCourses(list);
        } else if (filter === "rejected") {
          rawRes = await coursesService.getRejectedCourses();
          const list = extractArray(rawRes).map((c: any) => ({
            ...c,
            approvalStatus: "REJECTED",
          }));
          setCourses(list);
        } else {
          // Default: pending
          rawRes = await coursesService.getPendingCourses(0, 100);
          const list = extractArray(rawRes).map((c: any) => ({
            ...c,
            approvalStatus: "PENDING",
          }));
          setCourses(list);
        }
      } catch (err: unknown) {
        const msg = getApiError(err);
        setListError(msg);
        toast({
          title: `Could not load ${filter} courses`,
          description: msg,
          variant: "destructive",
        });
      } finally {
        setLoadingList(false);
      }
    },
    [extractArray, toast],
  );

  useEffect(() => {
    void loadGlobalCounts();
  }, [loadGlobalCounts]);

  useEffect(() => {
    void loadCourses(activeFilter);
  }, [activeFilter, loadCourses]);

  const handleRefresh = () => {
    void loadGlobalCounts();
    void loadCourses(activeFilter);
  };

  // Helper to resolve Instructor Name
  const resolveInstructorName = (course: AdminCourseItem): string => {
    if (typeof course.instructor === "object" && course.instructor?.name) {
      return course.instructor.name;
    }
    if (typeof course.instructor === "object" && (course.instructor?.firstName || course.instructor?.lastName)) {
      return `${course.instructor.firstName || ""} ${course.instructor.lastName || ""}`.trim();
    }
    if (course.instructorName) return course.instructorName;
    const instId = String(course.instructorId || course.instructor || "");
    if (instructorsMap[instId]) return instructorsMap[instId];
    if (instId && !instId.includes("-") && !instId.match(/^[0-9a-fA-F]{8}/)) {
      return instId;
    }
    return "Instructor";
  };

  // Helper to resolve Category Name
  const resolveCategoryName = (course: AdminCourseItem): string => {
    if (typeof course.category === "object" && course.category?.name) {
      return course.category.name;
    }
    if (course.categoryName) return course.categoryName;
    const catId = String(course.categoryId || course.category || "");
    if (categoriesMap[catId]) return categoriesMap[catId];
    if (catId && !catId.includes("-") && !catId.match(/^[0-9a-fA-F]{8}/)) {
      return catId;
    }
    return "General";
  };

  // Helper to resolve Price & Currency
  const formatPrice = (amount?: number, currency = "$"): string => {
    const val = typeof amount === "number" ? amount : 0;
    const currSymbol = currency === "INR" || currency === "₹" ? "₹" : "$";
    return `${currSymbol} ${val.toFixed(2)}`;
  };

  // Format Relative / Applied Time
  const formatSubmittedTime = (dateStr?: string): string => {
    if (!dateStr) return "Submitted recently";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "Submitted recently";
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) return "Submitted just now";
      if (diffHours === 1) return "Submitted 1 hour ago";
      if (diffHours < 24) return `Submitted ${diffHours} hours ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return "Submitted 1 day ago";
      if (diffDays < 30) return `Submitted ${diffDays} days ago`;
      return `Submitted on ${d.toLocaleDateString()}`;
    } catch {
      return "Submitted recently";
    }
  };

  // Status badge config
  const getStatusBadge = (course: AdminCourseItem) => {
    const appStatus = String(course.approvalStatus || "").trim().toUpperCase();
    const status = String(course.status || "").trim().toUpperCase();
    const isApprovedFlag = course.isApproved === true || course.approved === true;

    // 1. Rejected
    if (appStatus === "REJECTED" || status === "REJECTED") {
      return {
        label: "Rejected",
        isApproved: false,
        isRejected: true,
        className: "bg-rose-50 text-rose-700 border-rose-200",
      };
    }

    // 2. Approved
    if (appStatus === "APPROVED" || status === "APPROVED" || isApprovedFlag) {
      return {
        label: "Approved",
        isApproved: true,
        isRejected: false,
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    }

    // 3. Pending Review (Default for submitted courses waiting for admin approval)
    return {
      label: "Pending Review",
      isApproved: false,
      isRejected: false,
      className: "bg-amber-50 text-amber-700 border-amber-200",
    };
  };

  // Handle Approve Course
  const handleApproveCourse = async (course: AdminCourseItem) => {
    const targetId = String(course.id || course.courseId || "").trim();
    try {
      setSubmittingActionId(targetId);
      await coursesService.approveCourse(targetId);
      toast({
        title: "Course approved & activated",
        description: `"${course.title}" is now active and visible to students.`,
      });

      // Update local state immediately so buttons become disabled
      setCourses((prev) =>
        prev.map((c) =>
          String(c.id || c.courseId || "") === targetId
            ? { ...c, approvalStatus: "APPROVED", status: "APPROVED", isApproved: true }
            : c,
        ),
      );

      // Close modal if open
      setReviewCourse(null);

      // Refresh list & statistics
      void loadGlobalCounts();
      void loadCourses(activeFilter, { silent: true });
    } catch (err: unknown) {
      toast({
        title: "Failed to approve course",
        description: getApiError(err),
        variant: "destructive",
      });
    } finally {
      setSubmittingActionId(null);
    }
  };

  // Handle Reject Course Submit
  const handleRejectSubmit = async () => {
    if (!rejectingCourse) return;
    const reason = rejectionReason.trim();
    if (!reason) {
      toast({
        title: "Rejection reason required",
        description: "Please provide a reason for rejecting this course.",
        variant: "destructive",
      });
      return;
    }

    const targetId = String(
      rejectingCourse.id ||
      rejectingCourse.courseId ||
      rejectingCourse._id ||
      "",
    ).trim();

    try {
      setSubmittingActionId(targetId);
      await coursesService.rejectCourse(targetId, reason);
      toast({
        title: "Course rejected",
        description: `"${rejectingCourse.title}" has been marked as rejected.`,
      });

      // Update local state immediately
      setCourses((prev) =>
        prev.map((c) =>
          String(c.id || c.courseId || "") === targetId
            ? { ...c, approvalStatus: "REJECTED", status: "REJECTED" }
            : c,
        ),
      );

      setRejectingCourse(null);
      setRejectionReason("");

      // Refresh list & statistics
      void loadGlobalCounts();
      void loadCourses(activeFilter, { silent: true });
    } catch (err: unknown) {
      toast({
        title: "Failed to reject course",
        description: getApiError(err),
        variant: "destructive",
      });
    } finally {
      setSubmittingActionId(null);
    }
  };

  // Open Review Videos Modal
  const handleOpenReviewVideos = async (course: AdminCourseItem) => {
    setReviewCourse(course);
    setLoadingReviewVideos(true);
    setReviewLessons([]);
    setActiveVideo(null);

    try {
      // Fetch modules and lessons
      const res: any = await coursesService.getModulesByCourse(course.id);
      const modules = extractArray(res);

      const lessons: VideoLesson[] = [];
      modules.forEach((mod: any, modIdx: number) => {
        const modLessons = extractArray(mod.lessons || mod.items);
        modLessons.forEach((l: any, lessonIdx: number) => {
          lessons.push({
            id: String(l.id || `${mod.id}-${lessonIdx}`),
            title: l.title || `Lesson ${lessonIdx + 1}`,
            videoUrl: l.videoUrl || l.url || l.videoFileKey || "",
            videoDurationSeconds: l.videoDurationSeconds || l.durationSeconds || l.duration,
            durationFormatted: formatDuration(l.videoDurationSeconds || l.durationSeconds || l.duration),
            moduleTitle: mod.title || `Module ${modIdx + 1}`,
            order: l.order ?? lessonIdx,
          });
        });
      });

      // Fallback placeholder lesson if none exist on server yet
      if (lessons.length === 0) {
        lessons.push({
          id: "preview-1",
          title: course.title ? `${course.title} - Overview` : "Course Overview Preview",
          videoUrl: "",
          durationFormatted: "05:30",
          moduleTitle: "Module 1",
          order: 1,
        });
      }

      setReviewLessons(lessons);
      setActiveVideo(lessons[0]);
    } catch {
      // Fallback lesson
      const fallback: VideoLesson = {
        id: "preview-1",
        title: course.title ? `${course.title} - Intro` : "Course Introduction",
        videoUrl: "",
        durationFormatted: "05:30",
        moduleTitle: "Module 1",
      };
      setReviewLessons([fallback]);
      setActiveVideo(fallback);
    } finally {
      setLoadingReviewVideos(false);
    }
  };

  // Empty state copy
  const getEmptyCopy = (filter: CourseFilterTab) => {
    switch (filter) {
      case "pending":
        return {
          title: "No pending courses",
          description: "All submitted courses have been reviewed. New submissions will appear here.",
        };
      case "approved":
        return {
          title: "No approved courses",
          description: "Courses approved and activated by administrators will appear here.",
        };
      case "rejected":
        return {
          title: "No rejected courses",
          description: "Courses that did not meet the guidelines will appear here.",
        };
      case "all":
      default:
        return {
          title: "No courses found",
          description: "There are currently no courses matching the selected criteria.",
        };
    }
  };

  const emptyCopy = getEmptyCopy(activeFilter);

  return (
    <div className="space-y-6">
      {/* Stats Cards Grid matching Figma */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pending"
          value={loadingStats ? "—" : stats.pendingCount}
          sub="Awaiting review"
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          isLoading={loadingStats}
        />
        <StatCard
          label="Approved"
          value={loadingStats ? "—" : stats.approvedCount}
          sub="This month"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          isLoading={loadingStats}
        />
        <StatCard
          label="Rejected"
          value={loadingStats ? "—" : stats.rejectedCount}
          sub="This month"
          icon={<XCircle className="h-5 w-5 text-red-500" />}
          isLoading={loadingStats}
        />
        <StatCard
          label="Avg Time"
          value={loadingStats ? "—" : stats.avgTime}
          sub="To approve"
          icon={<Zap className="h-5 w-5 text-blue-600" />}
          isLoading={loadingStats}
        />
      </div>

      {/* Filter Tabs matching Figma */}
      <div className="flex items-center gap-2 pt-1 pb-2">
        {(["All", "Pending", "Approved", "Rejected"] as const).map((tab) => {
          const key = tab.toLowerCase() as CourseFilterTab;
          const isActive = activeFilter === key;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveFilter(key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                isActive
                  ? "bg-[#1D61E7] text-white border-[#1D61E7] shadow-sm"
                  : "bg-white text-[#1D61E7] border-blue-300 hover:bg-blue-50"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Course List / Loading / Error */}
      {loadingList ? (
        <div className="space-y-4" aria-busy="true" aria-live="polite">
          {[0, 1].map((i) => (
            <div key={i} className="bg-card rounded-2xl border p-6 space-y-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-60" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-4 w-80" />
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                <div className="lg:col-span-8 space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
                <div className="lg:col-span-4">
                  <Skeleton className="h-32 w-full rounded-xl" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : listError ? (
        <div className="bg-card rounded-2xl border p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="font-semibold text-lg">Unable to load courses</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-5">{listError}</p>
          <Button variant="outline" className="gap-2" onClick={handleRefresh}>
            <RotateCcw className="h-4 w-4" /> Retry
          </Button>
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-card rounded-2xl border p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Inbox className="h-8 w-8 text-primary" />
          </div>
          <h2 className="font-semibold text-lg">{emptyCopy.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{emptyCopy.description}</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {courses.map((course, idx) => {
            const instructorName = resolveInstructorName(course);
            const categoryName = resolveCategoryName(course);
            const statusInfo = getStatusBadge(course);
            const isLive = course.courseType === "LIVE" || course.mode === "LIVE";
            const level = course.level
              ? course.level.charAt(0).toUpperCase() + course.level.slice(1).toLowerCase()
              : "Intermediate";
            const coursePrice = Number(course.basePrice ?? course.price ?? 129);
            const platformFee = coursePrice * 0.3;
            const instructorShare = coursePrice * 0.7;
            const currency = course.currency || "$";
            const isActionBusy = submittingActionId === course.id;
            const formattedId = course.id
              ? `ID: APP-${course.id.slice(0, 6).toUpperCase()}`
              : `ID: APP-${String(idx + 1).padStart(3, "0")}`;

            return (
              <li
                key={course.id || idx}
                className="bg-card rounded-2xl border p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="font-display text-lg font-bold text-foreground">
                      {course.title || "Untitled Course"}
                    </h3>
                    <Badge
                      variant="secondary"
                      className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium px-2.5 py-0.5 rounded-full"
                    >
                      {isLive ? "Live Course" : "Recorded Course"}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${statusInfo.className}`}
                    >
                      {statusInfo.label}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono font-medium">
                    {formattedId}
                  </span>
                </div>

                {/* Subtitle Line */}
                <p className="text-xs text-muted-foreground mb-5">
                  {instructorName} · {categoryName} · {level} ·{" "}
                  {isLive ? "Meeting setup included" : "On-demand content"}
                </p>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Course Information */}
                  <div className="lg:col-span-7 space-y-4">
                    <h4 className="text-sm font-semibold text-foreground">
                      Course Information
                    </h4>

                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                      <div>
                        <span className="text-muted-foreground block mb-0.5">
                          Course Title
                        </span>
                        <span className="font-medium text-foreground">
                          {course.title || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-0.5">
                          Instructor
                        </span>
                        <span className="font-medium text-foreground">
                          {instructorName}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-0.5">
                          Category
                        </span>
                        <span className="font-medium text-foreground">
                          {categoryName}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-0.5">
                          Level
                        </span>
                        <span className="font-medium text-foreground">
                          {level}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-xs text-muted-foreground block mb-1 font-medium">
                        Course Description
                      </span>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                        {course.description ||
                          "A comprehensive course providing in-depth structured modules, hands-on practice, and assessments designed for mastery."}
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Pricing Breakdown */}
                  <div className="lg:col-span-5">
                    <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-2.5">
                      <h4 className="text-sm font-semibold text-foreground">
                        Pricing Breakdown
                      </h4>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Course Price</span>
                          <span className="font-semibold text-foreground">
                            {formatPrice(coursePrice, currency)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            Platform Fee (30%)
                          </span>
                          <span className="font-medium text-rose-600">
                            -{formatPrice(platformFee, currency)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-blue-100">
                          <span className="text-muted-foreground font-medium">
                            Instructor Share
                          </span>
                          <span className="font-bold text-emerald-600">
                            {formatPrice(instructorShare, currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-5 mt-5 border-t">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                    <span>{formatSubmittedTime(course.submittedAt || course.createdAt)}</span>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap sm:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs text-foreground border-border hover:bg-accent"
                      onClick={() => handleOpenReviewVideos(course)}
                    >
                      <Video className="h-3.5 w-3.5 text-blue-600" />
                      Review Videos
                    </Button>

                    {!statusInfo.isApproved && !statusInfo.isRejected && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => {
                            setRejectingCourse(course);
                            setRejectionReason(
                              "The course content does not meet the required quality standards.",
                            );
                          }}
                          disabled={isActionBusy}
                        >
                          Reject
                        </Button>

                        <Button
                          size="sm"
                          className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                          onClick={() => void handleApproveCourse(course)}
                          disabled={isActionBusy}
                        >
                          {isActionBusy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          Approve & Activate
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ========================================================================= */}
      {/* REVIEW VIDEOS MODAL (Matching Screenshot 3) */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(reviewCourse)}
        onOpenChange={(open) => {
          if (!open) {
            setReviewCourse(null);
            setActiveVideo(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl p-0 overflow-hidden sm:rounded-2xl border">
          {reviewCourse && (
            <div className="flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="p-6 pb-4 border-b">
                <span className="text-xs font-semibold text-blue-600 tracking-wide uppercase">
                  Course video review ·{" "}
                  {reviewCourse.courseType === "LIVE" ? "Live Course" : "Recorded Course"}
                </span>
                <DialogTitle className="text-xl font-bold mt-1">
                  {reviewCourse.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {resolveInstructorName(reviewCourse)} · {reviewLessons.length} videos submitted for approval
                </DialogDescription>
              </div>

              {/* Modal Body: Left Video Preview, Right Video Playlist */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-0 flex-1 overflow-y-auto">
                {/* Left Pane (Player) */}
                <div className="md:col-span-7 p-6 bg-zinc-900/5 dark:bg-zinc-950/40 border-r flex flex-col justify-between space-y-3">
                  <div className="relative aspect-video rounded-xl bg-zinc-950 overflow-hidden shadow-inner flex items-center justify-center group border border-zinc-800">
                    {activeVideo?.videoUrl ? (
                      <video
                        key={activeVideo.id}
                        src={activeVideo.videoUrl}
                        controls
                        className="w-full h-full object-contain"
                        poster={reviewCourse.thumbnailUrl || undefined}
                      />
                    ) : (
                      <div className="text-center p-6 space-y-3">
                        <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center mx-auto text-white group-hover:scale-110 transition-transform">
                          <Play className="h-8 w-8 text-white fill-white ml-1" />
                        </div>
                        <div className="text-white">
                          <p className="font-semibold text-sm">
                            {activeVideo?.title || "Video Preview"}
                          </p>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            Duration: {activeVideo?.durationFormatted || "05:30"}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Overlay Title Bar when stopped */}
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-md text-xs font-medium text-white pointer-events-none">
                      {activeVideo?.title || reviewCourse.title}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    Video quality and content preview
                  </p>
                </div>

                {/* Right Pane (Video List) */}
                <div className="md:col-span-5 p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <h5 className="text-sm font-semibold text-foreground mb-3">
                      Uploaded videos
                    </h5>

                    {loadingReviewVideos ? (
                      <div className="space-y-2 py-4">
                        <Skeleton className="h-12 w-full rounded-xl" />
                        <Skeleton className="h-12 w-full rounded-xl" />
                        <Skeleton className="h-12 w-full rounded-xl" />
                      </div>
                    ) : reviewLessons.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4">
                        No videos attached to this course curriculum yet.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {reviewLessons.map((item) => {
                          const isCurrent = activeVideo?.id === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setActiveVideo(item)}
                              className={`w-full text-left p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                                isCurrent
                                  ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200"
                                  : "border-border hover:bg-accent text-foreground"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                                    isCurrent
                                      ? "bg-blue-600 text-white"
                                      : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  <Play className="h-4 w-4 fill-current ml-0.5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium truncate">
                                    {item.title}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground truncate">
                                    {item.moduleTitle}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                                {item.durationFormatted}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Quality Guideline Callout */}
                  <div className="rounded-xl bg-muted/60 p-3 text-[11px] text-muted-foreground leading-relaxed">
                    Check that lessons are clear, relevant, and free of technical issues before activating.
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-muted/20 border-t flex items-center justify-end gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setReviewCourse(null);
                    setActiveVideo(null);
                  }}
                >
                  Close
                </Button>
                {(() => {
                  const modalStatus = getStatusBadge(reviewCourse);
                  if (modalStatus.isApproved || modalStatus.isRejected) {
                    return null;
                  }

                  return (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5"
                      onClick={() => void handleApproveCourse(reviewCourse)}
                      disabled={submittingActionId === reviewCourse.id}
                    >
                      {submittingActionId === reviewCourse.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Approve Course
                    </Button>
                  );
                })()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* REJECT COURSE MODAL */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(rejectingCourse)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectingCourse(null);
            setRejectionReason("");
          }
        }}
      >
        <DialogContent className="max-w-md sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-destructive">
              Reject Course Application
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Please enter the feedback or rejection reason. This message will be communicated to the instructor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label
              htmlFor="rejectionReason"
              className="text-xs font-semibold text-foreground block"
            >
              Reason for Rejection <span className="text-rose-500">*</span>
            </label>
            <Textarea
              id="rejectionReason"
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. The course content does not meet the required quality standards or video resolution."
              className="resize-none text-xs"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRejectingCourse(null);
                setRejectionReason("");
              }}
              disabled={submittingActionId === rejectingCourse?.id}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRejectSubmit}
              disabled={submittingActionId === rejectingCourse?.id || !rejectionReason.trim()}
              className="gap-1.5"
            >
              {submittingActionId === rejectingCourse?.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const StatCard = ({
  label,
  value,
  sub,
  icon,
  isLoading,
}: {
  label: string;
  value: number | string;
  sub: string;
  icon: React.ReactNode;
  isLoading?: boolean;
}) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
    <div className="flex items-center justify-between mb-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div>{icon}</div>
    </div>
    {isLoading ? (
      <Skeleton className="h-8 w-16 my-1" />
    ) : (
      <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
    )}
    <p className="text-xs text-gray-400 mt-1">{sub}</p>
  </div>
);
