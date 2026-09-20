import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  Video,
  Image,
  FileText,
  X,
  Check,
  Clock,
  Plus,
  Trash2,
  Eye,
  GripVertical,
} from "lucide-react";
import { courses } from "@/data/courses";
import { useToast } from "@/hooks/use-toast";

// Mock previously uploaded content per course
const existingCourseLessons: Record<string, { id: string; title: string; type: "video" | "document" | "image"; duration: string; uploadedAt: string; size: string; }[]> = {
  "1": [
    { id: "ex-1", title: "Introduction to React & Setup", type: "video", duration: "18:32", uploadedAt: "2026-01-15", size: "245 MB" },
    { id: "ex-2", title: "Understanding JSX & Components", type: "video", duration: "24:15", uploadedAt: "2026-01-18", size: "312 MB" },
    { id: "ex-3", title: "React Hooks - useState & useEffect", type: "video", duration: "32:40", uploadedAt: "2026-01-22", size: "420 MB" },
  ],
  "2": [
    { id: "ex-4", title: "Python Basics & Environment Setup", type: "video", duration: "22:10", uploadedAt: "2026-02-01", size: "198 MB" },
    { id: "ex-5", title: "NumPy & Pandas Crash Course", type: "video", duration: "35:45", uploadedAt: "2026-02-05", size: "380 MB" },
  ],
  "3": [
    { id: "ex-6", title: "Design Thinking Fundamentals", type: "video", duration: "20:00", uploadedAt: "2026-01-10", size: "210 MB" },
    { id: "ex-7", title: "Figma Interface Walkthrough", type: "video", duration: "28:30", uploadedAt: "2026-01-14", size: "340 MB" },
    { id: "ex-8", title: "Color Theory Cheat Sheet", type: "document", duration: "—", uploadedAt: "2026-01-14", size: "2.4 MB" },
  ],
  "4": [
    { id: "ex-9", title: "AWS Overview & IAM Basics", type: "video", duration: "26:15", uploadedAt: "2026-02-10", size: "290 MB" },
    { id: "ex-10", title: "EC2 & VPC Deep Dive", type: "video", duration: "40:20", uploadedAt: "2026-02-14", size: "460 MB" },
  ],
  "5": [
    { id: "ex-11", title: "Node.js Fundamentals", type: "video", duration: "19:50", uploadedAt: "2026-01-20", size: "220 MB" },
    { id: "ex-12", title: "Express.js REST API", type: "video", duration: "30:15", uploadedAt: "2026-01-25", size: "350 MB" },
  ],
  "6": [
    { id: "ex-13", title: "Networking Fundamentals for Hackers", type: "video", duration: "25:00", uploadedAt: "2026-02-20", size: "270 MB" },
    { id: "ex-14", title: "Kali Linux Setup Guide", type: "document", duration: "—", uploadedAt: "2026-02-20", size: "5.1 MB" },
    { id: "ex-15", title: "Reconnaissance Techniques", type: "video", duration: "38:10", uploadedAt: "2026-02-24", size: "410 MB" },
  ],
  "7": [
    { id: "ex-16", title: "Dart Language Essentials", type: "video", duration: "21:30", uploadedAt: "2026-01-28", size: "230 MB" },
    { id: "ex-17", title: "Flutter Widget Tree Explained", type: "video", duration: "27:45", uploadedAt: "2026-02-01", size: "300 MB" },
  ],
  "8": [
    { id: "ex-18", title: "Docker Basics & Containers", type: "video", duration: "23:20", uploadedAt: "2026-02-08", size: "260 MB" },
    { id: "ex-19", title: "Kubernetes Architecture", type: "video", duration: "34:00", uploadedAt: "2026-02-12", size: "390 MB" },
  ],
};

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  type: "video" | "image" | "document";
  progress: number;
  status: "uploading" | "complete" | "error";
  previewUrl?: string;
}

interface ContentItem {
  id: string;
  title: string;
  description: string;
  type: "video" | "document" | "image";
  file?: UploadedFile;
  lessonNumber: number;
  duration: number;
  isFree: boolean;
}

const InstructorUpload = () => {
  const { toast } = useToast();
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [thumbnailFile, setThumbnailFile] = useState<UploadedFile | null>(null);

  // ── file helpers ──
  const getFileType = (name: string): "video" | "image" | "document" => {
    const ext = name.split(".").pop()?.toLowerCase();
    if (["mp4", "mov", "avi", "webm", "mkv"].includes(ext || "")) return "video";
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext || "")) return "image";
    return "document";
  };

  const fmtSize = (b: number) =>
    b < 1024
      ? `${b} B`
      : b < 1024 * 1024
      ? `${(b / 1024).toFixed(1)} KB`
      : `${(b / (1024 * 1024)).toFixed(1)} MB`;

  // ── upload simulation ──
  const simulateUpload = useCallback(
    (file: File, isThumbnail = false) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const uf: UploadedFile = {
        id,
        name: file.name,
        size: fmtSize(file.size),
        type: getFileType(file.name),
        progress: 0,
        status: "uploading",
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      };

      if (isThumbnail) {
        setThumbnailFile(uf);
      } else {
        setUploadedFiles((p) => [...p, uf]);
      }

      let progress = 0;
      const iv = setInterval(() => {
        progress += Math.random() * 25 + 5;
        if (progress >= 100) {
          progress = 100;
          clearInterval(iv);
          const done = { ...uf, progress: 100, status: "complete" as const };
          if (isThumbnail) {
            setThumbnailFile(done);
          } else {
            setUploadedFiles((p) => p.map((f) => (f.id === id ? done : f)));
          }
        } else {
          if (isThumbnail) {
            setThumbnailFile((p) => (p ? { ...p, progress } : p));
          } else {
            setUploadedFiles((p) => p.map((f) => (f.id === id ? { ...f, progress } : f)));
          }
        }
      }, 400);
    },
    []
  );

  // ── drag & drop ──
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      Array.from(e.dataTransfer.files).forEach((f) => simulateUpload(f));
    },
    [simulateUpload]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach((f) => simulateUpload(f));
    e.target.value = "";
  };

  const handleThumbnailInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) simulateUpload(file, true);
    e.target.value = "";
  };

  const removeFile = (id: string) => setUploadedFiles((p) => p.filter((f) => f.id !== id));

  // ── content items ──
  const addContentItem = () => {
    setContentItems((p) => [
      ...p,
      {
        id: Date.now().toString(),
        title: "",
        description: "",
        type: "video",
        lessonNumber: p.length + 1,
        duration: 0,
        isFree: false,
      },
    ]);
  };

  const updateContentItem = (id: string, updates: Partial<ContentItem>) => {
    setContentItems((p) => p.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const removeContentItem = (id: string) => setContentItems((p) => p.filter((c) => c.id !== id));

  const attachFileToContent = (contentId: string, fileId: string) => {
    const file = uploadedFiles.find((f) => f.id === fileId);
    if (file) updateContentItem(contentId, { file });
  };

  // ── submit ──
  const handleSubmit = () => {
    if (!selectedCourse) {
      toast({ title: "Error", description: "Please select a course.", variant: "destructive" });
      return;
    }
    if (uploadedFiles.length === 0 && contentItems.length === 0) {
      toast({ title: "Error", description: "Upload at least one file or add content.", variant: "destructive" });
      return;
    }
    toast({
      title: "Content Uploaded!",
      description: `${uploadedFiles.length} file(s) and ${contentItems.length} lesson(s) saved successfully.`,
    });
    setUploadedFiles([]);
    setContentItems([]);
    setSelectedCourse("");
    setThumbnailFile(null);
  };

  const fileIcon = (t: UploadedFile["type"]) =>
    t === "video" ? (
      <Video className="h-4 w-4 text-blue-500 shrink-0" />
    ) : t === "image" ? (
      <Image className="h-4 w-4 text-green-500 shrink-0" />
    ) : (
      <FileText className="h-4 w-4 text-orange-500 shrink-0" />
    );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col gap-3 mb-5 md:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Upload Content</h1>
          <p className="text-sm text-muted-foreground mt-1">Upload videos, thumbnails & resources for your courses</p>
        </div>
        <Button variant="default" onClick={handleSubmit} className="shrink-0 w-full sm:w-auto">
          <Upload className="h-4 w-4 mr-2" />
          Publish Content
        </Button>
      </div>

      {/* Mobile Summary (visible only on small screens, above main content) */}
      <div className="lg:hidden mb-5">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <span className="text-muted-foreground">Course: <span className="font-medium text-foreground">{selectedCourse ? courses.find((c) => c.id === selectedCourse)?.title ?? "—" : "None selected"}</span></span>
              <span className="text-muted-foreground">Files: <span className="font-medium text-foreground">{uploadedFiles.length}</span></span>
              <span className="text-muted-foreground">Lessons: <span className="font-medium text-foreground">{contentItems.length}</span></span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
        {/* ─── Left Column ─── */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* Course & Thumbnail */}
          <Card className="shadow-card">
            <CardHeader className="px-4 sm:px-6 py-4">
              <CardTitle className="text-base sm:text-lg">Course & Thumbnail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-5 px-4 sm:px-6">
              <div className="space-y-2">
                <Label className="text-sm">Select Course *</Label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Thumbnail */}
              <div className="space-y-2">
                <Label className="text-sm">Course Thumbnail</Label>
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:gap-4">
                  <div className="h-24 w-full sm:h-28 sm:w-44 shrink-0 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted/30">
                    {thumbnailFile?.previewUrl ? (
                      <img src={thumbnailFile.previewUrl} alt="Thumb" className="h-full w-full object-cover" />
                    ) : (
                      <Image className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-2 w-full sm:w-auto">
                    <label>
                      <input type="file" className="hidden" accept="image/*" onChange={handleThumbnailInput} />
                      <Button variant="outline" size="sm" className="cursor-pointer w-full sm:w-auto" asChild>
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          {thumbnailFile ? "Change" : "Upload"} Thumbnail
                        </span>
                      </Button>
                    </label>
                    <p className="text-xs text-muted-foreground">Recommended: 1280×720, JPG/PNG</p>
                    {thumbnailFile && thumbnailFile.status === "uploading" && (
                      <Progress value={thumbnailFile.progress} className="h-1.5 w-full sm:w-40" />
                    )}
                    {thumbnailFile && thumbnailFile.status === "complete" && (
                      <Badge className="bg-green-100 text-green-700 gap-1">
                        <Check className="h-3 w-3" /> Uploaded
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Previously Uploaded Content */}
          {selectedCourse && existingCourseLessons[selectedCourse] && (
            <Card className="shadow-card border-primary/20">
              <CardHeader className="pb-3 px-4 sm:px-6 py-4">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                    <span className="truncate">Previously Uploaded</span>
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {existingCourseLessons[selectedCourse].length} lesson(s)
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Already uploaded for this course. Review before adding new content.
                </p>
              </CardHeader>
              <CardContent className="space-y-2 px-4 sm:px-6">
                {existingCourseLessons[selectedCourse].map((lesson, idx) => (
                  <div
                    key={lesson.id}
                    className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-muted/40 border border-border/50"
                  >
                    <div className="flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-md bg-primary/10 text-primary text-xs font-bold shrink-0">
                      {idx + 1}
                    </div>
                    <div className="hidden sm:block">
                      {lesson.type === "video" ? (
                        <Video className="h-4 w-4 text-blue-500 shrink-0" />
                      ) : lesson.type === "image" ? (
                        <Image className="h-4 w-4 text-green-500 shrink-0" />
                      ) : (
                        <FileText className="h-4 w-4 text-orange-500 shrink-0" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-foreground truncate">{lesson.title}</p>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                        {lesson.duration !== "—" && (
                          <span className="flex items-center gap-0.5 sm:gap-1">
                            <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />{lesson.duration}
                          </span>
                        )}
                        <span>{lesson.size}</span>
                        <span className="hidden md:inline">• Uploaded {new Date(lesson.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700 text-[10px] sm:text-xs gap-0.5 sm:gap-1 shrink-0 px-1.5 sm:px-2">
                      <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Live
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Drop Zone */}
          <Card className="shadow-card">
            <CardHeader className="px-4 sm:px-6 py-4">
              <CardTitle className="text-base sm:text-lg">Upload Files</CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div
                className={`border-2 border-dashed rounded-xl p-5 sm:p-6 md:p-10 text-center transition-colors ${
                  dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground mx-auto mb-2 sm:mb-3" />
                <p className="font-semibold text-foreground text-sm sm:text-base mb-1">Drag & drop files here</p>
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">Videos, images & documents</p>
                <label>
                  <input type="file" multiple className="hidden" onChange={handleFileInput} accept="video/*,image/*,.pdf,.doc,.docx,.pptx" />
                  <Button variant="outline" size="sm" className="cursor-pointer" asChild>
                    <span>Browse Files</span>
                  </Button>
                </label>
              </div>

              {/* File list */}
              {uploadedFiles.length > 0 && (
                <div className="mt-4 sm:mt-5 space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Files ({uploadedFiles.length})</p>
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-muted/40 rounded-lg">
                      {fileIcon(file.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium truncate">{file.name}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{file.size}</p>
                        {file.status === "uploading" && <Progress value={file.progress} className="h-1 mt-1.5" />}
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {file.status === "uploading" && (
                          <Badge variant="secondary" className="text-[10px] sm:text-xs gap-0.5 sm:gap-1 px-1.5">
                            <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            {Math.round(file.progress)}%
                          </Badge>
                        )}
                        {file.status === "complete" && (
                          <Badge className="bg-green-100 text-green-700 text-[10px] sm:text-xs gap-0.5 sm:gap-1 px-1.5">
                            <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            Done
                          </Badge>
                        )}
                        <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7" onClick={() => removeFile(file.id)}>
                          <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Content / Lesson Items */}
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between px-4 sm:px-6 py-4">
              <CardTitle className="text-base sm:text-lg">Course Content</CardTitle>
              <Button variant="outline" size="sm" onClick={addContentItem}>
                <Plus className="h-4 w-4 mr-1" /> Add Lesson
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
              {contentItems.length === 0 && (
                <div className="text-center py-6 sm:py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-xs sm:text-sm">No lessons yet. Click "Add Lesson" to start building your curriculum.</p>
                </div>
              )}
              {contentItems.map((item, idx) => (
                <div key={item.id} className="border border-border rounded-lg p-3 sm:p-4 space-y-3">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <GripVertical className="h-5 w-5 text-muted-foreground mt-2 shrink-0 hidden sm:block" />
                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Title + Type */}
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <div className="flex-1 space-y-1.5">
                          <Label className="text-xs">Lesson Title *</Label>
                          <Input
                            placeholder={`Lesson ${idx + 1} title`}
                            value={item.title}
                            onChange={(e) => updateContentItem(item.id, { title: e.target.value })}
                          />
                        </div>
                        <div className="w-full sm:w-28 space-y-1.5">
                          <Label className="text-xs">Type</Label>
                          <Select
                            value={item.type}
                            onValueChange={(v: "video" | "document" | "image") => updateContentItem(item.id, { type: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="video">Video</SelectItem>
                              <SelectItem value="document">Document</SelectItem>
                              <SelectItem value="image">Image</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">Description</Label>
                        <Textarea
                          placeholder="Brief lesson description..."
                          value={item.description}
                          onChange={(e) => updateContentItem(item.id, { description: e.target.value })}
                          rows={2}
                        />
                      </div>

                      {/* Lesson #, Duration, Attach File */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="grid grid-cols-2 sm:grid-cols-1 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Lesson #</Label>
                            <Input
                              type="number"
                              min={1}
                              value={item.lessonNumber}
                              onChange={(e) => updateContentItem(item.id, { lessonNumber: Number(e.target.value) })}
                            />
                          </div>
                          <div className="space-y-1.5 sm:hidden">
                            <Label className="text-xs">Duration (min)</Label>
                            <Input
                              type="number"
                              min={0}
                              placeholder="30"
                              value={item.duration || ""}
                              onChange={(e) => updateContentItem(item.id, { duration: Number(e.target.value) })}
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5 hidden sm:block">
                          <Label className="text-xs">Duration (min)</Label>
                          <Input
                            type="number"
                            min={0}
                            placeholder="30"
                            value={item.duration || ""}
                            onChange={(e) => updateContentItem(item.id, { duration: Number(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Attach File</Label>
                          <Select onValueChange={(v) => attachFileToContent(item.id, v)}>
                            <SelectTrigger>
                              <SelectValue placeholder={item.file ? item.file.name : "Select file"} />
                            </SelectTrigger>
                            <SelectContent>
                              {uploadedFiles
                                .filter((f) => f.status === "complete")
                                .map((f) => (
                                  <SelectItem key={f.id} value={f.id}>
                                    {f.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={item.isFree}
                          onCheckedChange={(v) => updateContentItem(item.id, { isFree: v })}
                        />
                        <Label className="text-xs text-muted-foreground">Free preview</Label>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 text-destructive" onClick={() => removeContentItem(item.id)}>
                      <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ─── Right Column (hidden on mobile, shown on lg+) ─── */}
        <div className="hidden lg:block space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Upload Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Course</span>
                <span className="font-medium truncate max-w-[140px]">
                  {selectedCourse ? courses.find((c) => c.id === selectedCourse)?.title ?? "—" : "None"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Videos</span>
                <span className="font-medium">{uploadedFiles.filter((f) => f.type === "video").length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Images</span>
                <span className="font-medium">{uploadedFiles.filter((f) => f.type === "image").length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Documents</span>
                <span className="font-medium">{uploadedFiles.filter((f) => f.type === "document").length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lessons</span>
                <span className="font-medium">{contentItems.length}</span>
              </div>
              <hr className="border-border" />
              <div className="flex justify-between font-medium">
                <span>Total Files</span>
                <Badge variant="secondary">{uploadedFiles.length}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Accepted Formats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { icon: <Video className="h-4 w-4 text-blue-500" />, label: "Videos", formats: "MP4, MOV, AVI, WebM" },
                { icon: <Image className="h-4 w-4 text-green-500" />, label: "Images", formats: "JPG, PNG, GIF, WebP" },
                { icon: <FileText className="h-4 w-4 text-orange-500" />, label: "Documents", formats: "PDF, DOC, DOCX, PPTX" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  {item.icon}
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.formats}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Button className="w-full" size="lg" onClick={handleSubmit}>
            <Upload className="h-4 w-4 mr-2" />
            Publish Content
          </Button>
        </div>
      </div>

      {/* Mobile bottom publish button */}
      <div className="lg:hidden mt-5">
        <Button className="w-full" size="lg" onClick={handleSubmit}>
          <Upload className="h-4 w-4 mr-2" />
          Publish Content
        </Button>
      </div>
    </motion.div>
  );
};

export default InstructorUpload;
