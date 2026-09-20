import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Save,
  Upload,
  Plus,
  Trash2,
  GripVertical,
  Video,
  FileText,
  ArrowLeft,
} from "lucide-react";
import { instructorService } from "@/services/instructor.service";
import { toast } from "sonner";

interface Section {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  type: "video" | "text" | "quiz";
  duration?: number;
  isFree: boolean;
}

const CourseEditor = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [courseData, setCourseData] = useState({
    title: "",
    shortDescription: "",
    description: "",
    category: "",
    level: "",
    price: "",
    thumbnail: "",
  });
  const [sections, setSections] = useState<Section[]>([
    { id: "1", title: "Getting Started", lessons: [] },
  ]);

  const handleInputChange = (field: string, value: string) => {
    setCourseData((prev) => ({ ...prev, [field]: value }));
  };

  const addSection = () => {
    const newSection: Section = {
      id: Date.now().toString(),
      title: `Section ${sections.length + 1}`,
      lessons: [],
    };
    setSections([...sections, newSection]);
  };

  const updateSection = (sectionId: string, title: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, title } : s))
    );
  };

  const deleteSection = (sectionId: string) => {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
  };

  const addLesson = (sectionId: string) => {
    const newLesson: Lesson = {
      id: Date.now().toString(),
      title: "New Lesson",
      type: "video",
      isFree: false,
    };
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, lessons: [...s.lessons, newLesson] } : s
      )
    );
  };

  const updateLesson = (sectionId: string, lessonId: string, updates: Partial<Lesson>) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              lessons: s.lessons.map((l) =>
                l.id === lessonId ? { ...l, ...updates } : l
              ),
            }
          : s
      )
    );
  };

  const deleteLesson = (sectionId: string, lessonId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, lessons: s.lessons.filter((l) => l.id !== lessonId) }
          : s
      )
    );
  };

  const handleSave = async (publish = false) => {
    if (!courseData.title || !courseData.category) {
      toast.error("Please fill in required fields");
      return;
    }

    setLoading(true);
    try {
      await instructorService.createCourse({
        ...courseData,
        price: parseFloat(courseData.price) || 0,
        status: publish ? "published" : "draft",
      } as any);
      toast.success(publish ? "Course published!" : "Course saved as draft");
      navigate("/instructor/courses");
    } catch (error) {
      toast.error("Failed to save course");
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: "web-dev", name: "Web Development" },
    { id: "app-dev", name: "App Development" },
    { id: "ui-ux", name: "UI/UX Design" },
    { id: "data-science", name: "Data Science" },
    { id: "ai-ml", name: "AI & Machine Learning" },
    { id: "cybersecurity", name: "Cyber Security" },
    { id: "cloud", name: "Cloud Computing" },
    { id: "devops", name: "DevOps" },
    { id: "digital-marketing", name: "Digital Marketing" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create New Course</h1>
            <p className="text-muted-foreground">
              Fill in the details to create your course
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <Button onClick={() => handleSave(true)} disabled={loading}>
            Publish Course
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Course Details</TabsTrigger>
          <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Course Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Complete React Developer Course 2024"
                  value={courseData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shortDescription">Short Description *</Label>
                <Textarea
                  id="shortDescription"
                  placeholder="Brief description for course cards (max 160 characters)"
                  value={courseData.shortDescription}
                  onChange={(e) => handleInputChange("shortDescription", e.target.value)}
                  maxLength={160}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Full Description</Label>
                <Textarea
                  id="description"
                  placeholder="Detailed course description..."
                  value={courseData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  rows={6}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select
                    value={courseData.category}
                    onValueChange={(v) => handleInputChange("category", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Level *</Label>
                  <Select
                    value={courseData.level}
                    onValueChange={(v) => handleInputChange("level", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Course Thumbnail</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex h-32 w-48 items-center justify-center rounded-lg border-2 border-dashed">
                  {courseData.thumbnail ? (
                    <img
                      src={courseData.thumbnail}
                      alt="Thumbnail"
                      className="h-full w-full rounded-lg object-cover"
                    />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Image
                  </Button>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Recommended: 1280x720px, JPG or PNG
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Curriculum Tab */}
        <TabsContent value="curriculum" className="space-y-4">
          {sections.map((section, sectionIndex) => (
            <Card key={section.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-5 w-5 cursor-grab text-muted-foreground" />
                  <Input
                    value={section.title}
                    onChange={(e) => updateSection(section.id, e.target.value)}
                    className="flex-1 font-semibold"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteSection(section.id)}
                    disabled={sections.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {section.lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
                    {lesson.type === "video" ? (
                      <Video className="h-4 w-4 text-primary" />
                    ) : (
                      <FileText className="h-4 w-4 text-primary" />
                    )}
                    <Input
                      value={lesson.title}
                      onChange={(e) =>
                        updateLesson(section.id, lesson.id, { title: e.target.value })
                      }
                      className="flex-1"
                    />
                    <Select
                      value={lesson.type}
                      onValueChange={(v: "video" | "text" | "quiz") =>
                        updateLesson(section.id, lesson.id, { type: v })
                      }
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="quiz">Quiz</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteLesson(section.id, lesson.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => addLesson(section.id)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Lesson
                </Button>
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" onClick={addSection}>
            <Plus className="mr-2 h-4 w-4" />
            Add Section
          </Button>
        </TabsContent>

        {/* Pricing Tab */}
        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle>Course Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-sm space-y-2">
                <Label htmlFor="price">Price (USD)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="price"
                    type="number"
                    placeholder="0.00"
                    value={courseData.price}
                    onChange={(e) => handleInputChange("price", e.target.value)}
                    className="pl-7"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Set to 0 for a free course
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CourseEditor;
