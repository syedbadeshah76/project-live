import { forwardRef, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface LessonVideoPlayerProps {
  videoUrl: string;
  poster?: string;
  captionsSrc?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  className?: string;
}

const isFiniteMediaDuration = (duration: number) =>
  Number.isFinite(duration) && duration > 0;

/**
 * Standard lesson video player.
 * Native HTML5 controls — supports free forward/backward seeking,
 * volume, fullscreen, playback speed, and English captions.
 *
 * Shows a skeleton placeholder until the poster image loads and metadata
 * (which contains the captions track) is ready, so the player never
 * flashes a wrong/empty preview between lessons.
 */
const LessonVideoPlayer = forwardRef<HTMLVideoElement, LessonVideoPlayerProps>(
  (
    {
      videoUrl,
      poster,
      captionsSrc = "/captions/en.vtt",
      onTimeUpdate,
      onPlay,
      onPause,
      onEnded,
      className,
    },
    ref
  ) => {
    const [posterReady, setPosterReady] = useState(!poster);
    const [metaReady, setMetaReady] = useState(false);
    const [sourceError, setSourceError] = useState(false);
    const source = useMemo(() => videoUrl?.trim() ?? "", [videoUrl]);
    const ready = posterReady && metaReady;

    useEffect(() => {
      setPosterReady(!poster);
      setMetaReady(false);
      setSourceError(false);
    }, [poster, source]);

    const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
      const v = e.currentTarget;
      if (isFiniteMediaDuration(v.duration)) {
        onTimeUpdate?.(v.currentTime, v.duration);
      }
    };

    return (
      <div
        className={cn(
          "relative aspect-video w-full bg-black overflow-hidden",
          className
        )}
      >
        {!ready && (
          <Skeleton className="absolute inset-0 z-10 rounded-none bg-muted/60" />
        )}
        {/* Hidden image to detect poster readiness */}
        {poster && !posterReady && (
          <img
            src={poster}
            alt=""
            aria-hidden
            className="hidden"
            onLoad={() => setPosterReady(true)}
            onError={() => setPosterReady(true)}
          />
        )}
        <video
          // Force remount when source changes so skeleton shows again
          key={source + (captionsSrc || "")}
          ref={ref}
          src={source}
          poster={poster}
          controls
          controlsList="nodownload noremoteplayback"
          disablePictureInPicture
          playsInline
          preload="auto"
          className={cn(
            "h-full w-full transition-opacity duration-200",
            ready ? "opacity-100" : "opacity-0"
          )}
          onContextMenu={(event) => event.preventDefault()}
          onLoadedMetadata={(e) => {
            setMetaReady(true);
            const v = e.currentTarget;
            if (isFiniteMediaDuration(v.duration)) {
              onTimeUpdate?.(v.currentTime, v.duration);
            }
          }}
          onCanPlay={() => setMetaReady(true)}
          onDurationChange={(e) => {
            const v = e.currentTarget;
            if (isFiniteMediaDuration(v.duration)) {
              setMetaReady(true);
              onTimeUpdate?.(v.currentTime, v.duration);
            }
          }}
          onError={() => {
            setMetaReady(true);
            setSourceError(true);
          }}
          onTimeUpdate={handleTimeUpdate}
          onPlay={onPlay}
          onPause={onPause}
          onEnded={onEnded}
        >
          <track
            kind="subtitles"
            src={captionsSrc}
            srcLang="en"
            label="English"
            default
          />
          Your browser does not support the video tag.
        </video>
        {sourceError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black px-4 text-center text-sm text-white">
            This lesson video could not be loaded. Please check that the uploaded video URL is public or streamable.
          </div>
        )}
      </div>
    );
  }
);

LessonVideoPlayer.displayName = "LessonVideoPlayer";

export default LessonVideoPlayer;
