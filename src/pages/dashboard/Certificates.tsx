import { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { certificatesService } from "@/services/certificates.service";
import { coursesService } from "@/services/courses.service";
import type { Certificate, Course, VerifyCertificateResponse } from "@/types/api.types";
import { getApiError, isResourceNotFound } from "@/lib/api-error";
import {
  Award,
  Download,
  CheckCircle2,
  User as UserIcon,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { CertificateSheet } from "@/components/certificates/CertificateSheet";
import { downloadCertificateFromElement } from "@/lib/certificate-pdf";

const DEFAULT_COURSE_THUMB =
  "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=400&h=240&fit=crop";

const Certificates = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);

  // Hidden export sheet state
  const [exportCert, setExportCert] = useState<{ cert: Certificate; holderName: string } | null>(null);
  const exportSheetRef = useRef<HTMLDivElement>(null);

  // Verification state
  const [verifyNumber, setVerifyNumber] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState<VerifyCertificateResponse | null>(null);

  // Download state
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCertificatesAndCourses = async () => {
      try {
        const [certResponse, coursesResponse] = await Promise.allSettled([
          certificatesService.getMyCertificates(),
          coursesService.getCourses(),
        ]);

        let list: Certificate[] = [];
        if (certResponse.status === "fulfilled") {
          const raw = certResponse.value;
          list = Array.isArray(raw)
            ? raw
            : Array.isArray(raw?.data)
            ? raw.data
            : [];
        } else if (!isResourceNotFound(certResponse.reason)) {
          toast({
            title: "Error",
            description: getApiError(certResponse.reason, "Failed to load certificates. Please try again."),
            variant: "destructive",
          });
        }

        // Build course map for instructor name fallback
        const courseMap = new Map<string, Course>();
        if (coursesResponse.status === "fulfilled" && coursesResponse.value?.data) {
          const allCourses = Array.isArray(coursesResponse.value.data) ? coursesResponse.value.data : [];
          allCourses.forEach((c) => {
            if (c.id) courseMap.set(c.id, c);
          });
        }

        // Enrich certificates with accurate instructor name
        const enrichedList = list.map((cert) => {
          const matchedCourse = cert.courseId ? courseMap.get(cert.courseId) : undefined;
          const resolvedInstructorName =
            cert.instructorName ||
            cert.instructor?.name ||
            matchedCourse?.instructorName ||
            matchedCourse?.instructor?.name ||
            "Instructor";

          const resolvedCourseTitle =
            cert.courseTitle ||
            cert.course?.title ||
            matchedCourse?.title ||
            "Course Certificate";

          const resolvedThumbnail =
            cert.courseThumbnail ||
            cert.course?.thumbnail ||
            matchedCourse?.thumbnail ||
            DEFAULT_COURSE_THUMB;

          const resolvedCategory =
            cert.category ||
            cert.course?.category ||
            (typeof matchedCourse?.category === "string" ? matchedCourse.category : matchedCourse?.category?.name) ||
            "Course";

          return {
            ...cert,
            instructorName: resolvedInstructorName,
            courseTitle: resolvedCourseTitle,
            courseThumbnail: resolvedThumbnail,
            category: resolvedCategory,
          };
        });

        setCertificates(enrichedList);
      } catch (error) {
        if (!isResourceNotFound(error)) {
          toast({
            title: "Error",
            description: getApiError(error, "Failed to load certificates. Please try again."),
            variant: "destructive",
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCertificatesAndCourses();
  }, [toast]);

  // Derived statistics
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const totalCertificates = certificates.length;

  const coursesCompleted = useMemo(() => {
    return certificates.filter(
      (c) => c.status === "completed" || c.completedDate || c.issueDate
    ).length;
  }, [certificates]);

  const thisYearCount = useMemo(() => {
    return certificates.filter((c) => {
      const dateStr = c.completedDate || c.issueDate;
      if (!dateStr) return false;
      const year = new Date(dateStr).getFullYear();
      return year === currentYear;
    }).length;
  }, [certificates, currentYear]);

  const handleDownload = async (cert: Certificate) => {
    setDownloadingId(cert.id);
    try {
      const holderName = user?.name ?? "Student";
      setExportCert({ cert, holderName });
      await new Promise((r) => setTimeout(r, 60));
      if (exportSheetRef.current) {
        const fileName = `${cert.certificateNumber || "certificate"}.pdf`;
        const success = await downloadCertificateFromElement(exportSheetRef.current, fileName);
        if (success) {
          toast({
            title: "Downloaded!",
            description: `Certificate ${cert.certificateNumber} downloaded successfully.`,
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to download certificate. Please try again.",
            variant: "destructive",
          });
        }
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to download certificate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
      setExportCert(null);
    }
  };

  const handleOpenVerifyModal = () => {
    setVerifyNumber("");
    setVerifyError(null);
    setVerifySuccess(null);
    setVerifyDialogOpen(true);
  };

  const handleVerify = async () => {
    const cleanNumber = verifyNumber.trim();
    if (!cleanNumber) {
      setVerifyError("*Please enter a valid certificate number");
      setVerifySuccess(null);
      return;
    }

    setVerifying(true);
    setVerifyError(null);
    setVerifySuccess(null);

    try {
      const response = await certificatesService.verifyCertificate(cleanNumber);
      if (response.success && response.data) {
        if (response.data.valid) {
          setVerifySuccess(response.data);
          setVerifyError(null);
        } else {
          setVerifyError(
            response.data.message
              ? `*${response.data.message}`
              : "*Certificate Not Found"
          );
          setVerifySuccess(null);
        }
      } else {
        setVerifyError("*Certificate Not Found");
        setVerifySuccess(null);
      }
    } catch {
      setVerifyError("*Unable to verify certificate. Please try again.");
      setVerifySuccess(null);
    } finally {
      setVerifying(false);
    }
  };

  const formatCompletionDate = (dateStr?: string) => {
    if (!dateStr) return "Completed March 2025";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return `Completed ${dateStr}`;
    return `Completed ${date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })}`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-6 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Certificates
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              View, download, and share your earned certificates
            </p>
          </div>

          {/* Verify Certificate Button */}
          <Button
            onClick={handleOpenVerifyModal}
            variant="outline"
            className="h-10 px-4 bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-900 text-xs sm:text-sm font-semibold rounded-xl shadow-2xs flex items-center gap-2 self-start sm:self-auto shrink-0 transition-colors"
          >
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-50 text-[#1D4ED8]">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
            <span>Verify Certificate</span>
          </Button>
        </div>

        {/* Stats Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5 animate-pulse"
              >
                <div className="h-10 w-10 rounded-full bg-slate-200 shrink-0" />
                <div className="h-4 w-32 bg-slate-200 rounded" />
              </div>
            ))
          ) : (
            <>
              {/* Stat Card 1 */}
              <div className="relative overflow-hidden bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1D4ED8] text-white font-bold text-base shadow-2xs">
                  {totalCertificates}
                </div>
                <span className="font-bold text-slate-900 text-sm sm:text-base">
                  Total Certificates
                </span>
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-blue-50/70 to-transparent" />
              </div>

              {/* Stat Card 2 */}
              <div className="relative overflow-hidden bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1D4ED8] text-white font-bold text-base shadow-2xs">
                  {coursesCompleted}
                </div>
                <span className="font-bold text-slate-900 text-sm sm:text-base">
                  Courses Completed
                </span>
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-blue-50/70 to-transparent" />
              </div>

              {/* Stat Card 3 */}
              <div className="relative overflow-hidden bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1D4ED8] text-white font-bold text-base shadow-2xs">
                  {thisYearCount}
                </div>
                <span className="font-bold text-slate-900 text-sm sm:text-base">
                  This Year
                </span>
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-blue-50/70 to-transparent" />
              </div>
            </>
          )}
        </div>

        {/* Certificate Cards Grid / Empty State */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3 animate-pulse"
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-[145px] h-[95px] bg-slate-200 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-slate-200 rounded" />
                    <div className="h-3.5 w-1/2 bg-slate-200 rounded" />
                    <div className="h-8 w-24 bg-slate-200 rounded mt-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : certificates.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-10 text-center shadow-xs max-w-md mx-auto my-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[#1D4ED8] mb-3">
              <Award className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">No certificates yet</h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Complete a course to earn your first certificate.
            </p>
            <Button
              asChild
              className="mt-5 bg-[#1D4ED8] hover:bg-blue-700 text-white rounded-lg px-5 h-9 text-xs font-semibold"
            >
              <Link to="/courses">Browse Courses</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {certificates.map((cert, index) => {
              const courseTitle =
                cert.courseTitle ||
                cert.course?.title ||
                "Course Certificate";
              const thumbnail =
                cert.courseThumbnail ||
                cert.course?.thumbnail ||
                DEFAULT_COURSE_THUMB;
              const category =
                cert.category || cert.course?.category || "Course";
              const completionDate =
                cert.completedDate || cert.issueDate;
              const instructorName =
                cert.instructorName ||
                cert.instructor?.name ||
                "Instructor";
              const isDownloading = downloadingId === cert.id;

              return (
                <motion.div
                  key={cert.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: index * 0.03 }}
                  className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col sm:flex-row gap-4 sm:items-center justify-between"
                >
                  {/* Left Thumbnail */}
                  <img
                    src={thumbnail}
                    alt={courseTitle}
                    className="w-full sm:w-[145px] h-[95px] rounded-xl object-cover shrink-0 bg-slate-100"
                  />

                  {/* Right Content */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between h-full space-y-2.5">
                    <div>
                      {/* Course Title */}
                      <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 leading-snug line-clamp-1">
                        {courseTitle}
                      </h3>

                      {/* Category & Completed Date */}
                      <p className="text-xs text-slate-500 font-medium pt-0.5">
                        {category} · {formatCompletionDate(completionDate)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      {/* Instructor */}
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#1D4ED8] min-w-0">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1D4ED8] text-white shrink-0">
                          <UserIcon className="h-3 w-3" />
                        </span>
                        <span className="truncate">{instructorName}</span>
                      </div>

                      {/* Download Button */}
                      <Button
                        onClick={() => handleDownload(cert)}
                        disabled={isDownloading}
                        className="h-9 px-4 rounded-xl bg-[#1D4ED8] hover:bg-blue-700 text-white font-medium text-xs sm:text-sm flex items-center gap-1.5 shadow-2xs shrink-0"
                      >
                        {isDownloading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <span>Download</span>
                            <Download className="h-3.5 w-3.5" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Verify Certificate Modal */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border-0">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-xl font-bold text-slate-900">
              Verify Certificate
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-slate-500">
              Enter a certificate number to verify its authenticity
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="flex flex-row items-center gap-3">
              <Input
                placeholder="CERT-2026-0012323"
                value={verifyNumber}
                onChange={(e) => {
                  setVerifyNumber(e.target.value);
                  if (verifyError) setVerifyError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                className="flex-1 h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#1D4ED8]"
              />

              <Button
                onClick={handleVerify}
                disabled={verifying || !verifyNumber.trim()}
                className="h-11 px-6 bg-[#1D4ED8] hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs shrink-0"
              >
                {verifying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Verify"
                )}
              </Button>
            </div>

            {/* Validation Message */}
            {verifyError && (
              <p className="text-xs font-semibold text-red-500 pt-0.5">
                {verifyError}
              </p>
            )}

            {verifySuccess && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs sm:text-sm space-y-2 mt-3">
                <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Certificate verified successfully</span>
                </div>

                <div className="space-y-1 text-slate-700 pt-1 text-xs">
                  {verifySuccess.studentName && (
                    <p>
                      <span className="font-semibold text-slate-900">Student:</span>{" "}
                      {verifySuccess.studentName}
                    </p>
                  )}
                  {verifySuccess.courseTitle && (
                    <p>
                      <span className="font-semibold text-slate-900">Course:</span>{" "}
                      {verifySuccess.courseTitle}
                    </p>
                  )}
                  {verifySuccess.completedDate && (
                    <p>
                      <span className="font-semibold text-slate-900">Completed:</span>{" "}
                      {verifySuccess.completedDate}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Off-screen certificate sheet for pixel-perfect PDF export */}
      {exportCert && (
        <div
          className="fixed -left-[9999px] -top-[9999px] w-[1040px] pointer-events-none opacity-0"
          aria-hidden="true"
        >
          <CertificateSheet
            innerRef={exportSheetRef}
            holderName={exportCert.holderName}
            courseTitle={exportCert.cert.courseTitle || exportCert.cert.course?.title || "Course"}
            issuedOn={new Date(exportCert.cert.issueDate || exportCert.cert.completedDate || Date.now()).toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" })}
            certificateNumber={exportCert.cert.certificateNumber}
          />
        </div>
      )}
    </div>
  );
};

export default Certificates;
