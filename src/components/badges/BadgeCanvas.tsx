import { forwardRef, useMemo } from "react";
import badgeTemplate from "@/assets/badge-template.png.asset.json";

interface Props {
  /** Course title — replaces "WEB DEVELOPMENT" on the top arc */
  courseTitle: string;
  /** Completion date in ISO (YYYY-MM-DD). Rendered as "15 APR 2026" */
  completionDate: string;
  /** Pixel size of the badge */
  size?: number;
  /** Whether the title/date overlays should be visible (locked badges hide them) */
  showText?: boolean;
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, "0");
  return `${day} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Renders the official EDVANZ course-completion badge by overlaying
 * two dynamic SVG textPath elements (course title on the top arc,
 * completion date on the bottom arc) on the master PNG stamp.
 * The stamp itself, logo, stars, and grunge effect remain pixel-identical.
 */
export const BadgeCanvas = forwardRef<HTMLDivElement, Props>(
  ({ courseTitle, completionDate, size = 320, showText = true }, ref) => {
    const dateLabel = useMemo(() => formatDate(completionDate), [completionDate]);
    const title = (courseTitle || "").toUpperCase();

    // Auto-scale the title font so long course names still fit on the arc.
    const titleFontSize = title.length > 22 ? 18 : title.length > 16 ? 22 : 26;

    return (
      <div
        ref={ref}
        className="relative inline-block"
        style={{ width: size, height: size }}
      >
        <img
          src={badgeTemplate.url}
          alt={`${title || "Course"} badge`}
          width={size}
          height={size}
          className="block select-none"
          draggable={false}
          crossOrigin="anonymous"
        />
        {showText && (
          <svg
            viewBox="0 0 400 400"
            width={size}
            height={size}
            className="absolute inset-0 pointer-events-none"
          >
            <defs>
              {/* Top arc: course title (reads left-to-right along the upper ring) */}
              <path
                id="badge-top-arc"
                d="M 64 200 A 136 136 0 0 1 336 200"
                fill="none"
              />
              {/* Bottom arc: date (reads left-to-right along the lower ring) */}
              <path
                id="badge-bottom-arc"
                d="M 70 220 A 130 130 0 0 0 330 220"
                fill="none"
              />
            </defs>
            <text
              fill="#3D2BBF"
              fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
              fontWeight={800}
              fontSize={titleFontSize}
              letterSpacing="3"
            >
              <textPath
                href="#badge-top-arc"
                startOffset="50%"
                textAnchor="middle"
              >
                {title}
              </textPath>
            </text>
            <text
              fill="#3D2BBF"
              fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
              fontWeight={800}
              fontSize={22}
              letterSpacing="4"
            >
              <textPath
                href="#badge-bottom-arc"
                startOffset="50%"
                textAnchor="middle"
              >
                {dateLabel}
              </textPath>
            </text>
          </svg>
        )}
      </div>
    );
  }
);
BadgeCanvas.displayName = "BadgeCanvas";

/** Locked variant — grayscale, with a lock icon overlay */
export const LockedBadge = ({ size = 320 }: { size?: number }) => (
  <div
    className="relative inline-flex items-center justify-center rounded-2xl bg-muted"
    style={{ width: size, height: size }}
  >
    <img
      src={badgeTemplate.url}
      width={size}
      height={size}
      alt="Locked badge"
      className="opacity-30 grayscale"
      draggable={false}
    />
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="h-16 w-16 rounded-full bg-background/90 backdrop-blur flex items-center justify-center shadow-lg">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
    </div>
  </div>
);
