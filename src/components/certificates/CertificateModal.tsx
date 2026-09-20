import { useRef, useEffect, useState } from "react";
import { Download, Loader2, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Certificate } from "@/types/api.types";
import { useAuth } from "@/contexts/AuthContext";
import { profileService } from "@/services/profile.service";
import { CertificateSheet } from "./CertificateSheet";
import { downloadCertificateFromElement } from "@/lib/certificate-pdf";
import { toast } from "sonner";

interface CertificateModalProps {
  certificate?: Certificate | null;
  holderName?: string;
  studentName?: string;
  courseTitle?: string;
  issueDate?: string | Date;
  certificateNumber?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload?: (certificate?: Certificate) => void | Promise<void>;
  downloading?: boolean;
}

const formatIssuedOn = (value?: string | Date): string => {
  if (!value) {
    return new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "2-digit",
      year: "numeric",
    });
  }
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });
};

export const CertificateModal = ({
  certificate,
  holderName,
  studentName,
  courseTitle: propCourseTitle,
  issueDate: propIssueDate,
  certificateNumber: propCertNumber,
  open,
  onOpenChange,
  onDownload,
  downloading = false,
}: CertificateModalProps) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const [resolvedFullName, setResolvedFullName] = useState<string>("");
  const [internalDownloading, setInternalDownloading] = useState(false);

  useEffect(() => {
    let alive = true;
    const fetchFullName = async () => {
      // 1. If explicit studentName or holderName passed and doesn't look like username/email
      const direct = studentName || holderName;
      if (direct && !direct.includes("@") && direct !== user?.email?.split("@")[0]) {
        if (alive) setResolvedFullName(direct);
        return;
      }

      // 2. Try fetching from profileService
      try {
        const res = await profileService.getProfile();
        if (alive && res.success && res.data) {
          const fn = [res.data.firstName, res.data.lastName].filter(Boolean).join(" ");
          if (fn) {
            if (alive) setResolvedFullName(fn);
            return;
          }
        }
      } catch {}

      // 3. Fallback to user.name or direct name
      if (alive) {
        setResolvedFullName(user?.name || direct || "Student Name");
      }
    };

    if (open) {
      fetchFullName();
    }

    return () => {
      alive = false;
    };
  }, [open, studentName, holderName, user]);

  const displayHolderName = resolvedFullName || studentName || holderName || user?.name || "Student Name";

  const displayCourseTitle =
    propCourseTitle ||
    certificate?.courseTitle ||
    certificate?.course?.title ||
    "Course Title";

  const rawDate =
    propIssueDate ||
    certificate?.completedDate ||
    certificate?.issueDate ||
    new Date();

  const issuedOn = formatIssuedOn(rawDate);
  const displayCertNumber = propCertNumber || certificate?.certificateNumber || "EDV-2026-335657";

  const handleDownloadClick = async () => {
    if (onDownload) {
      await onDownload(certificate || undefined);
      return;
    }

    if (sheetRef.current) {
      setInternalDownloading(true);
      try {
        const fileName = `${displayCertNumber || "Certificate"}.pdf`;
        const success = await downloadCertificateFromElement(sheetRef.current, fileName);
        if (success) {
          toast.success("Certificate downloaded successfully!");
        } else {
          toast.error("Failed to download certificate.");
        }
      } catch {
        toast.error("Failed to download certificate.");
      } finally {
        setInternalDownloading(false);
      }
    }
  };

  const isBusy = downloading || internalDownloading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[min(1040px,96vw)] p-0 border-0 bg-transparent shadow-none"
      >
        <div className="relative">
          {/* Top Action Toolbar */}
          <div className="absolute -top-12 right-0 flex items-center gap-2 z-50">
            <Button
              size="sm"
              onClick={handleDownloadClick}
              disabled={isBusy}
              className="h-9 gap-2 rounded-xl bg-[#2563EB] text-white hover:bg-blue-700 shadow-md font-semibold cursor-pointer"
            >
              {isBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download PDF
            </Button>
            <Button
              size="icon"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              className="h-9 w-9 rounded-xl bg-white/90 hover:bg-white text-slate-800 shadow-md cursor-pointer"
              aria-label="Close certificate preview"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Certificate Render Sheet */}
          <CertificateSheet
            innerRef={sheetRef}
            holderName={displayHolderName}
            courseTitle={displayCourseTitle}
            issuedOn={issuedOn}
            certificateNumber={displayCertNumber}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CertificateModal;
