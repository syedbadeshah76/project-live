import React from "react";
import EdvanzLogo from "@/assets/edvanz logo.png";

export interface CertificateSheetProps {
  id?: string;
  holderName: string;
  courseTitle: string;
  issuedOn: string;
  certificateNumber?: string;
  className?: string;
  innerRef?: React.Ref<HTMLDivElement>;
}

export const CertificateSheet: React.FC<CertificateSheetProps> = ({
  id,
  holderName,
  courseTitle,
  issuedOn,
  certificateNumber,
  className = "",
  innerRef,
}) => {
  const cleanName = (holderName || "Student Name").trim();
  const nameLen = cleanName.length;

  // Dynamically scale font size so names of any length never truncate
  const nameFontSizeClass =
    nameLen > 35
      ? "text-[1.8vw] sm:text-[19px]"
      : nameLen > 28
      ? "text-[2.1vw] sm:text-[22px]"
      : nameLen > 22
      ? "text-[2.4vw] sm:text-[25px]"
      : nameLen > 16
      ? "text-[2.7vw] sm:text-[28px]"
      : "text-[3.1vw] sm:text-[32px]";

  const courseLen = (courseTitle || "Course Title").trim().length;
  const courseFontSizeClass =
    courseLen > 40
      ? "text-[1.6vw] sm:text-[17px]"
      : courseLen > 25
      ? "text-[1.9vw] sm:text-[20px]"
      : "text-[2.2vw] sm:text-[23px]";

  return (
    <div
      id={id}
      ref={innerRef}
      className={`relative w-full overflow-hidden rounded-xl bg-white text-slate-900 shadow-2xl select-none ${className}`}
      style={{
        aspectRatio: "1.414 / 1",
        background: "linear-gradient(135deg, #FFFFFF 0%, #FAFBFD 50%, #F1F4F9 100%)",
      }}
    >
      {/* ================= CORNER RIBBON ACCENTS ================= */}
      {/* Top-Left Geometric Layered Ribbons */}
      <div className="absolute top-0 left-0 w-[24%] h-[36%] pointer-events-none z-0">
        <svg viewBox="0 0 200 200" className="w-full h-full" fill="none">
          <polygon points="0,0 155,0 0,155" fill="#1E3A8A" />
          <polygon points="0,0 115,0 0,115" fill="#2563EB" />
          <polygon points="0,35 130,0 160,0 0,160 0,65" fill="#6D28D9" />
          <polygon points="0,75 145,0 165,0 0,165" fill="#7C3AED" />
          <line x1="0" y1="168" x2="168" y2="0" stroke="#FFFFFF" strokeWidth="2.5" />
          <line x1="0" y1="172" x2="172" y2="0" stroke="#4F46E5" strokeWidth="1.5" opacity="0.6" />
        </svg>
      </div>

      {/* Bottom-Right Geometric Layered Ribbons */}
      <div className="absolute bottom-0 right-0 w-[24%] h-[36%] pointer-events-none z-0 rotate-180">
        <svg viewBox="0 0 200 200" className="w-full h-full" fill="none">
          <polygon points="0,0 155,0 0,155" fill="#1E3A8A" />
          <polygon points="0,0 115,0 0,115" fill="#2563EB" />
          <polygon points="0,35 130,0 160,0 0,160 0,65" fill="#6D28D9" />
          <polygon points="0,75 145,0 165,0 0,165" fill="#7C3AED" />
          <line x1="0" y1="168" x2="168" y2="0" stroke="#FFFFFF" strokeWidth="2.5" />
          <line x1="0" y1="172" x2="172" y2="0" stroke="#4F46E5" strokeWidth="1.5" opacity="0.6" />
        </svg>
      </div>

      {/* Double Border Frame with Corner Accents */}
      <div className="absolute inset-[2.2%] pointer-events-none border border-indigo-950/80 z-10">
        <div className="absolute inset-[2px] sm:inset-[4px] border border-indigo-600/30" />
        <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-indigo-900" />
        <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-indigo-900" />
        <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-indigo-900" />
        <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-indigo-900" />
      </div>

      {/* Certificate Body Content */}
      <div className="relative z-20 flex h-full flex-col items-center justify-between px-[7%] py-[4.5%] text-center">
        {/* Header Branding */}
        <div className="flex flex-col items-center">
          <img
            src={EdvanzLogo}
            alt="EDVANZ"
            className="h-[4.2vw] max-h-12 min-h-6 object-contain"
          />
          <span className="text-[1.1vw] max-text-xs tracking-wider text-slate-500 font-medium italic mt-0.5">
            Beyond Learning.
          </span>
        </div>

        {/* Center Content Section */}
        <div className="my-auto w-full flex flex-col items-center py-1">
          {/* Title */}
          <h1 className="font-serif font-black tracking-[0.14em] text-[#1E2B6D] text-[4.8vw] leading-none">
            CERTIFICATE
          </h1>

          {/* OF COMPLETION with Divider */}
          <div className="flex items-center justify-center gap-3 w-full max-w-[55%] my-[1.2%]">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#4338CA] to-[#4338CA]" />
            <div className="flex items-center gap-1.5">
              <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rotate-45 bg-[#4338CA] inline-block" />
              <span className="text-[1.3vw] font-bold tracking-[0.26em] text-[#3730A3] uppercase">
                OF COMPLETION
              </span>
              <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rotate-45 bg-[#4338CA] inline-block" />
            </div>
            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#4338CA] to-[#4338CA]" />
          </div>

          {/* THIS IS TO CERTIFY THAT */}
          <p className="text-[1.2vw] font-semibold tracking-[0.24em] text-slate-600 uppercase mt-[1%]">
            THIS IS TO CERTIFY THAT
          </p>

          {/* Recipient Full Name */}
          <div className="w-full max-w-[85%] mx-auto my-[0.8%] px-2">
            <div
              className={`font-serif font-bold text-[#0F172A] tracking-wide py-0.5 text-center leading-normal ${nameFontSizeClass}`}
            >
              {cleanName}
            </div>
            <div className="h-[1.5px] w-full bg-[#4338CA]/70" />
          </div>

          {/* HAS SUCCESSFULLY COMPLETED */}
          <p className="text-[1.2vw] font-semibold tracking-[0.24em] text-slate-600 uppercase mt-[1%]">
            HAS SUCCESSFULLY COMPLETED
          </p>

          {/* Course Title */}
          <div className="w-full max-w-[85%] mx-auto my-[0.8%] px-2">
            <div
              className={`font-bold text-[#1E293B] tracking-wide py-0.5 text-center leading-normal ${courseFontSizeClass}`}
            >
              {courseTitle}
            </div>
            <div className="h-[1.5px] w-full bg-[#4338CA]/70" />
          </div>

          {/* Body paragraph */}
          <p className="text-[1.2vw] text-slate-600 font-normal italic max-w-[78%] mx-auto mt-[1%] leading-relaxed">
            and has demonstrated dedication, commitment, and satisfactory performance throughout the course.
          </p>
        </div>

        {/* Footer Section */}
        <div className="w-full flex items-end justify-between px-2 pt-1">
          {/* Left: Issued On & ID */}
          <div className="text-left flex flex-col items-start min-w-[25%]">
            <span className="text-[1.1vw] font-bold tracking-wider text-slate-700 uppercase">
              ISSUED ON:
            </span>
            <div className="text-[1.35vw] font-semibold text-slate-900 pt-0.5 pb-0.5">
              {issuedOn}
            </div>
            <div className="h-[1.5px] w-full bg-[#4338CA]/70" />
            {certificateNumber && (
              <span className="text-[1vw] text-slate-400 font-mono mt-1">
                ID: {certificateNumber}
              </span>
            )}
          </div>

          {/* Right: Circular Scalloped Rosette Seal Medal */}
          <div className="relative flex items-center justify-center">
            <div className="w-[12vw] h-[12vw] max-w-[110px] max-h-[110px] min-w-[56px] min-h-[56px]">
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
                {/* 24-point Scalloped Outer Seal */}
                <path
                  d="M 50,2 
                     C 53,2 55,6 58,6 
                     C 61,6 63,3 66,4 
                     C 69,5 71,9 74,10 
                     C 77,11 80,9 82,11 
                     C 84,13 85,17 87,19 
                     C 89,21 93,21 94,24 
                     C 95,27 94,31 95,34 
                     C 96,37 99,39 99,42 
                     C 99,45 96,48 96,51 
                     C 96,54 99,57 98,60 
                     C 97,63 94,65 93,68 
                     C 92,71 94,75 92,77 
                     C 90,79 86,81 84,83 
                     C 82,85 83,89 80,91 
                     C 77,93 74,92 71,94 
                     C 68,96 66,99 63,99 
                     C 60,99 57,96 54,96 
                     C 51,96 48,99 45,99 
                     C 42,99 39,96 36,95 
                     C 33,94 30,96 27,94 
                     C 24,92 24,88 21,86 
                     C 18,84 14,84 13,81 
                     C 12,78 14,74 13,71 
                     C 12,68 8,66 8,63 
                     C 8,60 11,57 11,54 
                     C 11,51 8,48 9,45 
                     C 10,42 13,40 14,37 
                     C 15,34 14,30 16,27 
                     C 18,24 22,23 24,20 
                     C 26,17 26,13 29,11 
                     C 32,9 35,11 38,10 
                     C 41,9 43,5 46,4 
                     C 49,3 50,2 50,2 Z"
                  fill="#581C87"
                />
                {/* Outer White Dashed Ring */}
                <circle cx="50" cy="50" r="41" fill="none" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="2,2" opacity="0.85" />
                {/* Inner Solid White Ring */}
                <circle cx="50" cy="50" r="37" fill="#4C1D95" stroke="#FFFFFF" strokeWidth="0.8" />

                {/* Medal Text */}
                <text x="50" y="32" textAnchor="middle" fill="#E9D5FF" fontSize="5" fontWeight="bold" letterSpacing="0.8">
                  COMMITMENT
                </text>
                <text x="50" y="44" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="900" letterSpacing="0.5">
                  EXCELLENCE
                </text>
                <text x="50" y="54" textAnchor="middle" fill="#E9D5FF" fontSize="5" fontWeight="bold" letterSpacing="0.8">
                  ACHIEVEMENT
                </text>

                {/* Stars & Laurels */}
                <text x="50" y="65" textAnchor="middle" fill="#FFFFFF" fontSize="6.5">
                  ★ ★ ★
                </text>
                <path
                  d="M 28,68 C 28,78 38,84 50,84 C 62,84 72,78 72,68"
                  fill="none"
                  stroke="#E9D5FF"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
                <circle cx="33" cy="74" r="1.2" fill="#E9D5FF" />
                <circle cx="39" cy="79" r="1.2" fill="#E9D5FF" />
                <circle cx="45" cy="81" r="1.2" fill="#E9D5FF" />
                <circle cx="67" cy="74" r="1.2" fill="#E9D5FF" />
                <circle cx="61" cy="79" r="1.2" fill="#E9D5FF" />
                <circle cx="55" cy="81" r="1.2" fill="#E9D5FF" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
