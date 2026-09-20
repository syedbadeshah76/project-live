import React, { useId } from "react";

interface CourseStampProps {
  courseName?: string;
  size?: number;
  className?: string;
}

export function formatCourseStampTitle(title: string): string {
  if (!title) return "AI Fundamentals";
  // Strip "by Author", "Complete", "Course", etc.
  let cleaned = title
    .replace(/\s+by\s+.*$/i, "")
    .replace(/\s*-\s*.*$/, "")
    .replace(/^(The\s+Complete|Complete|Mastering|The|Learn|Ultimate)\s+/i, "")
    .replace(/\s+(Course|Bootcamp|Masterclass|Training|Specialization|202[0-9])$/i, "")
    .replace(/\s+Certificate$/i, "")
    .trim();

  if (!cleaned) cleaned = title.trim();
  if (cleaned.length > 20) {
    cleaned = cleaned.substring(0, 20).trim();
  }
  return cleaned;
}

export function CourseStamp({
  courseName = "AI FUNDAMENTALS",
  size = 72,
  className = "",
}: CourseStampProps) {
  const rawShortName = formatCourseStampTitle(courseName);
  const displayName = rawShortName.toUpperCase();
  const rawId = useId();
  const id = `stamp-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  // Font size calculation for top curved text
  const fontSize = displayName.length > 16 ? "9.5" : displayName.length > 12 ? "11" : "12.5";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={`select-none shrink-0 ${className}`}
      aria-label={`${rawShortName} Stamp`}
    >
      <defs>
        {/* Top curved path */}
        <path
          id={`${id}-top`}
          d="M 28,100 A 72,72 0 0,1 172,100"
          fill="none"
        />
        {/* Bottom curved path */}
        <path
          id={`${id}-bottom`}
          d="M 172,100 A 72,72 0 0,1 28,100"
          fill="none"
        />
        {/* Gradient for center EZ badge */}
        <linearGradient id={`${id}-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="50%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>

      {/* Background fill */}
      <circle cx="100" cy="100" r="94" fill="#FAF8FF" />

      {/* Outer Solid Ring */}
      <circle
        cx="100"
        cy="100"
        r="92"
        fill="none"
        stroke="#6D28D9"
        strokeWidth="3.5"
      />

      {/* Outer Dashed/Dotted Ring */}
      <circle
        cx="100"
        cy="100"
        r="85"
        fill="none"
        stroke="#7C3AED"
        strokeWidth="2"
        strokeDasharray="5 3"
      />

      {/* Inner Thin Dotted Ring */}
      <circle
        cx="100"
        cy="100"
        r="58"
        fill="none"
        stroke="#8B5CF6"
        strokeWidth="1.5"
        strokeDasharray="4 2"
      />

      {/* Left Stars */}
      <g fill="#6D28D9" fontSize="11" textAnchor="middle" fontWeight="bold">
        <text x="24" y="96">★</text>
        <text x="22" y="112">★</text>
        <text x="25" y="128">★</text>
        <text x="32" y="142">★</text>
      </g>

      {/* Right Stars */}
      <g fill="#6D28D9" fontSize="11" textAnchor="middle" fontWeight="bold">
        <text x="176" y="96">★</text>
        <text x="178" y="112">★</text>
        <text x="175" y="128">★</text>
        <text x="168" y="142">★</text>
      </g>

      {/* Top Arc Text: Course Name */}
      <text
        fill="#5B21B6"
        fontSize={fontSize}
        fontWeight="900"
        letterSpacing="1.5"
      >
        <textPath href={`#${id}-top`} startOffset="50%" textAnchor="middle">
          {displayName}
        </textPath>
      </text>

      {/* Bottom Arc Text: CERTIFICATE */}
      <text
        fill="#5B21B6"
        fontSize="11.5"
        fontWeight="900"
        letterSpacing="2.5"
      >
        <textPath href={`#${id}-bottom`} startOffset="50%" textAnchor="middle">
          CERTIFICATE
        </textPath>
      </text>

      {/* Center EZ Rounded Badge */}
      <rect
        x="68"
        y="68"
        width="64"
        height="64"
        rx="16"
        fill={`url(#${id}-grad)`}
      />
      <text
        x="100"
        y="109"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="28"
        fontStyle="italic"
        fontWeight="900"
        letterSpacing="-1"
      >
        EZ
      </text>
    </svg>
  );
}
