/**
 * Demo IT video catalog.
 *
 * TEMPORARY: Used until the backend serves real lesson media.
 * Each entry maps an IT category (case-insensitive) to a freely hosted
 * sample video + poster + captions track. `getDemoVideo()` falls back to
 * a generic IT clip when no category-specific asset exists.
 *
 * `getLessonMedia()` is the single source of truth used by BOTH the
 * Course Player and the My Courses preview dialog so the lesson screen
 * looks consistent across the app for any given IT field.
 *
 * When the backend is ready, replace calls to `getLessonMedia()` with the
 * real `videoUrl` / `previewVideo` / `posterUrl` / `captionsUrl` returned
 * by the API and delete this file.
 */

export interface DemoVideo {
  videoUrl: string;
  poster: string;
  /** WebVTT captions URL for this IT field. Falls back to generic English captions. */
  captionsSrc: string;
}

const GENERIC_CAPTIONS = "/captions/en.vtt";

const GENERIC: DemoVideo = {
  videoUrl:
    "https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4",
  poster:
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1280&q=80",
  captionsSrc: GENERIC_CAPTIONS,
};

const CATALOG: Record<string, DemoVideo> = {
  "web development": {
    videoUrl:
      "https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4",
    poster:
      "https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&w=1280&q=80",
    captionsSrc: GENERIC_CAPTIONS,
  },
  "app development": {
    videoUrl:
      "https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4",
    poster:
      "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=1280&q=80",
    captionsSrc: GENERIC_CAPTIONS,
  },
  "ui/ux design": {
    videoUrl:
      "https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4",
    poster:
      "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=1280&q=80",
    captionsSrc: GENERIC_CAPTIONS,
  },
  "data science": {
    videoUrl:
      "https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4",
    poster:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1280&q=80",
    captionsSrc: GENERIC_CAPTIONS,
  },
  ai: {
    videoUrl:
      "https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4",
    poster:
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1280&q=80",
    captionsSrc: GENERIC_CAPTIONS,
  },
  "cyber security": {
    videoUrl:
      "https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4",
    poster:
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1280&q=80",
    captionsSrc: GENERIC_CAPTIONS,
  },
  "cloud computing": {
    videoUrl:
      "https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4",
    poster:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1280&q=80",
    captionsSrc: GENERIC_CAPTIONS,
  },
};

/** Get an IT-category-specific demo video, or the generic fallback. */
export const getDemoVideo = (category?: string | null): DemoVideo => {
  if (!category) return GENERIC;
  const key = category.trim().toLowerCase();
  return CATALOG[key] ?? GENERIC;
};

export const DEFAULT_DEMO_VIDEO = GENERIC;

/**
 * Resolve the media (video URL, poster, captions) to render for a lesson
 * or preview, given the course's IT category and any real backend-provided
 * URLs. Used by both CoursePlayer and MyCourses to keep the lesson screen
 * visually consistent for each IT field.
 *
 * Rules:
 * - videoUrl: real lesson/preview URL if present (and not the legacy
 *   "example.com" placeholder), else the IT-field demo clip.
 * - poster: ALWAYS the IT-field demo poster while we're on demo content,
 *   so the lesson screen reflects the field rather than mixing arbitrary
 *   thumbnails. If the lesson ships a real videoUrl, prefer the course
 *   thumbnail (real content), then fall back to the field poster.
 * - captionsSrc: per-field captions track, falling back to generic English.
 */
export interface LessonMediaInput {
  category?: string | null;
  /** Real lesson video URL from the backend (preferred). */
  videoUrl?: string | null;
  /** Course thumbnail; only used when a real video URL is present. */
  thumbnail?: string | null;
}

const PLACEHOLDER_URLS = new Set(["https://example.com/video.mp4", ""]);

export const getLessonMedia = ({
  category,
  videoUrl,
  thumbnail,
}: LessonMediaInput): DemoVideo => {
  const demo = getDemoVideo(category);
  const hasRealVideo = !!videoUrl && !PLACEHOLDER_URLS.has(videoUrl);

  return {
    videoUrl: hasRealVideo ? (videoUrl as string) : demo.videoUrl,
    // When using demo content, always show the field poster for consistency.
    // When the backend ships a real video, prefer the course thumbnail.
    poster: hasRealVideo ? thumbnail || demo.poster : demo.poster,
    captionsSrc: demo.captionsSrc,
  };
};
