import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Video,
  Download,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Clock,
  AlertCircle,
  Mail,
  MapPin,
  Calendar,
  UserCheck,
  GraduationCap,
  Briefcase,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/auth.service";
import { getApiError } from "@/lib/api-error";
import type {
  InstructorApprovalNavState,
  InstructorApprovalUser,
} from "@/types/instructor-approval.types";
import {
  downloadFileFromUrl,
  extractResumeFilename,
  formatAppliedDate,
  getFullName,
  getInstructorAppliedTimestamp,
  getInstructorStatusInfo,
  getLocation,
  isValidMediaUrl,
  timeAgo,
} from "@/lib/instructor-approval.utils";
import { Textarea } from "@/components/ui/textarea";

type PendingAction = "approve" | "reject" | null;

const AdminInstructorApprovalDetail = () => {
  const { id: userId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { state } = useLocation() as {
    state: InstructorApprovalNavState | null;
  };

  const activeFilter = state?.activeFilter || "pending";

  const [instructor, setInstructor] = useState<InstructorApprovalUser | null>(
    state?.instructor && (state.instructor.userId === userId || state.instructor.id === userId)
      ? state.instructor
      : null,
  );
  const [loading, setLoading] = useState(!instructor);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState<PendingAction>(null);
  const [confirm, setConfirm] = useState<PendingAction>(null);
  const [rejectionNote, setRejectionNote] = useState("");

  // Video player state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [videoDuration, setVideoDuration] = useState<string | null>(null);
  const [videoRetryKey, setVideoRetryKey] = useState(0);

  // Download loading states
  const [isDownloadingVideo, setIsDownloadingVideo] = useState(false);
  const [isDownloadingResume, setIsDownloadingResume] = useState(false);

  // Checklist state
  const [checklist, setChecklist] = useState({
    credentials: false,
    background: false,
    content: false,
    payment: false,
  });

  const loadInstructor = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    try {
      // Fetch across lists if not passed in location state
      const pendingList = await authService.getPendingInstructors();
      let match = pendingList.find(
        (item) => item.userId === userId || item.id === userId,
      );

      if (!match) {
        const approvedList = await authService.getApprovedInstructors(50);
        match = approvedList.find(
          (item) => item.userId === userId || item.id === userId,
        );
      }
      if (!match) {
        const rejectedList = await authService.getRejectedInstructors(50);
        match = rejectedList.find(
          (item) => item.userId === userId || item.id === userId,
        );
      }
      if (!match) {
        const allList = await authService.getAllInstructors(50);
        match = allList.find(
          (item) => item.userId === userId || item.id === userId,
        );
      }

      setInstructor(match || null);
      if (!match) setError("This instructor application could not be found.");
    } catch (err: unknown) {
      const message = getApiError(err);
      setError(message);
      toast({
        title: "Could not load application",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    if (!instructor) void loadInstructor();
  }, [instructor, loadInstructor]);

  const targetUserId = instructor?.userId || instructor?.id || userId || "";

  const runAction = async (action: Exclude<PendingAction, null>) => {
    if (!instructor || !targetUserId || submitting) return;

    if (action === "reject" && rejectionNote.trim().length === 0) {
      toast({
        title: "Rejection reason required",
        description: "Please enter a reason before rejecting the instructor.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(action);

    try {
      const result =
        action === "approve"
          ? await authService.approveInstructor(targetUserId)
          : await authService.rejectInstructor(targetUserId, rejectionNote.trim());

      toast({
        title:
          action === "approve"
            ? "Instructor approved successfully."
            : "Instructor rejected successfully.",
        description: result.message,
      });

      setRejectionNote("");
      setConfirm(null);

      navigate("/admin/instructor-approvals", {
        replace: true,
        state: { activeFilter, refreshTimestamp: Date.now() },
      });
    } catch (err: unknown) {
      toast({
        title: action === "approve" ? "Approval failed" : "Rejection failed",
        description: getApiError(err),
        variant: "destructive",
      });
    } finally {
      setSubmitting(null);
    }
  };

  const handleLoadedMetadata = () => {
    setVideoLoading(false);
    setVideoError(false);
    if (videoRef.current && videoRef.current.duration) {
      const totalSeconds = Math.floor(videoRef.current.duration);
      if (!Number.isNaN(totalSeconds) && totalSeconds > 0) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        setVideoDuration(`${minutes}:${seconds < 10 ? "0" : ""}${seconds}`);
      }
    }
  };

  const handleVideoError = () => {
    setVideoLoading(false);
    setVideoError(true);
  };

  const handleRetryVideo = () => {
    setVideoError(false);
    setVideoLoading(true);
    setVideoRetryKey((prev) => prev + 1);
  };

  const name = instructor ? getFullName(instructor) : "";
  const locationText = instructor ? getLocation(instructor) : "";
  const appliedTimestamp = instructor
    ? getInstructorAppliedTimestamp(instructor)
    : null;
  const formattedAppliedDate = formatAppliedDate(appliedTimestamp);
  const statusInfo = instructor
    ? getInstructorStatusInfo(instructor)
    : {
        status: "PENDING",
        label: "Pending",
        badgeClass:
          "bg-amber-100 text-amber-800 border-amber-200 font-medium px-2.5 py-0.5 rounded-full text-xs",
      };

  const videoSrc = instructor?.introVideoUrl || instructor?.introVideoFileKey;
  const hasVideo = isValidMediaUrl(videoSrc);

  const resumeSrc = instructor?.resumeFileKey || instructor?.resumeUrl;
  const hasResume = isValidMediaUrl(resumeSrc);
  const resumeFilename = extractResumeFilename(
    resumeSrc,
    `${name.replace(/\s+/g, "_")}_Resume.pdf`,
  );

  const handleDownloadVideo = async () => {
    if (!videoSrc || isDownloadingVideo) return;
    setIsDownloadingVideo(true);
    try {
      const defaultFilename = `${name.replace(/\s+/g, "_")}_intro.mp4`;
      await downloadFileFromUrl(videoSrc, defaultFilename);
    } catch (err: unknown) {
      toast({
        title: "Download failed",
        description:
          err instanceof Error
            ? err.message
            : "Unable to download intro video.",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingVideo(false);
    }
  };

  const handleDownloadResume = async () => {
    if (!resumeSrc || isDownloadingResume) return;
    setIsDownloadingResume(true);
    try {
      await downloadFileFromUrl(resumeSrc, resumeFilename);
    } catch (err: unknown) {
      toast({
        title: "Download failed",
        description:
          err instanceof Error
            ? err.message
            : "Unable to download resume file.",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingResume(false);
    }
  };

  const completedChecklistCount = Object.values(checklist).filter(Boolean).length;
  const pendingChecklistCount = 4 - completedChecklistCount;

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6" aria-busy="true">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-8 w-72" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-48 w-full rounded-2xl" />
              <Skeleton className="h-72 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!instructor) {
    return (
      <AdminLayout>
        <div className="bg-card rounded-2xl border p-12 text-center max-w-lg mx-auto">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="font-semibold text-lg">Application not available</h1>
          <p className="text-sm text-muted-foreground mt-1 mb-5">
            {error || "This instructor application could not be found."}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => void loadInstructor()}
            >
              <RefreshCw className="h-4 w-4" /> Retry
            </Button>
            <Button onClick={() => navigate("/admin/instructor-approvals")}>
              Back to Approvals
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const busy = submitting !== null;

  // Format array/string for specializations and qualifications
  const specializationsList = Array.isArray(instructor.specialization)
    ? instructor.specialization
    : typeof instructor.specialization === "string" && instructor.specialization
      ? instructor.specialization.split(",").map((s) => s.trim())
      : [];

  const qualificationsList = Array.isArray(instructor.qualifications)
    ? instructor.qualifications
    : typeof instructor.qualifications === "string" && instructor.qualifications
      ? instructor.qualifications.split(",").map((q) => q.trim())
      : [];

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Navigation & Header */}
        <div>
          <Link
            to="/admin/instructor-approvals"
            state={{ activeFilter }}
            className="inline-flex items-center gap-2 text-blue-600 text-sm font-medium focus-visible:outline-none hover:underline mb-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Approvals
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">
                Review Application - {name}
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Submitted {timeAgo(appliedTimestamp)}
              </p>
            </div>
            <Badge variant="secondary" className={statusInfo.badgeClass}>
              {statusInfo.label}
            </Badge>
          </div>
        </div>

        {/* Main Content Layout (Desktop: 2 Columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN (Cols 1-8) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Instructor Overview Card */}
            <div className="bg-card rounded-2xl border p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b pb-3">
                <UserCheck className="h-5 w-5 text-blue-600" />
                <h2 className="font-semibold text-base text-foreground">
                  Applicant Profile
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">Full Name</span>
                  <span className="font-medium text-foreground">{name}</span>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block">Email Address</span>
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{instructor.email}</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block">Location</span>
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{locationText}</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block">Submission Date</span>
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{formattedAppliedDate}</span>
                  </div>
                </div>

                {instructor.experience && (
                  <div>
                    <span className="text-xs text-muted-foreground block">Experience</span>
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{instructor.experience}</span>
                    </div>
                  </div>
                )}

                {(instructor.accountStatus || instructor.userStatus) && (
                  <div>
                    <span className="text-xs text-muted-foreground block">Account Status</span>
                    <span className="font-medium text-foreground capitalize">
                      {instructor.accountStatus || instructor.userStatus}
                    </span>
                  </div>
                )}
              </div>

              {specializationsList.length > 0 && (
                <div className="pt-2 border-t">
                  <span className="text-xs text-muted-foreground block mb-1.5">
                    Specializations
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {specializationsList.map((spec) => (
                      <span
                        key={spec}
                        className="px-2.5 py-0.5 rounded-full text-xs border border-blue-200 text-blue-700 bg-blue-50 font-medium"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {qualificationsList.length > 0 && (
                <div className="pt-2 border-t">
                  <span className="text-xs text-muted-foreground block mb-1.5 flex items-center gap-1">
                    <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                    Qualifications
                  </span>
                  <ul className="list-disc list-inside text-sm text-foreground space-y-1">
                    {qualificationsList.map((qual) => (
                      <li key={qual}>{qual}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Introduction Video Card */}
            <div className="bg-card rounded-2xl border p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Video className="h-5 w-5 text-foreground" />
                <h2 className="font-semibold text-base text-foreground">
                  Introduction Video
                </h2>
              </div>

              {hasVideo ? (
                <>
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border">
                    {videoError ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center bg-card">
                        <AlertTriangle className="h-8 w-8 text-destructive" />
                        <div>
                          <p className="text-sm font-semibold">
                            Unable to load intro video
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Please check your connection or video URL.
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 mt-1"
                          onClick={handleRetryVideo}
                        >
                          <RefreshCw className="h-4 w-4" /> Retry
                        </Button>
                      </div>
                    ) : (
                      <>
                        <video
                          key={videoRetryKey}
                          ref={videoRef}
                          controls
                          preload="metadata"
                          playsInline
                          controlsList="nodownload"
                          className="w-full h-full aspect-video rounded-xl bg-black border"
                          onLoadedMetadata={handleLoadedMetadata}
                          onCanPlay={() => setVideoLoading(false)}
                          onError={handleVideoError}
                        >
                          <source src={videoSrc as string} type="video/mp4" />
                          Your browser does not support video playback.
                        </video>
                        {videoLoading && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 backdrop-blur-sm text-white pointer-events-none">
                            <Loader2 className="h-7 w-7 animate-spin text-primary" />
                            <p className="text-sm font-medium">
                              Loading video...
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Video metadata info */}
                  <div className="text-xs text-muted-foreground space-y-0.5 mt-3 mb-4">
                    <p>Duration: {videoDuration || "Available"}</p>
                    <p>Quality: 1080p</p>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full justify-center gap-2 border rounded-lg py-2.5 font-medium"
                    onClick={() => void handleDownloadVideo()}
                    disabled={isDownloadingVideo}
                  >
                    {isDownloadingVideo ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {isDownloadingVideo
                      ? "Downloading..."
                      : "Download Intro Video"}
                  </Button>
                </>
              ) : (
                <div className="w-full aspect-video bg-muted rounded-xl border flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Video className="h-8 w-8" />
                  <p className="text-sm font-medium">
                    Intro video not uploaded
                  </p>
                </div>
              )}
            </div>

            {/* Timeline Section */}
            <div className="bg-card rounded-2xl border p-5 shadow-sm">
              <h2 className="font-semibold text-base mb-4 text-foreground">
                Timeline
              </h2>
              <div className="space-y-4 relative pl-6 border-l-2 border-muted ml-2">
                {/* Application Submitted */}
                <div className="relative">
                  <span className="absolute -left-[31px] top-1 h-3.5 w-3.5 bg-emerald-500 rounded-full border-2 border-background" />
                  <p className="text-sm font-medium text-foreground">
                    Application Submitted
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formattedAppliedDate}
                  </p>
                </div>

                {/* Status node */}
                <div className="relative pt-2">
                  <span
                    className={`absolute -left-[31px] top-3 h-3.5 w-3.5 rounded-full border-2 border-background ${
                      statusInfo.label === "Approved"
                        ? "bg-emerald-600"
                        : statusInfo.label === "Rejected"
                          ? "bg-red-600"
                          : "bg-amber-500"
                    }`}
                  />
                  <p className="text-sm font-medium text-foreground">
                    Status: {statusInfo.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {statusInfo.label === "Pending"
                      ? "Under active review"
                      : `Application mark as ${statusInfo.label}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (Cols 9-12) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Review Checklist Panel */}
            <div className="bg-blue-50/40 border border-blue-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-5 w-5 text-blue-600" />
                <h2 className="font-semibold text-base text-blue-950">
                  Review Checklist
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                {completedChecklistCount} of 4 items complete
              </p>

              <div className="space-y-3">
                <label className="flex items-center gap-3 text-sm font-medium text-zinc-800 cursor-pointer">
                  <Checkbox
                    checked={checklist.credentials}
                    onCheckedChange={(c) =>
                      setChecklist((prev) => ({
                        ...prev,
                        credentials: Boolean(c),
                      }))
                    }
                    className="border-blue-300 data-[state=checked]:bg-blue-600"
                  />
                  <span>Credentials verified</span>
                </label>

                <label className="flex items-center gap-3 text-sm font-medium text-zinc-800 cursor-pointer">
                  <Checkbox
                    checked={checklist.background}
                    onCheckedChange={(c) =>
                      setChecklist((prev) => ({
                        ...prev,
                        background: Boolean(c),
                      }))
                    }
                    className="border-blue-300 data-[state=checked]:bg-blue-600"
                  />
                  <span>Background checked</span>
                </label>

                <label className="flex items-center gap-3 text-sm font-medium text-zinc-800 cursor-pointer">
                  <Checkbox
                    checked={checklist.content}
                    onCheckedChange={(c) =>
                      setChecklist((prev) => ({
                        ...prev,
                        content: Boolean(c),
                      }))
                    }
                    className="border-blue-300 data-[state=checked]:bg-blue-600"
                  />
                  <span>Content reviewed</span>
                </label>

                <label className="flex items-center gap-3 text-sm font-medium text-zinc-800 cursor-pointer">
                  <Checkbox
                    checked={checklist.payment}
                    onCheckedChange={(c) =>
                      setChecklist((prev) => ({
                        ...prev,
                        payment: Boolean(c),
                      }))
                    }
                    className="border-blue-300 data-[state=checked]:bg-blue-600"
                  />
                  <span>Payment verified</span>
                </label>
              </div>

              <div className="border-t border-blue-200/80 my-4" />

              <div className="flex items-center gap-1.5 text-amber-600 font-medium text-xs">
                <AlertCircle className="h-4 w-4" />
                <span>{pendingChecklistCount} items pending</span>
              </div>
            </div>

            {/* Documents Panel */}
            <div className="bg-card rounded-2xl border p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-foreground" />
                <h2 className="font-semibold text-base text-foreground">
                  Documents
                </h2>
              </div>

              <div className="space-y-2.5">
                {/* Uploaded Resume */}
                <div className="bg-blue-50/50 border border-blue-100/80 rounded-xl p-3.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="h-4 w-4 text-zinc-700 shrink-0" />
                    <span className="text-sm font-medium text-foreground truncate">
                      {hasResume ? resumeFilename : "Resume not uploaded"}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-700 hover:text-blue-600 shrink-0"
                    onClick={() => void handleDownloadResume()}
                    disabled={!hasResume || isDownloadingResume}
                    aria-label="Download uploaded resume"
                  >
                    {isDownloadingResume ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="pt-6 border-t flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-end gap-3">
          <Button
            variant="outline"
            className="border-red-500 text-red-600 hover:bg-red-50 font-medium px-6 py-2.5 rounded-lg flex items-center justify-center gap-2"
            onClick={() => setConfirm("reject")}
            disabled={busy}
          >
            {submitting === "reject" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Reject Application
          </Button>

          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-2.5 rounded-lg flex items-center justify-center gap-2"
            onClick={() => setConfirm("approve")}
            disabled={busy}
          >
            {submitting === "approve" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Approve &amp; Activate
          </Button>
        </div>

        {/* Approve Confirmation Dialog */}
        <Dialog
          open={confirm === "approve"}
          onOpenChange={(open) => {
            if (!open && submitting === null) {
              setConfirm(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Instructor?</DialogTitle>
              <DialogDescription>
                This will approve the instructor application and activate the
                account.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirm(null)}
                disabled={submitting === "approve"}
              >
                Cancel
              </Button>

              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => void runAction("approve")}
                disabled={submitting === "approve"}
              >
                {submitting === "approve" && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Approve & Activate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Confirmation Dialog */}
        <Dialog
          open={confirm === "reject"}
          onOpenChange={(open) => {
            if (!open && submitting === null) {
              setConfirm(null);
              setRejectionNote("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Instructor?</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this instructor
                application.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Rejection Reason <span className="text-destructive">*</span>
              </label>

              <Textarea
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                placeholder="Enter the reason for rejection..."
                rows={5}
                disabled={submitting === "reject"}
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setConfirm(null);
                  setRejectionNote("");
                }}
                disabled={submitting === "reject"}
              >
                Cancel
              </Button>

              <Button
                variant="destructive"
                onClick={() => void runAction("reject")}
                disabled={
                  submitting === "reject" || rejectionNote.trim().length === 0
                }
              >
                {submitting === "reject" && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </AdminLayout>
  );
};

export default AdminInstructorApprovalDetail;



