import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Trash2,
} from "lucide-react";
import { courses } from "@/data/courses";
import { useToast } from "@/hooks/use-toast";

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  type: "video" | "image" | "document";
  progress: number;
  status: "uploading" | "complete" | "error";
}

const AdminUpload = () => {
  const { toast } = useToast();
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const getFileType = (fileName: string): "video" | "image" | "document" => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (["mp4", "mov", "avi", "webm"].includes(ext || "")) return "video";
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) return "image";
    return "document";
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const simulateUpload = (file: File) => {
    const newFile: UploadedFile = {
      id: Date.now().toString(),
      name: file.name,
      size: formatFileSize(file.size),
      type: getFileType(file.name),
      progress: 0,
      status: "uploading",
    };

    setUploadedFiles((prev) => [...prev, newFile]);

    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === newFile.id ? { ...f, progress: 100, status: "complete" } : f
          )
        );
      } else {
        setUploadedFiles((prev) =>
          prev.map((f) => (f.id === newFile.id ? { ...f, progress } : f))
        );
      }
    }, 500);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    files.forEach(simulateUpload);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(simulateUpload);
  };

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = () => {
    if (!selectedCourse) {
      toast({
        title: "Select a course",
        description: "Please select a course to upload content to.",
        variant: "destructive",
      });
      return;
    }

    if (uploadedFiles.length === 0) {
      toast({
        title: "No files uploaded",
        description: "Please upload at least one file.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Content uploaded",
      description: `${uploadedFiles.length} file(s) have been added to the course.`,
    });
    setUploadedFiles([]);
    setSelectedCourse("");
  };

  const getFileIcon = (type: UploadedFile["type"]) => {
    switch (type) {
      case "video":
        return <Video className="h-5 w-5 text-blue-500" />;
      case "image":
        return <Image className="h-5 w-5 text-green-500" />;
      default:
        return <FileText className="h-5 w-5 text-orange-500" />;
    }
  };

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
            Upload Content
          </h1>
          <p className="text-muted-foreground">
            Upload videos, images, and resources for your courses.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Upload Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Course Selection */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Select Course</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a course to upload content to" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Drop Zone */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Upload Files</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                    dragActive
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-primary/50"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">
                    Drag and drop files here
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Support for videos, images, and documents
                  </p>
                  <div className="flex justify-center">
                    <label>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileInput}
                        accept="video/*,image/*,.pdf,.doc,.docx"
                      />
                      <Button variant="outline" className="cursor-pointer" asChild>
                        <span>Browse Files</span>
                      </Button>
                    </label>
                  </div>
                </div>

                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground">
                      Uploaded Files ({uploadedFiles.length})
                    </h4>
                    {uploadedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg"
                      >
                        {getFileIcon(file.type)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{file.size}</p>
                          {file.status === "uploading" && (
                            <Progress value={file.progress} className="h-1 mt-2" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {file.status === "uploading" && (
                            <Badge variant="secondary" className="gap-1">
                              <Clock className="h-3 w-3" />
                              {Math.round(file.progress)}%
                            </Badge>
                          )}
                          {file.status === "complete" && (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 gap-1">
                              <Check className="h-3 w-3" />
                              Complete
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeFile(file.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Video Details Form */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Video Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="videoTitle">Video Title</Label>
                  <Input id="videoTitle" placeholder="Enter video title" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="videoDescription">Description</Label>
                  <Textarea
                    id="videoDescription"
                    placeholder="Enter video description"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="lessonNumber">Lesson Number</Label>
                    <Input id="lessonNumber" type="number" placeholder="1" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input id="duration" type="number" placeholder="30" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upload Summary */}
          <div className="space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Upload Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Selected Course</span>
                  <span className="font-medium">
                    {selectedCourse
                      ? courses.find((c) => c.id === selectedCourse)?.title.slice(0, 20) +
                        "..."
                      : "None"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Videos</span>
                  <span className="font-medium">
                    {uploadedFiles.filter((f) => f.type === "video").length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Images</span>
                  <span className="font-medium">
                    {uploadedFiles.filter((f) => f.type === "image").length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Documents</span>
                  <span className="font-medium">
                    {uploadedFiles.filter((f) => f.type === "document").length}
                  </span>
                </div>
                <hr className="border-border" />
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Files</span>
                  <Badge variant="secondary">{uploadedFiles.length}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Accepted Formats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Video className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium text-sm">Videos</p>
                      <p className="text-xs text-muted-foreground">
                        MP4, MOV, AVI, WebM
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Image className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium text-sm">Images</p>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG, GIF, WebP
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="font-medium text-sm">Documents</p>
                      <p className="text-xs text-muted-foreground">PDF, DOC, DOCX</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button className="w-full" size="lg" onClick={handleSubmit}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Content
            </Button>
          </div>
        </div>
      </motion.div>
    </AdminLayout>
  );
};

export default AdminUpload;
