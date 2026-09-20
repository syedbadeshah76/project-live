import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Check, ImageIcon, Film, FileText, Trash2, Video, Calendar,
  Clock, DollarSign, Globe, Lock, Eye, Lightbulb, CheckCircle2, Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { categoriesService } from "@/services/categories.service";
import { liveCoursesService } from "@/services/liveCourses.service";
import type {
  CreateLiveCourseDto, LiveAccessType, LiveDurationUnit, LiveMeetingPlatform,
  LiveVisibility, TimezoneOption, WeekDay,
} from "@/types/LiveCourse.types";
import { cn } from "@/lib/utils";

const STEPS = [
  { n: 1, label: "Basic Info" },
  { n: 2, label: "Live Schedule" },
  { n: 3, label: "Pricing" },
  { n: 4, label: "Review" },
  { n: 5, label: "Publish" },
];

const isUuid = (v?: string) =>
  !!v && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v);

const DAYS: { id: WeekDay; label: string }[] = [
  { id: "MON", label: "Mon" }, { id: "TUE", label: "Tue" }, { id: "WED", label: "Wed" },
  { id: "THU", label: "Thu" }, { id: "FRI", label: "Fri" }, { id: "SAT", label: "Sat" },
  { id: "SUN", label: "Sun" },
];

const PLATFORMS: { id: LiveMeetingPlatform; label: string }[] = [
  { id: "ZOOM", label: "Zoom" },
];

interface ResourceDraft { id: string; name: string; size: number; file: File; url?: string }

const uid = () => Math.random().toString(36).slice(2, 10);
const fmtDate = (v?: string) => (v ? new Date(`${v}T00:00:00`).toLocaleDateString() : "Not set");

/* ---------------------------- shared UI atoms ---------------------------- */

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground sm:text-lg">
        {icon}{title}
      </h3>
      {children}
    </div>
  );
}

function RadioRow({
  selected, title, subtitle, icon, onSelect,
}: { selected: boolean; title: string; subtitle?: string; icon?: React.ReactNode; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
        selected ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-muted/50"
      }`}
    >
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
        selected ? "border-primary" : "border-muted-foreground/40"
      }`}>
        {selected && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{title}</span>
        {subtitle && <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>}
      </span>
      {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

function ToggleRow({
  title, subtitle, checked, onChange,
}: { title: string; subtitle: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/50 p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function TipsCard({ title, tips }: { title: string; tips: string[] }) {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
      <p className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
        <Lightbulb className="h-4 w-4 text-primary" />{title}
      </p>
      <ul className="space-y-1.5">
        {tips.map((t) => (
          <li key={t} className="flex gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />{t}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------- component ------------------------------- */

interface Props {
  mode?: "create" | "edit";
  onSwitchToRecorded?: () => void;
}

export default function InstructorLiveCourseForm({ mode = "create", onSwitchToRecorded }: Props) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [level, setLevel] = useState("");
  const [language, setLanguage] = useState("");
  const [thumbnail, setThumbnail] = useState<{ file?: File; preview?: string }>({});
  const [promoVideo, setPromoVideo] = useState<{ file?: File; name?: string }>({});
  const [resources, setResources] = useState<ResourceDraft[]>([]);

  const thumbInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const pdfInput = useRef<HTMLInputElement>(null);

  // Step 2
  const [platform, setPlatform] = useState<LiveMeetingPlatform>("ZOOM");
  const [customLink, setCustomLink] = useState("");
  const [timezones, setTimezones] = useState<TimezoneOption[]>([
    { id: "UTC", label: "UTC (Coordinated Universal Time)", country: "Global", offset: "+00:00" },
  ]);
  const [timezone, setTimezone] = useState("UTC");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [durationValue, setDurationValue] = useState(12);
  const [durationUnit, setDurationUnit] = useState<LiveDurationUnit>("WEEKS");
  const [sessionDays, setSessionDays] = useState<WeekDay[]>(["MON", "WED", "FRI"]);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:30");
  const [sessionDuration, setSessionDuration] = useState(90);
  const [maxSeats, setMaxSeats] = useState(50);
  const [enrollmentDeadline, setEnrollmentDeadline] = useState("");
  const [waitingList, setWaitingList] = useState(true);
  const [recordSessions, setRecordSessions] = useState(true);
  const [attendanceRequired, setAttendanceRequired] = useState(true);
  const [liveChat, setLiveChat] = useState(true);

  // Step 3
  const [accessType, setAccessType] = useState<LiveAccessType>("PAID");
  const [basePrice, setBasePrice] = useState<string>("99.99");
  const [discountPrice, setDiscountPrice] = useState<string>("");
  const [visibility, setVisibility] = useState<LiveVisibility>("PUBLIC");
  const [step3Attempted, setStep3Attempted] = useState(false);

  const discountPriceError = useMemo(() => {
    if (accessType !== "PAID") return null;
    const isBaseEntered = basePrice !== undefined && basePrice !== null && basePrice.trim() !== "";
    if (!isBaseEntered) return null;

    if (!discountPrice || discountPrice.trim() === "") {
      return "Discount price is required.";
    }
    const base = Number(basePrice);
    const disc = Number(discountPrice);
    if (Number.isNaN(disc) || disc <= 0) {
      return "Discount price must be a valid positive number.";
    }
    if (!Number.isNaN(base) && disc >= base) {
      return "Discount price must be lower than the base price.";
    }
    return null;
  }, [accessType, basePrice, discountPrice]);

  const [categories, setCategories] = useState<{ id: string; name: string; subcategories?: { id: string; name: string }[] }[]>([]);
  const [subcategories, setSubcategories] = useState<{ id: string; name: string }[]>([]);

  // Hydrate form data when mode === "edit"
  useEffect(() => {
    if (mode !== "edit" || !id) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await liveCoursesService.getById(id);
        if (!alive || !res) return;
        const data = res?.data ?? res;
        setCreatedCourseId(String(data.id || id));

        // Step 1: Basic Info
        if (data.title) setTitle(data.title);
        if (data.description) setDescription(data.description);
        if (data.categoryId || data.category?.id) {
          setCategoryId(String(data.categoryId || data.category?.id));
        }
        if (data.subcategoryId || data.subcategory?.id || data.subcategory) {
          setSubcategory(String(data.subcategoryId || data.subcategory?.id || data.subcategory));
        }
        if (data.level) setLevel(String(data.level).toUpperCase());
        if (data.language) setLanguage(data.language);

        const thumb = data.thumbnailUrl || data.thumbnail;
        if (thumb) {
          setThumbnail({ preview: thumb });
          setUploadedThumbUrl(thumb);
        }
        const promo = data.promoVideoUrl || data.previewVideo;
        if (promo) {
          setPromoVideo({ name: String(promo).split("/").pop() || "Promotional Video" });
          setUploadedPromoUrl(promo);
        }
        const pdf = data.pdfUrl || (Array.isArray(data.resourceUrls) && data.resourceUrls[0]);
        if (pdf) {
          setUploadedPdfUrl(pdf);
          setResources([
            { id: uid(), name: String(pdf).split("/").pop() || "Resource Document.pdf", size: 0, file: new File([], "") },
          ]);
        }

        // Step 2: Schedule
        const sched = data.schedule || data;
        if (sched.meetingPlatform) setPlatform(sched.meetingPlatform as LiveMeetingPlatform);
        if (sched.customMeetingLink) setCustomLink(sched.customMeetingLink);
        if (sched.timezone) setTimezone(sched.timezone);
        if (sched.startDate) setStartDate(String(sched.startDate).split("T")[0]);
        if (sched.endDate) setEndDate(String(sched.endDate).split("T")[0]);
        if (sched.durationValue) setDurationValue(Number(sched.durationValue));
        if (sched.durationUnit) setDurationUnit(sched.durationUnit as LiveDurationUnit);

        const rawDays = sched.sessionDays || sched.daysOfWeek;
        if (rawDays) {
          const arr = Array.isArray(rawDays) ? rawDays : String(rawDays).split(",");
          const WEEKDAY_REVERSE: Record<string, WeekDay> = {
            MONDAY: "MON", TUESDAY: "TUE", WEDNESDAY: "WED", THURSDAY: "THU",
            FRIDAY: "FRI", SATURDAY: "SAT", SUNDAY: "SUN",
            MON: "MON", TUE: "TUE", WED: "WED", THU: "THU", FRI: "FRI", SAT: "SAT", SUN: "SUN",
          };
          const parsed = arr.map((d: string) => WEEKDAY_REVERSE[d.trim().toUpperCase()]).filter(Boolean);
          if (parsed.length > 0) setSessionDays(parsed);
        }

        if (sched.sessionStartTime || sched.startTime) {
          setStartTime(String(sched.sessionStartTime || sched.startTime).slice(0, 5));
        }
        if (sched.sessionEndTime || sched.endTime) {
          setEndTime(String(sched.sessionEndTime || sched.endTime).slice(0, 5));
        }
        if (sched.sessionDurationMinutes || sched.sessionDuration) {
          setSessionDuration(Number(sched.sessionDurationMinutes || sched.sessionDuration));
        }
        if (sched.maxSeats || sched.maximumSeats) {
          setMaxSeats(Number(sched.maxSeats || sched.maximumSeats));
        }
        if (sched.enrollmentDeadline) setEnrollmentDeadline(String(sched.enrollmentDeadline).split("T")[0]);
        if (sched.enableWaitingList !== undefined) setWaitingList(!!sched.enableWaitingList);
        if (sched.autoRecordSessions !== undefined) setRecordSessions(!!sched.autoRecordSessions);
        if (sched.attendanceRequired !== undefined) setAttendanceRequired(!!sched.attendanceRequired);
        if (sched.enableLiveChat !== undefined) setLiveChat(!!sched.enableLiveChat);

        // Step 3: Pricing & Visibility
        const pricingData = data.pricing || data;
        if (pricingData.accessType) setAccessType((String(pricingData.accessType).toUpperCase()) as LiveAccessType);
        if (pricingData.basePrice !== undefined && pricingData.basePrice !== null) {
          setBasePrice(String(pricingData.basePrice));
        }
        if (pricingData.discountedPrice !== undefined && pricingData.discountedPrice !== null) {
          setDiscountPrice(String(pricingData.discountedPrice));
        }
        if (pricingData.visibility) setVisibility((String(pricingData.visibility).toUpperCase()) as LiveVisibility);
      } catch (err: any) {
        toast({
          title: "Failed to load live course",
          description: err?.message || "Course not found",
          variant: "destructive",
        });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [mode, id, toast]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const treeRes: any = await categoriesService.getCategoryTree();
        const treeArr = Array.isArray(treeRes) ? treeRes : treeRes?.data ?? [];
        if (alive && Array.isArray(treeArr) && treeArr.length > 0) {
          setCategories(
            treeArr.map((c: any) => ({
              id: String(c.id),
              name: c.name ?? c.title ?? "Uncategorized",
              subcategories: Array.isArray(c.subcategories)
                ? c.subcategories.map((sc: any) => ({ id: String(sc.id), name: sc.name ?? sc.title }))
                : [],
            }))
          );
        } else {
          const res = await categoriesService.getCategories();
          const list = res?.data ?? [];
          if (alive && Array.isArray(list)) {
            const mainCats = list.filter((c: any) => !c.parentId && !c.parent_id);
            setCategories(mainCats.map((c: any) => ({ id: String(c.id), name: c.name ?? c.title ?? "Uncategorized" })));
          }
        }
      } catch {
        /* categories stay empty */
      }
      const tzs = await liveCoursesService.listTimezones();
      if (alive) {
        const utcList = tzs.filter((tz) => tz.id === "UTC" || tz.label?.includes("UTC"));
        const finalList = utcList.length ? utcList : [{ id: "UTC", label: "UTC (Coordinated Universal Time)", country: "Global", offset: "+00:00" }];
        setTimezones(finalList);
        setTimezone("UTC");
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!categoryId) {
      setSubcategories([]);
      setSubcategory("");
      return;
    }
    let alive = true;
    (async () => {
      try {
        const selectedMain = categories.find((c) => String(c.id) === String(categoryId));
        if (selectedMain && selectedMain.subcategories && selectedMain.subcategories.length > 0) {
          if (alive) setSubcategories(selectedMain.subcategories);
          return;
        }

        const res = await categoriesService.getSubcategories(categoryId);
        let list = res?.data ?? [];
        if (!Array.isArray(list) || list.length === 0) {
          const flatRes = await categoriesService.getCategories({ parentId: categoryId });
          list = flatRes?.data ?? [];
        }
        if (alive && Array.isArray(list)) {
          setSubcategories(list.map((sc: any) => ({ id: String(sc.id), name: sc.name ?? sc.title })));
        } else if (alive) {
          setSubcategories([]);
          setSubcategory("");
        }
      } catch {
        if (alive) {
          setSubcategories([]);
          setSubcategory("");
        }
      }
    })();
    return () => { alive = false; };
  }, [categoryId, categories]);

  useEffect(() => () => { if (thumbnail.preview) URL.revokeObjectURL(thumbnail.preview); }, [thumbnail.preview]);

  const totalWeeks = useMemo(
    () => (durationUnit === "MONTHS" ? durationValue * 4 : durationValue),
    [durationValue, durationUnit],
  );
  const totalSessions = useMemo(
    () => totalWeeks * sessionDays.length,
    [totalWeeks, sessionDays.length],
  );
  const daysLabel = useMemo(() => {
    const names = sessionDays.map((d) => DAYS.find((x) => x.id === d)?.label ?? d);
    if (!names.length) return "Not set";
    return names.length <= 2 ? names.join(", ") : `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
  }, [sessionDays]);

  /* ------------------------------ file handlers ----------------------------- */

  const onThumb = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Maximum thumbnail size is 5MB.", variant: "destructive" });
      return;
    }
    setThumbProgress(null);
    setThumbnail({ file, preview: URL.createObjectURL(file) });
  };

  const onVideo = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 500 * 1024 * 1024) {
      toast({ title: "Video too large", description: "Maximum promotional video size is 500MB.", variant: "destructive" });
      return;
    }
    setPromoProgress(null);
    setPromoVideo({ file, name: file.name });
  };

  const onPdfs = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    const valid = files.filter((f) => f.type === "application/pdf" && f.size <= 25 * 1024 * 1024);
    if (valid.length !== files.length) {
      toast({ title: "Some files skipped", description: "Only PDF files up to 25MB are allowed.", variant: "destructive" });
    }
    setResources((prev) => [...prev, ...valid.map((f) => ({ id: uid(), name: f.name, size: f.size, file: f }))]);
  };

  /* -------------------------------- validation ------------------------------ */

  const validateStep = (s: number) => {
    if (s === 1) {
      if (!title.trim()) return "Course title is required.";
      if (!description.trim()) return "Course description is required.";
      if (!categoryId) return "Please select a category.";
      if (!level) return "Please select a course level.";
      if (!language) return "Please select a language.";
    }
    if (s === 2) {
      if (platform === "CUSTOM" && !customLink.trim()) return "Please provide the custom meeting link.";
      if (!startDate) return "Course start date is required.";
      if (!endDate) return "Course end date is required.";
      if (new Date(endDate) < new Date(startDate)) return "End date must be after the start date.";
      if (!sessionDays.length) return "Select at least one session day.";
      if (sessionDuration <= 0) return "Session duration must be greater than 0.";
      if (maxSeats <= 0) return "Maximum seats must be greater than 0.";
      if (enrollmentDeadline && new Date(enrollmentDeadline) > new Date(startDate))
        return "Enrollment deadline must be on or before the start date.";
    }
    if (s === 3 && accessType === "PAID") {
      const base = Number(basePrice);
      const isBaseEntered = basePrice !== undefined && basePrice !== null && basePrice.trim() !== "";

      if (!isBaseEntered || Number.isNaN(base) || base <= 0) {
        return "Base price is required for a paid course.";
      }

      if (isBaseEntered) {
        if (!discountPrice || discountPrice.trim() === "") {
          return "Discount price is required.";
        }
        const disc = Number(discountPrice);
        if (Number.isNaN(disc) || disc <= 0) {
          return "Discount price must be a valid positive number.";
        }
        if (disc >= base) {
          return "Discount price must be lower than the base price.";
        }
      }
    }
    return null;
  };

  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null);

  const [uploadedThumbUrl, setUploadedThumbUrl] = useState("");
  const [uploadedPromoUrl, setUploadedPromoUrl] = useState("");
  const [uploadedPdfUrl, setUploadedPdfUrl] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");

  const [thumbProgress, setThumbProgress] = useState<number | null>(null);
  const [promoProgress, setPromoProgress] = useState<number | null>(null);
  const [resourceProgress, setResourceProgress] = useState<Record<string, number>>({});

  const goNext = async () => {
    if (step === 3) {
      setStep3Attempted(true);
    }
    const err = validateStep(step);
    if (err) {
      toast({ title: "Missing information", description: err, variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (step === 1) {
        setUploadStatus("Saving course details...");
        const slugBase = title
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        const uniqueSlug = `${slugBase || "live-course"}-${Date.now().toString(36)}`;

        const basicReq: any = {
          title: title.trim(),
          slug: uniqueSlug,
          description: description.trim(),
          categoryId,
          language: language || "English",
          level: (level || "INTERMEDIATE").toUpperCase(),
        };
        if (user?.id && isUuid(user.id)) {
          basicReq.instructorId = user.id;
        }
        if (subcategory.trim() && isUuid(subcategory.trim())) {
          basicReq.subcategoryId = subcategory.trim();
        }

        let cId = createdCourseId;
        if (!cId) {
          const res = await liveCoursesService.create(basicReq);
          cId = String(res?.id ?? res?.data?.id ?? res?.courseId ?? "");
          if (cId) setCreatedCourseId(cId);
        } else {
          await liveCoursesService.updateBasicInfo(cId, basicReq);
        }

        const effectiveCourseId = cId || "live-course";

        // Pre-Signed URL S3 Uploads for Thumbnail, Promo Video, and Resources
        let thumbUrl = uploadedThumbUrl;
        if (thumbnail.file && thumbnail.file.size > 0) {
          setUploadStatus("Uploading thumbnail...");
          setThumbProgress(0);
          const res = await liveCoursesService.uploadMedia(
            thumbnail.file,
            "thumbnail",
            effectiveCourseId,
            (pct: number) => setThumbProgress(pct)
          );
          thumbUrl = res?.data?.url || res?.url || "";
          if (thumbUrl) setUploadedThumbUrl(thumbUrl);
          setThumbProgress(100);
        }

        let promoUrl = uploadedPromoUrl;
        if (promoVideo.file && promoVideo.file.size > 0) {
          setUploadStatus("Uploading promotional video...");
          setPromoProgress(0);
          const res = await liveCoursesService.uploadMedia(
            promoVideo.file,
            "promo",
            effectiveCourseId,
            (pct: number) => setPromoProgress(pct)
          );
          promoUrl = res?.data?.url || res?.url || "";
          if (promoUrl) setUploadedPromoUrl(promoUrl);
          setPromoProgress(100);
        }

        let pdfUrl = uploadedPdfUrl;
        const uploadablePdfs = resources.filter((r) => r.file && r.file.size > 0);
        for (let i = 0; i < uploadablePdfs.length; i++) {
          const r = uploadablePdfs[i];
          setUploadStatus(
            uploadablePdfs.length === 1
              ? "Uploading PDF resource..."
              : `Uploading PDF (${i + 1}/${uploadablePdfs.length})...`
          );
          setResourceProgress((prev) => ({ ...prev, [r.id]: 0 }));
          const res = await liveCoursesService.uploadMedia(
            r.file,
            "resource",
            effectiveCourseId,
            (pct: number) => setResourceProgress((prev) => ({ ...prev, [r.id]: pct }))
          );
          const u = res?.data?.url || res?.url;
          if (u) {
            pdfUrl = u;
            setUploadedPdfUrl(u);
          }
          setResourceProgress((prev) => ({ ...prev, [r.id]: 100 }));
        }

        toast({ title: "Basic Info Saved", description: "Continuing to Live Schedule." });
      } else if (step === 2) {
        setUploadStatus("Saving live schedule...");
        const cId = createdCourseId;
        if (!cId) throw new Error("Live course not created yet.");

        const WEEKDAY_MAP: Record<string, string> = {
          MON: "MONDAY", TUE: "TUESDAY", WED: "WEDNESDAY", THU: "THURSDAY",
          FRI: "FRIDAY", SAT: "SATURDAY", SUN: "SUNDAY",
        };
        const sessionDaysStr = sessionDays.map((d) => WEEKDAY_MAP[d] || d).join(",");
        const startTimeFormatted = startTime ? (startTime.split(":").length === 2 ? `${startTime}:00` : startTime) : "10:00:00";
        const endTimeFormatted = endTime ? (endTime.split(":").length === 2 ? `${endTime}:00` : endTime) : "11:30:00";
        const deadlineFormatted = enrollmentDeadline
          ? (enrollmentDeadline.includes("T") ? enrollmentDeadline : `${enrollmentDeadline}T23:59:59`)
          : `${startDate || "2026-09-01"}T23:59:59`;

        // 1. Schedule API (Must succeed before Basic Info)
        await liveCoursesService.upsertSchedule(cId, {
          meetingPlatform: platform || "ZOOM",
          customMeetingLink: platform === "CUSTOM" ? customLink.trim() : undefined,
          timezone: timezone || "UTC",
          startDate,
          endDate,
          sessionDays: sessionDaysStr,
          sessionStartTime: startTimeFormatted,
          sessionEndTime: endTimeFormatted,
          maxSeats: maxSeats ?? 50,
          enrollmentDeadline: deadlineFormatted,
          enableWaitingList: !!waitingList,
          autoRecordSessions: !!recordSessions,
          attendanceRequired: !!attendanceRequired,
          enableLiveChat: !!liveChat,
        });

        // 2. Basic Info API (Called AFTER Schedule API succeeds)
        const updateReq: any = {
          title: title.trim(),
          description: description.trim(),
          categoryId,
          language: language || "English",
          level: (level || "INTERMEDIATE").toUpperCase(),
        };
        if (user?.id && isUuid(user.id)) updateReq.instructorId = user.id;
        if (subcategory.trim() && isUuid(subcategory.trim())) updateReq.subcategoryId = subcategory.trim();
        if (uploadedThumbUrl || thumbnail.preview) updateReq.thumbnailUrl = uploadedThumbUrl || thumbnail.preview;
        if (uploadedPromoUrl) updateReq.promoVideoUrl = uploadedPromoUrl;
        if (uploadedPdfUrl) updateReq.pdfUrl = uploadedPdfUrl;

        await liveCoursesService.updateBasicInfo(cId, updateReq);

        toast({ title: "Live Schedule & Basic Info Saved", description: "Continuing to Pricing." });
      } else if (step === 3) {
        const cId = createdCourseId;
        if (!cId) throw new Error("Live course not created yet.");

        await liveCoursesService.upsertPricing(cId, {
          accessType: accessType || "PAID",
          basePrice: accessType === "PAID" ? Number(basePrice) : 0,
          discountedPrice: accessType === "PAID" && discountPrice ? Number(discountPrice) : undefined,
          visibility: visibility || "PUBLIC",
        });
        toast({ title: "Pricing Saved", description: "Continuing to Review." });
      }

      setStep((s) => Math.min(5, s + 1));
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      toast({
        title: "Could not save step",
        description: e?.message ?? "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setUploadStatus("");
    }
  };

  const goBack = () => {
    setStep((s) => Math.max(1, s - 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* --------------------------------- submit -------------------------------- */

  const buildDto = (thumbUrl?: string, promoUrl?: string, resourceUrls?: string[]): CreateLiveCourseDto => ({
    courseType: "LIVE",
    status: "PUBLISHED",
    title: title.trim(),
    description: description.trim(),
    categoryId,
    subcategory: subcategory.trim() || undefined,
    thumbnailUrl: thumbUrl,
    promoVideoUrl: promoUrl,
    resourceUrls,
    meetingPlatform: platform,
    customMeetingLink: platform === "CUSTOM" ? customLink.trim() : undefined,
    timezone,
    startDate,
    endDate,
    durationValue,
    durationUnit,
    sessionDays,
    startTime,
    endTime,
    sessionDurationMinutes: sessionDuration,
    maximumSeats: maxSeats,
    enrollmentDeadline: enrollmentDeadline || undefined,
    enableWaitingList: waitingList,
    recordSessions,
    attendanceRequired,
    enableLiveChat: liveChat,
    accessType,
    basePrice: accessType === "PAID" ? Number(basePrice) : undefined,
    discountedPrice: accessType === "PAID" && discountPrice ? Number(discountPrice) : undefined,
    visibility,
  });

  const handlePublish = async () => {
    setSaving(true);
    try {
      const cId = createdCourseId;
      if (cId) {
        const WEEKDAY_MAP: Record<string, string> = {
          MON: "MONDAY", TUE: "TUESDAY", WED: "WEDNESDAY", THU: "THURSDAY",
          FRI: "FRIDAY", SAT: "SATURDAY", SUN: "SUNDAY",
        };
        const sessionDaysStr = sessionDays.map((d) => WEEKDAY_MAP[d] || d).join(",");
        const startTimeFormatted = startTime ? (startTime.split(":").length === 2 ? `${startTime}:00` : startTime) : "10:00:00";
        const endTimeFormatted = endTime ? (endTime.split(":").length === 2 ? `${endTime}:00` : endTime) : "11:30:00";
        const deadlineFormatted = enrollmentDeadline
          ? (enrollmentDeadline.includes("T") ? enrollmentDeadline : `${enrollmentDeadline}T23:59:59`)
          : `${startDate || "2026-09-01"}T23:59:59`;

        // 1. Schedule PATCH
        await liveCoursesService.upsertSchedule(cId, {
          meetingPlatform: platform || "ZOOM",
          customMeetingLink: platform === "CUSTOM" ? customLink.trim() : undefined,
          timezone: timezone || "UTC",
          startDate,
          endDate,
          sessionDays: sessionDaysStr,
          sessionStartTime: startTimeFormatted,
          sessionEndTime: endTimeFormatted,
          maxSeats: maxSeats ?? 50,
          enrollmentDeadline: deadlineFormatted,
          enableWaitingList: !!waitingList,
          autoRecordSessions: !!recordSessions,
          attendanceRequired: !!attendanceRequired,
          enableLiveChat: !!liveChat,
        });

        // 2. Basic Info PATCH
        const updateReq: any = {
          title: title.trim(),
          description: description.trim(),
          categoryId,
          language: language || "English",
          level: (level || "INTERMEDIATE").toUpperCase(),
        };
        if (user?.id && isUuid(user.id)) updateReq.instructorId = user.id;
        if (subcategory.trim() && isUuid(subcategory.trim())) updateReq.subcategoryId = subcategory.trim();
        if (uploadedThumbUrl || thumbnail.preview) updateReq.thumbnailUrl = uploadedThumbUrl || thumbnail.preview;
        if (uploadedPromoUrl) updateReq.promoVideoUrl = uploadedPromoUrl;
        if (uploadedPdfUrl) updateReq.pdfUrl = uploadedPdfUrl;

        await liveCoursesService.updateBasicInfo(cId, updateReq);

        // 3. Pricing PATCH
        await liveCoursesService.upsertPricing(cId, {
          accessType: accessType || "PAID",
          basePrice: accessType === "PAID" ? Number(basePrice) : 0,
          discountedPrice: accessType === "PAID" && discountPrice ? Number(discountPrice) : undefined,
          visibility: visibility || "PUBLIC",
        });

        // 4. Status Update
        await liveCoursesService.updateStatus(cId, { status: "PUBLISHED" });
      } else {
        const dto = buildDto();
        await liveCoursesService.createFullLiveCourse(dto);
      }
      toast({
        title: mode === "edit" ? "Live course updated" : "Live course published",
        description: `"${title}" has been saved successfully.`,
      });
      navigate("/instructor/courses");
    } catch (e: any) {
      toast({
        title: mode === "edit" ? "Could not update course" : "Could not publish course",
        description: e?.message ?? "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  /* --------------------------------- render -------------------------------- */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate("/instructor/courses")}
          className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Courses
        </button>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          {mode === "edit" ? "Edit Live Course" : "Create New Course"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Step {step} of 5 : {STEPS[step - 1].label}
        </p>

        {/* Course type */}
        <div className="mt-6 rounded-xl border border-border bg-card p-4 sm:p-5">
          <p className="mb-3 text-sm font-medium text-foreground">Course Type</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <RadioRow
              selected={false}
              title="Recorded Course"
              subtitle="Pre-recorded videos"
              onSelect={() => onSwitchToRecorded?.()}
            />
            <RadioRow selected title="Live Course" subtitle="Interactive sessions" onSelect={() => {}} />
          </div>
        </div>

        {/* Progress */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Course Setup Progress</span>
            <span className="text-sm text-muted-foreground">{step} of 5</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(step / 5) * 100}%` }} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
            {STEPS.map((s) => {
              const done = s.n < step;
              const active = s.n === step;
              return (
                <div key={s.n} className="flex items-center gap-2">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                    done || active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                  }`}>
                    {done || active ? <Check className="h-4 w-4" /> : s.n}
                  </span>
                  <span className={`text-sm ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ------------------------------ STEP 1 ------------------------------ */}
        {step === 1 && (
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Section title="Course Information">
                <div className="space-y-5">
                  <div>
                    <Label htmlFor="lc-title">Course Title <span className="text-destructive">*</span></Label>
                    <Input
                      id="lc-title" value={title} maxLength={80}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Learn Advanced React Patterns and Best Practices"
                      className="mt-1.5"
                    />
                    <p className="mt-1 text-right text-xs text-muted-foreground">{title.length} /80</p>
                  </div>

                  <div>
                    <Label htmlFor="lc-desc">Description <span className="text-destructive">*</span></Label>
                    <Textarea
                      id="lc-desc" value={description} maxLength={1000} rows={5}
                      onChange={(e) => setDescription(e.target.value)}
                      className="mt-1.5 resize-none"
                    />
                    <p className="mt-1 text-right text-xs text-muted-foreground">{description.length} /1000</p>
                  </div>

                  <div className={cn("grid gap-4", subcategories.length > 0 ? "sm:grid-cols-2" : "grid-cols-1")}>
                    <div>
                      <Label>Category <span className="text-destructive">*</span></Label>
                      <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setSubcategory(""); }}>
                        <SelectTrigger className="mt-1.5"><SelectValue placeholder="Choose option..." /></SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {subcategories.length > 0 && (
                      <div>
                        <Label htmlFor="lc-sub">Subcategory (optional)</Label>
                        <Select
                          value={subcategory || "none"}
                          onValueChange={(v) => setSubcategory(v === "none" ? "" : v)}
                        >
                          <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select subcategory (optional)" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None (Main Category only)</SelectItem>
                            {subcategories.map((sc) => (
                              <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Course Level <span className="text-destructive">*</span></Label>
                      <Select value={level} onValueChange={setLevel}>
                        <SelectTrigger className="mt-1.5"><SelectValue placeholder="Choose option..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BEGINNER">Beginner</SelectItem>
                          <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                          <SelectItem value="ADVANCED">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Language <span className="text-destructive">*</span></Label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger className="mt-1.5"><SelectValue placeholder="Choose option..." /></SelectTrigger>
                        <SelectContent>
                          {["English", "Hindi", "Urdu", "Spanish", "French", "German", "Arabic"].map((l) => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </Section>
            </div>

            {/* Media column */}
            <div className="space-y-6">
              <Section title="Course Thumbnail">
                <input ref={thumbInput} type="file" accept="image/jpeg,image/png" hidden onChange={onThumb} />
                <button
                  type="button"
                  onClick={() => thumbInput.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary hover:bg-primary/5"
                >
                  {thumbnail.preview ? (
                    <img src={thumbnail.preview} alt="Course thumbnail preview" className="max-h-36 rounded-md object-cover" />
                  ) : (
                    <>
                      <ImageIcon className="h-7 w-7 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">Drop image here</span>
                      <span className="text-xs text-muted-foreground">or click to select</span>
                    </>
                  )}
                </button>
                <p className="mt-3 text-xs text-muted-foreground">Recommended: 1280x720px, JPG or PNG, max 5MB</p>

                {thumbProgress !== null && (
                  <div className="mt-3 space-y-1.5 rounded-lg border border-border bg-muted/40 p-3">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="flex items-center gap-1.5 text-foreground">
                        {thumbProgress < 100 ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                            Uploading thumbnail...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Thumbnail uploaded
                          </>
                        )}
                      </span>
                      <span className="text-muted-foreground">{thumbProgress}%</span>
                    </div>
                    <Progress value={thumbProgress} className="h-2" />
                  </div>
                )}
              </Section>

              <Section title="Promotional Video">
                <input ref={videoInput} type="file" accept="video/mp4,video/webm,video/ogg" hidden onChange={onVideo} />
                <button
                  type="button"
                  onClick={() => videoInput.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary hover:bg-primary/5"
                >
                  <Film className="h-7 w-7 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {promoVideo.name ?? "Drop video here"}
                  </span>
                  <span className="text-xs text-muted-foreground">or click to select</span>
                </button>
                <p className="mt-3 text-xs text-muted-foreground">MP4, WebM, Ogg. Max 500MB</p>

                {promoProgress !== null && (
                  <div className="mt-3 space-y-1.5 rounded-lg border border-border bg-muted/40 p-3">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="flex items-center gap-1.5 text-foreground">
                        {promoProgress < 100 ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                            Uploading promotional video...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Video uploaded
                          </>
                        )}
                      </span>
                      <span className="text-muted-foreground">{promoProgress}%</span>
                    </div>
                    <Progress value={promoProgress} className="h-2" />
                  </div>
                )}
              </Section>

              <Section title="Resources">
                <input ref={pdfInput} type="file" accept="application/pdf" multiple hidden onChange={onPdfs} />
                <button
                  type="button"
                  onClick={() => pdfInput.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary hover:bg-primary/5"
                >
                  <FileText className="h-7 w-7 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Drop PDF here</span>
                  <span className="text-xs text-muted-foreground">or click to select</span>
                </button>
                <p className="mt-3 text-xs text-muted-foreground">PDF only. Max 25MB per file</p>

                {resources.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {resources.map((r) => {
                      const prog = resourceProgress[r.id];
                      return (
                        <li key={r.id} className="flex flex-col gap-2 rounded-md bg-muted/60 px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{r.name}</span>
                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              {r.size > 0 ? `${(r.size / 1024 / 1024).toFixed(1)}MB` : ""}
                            </span>
                            {!saving && (
                              <button
                                type="button"
                                aria-label={`Remove ${r.name}`}
                                onClick={() => setResources((p) => p.filter((x) => x.id !== r.id))}
                                className="shrink-0 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          {prog !== undefined && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                  {prog < 100 ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                                      Uploading...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                      Uploaded
                                    </>
                                  )}
                                </span>
                                <span className="font-medium text-foreground">{prog}%</span>
                              </div>
                              <Progress value={prog} className="h-1.5" />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Section>

              <TipsCard title="Pro Tip" tips={["High-quality thumbnails significantly increase course enrollment. Make them attractive!"]} />
            </div>
          </div>
        )}

        {/* ------------------------------ STEP 2 ------------------------------ */}
        {step === 2 && (
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Section title="Meeting Platform">
                <div className="space-y-3">
                  {PLATFORMS.map((p) => (
                    <RadioRow
                      key={p.id} selected={platform === p.id} title={p.label}
                      icon={<Video className="h-5 w-5" />} onSelect={() => setPlatform(p.id)}
                    />
                  ))}
                </div>
                {platform === "CUSTOM" && (
                  <div className="mt-4">
                    <Label htmlFor="lc-link">Custom Meeting Link <span className="text-destructive">*</span></Label>
                    <Input
                      id="lc-link" value={customLink} onChange={(e) => setCustomLink(e.target.value)}
                      placeholder="https://..." className="mt-1.5"
                    />
                  </div>
                )}
              </Section>

              <Section title="Timezone">
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger><SelectValue placeholder="Select timezone" /></SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz.id} value={tz.id}>
                        {tz.label} — {tz.country} (UTC{tz.offset})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="lc-start">Course Start Date <span className="text-destructive">*</span></Label>
                    <Input id="lc-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="lc-end">Course End Date <span className="text-destructive">*</span></Label>
                    <Input id="lc-end" type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="lc-dur">Course Duration <span className="text-destructive">*</span></Label>
                    <Input
                      id="lc-dur" type="number" min={1} value={durationValue}
                      onChange={(e) => setDurationValue(Math.max(1, Number(e.target.value) || 1))}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Duration Unit</Label>
                    <Select value={durationUnit} onValueChange={(v) => setDurationUnit(v as LiveDurationUnit)}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WEEKS">Weeks</SelectItem>
                        <SelectItem value="MONTHS">Months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Section>

              <Section title="Recurring Schedule">
                <Label className="mb-2 block">Session Days</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((d) => {
                    const on = sessionDays.includes(d.id);
                    return (
                      <button
                        key={d.id} type="button" aria-pressed={on}
                        onClick={() => setSessionDays((prev) =>
                          prev.includes(d.id) ? prev.filter((x) => x !== d.id) : [...prev, d.id],
                        )}
                        className={`min-w-[68px] rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                          on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="lc-st">Start Time</Label>
                    <Input id="lc-st" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="lc-et">End Time</Label>
                    <Input id="lc-et" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="lc-sd">Duration (minutes)</Label>
                    <Input
                      id="lc-sd" type="number" min={1} value={sessionDuration}
                      onChange={(e) => setSessionDuration(Math.max(1, Number(e.target.value) || 1))}
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </Section>

              <Section title="Enrollment Settings">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="lc-seats">Maximum Seats</Label>
                    <Input
                      id="lc-seats" type="number" min={1} value={maxSeats}
                      onChange={(e) => setMaxSeats(Math.max(1, Number(e.target.value) || 1))}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lc-dl">Enrollment Deadline</Label>
                    <Input
                      id="lc-dl" type="date" value={enrollmentDeadline} max={startDate || undefined}
                      onChange={(e) => setEnrollmentDeadline(e.target.value)} className="mt-1.5"
                    />
                  </div>
                </div>
              </Section>

              <Section title="Session Features">
                <div className="space-y-3">
                  <ToggleRow title="Enable Waiting List" subtitle="Allow students to join the waiting list if course is full" checked={waitingList} onChange={setWaitingList} />
                  <ToggleRow title="Record Sessions Automatically" subtitle="Automatically record all live sessions for playback" checked={recordSessions} onChange={setRecordSessions} />
                  <ToggleRow title="Attendance Required" subtitle="Require students to attend sessions for completion" checked={attendanceRequired} onChange={setAttendanceRequired} />
                  <ToggleRow title="Enable Live Chat" subtitle="Allow students to chat during live sessions" checked={liveChat} onChange={setLiveChat} />
                </div>
              </Section>
            </div>

            <div className="space-y-6">
              <Section title="Course Summary" icon={<Calendar className="h-4 w-4 text-foreground" />}>
                <SummaryRow label="Total Weeks" value={totalWeeks || "-"} />
                <SummaryRow label="Live Sessions" value={totalSessions || "-"} />
                <SummaryRow label="Timezone" value={timezone} />
                <SummaryRow label="Meeting Platform" value={PLATFORMS.find((p) => p.id === platform)?.label ?? "-"} />
                <SummaryRow label="Session Duration" value={`${sessionDuration} min`} />
                <SummaryRow label="Max Students" value={maxSeats} />
              </Section>

              <Section title="Schedule Preview" icon={<Calendar className="h-4 w-4 text-foreground" />}>
                <div className="space-y-3">
                  <div className="rounded-lg bg-primary/5 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-primary">Start Date</p>
                    <p className="text-sm text-foreground">{fmtDate(startDate)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">End Date</p>
                    <p className="text-sm text-foreground">{fmtDate(endDate)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recurring Sessions</p>
                    <p className="text-sm text-foreground">{daysLabel}</p>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-muted/60 p-3">
                    <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Time</p>
                      <p className="text-sm text-foreground">{startTime} - {endTime}</p>
                    </div>
                  </div>
                </div>
              </Section>

              <Section title="Next Session" icon={<Clock className="h-4 w-4 text-foreground" />}>
                <p className="text-sm text-muted-foreground">
                  {startDate ? `${fmtDate(startDate)} at ${startTime}` : "Select a start date to see your first session"}
                </p>
              </Section>

              <TipsCard
                title="Pro Tips"
                tips={[
                  "Test your meeting link before the first session",
                  "Enable recording for students to review content",
                  "Set enrollment deadline before first session",
                ]}
              />
            </div>
          </div>
        )}

        {/* ------------------------------ STEP 3 ------------------------------ */}
        {step === 3 && (
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Section title="Access Type">
                <div className="space-y-3">
                  <RadioRow
                    selected={accessType === "FREE"} title="Free Live Course"
                    subtitle="No charge for students to enroll" icon={<DollarSign className="h-5 w-5" />}
                    onSelect={() => setAccessType("FREE")}
                  />
                  <RadioRow
                    selected={accessType === "PAID"} title="Paid Live Course"
                    subtitle="Students pay to enroll and access the course" icon={<DollarSign className="h-5 w-5" />}
                    onSelect={() => setAccessType("PAID")}
                  />
                </div>
              </Section>

              {accessType === "PAID" && (
                <Section title="Pricing">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="lc-base">Base Price <span className="text-destructive">*</span></Label>
                      <Input
                        id="lc-base" type="number" min={0} step="0.01" value={basePrice}
                        onChange={(e) => setBasePrice(e.target.value)} placeholder="99.99" className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lc-disc">
                        Discounted Price {basePrice.trim() !== "" ? <span className="text-destructive">*</span> : "(Optional)"}
                      </Label>
                      <Input
                        id="lc-disc" type="number" min={0} step="0.01" value={discountPrice}
                        onChange={(e) => setDiscountPrice(e.target.value)} placeholder="79.99"
                        className={cn("mt-1.5", step3Attempted && discountPriceError ? "border-destructive focus-visible:ring-destructive" : "")}
                      />
                      {step3Attempted && discountPriceError && (
                        <p className="mt-1 text-xs text-destructive">{discountPriceError}</p>
                      )}
                    </div>
                  </div>
                </Section>
              )}

              <Section title="Course Visibility">
                <div className="space-y-3">
                  <RadioRow selected={visibility === "PUBLIC"} title="Public" subtitle="Anyone can find and enroll" icon={<Globe className="h-5 w-5" />} onSelect={() => setVisibility("PUBLIC")} />
                  <RadioRow selected={visibility === "PRIVATE"} title="Private" subtitle="Only shared link can access" icon={<Lock className="h-5 w-5" />} onSelect={() => setVisibility("PRIVATE")} />
                  <RadioRow selected={visibility === "INVITE_ONLY"} title="Invite Only" subtitle="Only invited students can enroll" icon={<Eye className="h-5 w-5" />} onSelect={() => setVisibility("INVITE_ONLY")} />
                </div>
              </Section>
            </div>

            <div className="space-y-6">
              <Section title="Pricing Summary">
                <div className="rounded-lg bg-muted/60 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Base Price</p>
                  <p className="text-3xl font-bold text-foreground">
                    {accessType === "FREE" ? "Free" : ` ${Number(basePrice || 0).toFixed(2)}`}
                  </p>
                  {accessType === "PAID" && discountPrice && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Discounted: {Number(discountPrice).toFixed(2)}
                    </p>
                  )}
                </div>
              </Section>

              <Section title="Course Details">
                <SummaryRow label="Access Type" value={accessType === "FREE" ? "Free" : "Paid"} />
                <SummaryRow label="Max Students" value={maxSeats} />
                <SummaryRow
                  label="Visibility"
                  value={visibility === "PUBLIC" ? "Public" : visibility === "PRIVATE" ? "Private" : "Invite Only"}
                />
              </Section>

              <TipsCard
                title="Pricing Tips"
                tips={[
                  "Research competitor pricing for similar courses",
                  "Early bird discounts increase initial enrollment",
                  "Money-back guarantees reduce purchase hesitation",
                ]}
              />
            </div>
          </div>
        )}

        {/* --------------------------- STEP 4 & 5 ----------------------------- */}
        {(step === 4 || step === 5) && (
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                {thumbnail.preview ? (
                  <img src={thumbnail.preview} alt={`${title || "Course"} thumbnail`} className="h-64 w-full object-cover" />
                ) : (
                  <div className="flex h-64 w-full items-center justify-center bg-muted">
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
              </div>

              <Section title="Basic Information">
                <SummaryRow label="Course Title" value={title || "-"} />
                <SummaryRow label="Category" value={categories.find((c) => c.id === categoryId)?.name ?? "-"} />
                <SummaryRow label="Subcategory" value={subcategory || "-"} />
                <SummaryRow label="Level" value={level || "-"} />
                <SummaryRow label="Language" value={language || "-"} />
                <SummaryRow label="Promotional Video" value={promoVideo.name ?? "Not added"} />
                <SummaryRow label="Resources" value={`${resources.length} PDF${resources.length === 1 ? "" : "s"}`} />
                <div className="pt-3">
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-foreground">{description || "-"}</p>
                </div>
              </Section>

              <Section title="Live Schedule">
                <SummaryRow label="Meeting Platform" value={PLATFORMS.find((p) => p.id === platform)?.label ?? "-"} />
                {platform === "CUSTOM" && <SummaryRow label="Meeting Link" value={customLink || "-"} />}
                <SummaryRow label="Timezone" value={timezone} />
                <SummaryRow label="Start Date" value={fmtDate(startDate)} />
                <SummaryRow label="End Date" value={fmtDate(endDate)} />
                <SummaryRow label="Duration" value={`${durationValue} ${durationUnit.toLowerCase()}`} />
                <SummaryRow label="Session Days" value={daysLabel} />
                <SummaryRow label="Time" value={`${startTime} - ${endTime}`} />
                <SummaryRow label="Session Duration" value={`${sessionDuration} min`} />
                <SummaryRow label="Maximum Seats" value={maxSeats} />
                <SummaryRow label="Enrollment Deadline" value={fmtDate(enrollmentDeadline)} />
              </Section>

              <Section title="Session Features">
                <SummaryRow label="Waiting List" value={waitingList ? "Enabled" : "Disabled"} />
                <SummaryRow label="Auto Recording" value={recordSessions ? "Enabled" : "Disabled"} />
                <SummaryRow label="Attendance Required" value={attendanceRequired ? "Yes" : "No"} />
                <SummaryRow label="Live Chat" value={liveChat ? "Enabled" : "Disabled"} />
              </Section>

              <Section title="Pricing & Visibility">
                <SummaryRow label="Access Type" value={accessType === "FREE" ? "Free" : "Paid"} />
                {accessType === "PAID" && (
                  <>
                    <SummaryRow label="Base Price" value={`${Number(basePrice || 0).toFixed(2)}`} />
                    <SummaryRow label="Discounted Price" value={discountPrice ? `${Number(discountPrice).toFixed(2)}` : "-"} />
                  </>
                )}
                <SummaryRow
                  label="Visibility"
                  value={visibility === "PUBLIC" ? "Public" : visibility === "PRIVATE" ? "Private" : "Invite Only"}
                />
              </Section>
            </div>

            <div className="space-y-6">
              <Section title="Course Summary">
                <div className="space-y-3">
                  <div className="rounded-lg bg-primary/5 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Course Title</p>
                    <p className="text-sm font-medium text-foreground">{title || "-"}</p>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Price</p>
                    <p className="text-sm font-medium text-foreground">
                      {accessType === "FREE" ? "Free" : `${Number(discountPrice || basePrice || 0).toFixed(2)}`}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Sessions</p>
                    <p className="text-sm font-medium text-foreground">{totalSessions}</p>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Duration</p>
                    <p className="text-sm font-medium text-foreground">{durationValue} {durationUnit.toLowerCase()}</p>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Max Students</p>
                    <p className="text-sm font-medium text-foreground">{maxSeats}</p>
                  </div>
                </div>
              </Section>

              <Section title="Completion Checklist">
                <ul className="space-y-2">
                  {[
                    { label: "Basic Information", done: !!(title && description && categoryId && level && language) },
                    { label: "Live Schedule", done: !!(startDate && endDate && sessionDays.length) },
                    { label: "Pricing & Enrollment", done: accessType === "FREE" || (Number(basePrice) > 0 && Number(discountPrice) > 0 && Number(discountPrice) < Number(basePrice)) },
                    { label: "Media", done: !!thumbnail.file },
                    { label: "Resources", done: resources.length > 0 },
                  ].map((c) => (
                    <li
                      key={c.label}
                      className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
                        c.done ? "bg-primary/5 text-foreground" : "bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className={`h-4 w-4 ${c.done ? "text-primary" : "text-muted-foreground/50"}`} />
                        {c.label}
                      </span>
                      <span className="text-xs font-medium">{c.done ? "Complete" : "Pending"}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            </div>
          </div>
        )}

        {/* ------------------------------- footer ------------------------------ */}
        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button" variant="outline" disabled={saving}
            onClick={() => (step === 1 ? navigate("/instructor/courses") : goBack())}
          >
            {step === 1 ? "Cancel" : "Back"}
          </Button>

          {step < 4 ? (
            <Button type="button" onClick={goNext} disabled={saving} className="bg-primary hover:bg-primary/90 min-w-[220px]">
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              {saving
                ? uploadStatus || "Saving..."
                : step === 1
                ? "Continue to Live Schedule"
                : step === 2
                ? "Continue to Pricing"
                : "Continue to Review"}
            </Button>
          ) : step === 4 ? (
            <Button type="button" onClick={goNext} disabled={saving} className="bg-primary hover:bg-primary/90 min-w-[190px]">
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              {saving ? "Saving..." : "Continue to Publish"}
            </Button>
          ) : (
            <Button type="button" onClick={handlePublish} disabled={saving} className="bg-primary hover:bg-primary/90 min-w-[190px]">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              {saving
                ? "Publishing..."
                : mode === "edit"
                ? "Save Live Course"
                : "Publish Live Course"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
