import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Download,
  Linkedin,
  Link as LinkIcon,
  Instagram,
  Twitter,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { EditableSkillsBlock } from "./EditableSkillsBlock";
import { SkillPassportCard, captureAndDownloadPassportPDF, imageToDataUrl } from "./SkillPassportCard";
import { SkillPassportStampsPage } from "./SkillPassportStampsPage";
import { CourseStamp, formatCourseStampTitle } from "./CourseStamp";
import { enrollmentService } from "@/services/enrollment.service";
import { certificatesService } from "@/services/certificates.service";
import { coursesService, type CourseProgress } from "@/services/courses.service";
import { useEffect, useState } from "react";

interface EducationEntry {
  id?: string;
  school: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  description?: string;
}

interface ProfileData {
  name: string;
  username: string;
  email: string;
  phone: string;
  avatar: string;
  bio: string;
  skills: string[];
  learningInterests?: string[];
  education?: EducationEntry[];
  socials: {
    linkedin?: string;
    website?: string;
    github?: string;
    instagram?: string;
    twitter?: string;
  };
}

interface SkillPassportSectionProps {
  profile: ProfileData;
  onEditProfile: () => void;
}

interface StampItem {
  id: string;
  courseTitle: string;
  shortTitle: string;
  displayTitle: string;
  dateText: string;
}

const getEnrollmentCourseId = (enrollment: any): string =>
  String(enrollment?.courseId || enrollment?.course?.id || enrollment?.id || "");

const formatEduDate = (date?: string) => {
  if (!date) return "";

  const d = new Date(date);

  return d.toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });
};

function formatStampDate(dateStr?: string) {
  if (!dateStr) return "Issued on 31 March 2026";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return `Issued on ${dateStr}`;
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "long" });
  const year = d.getFullYear();
  return `Issued on ${day} ${month} ${year}`;
}

export const SkillPassportSection = ({
  profile,
  onEditProfile,
}: SkillPassportSectionProps) => {
  const [avatarSrc, setAvatarSrc] = useState(profile.avatar || "");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string>(profile.avatar || "");
  const [downloading, setDownloading] = useState(false);
  const [stamps, setStamps] = useState<StampItem[]>([]);
  const [loadingStamps, setLoadingStamps] = useState(true);
  const [showAllStamps, setShowAllStamps] = useState(false);

  useEffect(() => {
    setAvatarSrc(profile.avatar || "");
    if (profile.avatar) {
      if (profile.avatar.startsWith("data:")) {
        setAvatarDataUrl(profile.avatar);
      } else {
        imageToDataUrl(profile.avatar).then((dUrl) => {
          if (dUrl) setAvatarDataUrl(dUrl);
        });
      }
    } else {
      setAvatarDataUrl("");
    }
  }, [profile.avatar]);

  useEffect(() => {
    let isMounted = true;
    const loadCompletedStamps = async () => {
      setLoadingStamps(true);
      try {
        const [enrollmentsRes, certsRes] = await Promise.all([
          enrollmentService.getMyEnrollments({}, "all").catch(() => null),
          certificatesService.getMyCertificates().catch(() => null),
        ]);

        const rawEnrollments = Array.isArray(enrollmentsRes?.data)
          ? enrollmentsRes.data
          : [];

        // Exclude live courses from recorded stamps
        const recordedEnrollments = rawEnrollments.filter(
          (e: any) => !(e.course as any)?.isLive && (e.course as any)?.productType !== "LIVE_COURSE"
        );

        const certs = Array.isArray(certsRes?.data)
          ? certsRes.data
          : Array.isArray(certsRes)
          ? certsRes
          : [];

        const collected: StampItem[] = [];
        const seenCourseIds = new Set<string>();
        const seenTitles = new Set<string>();

        // 1. Completed Enrollments (100% progress check)
        recordedEnrollments.forEach((e: any) => {
          const courseId = getEnrollmentCourseId(e);

          let localMax = 0;
          let localCompCount = 0;
          try {
            const cachedMax = localStorage.getItem(`edvanz_max_progress_${courseId}`);
            if (cachedMax) localMax = Number(cachedMax) || 0;

            const cachedLessons = localStorage.getItem(`edvanz_completed_lessons_${courseId}`);
            if (cachedLessons) {
              const parsed = JSON.parse(cachedLessons);
              if (Array.isArray(parsed)) localCompCount = parsed.length;
            }
          } catch {
            /* noop */
          }

          const rawTotal = Number(
            (e.course as any)?.lessons || (e.course as any)?.totalLessons || e.progress?.totalLessons || 0
          );
          const compCount = Math.max(
            typeof e.progress?.completedLessons === "number"
              ? e.progress.completedLessons
              : Array.isArray(e.progress?.completedLessons)
              ? e.progress.completedLessons.length
              : 0,
            localCompCount
          );

          const total = Math.max(rawTotal, compCount);
          const calculatedPct =
            total > 0 ? Math.min(100, Math.round((compCount / total) * 100)) : 0;
          const finalPct = Math.max(
            p?.progressPercentage ?? 0,
            Number(e.progress?.progressPercentage ?? 0),
            calculatedPct,
            localMax
          );

          const isCompleted =
            finalPct >= 100 ||
            p?.status === "COMPLETED" ||
            e.status === "completed" ||
            (e.course as any)?.status === "COMPLETED";

          const rawTitle = e.course?.title;
          if (isCompleted && rawTitle) {
            const short = formatCourseStampTitle(rawTitle);
            const titleKey = short.toLowerCase();
            const idKey = courseId || String(e.id);

            if (!seenCourseIds.has(idKey) && !seenTitles.has(titleKey)) {
              if (idKey) seenCourseIds.add(idKey);
              seenTitles.add(titleKey);

              const dateStr =
                (p as any)?.completedAt ||
                (e as any).completedAt ||
                (e as any).updatedAt ||
                e.enrolledAt;

              collected.push({
                id: idKey || `stamp-enr-${collected.length}`,
                courseTitle: rawTitle,
                shortTitle: short,
                displayTitle: `${short} Certificate`,
                dateText: formatStampDate(dateStr),
              });
            }
          }
        });

        // 2. Unlocked Certificates (add any certificate not already captured)
        for (const c of certs) {
          const rawTitle = c.course?.title || (c as any).title || (c as any).courseTitle || "";
          const certCourseId = String(c.courseId || c.course?.id || c.id || "");
          if (rawTitle) {
            const short = formatCourseStampTitle(rawTitle);
            const titleKey = short.toLowerCase();
            const idKey = certCourseId || String(c.id);

            if (!seenCourseIds.has(idKey) && !seenTitles.has(titleKey)) {
              if (idKey) seenCourseIds.add(idKey);
              seenTitles.add(titleKey);

              const dateStr =
                c.issueDate || (c as any).completedDate || (c as any).createdAt;

              collected.push({
                id: c.id || idKey || `stamp-cert-${collected.length}`,
                courseTitle: rawTitle,
                shortTitle: short,
                displayTitle: `${short} Certificate`,
                dateText: formatStampDate(dateStr),
              });
            }
          }
        }

        if (isMounted) {
          setStamps(collected);
        }
      } catch {
        /* noop */
      } finally {
        if (isMounted) {
          setLoadingStamps(false);
        }
      }
    };

    loadCompletedStamps();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      if (avatarSrc && (!avatarDataUrl || !avatarDataUrl.startsWith("data:"))) {
        const dUrl = await imageToDataUrl(avatarSrc);
        if (dUrl) setAvatarDataUrl(dUrl);
      }
      const fileName = `${profile.name.replace(/\s+/g, "_")}_Skill_Passport.pdf`;
      const success = await captureAndDownloadPassportPDF(
        "skill-passport-card-hidden",
        "skill-passport-stamps-hidden",
        fileName
      );
      if (success) {
        toast.success("Skill Passport PDF downloaded successfully!");
      } else {
        toast.error("Failed to download Skill Passport PDF. Please try again.");
      }
    } catch {
      toast.error("Failed to download Skill Passport PDF.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Section: Profile Card + Socials (Matching Figma Design) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 md:pt-4">
        {/* Left: Profile Details Card */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-start gap-4 pb-5">
            <Avatar className="h-20 w-20 rounded-full bg-[#E8E1FF] shrink-0 border-0">
              <AvatarImage src={avatarSrc} className="object-cover rounded-full" />
              <AvatarFallback className="text-2xl font-bold bg-[#E8E1FF] text-[#604BD6]">
                {profile.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1 min-w-0 flex-1 pt-0.5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-bold text-card-foreground truncate">
                  {profile.name}
                </h2>
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="text-[#3B82F6] hover:text-[#2563EB] transition-colors p-1 -mr-1 rounded-md hover:bg-blue-50 cursor-pointer disabled:opacity-50"
                  title="Download Skill Passport PDF"
                  aria-label="Download Skill Passport PDF"
                >
                  {downloading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Download className="h-5 w-5 stroke-[2.2]" />
                  )}
                </button>
              </div>
              {profile.email && (
                <p className="text-sm text-muted-foreground underline underline-offset-2 decoration-muted-foreground/40 truncate">
                  {profile.email}
                </p>
              )}
              {profile.phone && (
                <p className="text-sm text-muted-foreground truncate">
                  {profile.phone}
                </p>
              )}
            </div>
          </div>

          <Button
            variant="outline"
            onClick={onEditProfile}
            className="w-full rounded-xl border-[#3B82F6] bg-[#3B82F6]/5 hover:bg-[#3B82F6]/10 text-[#3B82F6] font-medium py-2.5 shadow-2xs cursor-pointer"
          >
            Edit Profile
          </Button>
        </div>

        {/* Right: Socials Card */}
        <div className="bg-card rounded-2xl border border-border p-6 min-w-0 shadow-xs flex flex-col justify-between">
          <h3 className="text-lg font-bold text-card-foreground mb-4">
            Socials
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 my-auto pb-2">
            <SocialLink
              icon={<Linkedin className="h-4 w-4" />}
              label="LinkedIn"
              href={profile.socials.linkedin}
            />
            <SocialLink
              icon={<LinkIcon className="h-4 w-4" />}
              label="Website"
              href={profile.socials.website}
            />
            <SocialLink
              icon={<Instagram className="h-4 w-4" />}
              label="Instagram"
              href={profile.socials.instagram}
            />
            <SocialLink
              icon={<Twitter className="h-4 w-4" />}
              label="X(formerly Twitter)"
              href={profile.socials.twitter || profile.socials.github}
            />
          </div>
        </div>
      </div>

      {/* Stamps Achieved Loading State */}
      {loadingStamps && (
        <div className="bg-card rounded-2xl border border-border p-6 md:p-8 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-card-foreground">
              Stamps Achieved
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3.5 p-4 rounded-xl border border-border bg-background/50 animate-pulse"
              >
                <div className="h-16 w-16 sm:h-[72px] sm:w-[72px] rounded-xl bg-muted shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stamps Achieved (Displayed ONLY after the student has completed a course 100%) */}
      {!loadingStamps && stamps.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-6 md:p-8 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-card-foreground">
              Stamps Achieved
            </h3>
            <div className="flex items-center gap-2">
              {stamps.length > 3 && (
                <span className="text-xs font-semibold text-muted-foreground">
                  Showing {showAllStamps ? stamps.length : Math.min(3, stamps.length)} of {stamps.length}
                </span>
              )}
              <span className="text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                {stamps.length} {stamps.length === 1 ? "Stamp" : "Stamps"} Unlocked
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(showAllStamps ? stamps : stamps.slice(0, 3)).map((stamp) => (
              <div
                key={stamp.id}
                className="flex items-center gap-3.5 p-4 rounded-xl border border-border bg-background/50 hover:bg-background transition-all hover:shadow-2xs"
              >
                {/* Stamp Emblem in dark container matching design */}
                <div className="h-16 w-16 sm:h-[72px] sm:w-[72px] rounded-xl flex items-center justify-center shrink-0 p-1 shadow-xs ring-1 ring-border/20">
                  <CourseStamp courseName={stamp.shortTitle} size={64} />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="font-bold text-sm text-card-foreground truncate"
                    title={stamp.displayTitle}
                  >
                    {stamp.displayTitle}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stamp.dateText}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {stamps.length > 3 && (
            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => setShowAllStamps((prev) => !prev)}
                className="text-sm font-semibold text-[#3B82F6] hover:text-[#2563EB] hover:underline underline-offset-4 cursor-pointer transition-colors inline-flex items-center gap-1.5"
              >
                <span>{showAllStamps ? "See Less" : "See More"}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Off-screen passport pages used exclusively for high-res multi-page PDF generation */}
      <div
        className="fixed -left-[9999px] -top-[9999px] pointer-events-none opacity-0"
        aria-hidden="true"
      >
        <div id="skill-passport-card-hidden">
          <SkillPassportCard
            name={profile.name}
            avatar={avatarDataUrl || avatarSrc}
            memberSince="15 JAN 2026"
            status="STUDENT"
          />
        </div>
        <div id="skill-passport-stamps-hidden" className="mt-4">
          <SkillPassportStampsPage stamps={stamps} />
        </div>
      </div>

      {/* Skills & Learning Interests */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <EditableSkillsBlock
          title="Your Skills"
          field="skills"
          initialSkills={profile.skills}
        />
        <EditableSkillsBlock
          title="Learning Interests"
          field="learningInterests"
          initialSkills={profile.learningInterests ?? []}
        />
      </div>

      {/* Education */}
      <div className="bg-card rounded-2xl border border-border p-6 md:p-8 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-bold text-card-foreground">Education</h3>
          <button
            onClick={onEditProfile}
            className="text-sm font-medium text-[#604BD6] hover:opacity-80"
          >
            Edit
          </button>
        </div>
        <div className="space-y-4">
          {profile.education?.length ? (
            profile.education.map((edu, index) => (
              <div
                key={edu.id ?? index}
                className="rounded-2xl border border-border bg-background px-6 py-5 transition-all"
              >
                {/* School */}
                <h4 className="text-lg font-semibold text-card-foreground">
                  {edu.school}
                </h4>

                {/* Degree + Field */}
                {(edu.degree || edu.fieldOfStudy) && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(" - ")}
                  </p>
                )}

                {/* Dates */}
                {(edu.startDate || edu.endDate) && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {formatEduDate(edu.startDate)}
                    {edu.startDate || edu.endDate ? " – " : ""}
                    {edu.endDate ? formatEduDate(edu.endDate) : "Present"}
                  </p>
                )}
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No education added yet.
              </p>

              <button
                onClick={onEditProfile}
                className="mt-2 text-[#604BD6] text-sm font-medium hover:underline"
              >
                Add Education
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SocialLink = ({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
}) => {
  const disabled = !href;
  const className =
    "flex items-center gap-2 min-w-0 text-sm font-medium text-[#3B82F6] hover:text-[#2563EB] transition-colors rounded-md py-1 disabled:opacity-50 disabled:cursor-not-allowed";
  if (disabled) {
    return (
      <button
        type="button"
        disabled
        className={className}
        aria-label={`${label} (not set)`}
      >
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </button>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={`Open ${label} profile`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </a>
  );
};
