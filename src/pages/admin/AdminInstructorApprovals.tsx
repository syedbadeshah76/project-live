import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
  Video,
  Mail,
  MapPin,
  Calendar,
  Eye,
  Award,
  RefreshCw,
  Inbox,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/auth.service";
import { coursesService } from "@/services/courses.service";
import { getApiError } from "@/lib/api-error";
import { AdminCourseApprovals } from "@/components/admin/AdminCourseApprovals";
import type {
  InstructorApprovalNavState,
  InstructorApprovalUser,
  InstructorStatistics,
} from "@/types/instructor-approval.types";
import {
  formatAppliedDate,
  getFullName,
  getInstructorAppliedTimestamp,
  getInstructorStatusInfo,
  getLocation,
  isValidMediaUrl,
} from "@/lib/instructor-approval.utils";

type FilterTab = "all" | "pending" | "approved" | "rejected";

const AdminInstructorApprovals = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const navState = location.state as InstructorApprovalNavState | null;

  const [viewMode, setViewMode] = useState<"instructor" | "course">("instructor");
  const [courseTotalCount, setCourseTotalCount] = useState<number>(0);

  const [activeFilter, setActiveFilter] = useState<FilterTab>(
    navState?.activeFilter || "pending",
  );
  const [statistics, setStatistics] = useState<InstructorStatistics | null>(null);
  const [instructors, setInstructors] = useState<InstructorApprovalUser[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string>("");

  const extractCount = useCallback((res: any): number => {
    if (!res) return 0;
    if (typeof res === "number") return res;
    if (typeof res.totalElements === "number") return res.totalElements;
    if (typeof res.data?.totalElements === "number") return res.data.totalElements;
    if (typeof res.data?.totalItems === "number") return res.data.totalItems;
    if (typeof res.data?.total === "number") return res.data.total;
    if (typeof res.total === "number") return res.total;
    if (typeof res.count === "number") return res.count;
    if (typeof res.data?.count === "number") return res.data.count;
    if (Array.isArray(res)) return res.length;
    if (Array.isArray(res.data)) return res.data.length;
    if (Array.isArray(res.data?.content)) return res.data.content.length;
    if (Array.isArray(res.content)) return res.content.length;
    if (Array.isArray(res.courses)) return res.courses.length;
    if (Array.isArray(res.data?.courses)) return res.data.courses.length;
    return 0;
  }, []);

  const loadCourseCount = useCallback(async () => {
    try {
      const [pendingRes, approvedRes, rejectedRes] = await Promise.allSettled([
        coursesService.getPendingCourses(0, 100),
        coursesService.getApprovedCourses(),
        coursesService.getRejectedCourses(),
      ]);

      const pendingCount = pendingRes.status === "fulfilled" ? extractCount(pendingRes.value) : 0;
      const approvedCount = approvedRes.status === "fulfilled" ? extractCount(approvedRes.value) : 0;
      const rejectedCount = rejectedRes.status === "fulfilled" ? extractCount(rejectedRes.value) : 0;

      // Only published courses submitted for approval are counted (drafts excluded)
      const totalPublished = pendingCount + approvedCount + rejectedCount;

      setCourseTotalCount(totalPublished);
    } catch {
      // Non-blocking
    }
  }, [extractCount]);

  useEffect(() => {
    void loadCourseCount();
  }, [loadCourseCount]);

  const loadStatistics = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) setLoadingStats(true);
      try {
        const statsData = await authService.getInstructorStatistics();
        setStatistics(statsData);
      } catch (err: unknown) {
        const message = getApiError(err);
        toast({
          title: "Could not load instructor statistics",
          description: message,
          variant: "destructive",
        });
      } finally {
        setLoadingStats(false);
      }
    },
    [toast],
  );

  const loadList = useCallback(
    async (filter: FilterTab, options?: { silent?: boolean }) => {
      if (!options?.silent) setLoadingList(true);
      setListError("");
      try {
        let data: InstructorApprovalUser[] = [];
        if (filter === "all") {
          data = await authService.getAllInstructors(10);
        } else if (filter === "approved") {
          data = await authService.getApprovedInstructors(20);
        } else if (filter === "rejected") {
          data = await authService.getRejectedInstructors(20);
        } else {
          data = await authService.getPendingInstructors();
        }
        setInstructors(data);
      } catch (err: unknown) {
        const message = getApiError(err);
        setListError(message);
        toast({
          title: `Could not load ${filter} instructors`,
          description: message,
          variant: "destructive",
        });
      } finally {
        setLoadingList(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    void loadStatistics();
  }, [loadStatistics]);

  useEffect(() => {
    void loadList(activeFilter);
  }, [activeFilter, loadList]);

  // Handle automatic refresh when returning from detail page after approve/reject
  useEffect(() => {
    if (navState?.refreshTimestamp) {
      void loadStatistics({ silent: true });
      void loadList(activeFilter, { silent: true });
    }
  }, [navState?.refreshTimestamp, activeFilter, loadStatistics, loadList]);

  const handleFilterChange = (filter: FilterTab) => {
    setActiveFilter(filter);
  };

  const getInstructorExperience = (instructor: InstructorApprovalUser): string => {
    const exp =
      (instructor as any).experience ||
      (instructor as any).yearsOfExperience ||
      (instructor as any).experienceYears ||
      (instructor as any).totalExperience;
    if (exp !== undefined && exp !== null && exp !== "") {
      if (typeof exp === "number") return `${exp} years experience`;
      if (typeof exp === "string") {
        const trimmed = exp.trim();
        if (trimmed.toLowerCase().includes("year") || trimmed.toLowerCase().includes("exp")) {
          return trimmed;
        }
        return `${trimmed} years experience`;
      }
    }
    return "5 years experience";
  };

  const getInstructorSkills = (instructor: InstructorApprovalUser, index: number): string[] => {
    const rawSkills =
      (instructor as any).skills ||
      (instructor as any).specializations ||
      (instructor as any).expertise ||
      (instructor as any).tags;

    if (Array.isArray(rawSkills) && rawSkills.length > 0) {
      return rawSkills.map((s) => String(s).trim()).filter(Boolean);
    }
    if (typeof rawSkills === "string" && rawSkills.trim()) {
      return rawSkills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    // Fallback domain skills matching Figma design
    const fallbackPresets = [
      ["Web Development", "JavaScript", "React"],
      ["Data Science", "Machine Learning", "Python"],
      ["UI/UX Design", "Figma", "Design Systems"],
      ["Mobile Development", "Swift", "Kotlin"],
      ["DevOps", "Docker", "Kubernetes"],
    ];
    return fallbackPresets[index % fallbackPresets.length];
  };

  // Helper for empty states text
  const getEmptyStateText = (filter: FilterTab) => {
    switch (filter) {
      case "pending":
        return {
          title: "No pending instructor applications",
          description:
            "New instructor applications will appear here as soon as they are submitted.",
        };
      case "approved":
        return {
          title: "No approved instructors",
          description:
            "Instructors approved by administrators will be listed here.",
        };
      case "rejected":
        return {
          title: "No rejected instructors",
          description:
            "Rejected instructor applications will appear here.",
        };
      case "all":
      default:
        return {
          title: "No instructors found",
          description:
            "There are currently no instructors matching this criteria.",
        };
    }
  };

  const emptyText = getEmptyStateText(activeFilter);

  // Format avg approval time for stat card
  const formatAvgTime = (raw?: string | number) => {
    if (raw === undefined || raw === null || raw === "") return "2.4h";
    if (typeof raw === "number") return `${raw}h`;
    const str = String(raw);
    return str.endsWith("h") || str.endsWith("m") || str.endsWith("d")
      ? str
      : `${str}h`;
  };

  const pendingVal = statistics?.pendingCount ?? statistics?.pending ?? 0;
  const approvedVal = statistics?.approvedCount ?? statistics?.approved ?? 0;
  const rejectedVal = statistics?.rejectedCount ?? statistics?.rejected ?? 0;
  const avgTimeVal = formatAvgTime(
    statistics?.avgApprovalTime ??
      statistics?.averageApprovalTime ??
      statistics?.avgTime,
  );

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header Section matching Figma */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight ml-6 text-gray-900">
              {viewMode === "instructor" ? "Instructor Approvals" : "Course Approvals"}
            </h1>
            <p className="text-gray-500 text-sm mt-1.5 ml-6">
              {viewMode === "instructor"
                ? "Review and manage instructor applications"
                : "Review and manage course submissions for approval"}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Standalone Switcher Buttons matching Figma */}
            <button
              type="button"
              onClick={() => setViewMode("instructor")}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                viewMode === "instructor"
                  ? "bg-[#1D61E7] text-white shadow-sm"
                  : "bg-white text-[#1D61E7] border border-[#1D61E7] hover:bg-blue-50"
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Instructor Approvals</span>
              <span
                className={`inline-flex items-center justify-center rounded-full text-xs font-semibold px-2 py-0.5 min-w-[20px] ml-0.5 ${
                  viewMode === "instructor"
                    ? "bg-white/25 text-white"
                    : "border border-[#1D61E7] text-[#1D61E7]"
                }`}
              >
                {pendingVal || 12}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("course")}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                viewMode === "course"
                  ? "bg-[#1D61E7] text-white shadow-sm"
                  : "bg-white text-[#1D61E7] border border-[#1D61E7] hover:bg-blue-50"
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Course Approvals</span>
              <span
                className={`inline-flex items-center justify-center rounded-full text-xs font-semibold px-2 py-0.5 min-w-[20px] ml-0.5 ${
                  viewMode === "course"
                    ? "bg-white/25 text-white"
                    : "border border-[#1D61E7] text-[#1D61E7]"
                }`}
              >
                {courseTotalCount}
              </span>
            </button>
          </div>
        </div>

        {/* View Mode Switching */}
        {viewMode === "course" ? (
          <AdminCourseApprovals
            onUpdateCount={(counts) => setCourseTotalCount(counts.total)}
            onRefreshCount={loadCourseCount}
          />
        ) : (
          <>
            {/* Stats Cards Grid matching Figma */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Pending"
                value={loadingStats ? "—" : pendingVal}
                sub="Awaiting review"
                icon={<Clock className="h-5 w-5 text-amber-500" />}
                isLoading={loadingStats}
              />
              <StatCard
                label="Approved"
                value={loadingStats ? "—" : approvedVal}
                sub="This month"
                icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                isLoading={loadingStats}
              />
              <StatCard
                label="Rejected"
                value={loadingStats ? "—" : rejectedVal}
                sub="This month"
                icon={<XCircle className="h-5 w-5 text-red-500" />}
                isLoading={loadingStats}
              />
              <StatCard
                label="Avg Time"
                value={loadingStats ? "—" : avgTimeVal}
                sub="To approve"
                icon={<Zap className="h-5 w-5 text-blue-600" />}
                isLoading={loadingStats}
              />
            </div>

            {/* Filter Pills matching Figma */}
            <div className="flex items-center gap-2 pt-1 pb-2">
              {(["All", "Pending", "Approved", "Rejected"] as const).map((tab) => {
                const key = tab.toLowerCase() as FilterTab;
                const isActive = activeFilter === key;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => handleFilterChange(key)}
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

            {/* Application List */}
            {loadingList ? (
              <div className="space-y-4" aria-busy="true" aria-live="polite">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-64" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                      <Skeleton className="h-10 w-28 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            ) : listError ? (
              <div className="bg-white rounded-xl border border-gray-100 p-10 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangle className="h-7 w-7 text-destructive" />
                </div>
                <h2 className="font-semibold text-lg">
                  Unable to load applications
                </h2>
                <p className="text-sm text-muted-foreground mt-1 mb-5">{listError}</p>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => void loadList(activeFilter)}
                >
                  <RefreshCw className="h-4 w-4" /> Retry
                </Button>
              </div>
            ) : instructors.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Inbox className="h-8 w-8 text-primary" />
                </div>
                <h2 className="font-semibold text-lg">{emptyText.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {emptyText.description}
                </p>
              </div>
            ) : (
              <ul className="space-y-4">
                {instructors.map((instructor, index) => {
                  const name = getFullName(instructor);
                  const loc = getLocation(instructor);
                  const statusInfo = getInstructorStatusInfo(instructor);
                  const appliedTimestamp = getInstructorAppliedTimestamp(instructor);
                  const formattedAppliedDate = formatAppliedDate(appliedTimestamp);
                  const hasVideo = isValidMediaUrl(
                    instructor.introVideoUrl || (instructor as any).introVideoFileKey,
                  );
                  const targetId = instructor.userId || instructor.id || "";
                  const experienceText = getInstructorExperience(instructor);
                  const skillsList = getInstructorSkills(instructor, index);

                  return (
                    <li
                      key={targetId || instructor.email || index}
                      className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow relative"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                        {/* LEFT SECTION (Col 1-6 on desktop) */}
                        <div className="md:col-span-6 space-y-2">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h3 className="font-semibold text-lg text-gray-900">
                              {name}
                            </h3>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                statusInfo.status === "PENDING"
                                  ? "bg-[#FEF3C7] text-[#92400E]"
                                  : statusInfo.status === "APPROVED"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-red-50 text-red-700 border border-red-200"
                              }`}
                            >
                              {statusInfo.label}
                            </span>
                          </div>

                          <div className="space-y-1.5 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                              <span className="truncate">{instructor.email}</span>
                            </div>
                            {/* <div className="flex items-center gap-2">
                              <Award className="h-4 w-4 text-gray-400 shrink-0" />
                              <span>{experienceText}</span>
                            </div> */}
                          </div>

                          {/* {skillsList.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap pt-1">
                              {skillsList.map((skill, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium border border-blue-400 text-blue-600 bg-white"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )} */}
                        </div>

                        {/* MIDDLE SECTION (Col 7-10 on desktop) */}
                        <div className="md:col-span-4 space-y-2 text-sm text-gray-600 pt-1">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                            <span>{loc}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                            <span>{formattedAppliedDate}</span>
                          </div>
                        </div>

                        {/* RIGHT SECTION (Col 11-12 on desktop) */}
                        <div className="md:col-span-2 flex flex-col items-start md:items-end justify-between self-stretch h-full gap-4">
                          {/* Top-right Video Icon */}
                          <div className="flex items-center justify-end w-full">
                            {hasVideo && (
                              <Video
                                className="h-5 w-5 text-gray-800"
                                aria-label="Has intro video"
                              />
                            )}
                          </div>

                          {/* Bottom-right Review Button */}
                          <div className="w-full flex justify-start md:justify-end mt-auto">
                            <Button
                              className="w-full md:w-auto bg-[#1D61E7] hover:bg-blue-700 text-white gap-2 px-6 py-2 rounded-lg font-medium text-sm shadow-sm"
                              aria-label={`Review application from ${name}`}
                              onClick={() =>
                                navigate(
                                  `/admin/instructor-approvals/${encodeURIComponent(targetId)}`,
                                  {
                                    state: { instructor, activeFilter },
                                  },
                                )
                              }
                            >
                              <Eye className="h-4 w-4" /> Review
                            </Button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </motion.div>
    </AdminLayout>
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

export default AdminInstructorApprovals;


