import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import EdvanzLogo from "@/assets/edvanz logo.png";

export interface CertificateDesignProps {
  studentName: string;
  courseTitle: string;
  issueDate?: string | Date;
  certificateNumber?: string;
  className?: string;
  scale?: number;
}

export const CertificateDesignView = forwardRef<HTMLDivElement, CertificateDesignProps>(
  (
    {
      studentName,
      courseTitle,
      issueDate = new Date(),
      certificateNumber = "EDV-2026-001234",
      className,
      scale = 1,
    },
    ref
  ) => {
    const formattedDate =
      typeof issueDate === "string"
        ? issueDate.includes("-") || issueDate.includes("/")
          ? new Date(issueDate).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : issueDate
        : issueDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });

    return (
      <div
        ref={ref}
        className={cn(
          "relative w-full max-w-[960px] aspect-[1.414/1] bg-white text-slate-900 overflow-hidden select-none shadow-2xl rounded-sm font-sans flex flex-col justify-between p-7 sm:p-10 md:p-12",
          className
        )}
        style={{
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: "top center",
          background: "linear-gradient(135deg, #FFFFFF 0%, #FAFBFD 50%, #F1F4F9 100%)",
        }}
      >
        {/* ================= BACKGROUND GEOMETRIC ACCENTS ================= */}
        {/* Top-Left Geometric Layered Ribbons */}
        <div className="absolute top-0 left-0 w-36 sm:w-48 md:w-60 h-36 sm:h-48 md:h-60 pointer-events-none z-0">
          <svg viewBox="0 0 200 200" className="w-full h-full" fill="none">
            {/* Deep Navy/Blue Base Ribbon */}
            <polygon points="0,0 155,0 0,155" fill="#1E3A8A" />
            {/* Royal Indigo Layer */}
            <polygon points="0,0 115,0 0,115" fill="#2563EB" />
            {/* Purple Diagonal Strip with subtle shadow */}
            <polygon points="0,35 130,0 160,0 0,160 0,65" fill="#6D28D9" />
            {/* Violet Accent Ribbon */}
            <polygon points="0,75 145,0 165,0 0,165" fill="#7C3AED" />
            {/* Thin White Divider */}
            <line x1="0" y1="168" x2="168" y2="0" stroke="#FFFFFF" strokeWidth="2.5" />
            {/* Soft Glow Shadow line */}
            <line x1="0" y1="172" x2="172" y2="0" stroke="#4F46E5" strokeWidth="1.5" opacity="0.6" />
          </svg>
        </div>

        {/* Bottom-Right Geometric Layered Ribbons */}
        <div className="absolute bottom-0 right-0 w-36 sm:w-48 md:w-60 h-36 sm:h-48 md:h-60 pointer-events-none z-0 rotate-180">
          <svg viewBox="0 0 200 200" className="w-full h-full" fill="none">
            {/* Deep Navy/Blue Base Ribbon */}
            <polygon points="0,0 155,0 0,155" fill="#1E3A8A" />
            {/* Royal Indigo Layer */}
            <polygon points="0,0 115,0 0,115" fill="#2563EB" />
            {/* Purple Diagonal Strip */}
            <polygon points="0,35 130,0 160,0 0,160 0,65" fill="#6D28D9" />
            {/* Violet Accent Ribbon */}
            <polygon points="0,75 145,0 165,0 0,165" fill="#7C3AED" />
            {/* Thin White Divider */}
            <line x1="0" y1="168" x2="168" y2="0" stroke="#FFFFFF" strokeWidth="2.5" />
            {/* Soft Glow Shadow line */}
            <line x1="0" y1="172" x2="172" y2="0" stroke="#4F46E5" strokeWidth="1.5" opacity="0.6" />
          </svg>
        </div>

        {/* ================= DOUBLE OUTER GEOMETRIC BORDER ================= */}
        <div className="absolute inset-3 sm:inset-5 md:inset-6 pointer-events-none border border-indigo-950/80 z-10">
          <div className="absolute inset-1 sm:inset-1.5 border border-indigo-600/40" />

          {/* Corner Notch Marks */}
          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-indigo-900" />
          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-indigo-900" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-indigo-900" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-indigo-900" />
        </div>

        {/* ================= CONTENT CONTAINER ================= */}
        <div className="relative z-20 flex flex-col items-center justify-between h-full text-center px-4 sm:px-8 py-2">
          {/* Header Branding with Official Edvanz Logo */}
          <div className="flex flex-col items-center mt-1 sm:mt-2">
            <img
              src={EdvanzLogo}
              alt="EDVANZ"
              className="h-8 sm:h-10 md:h-11 object-contain"
            />
            <span className="text-[10px] sm:text-xs tracking-wider text-slate-500 font-medium italic mt-1">
              Beyond Learning.
            </span>
          </div>

          {/* Main Title: CERTIFICATE OF COMPLETION */}
          <div className="my-auto py-1 sm:py-2 flex flex-col items-center w-full">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[50px] font-serif font-black tracking-[0.14em] text-[#1E2B6D] leading-none">
              CERTIFICATE
            </h1>

            {/* Divider with Ornament */}
            <div className="flex items-center justify-center gap-3 w-full max-w-md my-2 sm:my-3">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#4338CA] to-[#4338CA]" />
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rotate-45 bg-[#4338CA] inline-block" />
                <span className="text-[10px] sm:text-xs md:text-sm font-bold tracking-[0.25em] text-[#3730A3] uppercase">
                  OF COMPLETION
                </span>
                <span className="w-1.5 h-1.5 rotate-45 bg-[#4338CA] inline-block" />
              </div>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#4338CA] to-[#4338CA]" />
            </div>

            {/* Subtitle 1: THIS IS TO CERTIFY THAT */}
            <p className="text-[10px] sm:text-xs font-semibold tracking-[0.22em] text-slate-600 uppercase mt-2">
              THIS IS TO CERTIFY THAT
            </p>

            {/* Student Name */}
            <div className="w-full max-w-xl mx-auto my-1 sm:my-2 px-4">
              <div className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-[#0F172A] tracking-wide py-1 truncate">
                {studentName || "Student Name"}
              </div>
              <div className="h-[1.5px] w-full bg-[#4338CA]/70" />
            </div>

            {/* Subtitle 2: HAS SUCCESSFULLY COMPLETED */}
            <p className="text-[10px] sm:text-xs font-semibold tracking-[0.22em] text-slate-600 uppercase mt-2">
              HAS SUCCESSFULLY COMPLETED
            </p>

            {/* Course Title */}
            <div className="w-full max-w-xl mx-auto my-1 sm:my-2 px-4">
              <div className="text-base sm:text-lg md:text-xl font-bold text-[#1E293B] tracking-wide py-1 line-clamp-1">
                {courseTitle || "Course Title"}
              </div>
              <div className="h-[1.5px] w-full bg-[#4338CA]/70" />
            </div>

            {/* Body Text */}
            <p className="text-[10px] sm:text-xs md:text-sm text-slate-600 font-normal italic max-w-lg mx-auto mt-2 leading-relaxed px-4">
              and has demonstrated dedication, commitment, and satisfactory performance throughout the course.
            </p>
          </div>

          {/* Footer Section */}
          <div className="w-full flex items-end justify-between px-2 sm:px-6 pb-1">
            {/* Left: Issued On */}
            <div className="text-left flex flex-col items-start min-w-[140px] sm:min-w-[180px]">
              <span className="text-[9px] sm:text-xs font-bold tracking-wider text-slate-700 uppercase">
                ISSUED ON:
              </span>
              <div className="text-xs sm:text-sm font-semibold text-slate-900 pt-1 pb-0.5">
                {formattedDate}
              </div>
              <div className="h-[1.5px] w-full bg-[#4338CA]/70" />
              <span className="text-[8px] sm:text-[9px] text-slate-400 font-mono mt-1">
                ID: {certificateNumber}
              </span>
            </div>

            {/* Right: Circular Scalloped Rosette Seal Badge */}
            <div className="relative flex items-center justify-center">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 flex items-center justify-center">
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
                  <circle cx="50" cy="50" r="41" fill="none" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="2,2" opacity="0.8" />
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
  }
);

CertificateDesignView.displayName = "CertificateDesignView";
