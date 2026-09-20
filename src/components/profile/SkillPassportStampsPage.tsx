import React from "react";
import { Plane } from "lucide-react";
import { CourseStamp, formatCourseStampTitle } from "./CourseStamp";

interface StampItem {
  id?: string;
  courseTitle?: string;
  shortTitle?: string;
  displayTitle?: string;
  dateText?: string;
}

interface SkillPassportStampsPageProps {
  stamps?: StampItem[];
}

export function LockedStampSlot({ size = 80 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className="select-none shrink-0 opacity-40 hover:opacity-60 transition-opacity"
      aria-label="Locked Stamp Slot"
    >
      <defs>
        <path
          id="locked-top-curve"
          d="M 28,100 A 72,72 0 0,1 172,100"
          fill="none"
        />
      </defs>

      {/* Background */}
      <circle cx="100" cy="100" r="92" fill="#F4F3FF" stroke="#C4B5FD" strokeWidth="2" strokeDasharray="6 3" />
      <circle cx="100" cy="100" r="80" fill="none" stroke="#DDD6FE" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="58" fill="none" stroke="#DDD6FE" strokeWidth="1" strokeDasharray="4 2" />

      {/* Stars */}
      <g fill="#A78BFA" fontSize="11" textAnchor="middle">
        <text x="26" y="98">★</text>
        <text x="24" y="112">★</text>
        <text x="26" y="126">★</text>
        <text x="32" y="140">★</text>
        <text x="174" y="98">★</text>
        <text x="176" y="112">★</text>
        <text x="174" y="126">★</text>
        <text x="168" y="140">★</text>
      </g>

      {/* Top Arc Text: COMING SOON */}
      <text
        fill="#8B5CF6"
        fontSize="12"
        fontWeight="800"
        letterSpacing="3"
      >
        <textPath href="#locked-top-curve" startOffset="50%" textAnchor="middle">
          COMING SOON
        </textPath>
      </text>

      {/* Center EZ Light Watermark */}
      <text
        x="100"
        y="118"
        textAnchor="middle"
        fill="#A78BFA"
        fontSize="44"
        fontStyle="italic"
        fontWeight="900"
        letterSpacing="-1"
      >
        EZ
      </text>
    </svg>
  );
}

export function SkillPassportStampsPage({
  stamps = [],
}: SkillPassportStampsPageProps) {
  // Always render a 3x3 grid (9 slots total)
  const totalSlots = Math.max(9, Math.ceil(stamps.length / 3) * 3);
  const slots = Array.from({ length: totalSlots });

  return (
    <div
      id="skill-passport-stamps-card"
      className="relative w-full max-w-[440px] overflow-hidden rounded-[28px] border border-indigo-100/80 bg-gradient-to-b from-[#FAF8FF] via-[#F6F8FF] to-[#EDF2FF] shadow-xl p-6 sm:p-7 text-slate-800 select-none"
      style={{
        boxShadow: "0 20px 40px -15px rgba(99, 102, 241, 0.15), 0 0 0 1px rgba(224, 231, 255, 0.8)",
      }}
    >
      {/* Background Texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(#4F46E5 1px, transparent 1px), radial-gradient(#7C3AED 1px, #FAF8FF 1px)`,
          backgroundSize: "24px 24px",
          backgroundPosition: "0 0, 12px 12px",
        }}
      />

      {/* Bottom Right Globe Watermark */}
      <div className="pointer-events-none absolute -right-6 -bottom-6 w-[200px] h-[200px] opacity-[0.14] select-none">
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full text-indigo-700 stroke-current">
          <circle cx="100" cy="100" r="90" strokeWidth="1.2" strokeDasharray="3 3" />
          <ellipse cx="100" cy="100" rx="90" ry="40" strokeWidth="1" />
          <ellipse cx="100" cy="100" rx="40" ry="90" strokeWidth="1" />
          <line x1="10" y1="100" x2="190" y2="100" strokeWidth="1" />
          <line x1="100" y1="10" x2="100" y2="190" strokeWidth="1" />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="text-3xl font-black italic text-indigo-900/40">EZ</span>
        </div>
      </div>

      {/* Main Inner Container with Right Passport Border */}
      <div className="relative pr-8">
        {/* Right Vertical Binding Strip */}
        <div className="absolute right-0 top-0 bottom-0 flex flex-col items-center justify-center">
          <div className="h-full border-r-2 border-dashed border-indigo-300/80 relative flex items-center justify-center">
            <span
              className="absolute text-[10px] font-extrabold tracking-[0.34em] text-[#4F46E5] uppercase select-none whitespace-nowrap"
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
              }}
            >
              EDVANZ PASSPORT
            </span>
          </div>
        </div>

        {/* Top Header: EDVANZ Logo + Airplane */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-1.5">
            <span className="bg-gradient-to-r from-[#2D4BFF] via-[#5B47FF] to-[#8042FF] bg-clip-text text-xl font-black italic tracking-tight text-transparent">
              EDVANZ
            </span>
          </div>
          <div className="flex-1 h-[1.5px] bg-gradient-to-r from-indigo-300 via-purple-300 to-indigo-400 mx-2" />
          <Plane className="h-5 w-5 text-[#2D4BFF] fill-current -rotate-45 shrink-0" />
        </div>

        {/* Title: ACHIEVEMENT STAMPS */}
        <div className="mb-6">
          <h2 className="bg-gradient-to-r from-[#2D4BFF] via-[#4F46E5] to-[#8042FF] bg-clip-text text-2xl sm:text-[25px] font-black tracking-[0.16em] text-transparent leading-tight">
            ACHIEVEMENT STAMPS
          </h2>
          <p className="text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-700 uppercase mt-1">
            EACH STAMP MARKS A STEP TOWARDS EXCELLENCE.
          </p>
        </div>

        {/* 3x3 Grid of Stamps */}
        <div className="grid grid-cols-3 gap-3.5 sm:gap-4 place-items-center mb-8">
          {slots.map((_, index) => {
            const stamp = stamps[index];
            if (stamp) {
              const shortName = stamp.shortTitle || formatCourseStampTitle(stamp.courseTitle || "");
              return (
                <div key={stamp.id || index} className="flex flex-col items-center">
                  <CourseStamp courseName={shortName} size={84} />
                </div>
              );
            }
            return (
              <div key={`empty-${index}`} className="flex flex-col items-center">
                <LockedStampSlot size={84} />
              </div>
            );
          })}
        </div>

        {/* Bottom Slogan */}
        <div className="pt-2">
          <div className="w-4/5 h-[1.5px] bg-gradient-to-r from-indigo-400 to-transparent mb-3" />
          <p className="text-[9.5px] sm:text-[10.5px] font-extrabold tracking-[0.24em] text-[#4F46E5] uppercase">
            COLLECT STAMP. BUILD LEGACY.
          </p>
        </div>
      </div>
    </div>
  );
}
