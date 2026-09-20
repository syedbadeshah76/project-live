import { useEffect, useState, type ChangeEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft, Check, ImageIcon, Plus, Trash2, ChevronDown, ChevronRight,
  GripVertical, PlayCircle, CheckCircle2, Film, Download, FileText, HelpCircle,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { coursesService } from "@/services/courses.service";
import { liveCoursesService } from "@/services/liveCourses.service";
import { categoriesService } from "@/services/categories.service";
import { quizService } from "@/services/quiz.service";
import { CourseAnnouncementsManager } from "@/components/admin/CourseAnnouncementsManager";
import InstructorLiveCourseForm from "@/pages/instructor/InstructorLiveCourseForm";
import { downloadQuizSampleXlsx } from "@/lib/quiz-template";
interface Props { mode: "create" | "edit" }

const LANGUAGES = ["English", "Hindi", "Urdu", "Spanish", "French", "German", "Arabic"];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const LEVEL_MAP: Record<string, "BEGINNER" | "INTERMEDIATE" | "ADVANCED"> = {
  Beginner: "BEGINNER", Intermediate: "INTERMEDIATE", Advanced: "ADVANCED",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v?: string) => !!v && UUID_RE.test(v.trim());

const slugify = (s: string) =>
  s.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

type LessonType = "video" | "pdf";

interface LessonDraft {
  id: string;
  title: string;
  description?: string;
  type: LessonType;
  videoUrl?: string;
  videoFile?: File;
  videoFileName?: string;
  thumbnail?: string;
  videoDurationSeconds: number;
  order: number;
  allowPreview: boolean;
  captionFileName?: string;
  captionFile?: File;
  pdfFileName?: string;
  pdfFile?: File;
}

interface QuizDraft {
  id: string;
  title: string;
  description?: string;
  durationMinutes?: number;
  passingPercentage?: number;
  maxAttempts?: number;
  questionCount?: number;
  quizType?: string;
  excelFileName?: string;
  excelFile?: File;
  csvFileName?: string;
  csvFile?: File;
}

interface ModuleDraft {
  id: string;
  title: string;
  expanded: boolean;
  order: number;
  lessons: LessonDraft[];
  quiz?: QuizDraft;
}

const STEPS = [
  { n: 1, label: "Basic Info" },
  { n: 2, label: "Curriculum" },
  { n: 3, label: "Pricing" },
  { n: 4, label: "Review & Publish" },
];

const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const isLocalId = (id: string, prefix: string) => id.startsWith(`${prefix}-`);
const unwrap = (res: any) => res?.data ?? res;
const errMsg = (e: any, fallback: string) =>
  e?.response?.data?.message ?? e?.response?.data?.error ?? e?.message ?? fallback;

const InstructorCourseForm = ({ mode }: Props) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isLiveFromQuery = searchParams.get("type") === "live";
  const { toast } = useToast();

  const coursesListPath = "/instructor/courses";
  const [courseType, setCourseType] = useState<"RECORDED" | "LIVE">(
    isLiveFromQuery ? "LIVE" : "RECORDED"
  );
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [categories, setCategories] = useState<{ id: string; name: string; subcategories?: { id: string; name: string }[] }[]>([]);
  const [subcategories, setSubcategories] = useState<{ id: string; name: string }[]>([]);

  const [serverCourseId, setServerCourseId] = useState<string | null>(
    mode === "edit" ? id ?? null : null,
  );

  const [basic, setBasic] = useState({
    title: "",
    slug: "",
    description: "",
    categoryId: "",
    subcategoryId: "",
    tags: "",
    language: "English",
    level: "",
    thumbnail: "",
    thumbnailFile: undefined as File | undefined,
    banner: "",
    bannerFile: undefined as File | undefined,
    certificateEnabled: true,
  });

  const [modules, setModules] = useState<ModuleDraft[]>([
    { id: uid("m"), title: "", expanded: true, order: 0, lessons: [] },
  ]);

  const [pricing, setPricing] = useState({
    type: "one-time" as "free" | "one-time",
    salePrice: "49.99",
    mrp: "99.99",
    tax: "",
    description: "",
  });

  const [publishMode, setPublishMode] = useState<"publish" | "draft">("publish");

  const [videoDialog, setVideoDialog] = useState<{ open: boolean; moduleId?: string; lessonId?: string }>({ open: false });
  const [videoForm, setVideoForm] = useState<LessonDraft>({
    id: "", title: "", description: "", type: "video",
    videoUrl: "", videoDurationSeconds: 0, order: 0, allowPreview: false,
  });
  const [videoMinSec, setVideoMinSec] = useState({ min: 0, sec: 0 });

  const [quizDialog, setQuizDialog] = useState<{ open: boolean; moduleId?: string }>({ open: false });
  const [quizForm, setQuizForm] = useState<QuizDraft>({ id: "", title: "", questionCount: 0 });
  const [activeTab, setActiveTab] = useState<"details" | "announcements">("details");

  const totalLessons = modules.reduce((a, m) => a + m.lessons.length, 0);
  const totalVideos  = modules.reduce((a, m) => a + m.lessons.filter(l => l.type === "video").length, 0);
  const totalQuizzes = modules.filter(m => m.quiz).length;
  const totalSeconds = modules.reduce((a, m) => a + m.lessons.reduce((s, l) => s + (l.videoDurationSeconds || 0), 0), 0);
  const totalHours   = (totalSeconds / 3600).toFixed(1);

  // ---------- Load categories ----------
  useEffect(() => {
    (async () => {
      try {
        const treeRes: any = await categoriesService.getCategoryTree();
        const treeArr = Array.isArray(treeRes) ? treeRes : treeRes?.data ?? [];
        if (Array.isArray(treeArr) && treeArr.length > 0) {
          setCategories(
            treeArr.map((c: any) => ({
              id: String(c.id),
              name: c.name ?? c.title ?? "Uncategorized",
              subcategories: Array.isArray(c.subcategories)
                ? c.subcategories.map((sc: any) => ({ id: String(sc.id), name: sc.name ?? sc.title }))
                : [],
            }))
          );
          return;
        }

        const catRes: any = await categoriesService.getCategories();
        const arr = Array.isArray(catRes) ? catRes : catRes?.data ?? [];
        const mainCats = (arr || []).filter((c: any) => !c.parentId && !c.parent_id);
        setCategories(mainCats.map((c: any) => ({ id: String(c.id), name: c.name })));
      } catch { /* non-blocking */ }
    })();
  }, []);

  // ---------- Load subcategories when categoryId changes ----------
  useEffect(() => {
    if (!basic.categoryId) {
      setSubcategories([]);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const selectedMain = categories.find((c) => String(c.id) === String(basic.categoryId));
        if (selectedMain && selectedMain.subcategories && selectedMain.subcategories.length > 0) {
          if (alive) setSubcategories(selectedMain.subcategories);
          return;
        }

        const res = await categoriesService.getSubcategories(basic.categoryId);
        let list = res?.data ?? [];
        if (!Array.isArray(list) || list.length === 0) {
          const flatRes = await categoriesService.getCategories({ parentId: basic.categoryId });
          list = flatRes?.data ?? [];
        }
        if (alive && Array.isArray(list)) {
          setSubcategories(list.map((sc: any) => ({ id: String(sc.id), name: sc.name ?? sc.title })));
        } else if (alive) {
          setSubcategories([]);
        }
      } catch {
        if (alive) setSubcategories([]);
      }
    })();
    return () => { alive = false; };
  }, [basic.categoryId, categories]);

  // ---------- Edit hydrate ----------
  useEffect(() => {
    if (mode !== "edit" || !id) return;
    if (courseType === "LIVE" || isLiveFromQuery) {
      if (courseType !== "LIVE") setCourseType("LIVE");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res: any = await coursesService.getCourseDetails(id);
        if (cancelled) return;
        const c: any = unwrap(res);
        setServerCourseId(String(c.id ?? id));
        setBasic((b) => ({
          ...b,
          title: c.title || "",
          slug: c.slug || "",
          description: c.description || "",
          categoryId: c.categoryId || c.category?.id || "",
          subcategoryId: c.subcategoryId || c.subcategory?.id || "",
          tags: Array.isArray(c.tags) ? c.tags.join(", ") : (c.tags || ""),
          language: c.language || "English",
          level: c.level ? (String(c.level).charAt(0) + String(c.level).slice(1).toLowerCase()) : "",
          thumbnail: c.thumbnailUrl || c.thumbnail || "",
          banner: c.banner || "",
          certificateEnabled: c.certificateEnabled ?? true,
        }));

        let mods: any[] = Array.isArray(c.modules) ? c.modules : [];
        if (!mods.length) {
          try {
            const mr: any = await coursesService.getModulesByCourse(String(c.id));
            mods = Array.isArray(mr?.data) ? mr.data : [];
          } catch { /* no-op */ }
        }
        if (mods.length) {
          const hydratedModules = await Promise.all(
            mods.map(async (m: any, i: number) => {
              const getQuizFileName = (q: any) =>
                q?.excelFileName ||
                q?.csvFileName ||
                q?.fileName ||
                q?.questionBankFileName ||
                q?.questionBankFile ||
                (q?.fileUrl ? String(q.fileUrl).split("/").pop() : undefined) ||
                (q?.url ? String(q.url).split("/").pop() : undefined);

              const rawQuiz = m.quiz ?? m.moduleQuiz ?? (Array.isArray(m.quizzes) ? m.quizzes[0] : null);
              const rawQuizId = typeof rawQuiz === "string"
                ? rawQuiz
                : (typeof rawQuiz === "object" && rawQuiz?.id)
                  ? String(rawQuiz.id)
                  : String(m.quizId ?? m.quiz_id ?? "");

              let quizObj = rawQuizId ? {
                id: rawQuizId,
                title: (typeof rawQuiz === "object" && rawQuiz?.title) || `${m.title || "Module"} Quiz`,
                questionCount: (typeof rawQuiz === "object" && (rawQuiz?.questionCount ?? rawQuiz?.questions?.length)) || 10,
                excelFileName: typeof rawQuiz === "object" ? getQuizFileName(rawQuiz) : undefined,
                csvFileName: typeof rawQuiz === "object" ? rawQuiz?.csvFileName : undefined,
                fileUrl: typeof rawQuiz === "object" ? (rawQuiz?.fileUrl || rawQuiz?.url) : undefined,
              } : undefined;

              return {
                id: String(m.id),
                title: m.title || "",
                expanded: false,
                order: m.order ?? i,
                lessons: (m.lessons || []).map((l: any, j: number) => ({
                  id: String(l.id),
                  title: l.title || "",
                  description: l.description || "",
                  type: l.type === "pdf" ? "pdf" : "video",
                  videoUrl: l.videoUrl || "",
                  videoDurationSeconds: l.videoDurationSeconds ?? 0,
                  order: l.order ?? j,
                  allowPreview: !!l.previewEnabled,
                  thumbnail: l.thumbnailUrl,
                  pdfFileName: l.pdfUrl,
                })),
                quiz: quizObj,
              };
            }),
          );
          setModules(hydratedModules);
        }

        setPricing((p) => ({
          ...p,
          type: (c.basePrice ?? 0) > 0 ? "one-time" : "free",
          salePrice: String(c.basePrice ?? 0),
          mrp: String(c.strikeOutPrice ?? c.basePrice ?? 0),
        }));
      } catch (e: any) {
        if (cancelled) return;
        // Fallback: check if course is a live course
        try {
          const liveRes = await liveCoursesService.getById(id);
          if (liveRes) {
            setCourseType("LIVE");
            return;
          }
        } catch {
          /* not a live course either */
        }
        toast({ title: errMsg(e, "Failed to load course"), variant: "destructive" });
        navigate(coursesListPath);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [mode, id, navigate, toast, courseType, isLiveFromQuery]);

  // ---------- Validation ----------
  const validateStep = (s: number): string | null => {
    if (s === 1) {
      if (!basic.title.trim()) return "Course title is required";
      if (!basic.description.trim()) return "Description is required";
      if (!basic.categoryId) return "Category is required";
      if (!basic.level) return "Level is required";
      if (!basic.language) return "Language is required";
    }
    if (s === 2) {
      if (!modules.length) return "Add at least one module";
      for (const m of modules) {
        if (!m.title.trim()) return "Every module must have a title";
        if (!m.lessons.length) return `Module "${m.title}" needs at least one lesson`;
        for (const l of m.lessons) {
          if (!l.title.trim()) return `Every lesson in "${m.title}" needs a title`;
          if (l.type === "video" && !l.videoFile && !l.videoUrl) {
            return `Lesson "${l.title}" needs a video file or URL`;
          }
        }
      }
    }
    if (s === 3) {
      if (pricing.type === "one-time") {
        if (!pricing.salePrice || Number(pricing.salePrice) <= 0) return "Base price is required for paid courses";
        if (pricing.mrp && Number(pricing.mrp) > 0 && Number(pricing.mrp) < Number(pricing.salePrice)) {
          return "MRP (strike-out price) cannot be less than the base price";
        }
      }
    }
    return null;
  };

  // ---------- Payload (NO instructorId — backend uses the logged-in user) ----------
  const buildCoursePayload = () => {
    const payload: any = {
      title: basic.title.trim(),
      slug: (basic.slug || slugify(basic.title)).trim(),
      description: basic.description.trim(),
      categoryId: basic.categoryId,
      language: basic.language,
      level: LEVEL_MAP[basic.level] || "BEGINNER",
      basePrice: pricing.type === "free" ? 0 : Number(pricing.salePrice) || 0,
      strikeOutPrice:
        pricing.type === "free"
          ? 0
          : pricing.mrp && Number(pricing.mrp) > 0
          ? Number(pricing.mrp)
          : Number(pricing.salePrice) || 0,
    };
    if (basic.subcategoryId && isUuid(basic.subcategoryId)) {
      payload.subcategoryId = basic.subcategoryId.trim();
    } else {
      payload.subcategoryId = null;
    }
    return payload;
  };

  // ---------- Step 1 -> 2 : persist course + thumbnail ----------
  const persistCourseFromStep1 = async (): Promise<string> => {
    const payload = buildCoursePayload();
    let courseId = serverCourseId;

    if (!courseId) {
      const res: any = await coursesService.createCourse(payload);
      courseId = String(unwrap(res).id);
      setServerCourseId(courseId);
    } else {
      await coursesService.updateCourse(courseId, payload);
    }

    if (basic.thumbnailFile) {
      const r = await coursesService.uploadFileToS3(
        basic.thumbnailFile, "COURSE_THUMBNAIL", courseId,
      );
      await coursesService.updateCourse(courseId, { thumbnailUrl: r.url } as any);
      setBasic((b) => ({ ...b, thumbnail: r.url, thumbnailFile: undefined }));
    }
    return courseId;
  };

  // ---------- Step 2 -> 3 : modules + lessons (+uploads) + quizzes ----------
  const persistCurriculumFromStep2 = async (courseId: string) => {
    const nextModules: ModuleDraft[] = [];

    for (let mIdx = 0; mIdx < modules.length; mIdx++) {
      const m = modules[mIdx];
      let moduleId = m.id;

      if (isLocalId(m.id, "m")) {
        const created: any = await coursesService.createModule({
          courseId, title: m.title.trim(), order: mIdx,
        });
        moduleId = String(unwrap(created).id);
      } else {
        await coursesService.updateModule(m.id, { title: m.title.trim(), order: mIdx });
      }

      const nextLessons: LessonDraft[] = [];
      for (let lIdx = 0; lIdx < m.lessons.length; lIdx++) {
        const l = m.lessons[lIdx];
        let lessonId = l.id;

        const basePayload = {
          moduleId,
          title: l.title.trim(),
          description: l.description || "",
          order: lIdx,
          videoDurationSeconds: Number(l.videoDurationSeconds ?? 0),
          previewEnabled: l.allowPreview,
        };

        if (isLocalId(l.id, "l")) {
          const created: any = await coursesService.createLesson({
            ...basePayload,
            videoUrl: l.videoUrl && !l.videoFile ? l.videoUrl : undefined,
          });
          lessonId = String(unwrap(created).id);
        }

        let videoUrl = l.videoUrl;
        if (l.videoFile) {
          const up = await coursesService.uploadFileToS3(
            l.videoFile, "LESSON_VIDEO", lessonId,
          );
          videoUrl = up.url;
        }

        if (l.captionFile) {
          await coursesService.uploadFileToS3(
            l.captionFile, "LESSON_CAPTION", lessonId, { language: "en" },
          );
        }

        await coursesService.updateLesson(lessonId, {
          ...basePayload,
          videoUrl,
          thumbnailUrl: l.thumbnail,
        });

        nextLessons.push({
          ...l,
          id: lessonId,
          videoUrl,
          videoFile: undefined,
          videoFileName: undefined,
          captionFile: undefined,
        });
      }

      let nextQuiz: QuizDraft | undefined = m.quiz;
      if (m.quiz) {
        let quizId = m.quiz.id;

        let importedCount: number | null = null;

        // 1. First: Upload question bank if file exists
        const fileToUpload = m.quiz.csvFile || m.quiz.excelFile;
        if (fileToUpload && courseId && moduleId) {
          try {
            const uploadRes: any = await quizService.uploadQuestionBank(fileToUpload, courseId, moduleId);
            const data = unwrap<any>(uploadRes);
            const count = Number(data?.imported ?? data?.totalRows ?? uploadRes?.imported ?? uploadRes?.totalRows ?? 0);
            if (count > 0) importedCount = count;
          } catch (uploadErr) {
            console.warn("Question bank upload error/pending", uploadErr);
          }
        }

        const requestedCount = Number(m.quiz.questionCount) || 10;
        const finalQuestionCount = importedCount ? Math.min(requestedCount, importedCount) : requestedCount;

        const quizPayload = {
          moduleId,
          title: m.quiz.title.trim() || `${m.title} Quiz`,
          description: m.quiz.description || "Assessment for module",
          durationMinutes: Number(m.quiz.durationMinutes) || 20,
          passingPercentage: Number(m.quiz.passingPercentage) || 70,
          maxAttempts: Number(m.quiz.maxAttempts) || 3,
          questionCount: finalQuestionCount,
          quizType: "MODULE",
          randomizeQuestions: true,
          showResultImmediately: true,
          showCorrectAnswers: true,
          easyQuestionCount: 0,
          mediumQuestionCount: 0,
          hardQuestionCount: 0,
        };

        let existingServerQuizId: string | null = !isLocalId(m.quiz.id, "q") ? m.quiz.id : null;

        // 2. Second: Create or update quiz
        if (existingServerQuizId) {
          try {
            await quizService.updateQuiz(existingServerQuizId, quizPayload);
            quizId = existingServerQuizId;
          } catch {
            try {
              const qr: any = await quizService.createQuiz(quizPayload);
              const data = unwrap<any>(qr);
              quizId = String(data?.id ?? data?.quizId ?? data?.quiz_id ?? data?.uuid ?? existingServerQuizId ?? "");
            } catch {
              quizId = existingServerQuizId;
            }
          }
        } else {
          try {
            const qr: any = await quizService.createQuiz(quizPayload);
            const data = unwrap<any>(qr);
            quizId = String(data?.id ?? data?.quizId ?? data?.quiz_id ?? data?.uuid ?? "");
          } catch (createErr: any) {
            const fallbackId = createErr?.response?.data?.quizId || createErr?.response?.data?.id;
            if (fallbackId) {
              await quizService.updateQuiz(String(fallbackId), quizPayload);
              quizId = String(fallbackId);
            }
          }
        }

        // 3. Third: Publish quiz
        if (quizId && !isLocalId(quizId, "q")) {
          try {
            await quizService.publishQuiz(quizId);
          } catch {
            /* publish is best-effort */
          }
        }

        nextQuiz = { ...m.quiz, id: quizId, csvFile: undefined, excelFile: undefined };
      }

      nextModules.push({ ...m, id: moduleId, order: mIdx, lessons: nextLessons, quiz: nextQuiz });
    }

    setModules(nextModules);
  };

  const persistPricingFromStep3 = async (courseId: string) => {
    await coursesService.updateCourse(courseId, buildCoursePayload());
  };

  const next = async () => {
    const err = validateStep(step);
    if (err) { toast({ title: err, variant: "destructive" }); return; }
    try {
      setSubmitting(true);
      if (step === 1) {
        const cid = await persistCourseFromStep1();
        toast({ title: mode === "create" && !serverCourseId ? "Course created" : "Course saved" });
        setServerCourseId(cid);
      } else if (step === 2) {
        if (!serverCourseId) throw new Error("Course not created yet");
        await persistCurriculumFromStep2(serverCourseId);
        toast({ title: "Curriculum saved" });
      } else if (step === 3) {
        if (!serverCourseId) throw new Error("Course not created yet");
        await persistPricingFromStep3(serverCourseId);
        toast({ title: "Pricing saved" });
      }
      setStep((s) => Math.min(4, s + 1));
    } catch (e: any) {
      toast({ title: errMsg(e, "Save failed"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };
  const back = () => setStep((s) => Math.max(1, s - 1));

  // ---------- Module ops ----------
  const addModule = () =>
    setModules((m) => [...m, { id: uid("m"), title: "", expanded: true, order: m.length, lessons: [] }]);
  const removeModule = async (mid: string) => {
    if (!isLocalId(mid, "m")) {
      try { await coursesService.deleteModule(mid); } catch { /* keep going */ }
    }
    setModules((m) => m.filter((x) => x.id !== mid));
  };
  const toggleModule = (mid: string) =>
    setModules((m) => m.map((x) => (x.id === mid ? { ...x, expanded: !x.expanded } : x)));
  const setModuleTitle = (mid: string, title: string) =>
    setModules((m) => m.map((x) => (x.id === mid ? { ...x, title } : x)));

  // ---------- Lesson ops ----------
  const openAddVideo = (mid: string) => {
    setVideoForm({
      id: uid("l"), title: "", description: "", type: "video",
      videoUrl: "", videoDurationSeconds: 0, order: 0, allowPreview: false,
    });
    setVideoMinSec({ min: 0, sec: 0 });
    setVideoDialog({ open: true, moduleId: mid });
  };
  const saveVideoLesson = () => {
    if (!videoForm.title.trim()) {
      toast({ title: "Video title is required", variant: "destructive" }); return;
    }
    if (!videoForm.description?.trim()) {
      toast({ title: "Description is required", variant: "destructive" }); return;
    }
    if (!videoForm.videoFile && !videoForm.videoUrl) {
      toast({ title: "Provide a video file or URL", variant: "destructive" }); return;
    }
    const videoDurationSeconds = videoMinSec.min * 60 + videoMinSec.sec;
    const mid = videoDialog.moduleId!;
    setModules((m) => m.map((x) => {
      if (x.id !== mid) return x;
      const idx = x.lessons.findIndex((l) => l.id === videoForm.id);
      const lesson: LessonDraft = {
        ...videoForm,
        videoDurationSeconds,
        order: idx >= 0 ? x.lessons[idx].order : x.lessons.length,
      };
      const lessons = idx >= 0
        ? x.lessons.map((l, i) => i === idx ? lesson : l)
        : [...x.lessons, lesson];
      return { ...x, lessons };
    }));
    setVideoDialog({ open: false });
    toast({ title: "Video lesson saved (will upload on Continue)" });
  };
  const editLesson = (mid: string, lid: string) => {
    const mod = modules.find((m) => m.id === mid);
    const lsn = mod?.lessons.find((l) => l.id === lid);
    if (!lsn) return;
    if (lsn.type === "video") {
      setVideoForm(lsn);
      setVideoMinSec({ min: Math.floor(lsn.videoDurationSeconds / 60), sec: lsn.videoDurationSeconds % 60 });
      setVideoDialog({ open: true, moduleId: mid, lessonId: lid });
    }
  };
  const removeLesson = async (mid: string, lid: string) => {
    if (!isLocalId(lid, "l")) {
      try { await coursesService.deleteLesson(lid); } catch { /* keep going */ }
    }
    setModules((m) => m.map((x) =>
      x.id === mid ? { ...x, lessons: x.lessons.filter((l) => l.id !== lid) } : x));
  };

  // ---------- Quiz ops ----------
  const openAddQuiz = (mid: string) => {
    const mod = modules.find((m) => m.id === mid);
    setQuizForm(mod?.quiz ?? {
      id: uid("q"),
      title: mod?.title ? `${mod.title} Quiz` : "",
      description: "Assessment for module",
      durationMinutes: 30,
      passingPercentage: 75,
      maxAttempts: 3,
      questionCount: 10,
      quizType: "MODULE",
    });
    setQuizDialog({ open: true, moduleId: mid });
  };
  const saveQuiz = () => {
    const mid = quizDialog.moduleId!;
    if (!quizForm.title.trim()) {
      toast({ title: "Quiz title required", variant: "destructive" }); return;
    }
    setModules((m) => m.map((x) => x.id === mid ? { ...x, quiz: quizForm } : x));
    setQuizDialog({ open: false });
    toast({ title: "Quiz attached to module" });
  };
  const removeQuiz = (mid: string) =>
    setModules((m) => m.map((x) => x.id === mid ? { ...x, quiz: undefined } : x));

  // ---------- File handlers ----------
  const handleThumb = (e: ChangeEvent<HTMLInputElement>, key: "thumbnail" | "banner") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => setBasic((b) => ({
      ...b,
      [key]: String(r.result),
      [`${key}File`]: file,
    } as any));
    r.readAsDataURL(file);
  };

  // ---------- Final publish ----------
  const handleFinalSubmit = async () => {
    for (let s = 1; s <= 3; s++) {
      const err = validateStep(s);
      if (err) { toast({ title: err, variant: "destructive" }); setStep(s); return; }
    }
    try {
      setSubmitting(true);
      if (!serverCourseId) {
        const cid = await persistCourseFromStep1();
        await persistCurriculumFromStep2(cid);
        await persistPricingFromStep3(cid);
      }
      if (publishMode === "publish" && serverCourseId) {
        await coursesService.publishCourse(serverCourseId);
      }
      toast({
        title:
          publishMode === "publish"
            ? "Course published, wait for admin approval."
            : "Saved as draft",
      });
      navigate(coursesListPath);
    } catch (e: any) {
      toast({ title: errMsg(e, "Failed to save course"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };
  if (courseType === "LIVE") {
  return (
    <InstructorLiveCourseForm
      mode={mode}
      onSwitchToRecorded={() => setCourseType("RECORDED")}
    />
  );
}

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  const progressPct = (step / STEPS.length) * 100;
  const primaryLabel =
    step === 1 ? "Continue to Curriculum"
    : step === 2 ? "Continue to Pricing"
    : step === 3 ? "Review & Publish"
    : "";

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto">
      <button
        onClick={() => navigate(coursesListPath)}
        className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1 mb-3"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Courses
      </button>

      <h1 className="text-2xl font-bold">
        {mode === "create" && !serverCourseId ? "Create New Course" : "Edit Course"}
      </h1>
      <p className="text-sm text-muted-foreground mb-5">
        Step {step} of {STEPS.length} : {STEPS[step - 1].label}
      </p>

      <div className="mb-2 flex justify-between text-xs">
        <span className="font-medium">Course Setup Progress</span>
        <span className="text-muted-foreground">{step} of {STEPS.length}</span>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mb-5">
        <div className="h-full bg-blue-600 transition-all" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        {STEPS.map((s) => {
          const done = step > s.n;
          const active = step === s.n;
          return (
            <div key={s.n} className="flex items-center gap-2">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium
                ${done || active ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-600"}`}>
                {done ? <Check className="h-4 w-4" /> : s.n}
              </div>
              <span className={`text-sm ${active ? "font-semibold" : "text-muted-foreground"}`}>{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* ===== STEP 1 ===== */}
      {step === 1 && (
        <>
          <div className="flex items-center border-b border-slate-200 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab("details")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === "details" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >Class Details</button>
            <button
              type="button"
              onClick={() => setActiveTab("announcements")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === "announcements" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >Announcements</button>
          </div>

          {activeTab === "details" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="mt-6 rounded-xl border border-border bg-card p-4 sm:p-5">
  <p className="mb-3 text-sm font-medium text-foreground">Course Type</p>
  <div className="grid gap-3 sm:grid-cols-2">
    <button
      type="button"
      onClick={() => setCourseType("RECORDED")}
      className="flex w-full items-center gap-3 rounded-lg border border-primary bg-primary/5 p-4 text-left"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-primary">
        <span className="h-2.5 w-2.5 rounded-full bg-primary" />
      </span>
      <span>
        <span className="block text-sm font-medium text-foreground">Recorded Course</span>
        <span className="block text-xs text-muted-foreground">Pre-recorded videos</span>
      </span>
    </button>
    <button
      type="button"
      onClick={() => setCourseType("LIVE")}
      className="flex w-full items-center gap-3 rounded-lg border border-border bg-background p-4 text-left hover:bg-muted/50"
    >
      <span className="h-5 w-5 rounded-full border-2 border-muted-foreground/40" />
      <span>
        <span className="block text-sm font-medium text-foreground">Live Course</span>
        <span className="block text-xs text-muted-foreground">Interactive sessions</span>
      </span>
    </button>
  </div>
</div>

                <Field label="Course Title" required>
                  <Input maxLength={80} value={basic.title}
                    onChange={(e) => setBasic({ ...basic, title: e.target.value })}
                    placeholder="e.g., Learn Advanced React Patterns and Best Practices" />
                  <div className="text-[11px] text-muted-foreground text-right mt-1">{basic.title.length}/80</div>
                </Field>

                <Field label="Description" required>
                  <Textarea rows={5} maxLength={1000} value={basic.description}
                    onChange={(e) => setBasic({ ...basic, description: e.target.value })}
                    placeholder="What will students learn from this course?" />
                  <div className="text-[11px] text-muted-foreground text-right mt-1">{basic.description.length}/1000</div>
                </Field>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Category" required>
                    <Select value={basic.categoryId} onValueChange={(v) => setBasic({ ...basic, categoryId: v, subcategoryId: "" })}>
                      <SelectTrigger><SelectValue placeholder="Choose option..." /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>

                  {subcategories.length > 0 && (
                    <Field label="Subcategory (optional)">
                      <Select
                        value={basic.subcategoryId || "none"}
                        onValueChange={(v) => setBasic({ ...basic, subcategoryId: v === "none" ? "" : v })}
                      >
                        <SelectTrigger><SelectValue placeholder="Select subcategory (optional)" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None (Main Category only)</SelectItem>
                          {subcategories.map((sc) => (
                            <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                </div>

                <Field label="Tags (comma separated)">
                  <Input value={basic.tags} onChange={(e) => setBasic({ ...basic, tags: e.target.value })} placeholder="react, hooks, frontend" />
                </Field>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Language" required>
                    <Select value={basic.language} onValueChange={(v) => setBasic({ ...basic, language: v })}>
                      <SelectTrigger><SelectValue placeholder="Choose option..." /></SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Course Level" required>
                    <Select value={basic.level} onValueChange={(v) => setBasic({ ...basic, level: v })}>
                      <SelectTrigger><SelectValue placeholder="Choose option..." /></SelectTrigger>
                      <SelectContent>
                        {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={basic.certificateEnabled}
                    onCheckedChange={(c) => setBasic({ ...basic, certificateEnabled: !!c })} />
                  Issue a certificate of completion
                </label>
              </div>

              <div className="space-y-4">
                <UploadBox label="Course Thumbnail"
                  hint="Recommended: 1280×720, JPG/PNG/WebP, max 5MB"
                  preview={basic.thumbnail}
                  onChange={(e) => handleThumb(e, "thumbnail")} />
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-blue-900">Pro Tip</p>
                  <p className="text-xs text-blue-800 mt-1">High-quality thumbnails significantly increase enrollment.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "announcements" && (
            <CourseAnnouncementsManager courseId={serverCourseId ?? undefined} />
          )}
        </>
      )}

      {/* ===== STEP 2 ===== */}
      {step === 2 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <h2 className="font-semibold">Course Curriculum</h2>
              <p className="text-sm text-muted-foreground">
                Organize your course into modules and lessons. Everything is saved when you click <b>Continue to Pricing</b>.
              </p>
            </div>
            <Button onClick={addModule} className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Plus className="h-4 w-4" /> Add Module
            </Button>
          </div>

          <div className="space-y-3">
            {modules.map((m) => (
              <div key={m.id} className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-white">
                  <GripVertical className="h-4 w-4 text-slate-400" />
                  <button onClick={() => toggleModule(m.id)}>
                    {m.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <Input value={m.title} onChange={(e) => setModuleTitle(m.id, e.target.value)}
                    placeholder="Module title (e.g., Getting Started)"
                    className="border-0 shadow-none focus-visible:ring-0 px-2" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {m.lessons.length} lessons · {m.quiz ? "1 quiz" : "no quiz"}
                  </span>
                  <Button size="icon" variant="ghost" onClick={() => removeModule(m.id)}>
                    <Trash2 className="h-4 w-4 text-slate-500" />
                  </Button>
                </div>

                {m.expanded && (
                  <div className="border-t border-slate-200">
                    {m.lessons.map((l) => (
                      <div key={l.id} className="flex items-center gap-2 px-3 py-2 bg-white border-b last:border-b-0 border-slate-100">
                        <GripVertical className="h-4 w-4 text-slate-400" />
                        {l.type === "video"
                          ? <PlayCircle className="h-4 w-4 text-blue-600" />
                          : <FileText className="h-4 w-4 text-emerald-600" />}
                        <span className="text-sm flex-1 truncate">{l.title || "Untitled lesson"}</span>
                        {l.type === "video" && l.videoDurationSeconds > 0 && (
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                            {Math.floor(l.videoDurationSeconds / 60)}m {l.videoDurationSeconds % 60}s
                          </span>
                        )}
                        {l.type === "video" && (
                          <Button size="sm" variant="ghost" className="h-8 text-xs text-blue-600" onClick={() => editLesson(m.id, l.id)}>
                            Edit
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => removeLesson(m.id, l.id)}>
                          <Trash2 className="h-4 w-4 text-slate-500" />
                        </Button>
                      </div>
                    ))}

                    {m.quiz && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50/40 border-b border-slate-100">
                        <HelpCircle className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm flex-1">{m.quiz.title || "Module Quiz"}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {m.quiz.excelFileName ||
                            m.quiz.csvFileName ||
                            m.quiz.fileName ||
                            (m.quiz.fileUrl ? m.quiz.fileUrl.split("/").pop() : null) ||
                            (m.quiz.questionCount ? `${m.quiz.questionCount} Questions` : "QuestionBank_Uploaded")}
                        </span>
                        <Button size="sm" variant="ghost" className="h-8 text-xs text-blue-600" onClick={() => openAddQuiz(m.id)}>Edit</Button>
                        <Button size="icon" variant="ghost" onClick={() => removeQuiz(m.id)}>
                          <Trash2 className="h-4 w-4 text-slate-500" />
                        </Button>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-0 sm:gap-px">
                      <button onClick={() => openAddVideo(m.id)}
                        className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm py-2.5 flex items-center justify-center gap-1 font-medium">
                        <PlayCircle className="h-4 w-4" /> Add Video Lesson
                      </button>
                      {!m.quiz && (
                        <button onClick={() => openAddQuiz(m.id)}
                          className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm py-2.5 flex items-center justify-center gap-1 font-medium">
                          <Plus className="h-4 w-4" /> Add Quiz
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-slate-200 pt-4">
            <p className="text-sm font-medium mb-3">Current Course Stats</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <StatBox n={modules.length} label="Modules" />
              <StatBox n={totalLessons} label="Lessons" />
              <StatBox n={totalVideos} label="Videos" />
              <StatBox n={totalQuizzes} label="Quizzes" />
              <StatBox n={totalHours} label="Hours" />
            </div>
          </div>
        </div>
      )}

      {/* ===== STEP 3 ===== */}
      {step === 3 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-semibold">Course Pricing & Monetization</h2>
          <p className="text-sm text-muted-foreground mb-4">Choose how students will access your course</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PriceOption active={pricing.type === "free"} onClick={() => setPricing({ ...pricing, type: "free" })}
              title="Free Course" desc="Make your course free for all students" />
            <PriceOption active={pricing.type === "one-time"} onClick={() => setPricing({ ...pricing, type: "one-time" })}
              title="One-Time Purchase" desc="Students pay once for lifetime access" />
          </div>

          {pricing.type === "one-time" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 pt-5 border-t border-slate-200">
              <Field label="Base Price ($) — what users pay" required>
                <Input type="number" step="0.01" value={pricing.salePrice}
                  onChange={(e) => setPricing({ ...pricing, salePrice: e.target.value })} />
              </Field>
              <Field label="Strike-out Price / MRP ($)">
                <Input type="number" step="0.01" value={pricing.mrp}
                  onChange={(e) => setPricing({ ...pricing, mrp: e.target.value })} />
              </Field>
              <Field label="Tax (%)">
                <Input type="number" step="0.01" value={pricing.tax}
                  onChange={(e) => setPricing({ ...pricing, tax: e.target.value })} />
              </Field>
            </div>
          )}

          <div className="mt-4">
            <Field label="Pricing Description">
              <Textarea rows={3} value={pricing.description}
                onChange={(e) => setPricing({ ...pricing, description: e.target.value })} />
            </Field>
          </div>
        </div>
      )}

      {/* ===== STEP 4 ===== */}
      {step === 4 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-6">
          <div>
            <h2 className="font-semibold">Review & Publish Your Course</h2>
            <p className="text-sm text-muted-foreground">Make sure everything is ready before publishing</p>
          </div>

          <div>
            <p className="text-sm font-semibold mb-2">Publishing Checklist</p>
            <div className="space-y-2">
              <ChecklistItem item="Course information complete" done={!!basic.title && !!basic.description && !!basic.categoryId && !!basic.level} />
              <ChecklistItem item="At least one module with lessons" done={modules.length > 0 && modules.every(m => m.lessons.length > 0)} />
              <ChecklistItem item="Pricing configured" done={pricing.type === "free" || Number(pricing.salePrice) > 0} />
              <ChecklistItem item="Thumbnail uploaded" done={!!basic.thumbnail} />
            </div>
          </div>

          {basic.thumbnail && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <img src={basic.thumbnail} alt="thumbnail" className="w-full h-48 object-cover" />
            </div>
          )}

          <div>
            <p className="text-sm font-semibold mb-2">Course Summary</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <SummaryBox label="Course Title" value={basic.title || "—"} />
              <SummaryBox label="Category" value={categories.find(c => c.id === basic.categoryId)?.name || "—"} />
              <SummaryBox label="Level" value={basic.level || "—"} />
              <SummaryBox label="Language" value={basic.language} />
              <SummaryBox label="Modules" value={`${modules.length}`} />
              <SummaryBox label="Lessons" value={`${totalLessons} (${totalVideos} video)`} />
              <SummaryBox label="Quizzes" value={`${totalQuizzes}`} />
              <SummaryBox label="Total Duration" value={`${totalHours} hours`} />
              <SummaryBox label="Base Price" value={pricing.type === "free" ? "Free" : `$${pricing.salePrice}`} />
              <SummaryBox label="MRP (Strike-out)" value={pricing.type === "free" ? "—" : `$${pricing.mrp}`} />
              <SummaryBox label="Certificate" value={basic.certificateEnabled ? "Enabled" : "Disabled"} />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold mb-2">Publishing Options</p>
            <div className="space-y-2">
              <PriceOption active={publishMode === "publish"} onClick={() => setPublishMode("publish")}
                title="Publish Now" desc="Your course will be live immediately" />
              <PriceOption active={publishMode === "draft"} onClick={() => setPublishMode("draft")}
                title="Save as Draft" desc="Complete this later" />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between pt-5 border-t border-slate-200">
        {step === 1
          ? <Button variant="outline" onClick={() => navigate(coursesListPath)} disabled={submitting}>Cancel</Button>
          : <Button variant="outline" onClick={back} disabled={submitting}>Back</Button>}
        {step < 4
          ? <Button onClick={next} disabled={submitting} className="bg-blue-600 hover:bg-blue-700 gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {submitting ? "Saving..." : primaryLabel}
            </Button>
          : <Button onClick={handleFinalSubmit} disabled={submitting} className="bg-blue-600 hover:bg-blue-700 gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {submitting
                ? "Publishing..."
                : publishMode === "publish" ? "Publish Course Now" : "Save as Draft"}
            </Button>}
      </div>

      {/* ===== Video Lesson Dialog ===== */}
      {/* <Dialog open={videoDialog.open} onOpenChange={(o) => setVideoDialog({ open: o })}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Upload Video Lesson</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Field label="Video Title" required>
              <Input value={videoForm.title}
                onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                placeholder="e.g., Getting Started with React" />
            </Field>
            <Field label="Description">
              <Textarea rows={2} value={videoForm.description || ""}
                onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })} />
            </Field>
            <Field label="Video File" required>
              <label className="block border-2 border-dashed border-slate-200 rounded-lg h-32 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400">
                <Film className="h-7 w-7 text-slate-400 mb-1" />
                <span className="text-sm font-medium">{videoForm.videoFileName || "Drop video here or click"}</span>
                <span className="text-[11px] text-muted-foreground">MP4, WebM, or MOV (max 500MB)</span>
                <input type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setVideoForm({ ...videoForm, videoFile: f, videoFileName: f.name, videoUrl: URL.createObjectURL(f) });
                  }} />
              </label>
            </Field>
            <Field label="Video URL (optional)">
              <Input value={videoForm.videoUrl || ""}
                onChange={(e) => setVideoForm({ ...videoForm, videoUrl: e.target.value })}
                placeholder="https://..." />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Duration (minutes)">
                <Input type="number" min={0} value={videoMinSec.min}
                  onChange={(e) => setVideoMinSec({ ...videoMinSec, min: Number(e.target.value) })} />
              </Field>
              <Field label="(seconds)">
                <Input type="number" min={0} max={59} value={videoMinSec.sec}
                  onChange={(e) => setVideoMinSec({ ...videoMinSec, sec: Number(e.target.value) })} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={videoForm.allowPreview}
                onCheckedChange={(c) => setVideoForm({ ...videoForm, allowPreview: !!c })} />
              Allow students to preview this lesson
            </label>
            <Field label="Captions (Optional)">
              <label className="block bg-blue-50 text-blue-600 text-sm text-center py-2 rounded-md cursor-pointer font-medium">
                {videoForm.captionFileName || "Upload caption file (.vtt / .srt)"}
                <input type="file" accept=".vtt,.srt,text/vtt,application/x-subrip" className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setVideoForm({ ...videoForm, captionFile: f, captionFileName: f.name });
                  }} />
              </label>
            </Field>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setVideoDialog({ open: false })}>Cancel</Button>
            <Button className="flex-1 bg-blue-600 hover:bg-blue-700 gap-1" onClick={saveVideoLesson}>
              <Plus className="h-4 w-4" /> Save Video Lesson
            </Button>
          </div>
        </DialogContent>
      </Dialog> */}
      <Dialog
  open={videoDialog.open}
  onOpenChange={(o) => setVideoDialog({ open: o })}
>
  <DialogContent
    className="
      w-[calc(100%-1rem)]
      max-w-md
      max-h-[90vh]
      overflow-y-auto
      rounded-xl
      p-4
      sm:w-[calc(100%-2rem)]
      sm:max-w-lg
      sm:p-6
    "
  >
    <DialogHeader>
      <DialogTitle className="text-base sm:text-lg">
        Upload Video Lesson
      </DialogTitle>
    </DialogHeader>

    <div className="space-y-4">
      <Field label="Video Title" required>
        <Input
          className="w-full"
          value={videoForm.title}
          onChange={(e) =>
            setVideoForm({ ...videoForm, title: e.target.value })
          }
          placeholder="e.g., Getting Started with React"
        />
      </Field>

      <Field label="Description" required>
        <Textarea
          className="w-full resize-y"
          rows={2}
          value={videoForm.description || ""}
          placeholder="Enter lesson description"
          onChange={(e) =>
            setVideoForm({
              ...videoForm,
              description: e.target.value,
            })
          }
        />
      </Field>

      <Field label="Video File" required>
        <label
          className="
            flex h-32 w-full
            cursor-pointer flex-col items-center justify-center
            rounded-lg border-2 border-dashed border-slate-200
            px-3 text-center
            transition-colors
            hover:border-blue-400
            sm:h-36
          "
        >
          <Film className="mb-1 h-7 w-7 shrink-0 text-slate-400" />

          <span className="max-w-full truncate px-2 text-sm font-medium">
            {videoForm.videoFileName || "Drop video here or click"}
          </span>

          <span className="mt-1 text-center text-[11px] text-muted-foreground">
            MP4, WebM, or MOV (max 500MB)
          </span>

          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];

              if (f) {
                setVideoForm({
                  ...videoForm,
                  videoFile: f,
                  videoFileName: f.name,
                  videoUrl: URL.createObjectURL(f),
                });
              }
            }}
          />
        </label>
      </Field>

      <Field label="Video URL (optional)">
        <Input
          className="w-full"
          value={videoForm.videoUrl || ""}
          onChange={(e) =>
            setVideoForm({
              ...videoForm,
              videoUrl: e.target.value,
            })
          }
          placeholder="https://..."
        />
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Duration (minutes)">
          <Input
            type="number"
            min={0}
            className="w-full"
            value={videoMinSec.min}
            onChange={(e) =>
              setVideoMinSec({
                ...videoMinSec,
                min: Number(e.target.value),
              })
            }
          />
        </Field>

        <Field label="(seconds)">
          <Input
            type="number"
            min={0}
            max={59}
            className="w-full"
            value={videoMinSec.sec}
            onChange={(e) =>
              setVideoMinSec({
                ...videoMinSec,
                sec: Number(e.target.value),
              })
            }
          />
        </Field>
      </div>

      <label className="flex cursor-pointer items-start gap-2 text-sm leading-5">
        <Checkbox
          checked={videoForm.allowPreview}
          onCheckedChange={(c) =>
            setVideoForm({
              ...videoForm,
              allowPreview: !!c,
            })
          }
        />

        <span>Allow students to preview this lesson</span>
      </label>

      <Field label="Captions (Optional)">
        <label
          className="
            block w-full
            cursor-pointer
            rounded-md
            bg-blue-50
            px-3 py-2
            text-center
            text-sm font-medium
            text-blue-600
            transition-colors
            hover:bg-blue-100
          "
        >
          <span className="block max-w-full truncate">
            {videoForm.captionFileName ||
              "Upload caption file (.vtt / .srt)"}
          </span>

          <input
            type="file"
            accept=".vtt,.srt,text/vtt,application/x-subrip"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];

              if (f) {
                setVideoForm({
                  ...videoForm,
                  captionFile: f,
                  captionFileName: f.name,
                });
              }
            }}
          />
        </label>
      </Field>
    </div>

    <div
      className="
        flex flex-col gap-2 pt-2
        sm:flex-row
      "
    >
      <Button
        variant="outline"
        className="w-full sm:flex-1"
        onClick={() => setVideoDialog({ open: false })}
      >
        Cancel
      </Button>

      <Button
        className="w-full gap-1 bg-blue-600 hover:bg-blue-700 sm:flex-1"
        onClick={saveVideoLesson}
      >
        <Plus className="h-4 w-4" />
        Save Video Lesson
      </Button>
    </div>
  </DialogContent>
</Dialog>

      {/* ===== Quiz Dialog ===== */}
      <Dialog open={quizDialog.open} onOpenChange={(o) => setQuizDialog({ open: o })}>
        <DialogContent className="max-w-xl p-6 bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Quiz</DialogTitle>
            <p className="text-xs text-slate-500 font-normal mt-0.5">Upload a CSV to link multiple quizzes</p>
          </DialogHeader>

          <div className="space-y-4 my-1">
            {/* XLSX Format Info Box */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-900">XLSX Format</h4>
              <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-3.5 space-y-1">
                <p className="text-xs font-semibold text-slate-800">
                  Quiz Questions upload column template*
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Topic, Question, Question Type, Option A, Option B, Option C, Option D, Correct Answers, Difficulty, Explanation
                </p>
              </div>

              <Button
                type="button"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium gap-2 h-11 rounded-lg shadow-sm text-sm"
                onClick={() => downloadQuizSampleXlsx()}
              >
                <Download className="h-4 w-4" />
                Download Sample XLSX
              </Button>
            </div>

            {/* Upload XLSX Input */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-900">Upload XLSX</Label>
              <div className="relative">
                <label className="flex items-center w-full h-11 px-3 border border-slate-200 rounded-lg cursor-pointer bg-white hover:bg-slate-50 text-sm text-slate-600 truncate">
                  <span className="truncate">
                    {quizForm.excelFileName || quizForm.csvFileName || "Choose File - No file chosen"}
                  </span>
                  <input
                    type="file"
                    accept=".xlsx"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (!f.name.toLowerCase().endsWith(".xlsx")) {
                        toast({
                          title: "Invalid File Type",
                          description: "Only .xlsx files are allowed!",
                          variant: "destructive",
                        });
                        e.target.value = "";
                        return;
                      }
                      setQuizForm({
                        ...quizForm,
                        csvFile: f,
                        csvFileName: f.name,
                        excelFile: f,
                        excelFileName: f.name,
                      });
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Light Blue Card for Quiz Form Parameters */}
            <div className="bg-blue-50/60 border border-blue-100/80 rounded-xl p-4 space-y-4">
              <Field label="Quiz Title" required>
                <Input
                  className="bg-white border-slate-200 text-sm h-10"
                  value={quizForm.title}
                  onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                  placeholder="e.g., Getting Started with React"
                />
              </Field>

              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Field label="Max Attempts :">
                  <Input
                    type="number"
                    min={0}
                    className="bg-white border-slate-200 text-sm h-9"
                    value={quizForm.maxAttempts ?? 3}
                    onChange={(e) => setQuizForm({ ...quizForm, maxAttempts: Number(e.target.value) })}
                  />
                </Field>

                <Field label="No of Questions :">
                  <Input
                    type="number"
                    min={0}
                    className="bg-white border-slate-200 text-sm h-9"
                    value={quizForm.questionCount ?? 10}
                    onChange={(e) => setQuizForm({ ...quizForm, questionCount: Number(e.target.value) })}
                  />
                </Field>

                <Field label="passing marks :">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    className="bg-white border-slate-200 text-sm h-9"
                    value={quizForm.passingPercentage ?? 75}
                    onChange={(e) => setQuizForm({ ...quizForm, passingPercentage: Number(e.target.value) })}
                  />
                </Field>

                <Field label="Duration :">
                  <Input
                    type="number"
                    min={0}
                    className="bg-white border-slate-200 text-sm h-9"
                    value={quizForm.durationMinutes ?? 30}
                    onChange={(e) => setQuizForm({ ...quizForm, durationMinutes: Number(e.target.value) })}
                  />
                </Field>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 border-slate-200 text-slate-700 font-medium rounded-lg"
              onClick={() => setQuizDialog({ open: false })}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
              onClick={saveQuiz}
            >
              Process CSV
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SummarySummarySpacer />
    </div>
  );
};

/* ============= Helpers ============= */
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-medium text-slate-700 mb-1.5 block">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
    </div>
  );
}
function UploadBox({ label, hint, preview, onChange }: { label: string; hint: string; preview?: string; onChange: (e: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <p className="text-sm font-semibold mb-3">{label}</p>
      <label className="block border-2 border-dashed border-slate-200 rounded-lg h-40 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 overflow-hidden">
        {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : (
          <>
            <ImageIcon className="h-8 w-8 text-slate-400 mb-2" />
            <span className="text-sm font-medium">Drop image here</span>
            <span className="text-xs text-muted-foreground">or click to select</span>
          </>
        )}
        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onChange} />
      </label>
      <p className="text-[11px] text-muted-foreground mt-2">{hint}</p>
    </div>
  );
}
function StatBox({ n, label }: { n: number | string; label: string }) {
  return (
    <div>
      <p className="text-2xl font-bold text-blue-600">{n}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
function PriceOption({ active, onClick, title, desc }: any) {
  return (
    <button type="button" onClick={onClick}
      className={`text-left w-full border rounded-lg p-4 flex items-start gap-3 transition ${active ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white"}`}>
      <span className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center ${active ? "border-blue-600" : "border-slate-300"}`}>
        {active && <span className="h-2 w-2 rounded-full bg-blue-600" />}
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
    </button>
  );
}
function ChecklistItem({ item, done }: { item: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2 border border-slate-200 rounded-md px-3 py-2">
      <div className={`h-4 w-4 rounded flex items-center justify-center ${done ? "bg-blue-600" : "bg-slate-200"}`}>
        {done && <CheckCircle2 className="h-3 w-3 text-white" />}
      </div>
      <span className="text-sm">{item}</span>
    </div>
  );
}
function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-200 rounded-md px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-medium truncate">{value}</p>
    </div>
  );
}
function SummarySummarySpacer() { return null; }

export default InstructorCourseForm;
