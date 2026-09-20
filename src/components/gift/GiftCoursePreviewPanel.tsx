import { useEffect, useState } from "react";
import { Play, Clock, Layers, Calendar, Award, BookOpen, Star, IndianRupee } from "lucide-react";
import type { GiftCourseItem } from "@/types/gift.types";
import { coursesService } from "@/services/courses.service";

interface GiftCoursePreviewPanelProps {
  courses: GiftCourseItem[];
}

export function GiftCoursePreviewPanel({ courses }: GiftCoursePreviewPanelProps) {
  const [enrichedCourses, setEnrichedCourses] = useState<Record<string, {
    thumbnail?: string;
    title?: string;
    description?: string;
    duration?: string;
    modules?: number;
    lessons?: number;
    rating?: number;
  }>>({});

  useEffect(() => {
    let isMounted = true;
    courses.forEach((c) => {
      const targetId = c.courseId || c.productId || c.product_id;
      if (!targetId || targetId === "undefined" || targetId.trim() === "") return;
      coursesService.getCourse(targetId).then((res: any) => {
        if (!isMounted) return;
        const data = res?.data || res;
        if (data) {
          const thumb = data.thumbnailUrl || data.thumbnail || data.image;
          setEnrichedCourses((prev) => ({
            ...prev,
            [c.courseId]: {
              thumbnail: thumb || c.thumbnail,
              title: data.title || c.title,
              description: data.description || c.description,
              duration: data.duration || c.duration,
              modules: data.modules || c.modules,
              lessons: data.lessons || c.lessons,
              rating: data.rating || c.rating,
            },
          }));
        }
      }).catch(() => {
        /* Keep initial course data silently */
      });
    });

    return () => {
      isMounted = false;
    };
  }, [courses]);

  if (courses.length === 0) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-6 text-center text-muted-foreground text-sm">
        No courses selected for gifting.
      </div>
    );
  }

  return (
    <div className="lg:sticky lg:top-4 lg:self-start space-y-6 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto pr-1 scroll-smooth">
      {courses.map((course, idx) => {
        const enriched = enrichedCourses[course.courseId] || {};
        const thumbnailSrc = enriched.thumbnail || course.thumbnail || "/placeholder-course.jpg";
        const isPrimary = idx === 0;

        const meta = [
          { icon: BookOpen, label: "Course Type:", value: course.courseType || "Live Course" },
          { icon: Clock, label: "Duration:", value: enriched.duration || course.duration || "80 Hours" },
          { icon: Layers, label: "Modules:", value: String(enriched.modules || course.modules || 10) },
          { icon: Calendar, label: "Occurrence:", value: course.occurrence || "3 Days/Week" },
          { icon: Award, label: "Certificate:", value: course.certificate || "After Completion" },
        ];

        return (
          <div key={course.courseId} className="space-y-4 bg-card rounded-2xl p-5 border border-border/50 shadow-sm">
            {/* Thumbnail container matching Figma */}
            <div className="relative rounded-2xl overflow-hidden bg-muted aspect-video w-full">
              <img
                src={thumbnailSrc}
                alt={enriched.title || course.title}
                className="w-full h-full object-cover rounded-2xl transition-transform duration-300 hover:scale-105"
                onError={(e) => {
                  // Fallback if image URL fails to load
                  (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60";
                }}
              />
              {isPrimary && (
                <div
                  className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 transition"
                  aria-hidden="true"
                >
                  <span className="h-14 w-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg transform hover:scale-110 transition">
                    <Play className="h-6 w-6 text-primary fill-primary ml-1" />
                  </span>
                </div>
              )}
            </div>

            {/* Title & Rating */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <h2 className="text-lg md:text-xl font-bold text-foreground line-clamp-1">
                  {enriched.title || course.title}
                </h2>
                {(enriched.rating || course.rating) && (
                  <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 shrink-0">
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                    {enriched.rating || course.rating}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">
                {enriched.description || course.description}
              </p>
            </div>

            {/* Metadata breakdown */}
            <div className="rounded-xl border border-border/60 divide-y divide-border/60 bg-muted/20">
              {meta.map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="flex items-center justify-between px-4 py-2.5 text-sm"
                >
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Icon className="h-4 w-4 text-primary/80" /> {label}
                  </span>
                  <span className="font-medium text-foreground">{value}</span>
                </div>
              ))}
            </div>

            {/* Pricing Summary */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50 text-sm">
              <span className="text-muted-foreground font-medium">Gift Price:</span>
              <div className="flex items-center gap-2">
                {course.originalPrice > course.price && (
                  <span className="line-through text-muted-foreground text-xs flex items-center">
                    <IndianRupee className="h-3 w-3" />
                    {course.originalPrice.toLocaleString("en-IN")}
                  </span>
                )}
                <span className="font-bold text-base text-primary flex items-center">
                  <IndianRupee className="h-4 w-4" />
                  {course.price.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
