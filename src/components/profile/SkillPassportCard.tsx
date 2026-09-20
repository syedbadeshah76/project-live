import { useRef, useState, useEffect } from "react";
import { Globe, Download, CheckCircle2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

interface SkillPassportCardProps {
  name: string;
  avatar?: string;
  memberSince?: string;
  status?: string;
  onDownload?: () => void;
  downloading?: boolean;
}

const formatMemberDate = (dateStr?: string) => {
  if (!dateStr) return "15 JAN 2026";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr.toUpperCase();
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

/** Convert any image URL (remote/S3/blob) to a base64 Data URL to prevent CORS issues during HTML/PDF capture */
export async function imageToDataUrl(url?: string): Promise<string> {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("data:")) return trimmed;

  // Attempt 1: Fetch as blob with no-cors or standard CORS
  try {
    const response = await fetch(trimmed, { mode: "cors", cache: "no-cache" });
    if (response.ok) {
      const blob = await response.blob();
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string" && reader.result.startsWith("data:image")) {
            resolve(reader.result);
          } else {
            resolve(trimmed);
          }
        };
        reader.onerror = () => resolve(trimmed);
        reader.readAsDataURL(blob);
      });
    }
  } catch {
    /* fetch failed, try Image canvas fallback */
  }

  // Attempt 2: Image element with crossOrigin
  try {
    const dataUrl = await new Promise<string>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width || 300;
          canvas.height = img.naturalHeight || img.height || 300;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const res = canvas.toDataURL("image/png");
            if (res && res.startsWith("data:image")) {
              resolve(res);
              return;
            }
          }
        } catch {
          /* canvas security error */
        }
        resolve(trimmed);
      };
      img.onerror = () => resolve(trimmed);
      img.src = trimmed;
    });
    if (dataUrl && dataUrl.startsWith("data:")) return dataUrl;
  } catch {
    /* fallback */
  }

  return trimmed;
}

/** Preload and embed all images inside DOM nodes as Data URLs before screenshotting */
async function prepareNodeImagesForCapture(node: HTMLElement) {
  const images = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    images.map(async (img) => {
      if (img.src && !img.src.startsWith("data:")) {
        const dataUrl = await imageToDataUrl(img.src);
        if (dataUrl && dataUrl.startsWith("data:")) {
          img.src = dataUrl;
        }
      }
      if (img.complete) return;
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    })
  );
}

export async function captureAndDownloadPassport(
  elementId = "skill-passport-card",
  fileName = "Skill_Passport.png"
): Promise<boolean> {
  const node = document.getElementById(elementId);
  if (!node) return false;
  try {
    await prepareNodeImagesForCapture(node);
    const dataUrl = await toPng(node, {
      quality: 1,
      pixelRatio: 3,
      cacheBust: false,
      backgroundColor: "#FAF8FF",
    });
    const link = document.createElement("a");
    link.download = fileName;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (err) {
    console.error("Failed to generate passport image:", err);
    return false;
  }
}

export async function captureAndDownloadPassportPDF(
  page1Id = "skill-passport-card-hidden",
  page2Id = "skill-passport-stamps-hidden",
  fileName = "Skill_Passport.pdf"
): Promise<boolean> {
  const node1 = document.getElementById(page1Id);
  const node2 = document.getElementById(page2Id);
  if (!node1) return false;

  try {
    await prepareNodeImagesForCapture(node1);
    if (node2) {
      await prepareNodeImagesForCapture(node2);
    }

    const dataUrl1 = await toPng(node1, {
      quality: 1,
      pixelRatio: 3,
      cacheBust: false,
      backgroundColor: "#FAF8FF",
    });

    let dataUrl2: string | null = null;
    if (node2) {
      dataUrl2 = await toPng(node2, {
        quality: 1,
        pixelRatio: 3,
        cacheBust: false,
        backgroundColor: "#FAF8FF",
      });
    }

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Centered passport card dimensions on A4 (width 142mm x height 218mm)
    const cardWidth = 142;
    const cardHeight = 218;
    const x = (pageWidth - cardWidth) / 2;
    const y = (pageHeight - cardHeight) / 2;

    // Page 1: Identity Card
    pdf.addImage(dataUrl1, "PNG", x, y, cardWidth, cardHeight, undefined, "FAST");

    // Page 2: Achievement Stamps Card (if present)
    if (dataUrl2) {
      pdf.addPage();
      pdf.addImage(dataUrl2, "PNG", x, y, cardWidth, cardHeight, undefined, "FAST");
    }

    pdf.save(fileName);
    return true;
  } catch (err) {
    console.error("Failed to generate passport PDF:", err);
    return false;
  }
}

export function SkillPassportCard({
  name,
  avatar,
  memberSince = "15 JAN 2026",
  status = "STUDENT",
  onDownload,
  downloading = false,
}: SkillPassportCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [resolvedAvatar, setResolvedAvatar] = useState<string>(avatar || "");
  const [imgError, setImgError] = useState(false);
  const formattedDate = formatMemberDate(memberSince);
  const displayName = (name || "STUDENT").toUpperCase();
  const displayStatus = (status || "STUDENT").toUpperCase();

  useEffect(() => {
    let active = true;
    setImgError(false);
    if (!avatar) {
      setResolvedAvatar("");
      return;
    }

    if (avatar.startsWith("data:")) {
      setResolvedAvatar(avatar);
      return;
    }

    setResolvedAvatar(avatar);
    imageToDataUrl(avatar).then((dataUrl) => {
      if (active && dataUrl && dataUrl.startsWith("data:")) {
        setResolvedAvatar(dataUrl);
      }
    });

    return () => {
      active = false;
    };
  }, [avatar]);

  return (
    <div className="flex flex-col items-center w-full">
      {/* Download Action Bar */}
      {onDownload && (
        <div className="w-full max-w-[440px] flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Passport Active
          </span>
          <Button
            onClick={onDownload}
            disabled={downloading}
            variant="outline"
            size="sm"
            className="rounded-xl border-indigo-200 bg-white/90 backdrop-blur-xs text-[#2D4BFF] hover:bg-indigo-50 shadow-2xs font-semibold gap-2 transition-all cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>{downloading ? "Generating..." : "Download Passport"}</span>
          </Button>
        </div>
      )}

      {/* Main Passport Card */}
      <div
        ref={cardRef}
        id="skill-passport-card"
        className="relative w-full max-w-[440px] overflow-hidden rounded-[28px] border border-indigo-100/80 bg-gradient-to-b from-[#FAF8FF] via-[#F6F8FF] to-[#EDF2FF] shadow-xl text-slate-800 select-none"
        style={{
          boxShadow: "0 20px 40px -15px rgba(99, 102, 241, 0.15), 0 0 0 1px rgba(224, 231, 255, 0.8)",
        }}
      >
        {/* Subtle Background Security Texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(#4F46E5 1px, transparent 1px), radial-gradient(#7C3AED 1px, #FAF8FF 1px)`,
            backgroundSize: "24px 24px",
            backgroundPosition: "0 0, 12px 12px",
          }}
        />

        {/* Inner Content Container */}
        <div className="relative px-6 pt-7 pb-0 flex flex-col items-center text-center">
          {/* Top Logo Header */}
          <div className="flex items-center gap-2 mb-0.5">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[#2D4BFF] to-[#8042FF] text-[11px] font-black text-white shadow-2xs">
              EZ
            </span>
            <span className="bg-gradient-to-r from-[#2D4BFF] via-[#5B47FF] to-[#8042FF] bg-clip-text text-2xl font-black italic tracking-tight text-transparent">
              EDVANZ
            </span>
          </div>
          <p className="text-[11px] font-semibold italic text-[#8042FF] tracking-wide mb-5">
            Beyond Learning.
          </p>

          {/* PASSPORT Title */}
          <h2 className="bg-gradient-to-r from-[#2D4BFF] via-[#4F46E5] to-[#8042FF] bg-clip-text text-3xl sm:text-[34px] font-black tracking-[0.22em] text-transparent leading-none">
            PASSPORT
          </h2>

          {/* Slogan */}
          <div className="mt-2.5 flex items-center justify-center gap-2.5 text-[11px] font-extrabold tracking-[0.26em] text-slate-600 uppercase">
            <span>LEARN</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#8042FF]" />
            <span>ACHIEVE</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#8042FF]" />
            <span>GROW</span>
          </div>

          {/* Middle Identity Section */}
          <div className="relative mt-7 w-full flex items-center justify-between gap-4">
            {/* Left: Student Photo */}
            <div className="relative h-[190px] w-[145px] sm:h-[210px] sm:w-[160px] shrink-0 overflow-hidden rounded-2xl border-2 border-indigo-200/90 bg-slate-100 shadow-md ring-1 ring-purple-300/40">
              {resolvedAvatar && !imgError ? (
                <img
                  src={resolvedAvatar}
                  alt={displayName}
                  className="h-full w-full object-cover"
                  loading="eager"
                  decoding="sync"
                  onError={() => {
                    if (resolvedAvatar !== avatar && avatar) {
                      setResolvedAvatar(avatar);
                    } else {
                      setImgError(true);
                    }
                  }}
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-indigo-100 via-purple-50 to-blue-100 flex flex-col items-center justify-center text-indigo-700">
                  <div className="h-16 w-16 rounded-full bg-indigo-600/10 grid place-items-center text-2xl font-black">
                    {displayName.charAt(0)}
                  </div>
                  <span className="mt-2 text-[10px] font-bold tracking-wider opacity-60">
                    PASSPORT PHOTO
                  </span>
                </div>
              )}
            </div>

            {/* Right: Data Fields + Watermark */}
            <div className="relative flex-1 min-w-0 h-[190px] sm:h-[210px] flex flex-col justify-center text-left pl-1">
              {/* Globe + EZ Watermark */}
              <div className="pointer-events-none absolute -right-6 top-1/2 -translate-y-1/2 w-[220px] h-[220px] opacity-[0.16] select-none">
                <svg
                  viewBox="0 0 200 200"
                  fill="none"
                  className="w-full h-full text-indigo-700 stroke-current"
                >
                  <circle cx="100" cy="100" r="90" strokeWidth="1.2" strokeDasharray="3 3" />
                  <ellipse cx="100" cy="100" rx="90" ry="40" strokeWidth="1" />
                  <ellipse cx="100" cy="100" rx="40" ry="90" strokeWidth="1" />
                  <line x1="10" y1="100" x2="190" y2="100" strokeWidth="1" />
                  <line x1="100" y1="10" x2="100" y2="190" strokeWidth="1" />
                  <ellipse cx="100" cy="100" rx="70" ry="25" strokeWidth="0.8" />
                  <ellipse cx="100" cy="100" rx="25" ry="70" strokeWidth="0.8" />
                </svg>
                <div className="absolute inset-0 grid place-items-center">
                  <span className="text-4xl font-black italic tracking-tighter text-indigo-900/30">
                    EZ
                  </span>
                </div>
              </div>

              {/* Field 1: NAME */}
              <div className="relative z-10 mb-3">
                <span className="block text-[10px] font-extrabold text-[#6366F1] tracking-wider uppercase mb-0.5">
                  NAME
                </span>
                <span className="block text-xs sm:text-[13px] font-black text-[#1E293B] tracking-wide leading-snug break-words line-clamp-2 max-w-[200px]">
                  {displayName}
                </span>
              </div>

              {/* Field 2: MEMBER SINCE */}
              <div className="relative z-10 mb-3">
                <span className="block text-[10px] font-extrabold text-[#6366F1] tracking-wider uppercase mb-0.5">
                  MEMBER SINCE
                </span>
                <span className="block text-xs sm:text-[13px] font-black text-[#1E293B] tracking-wide">
                  {formattedDate}
                </span>
              </div>

              {/* Field 3: STATUS */}
              <div className="relative z-10">
                <span className="block text-[10px] font-extrabold text-[#6366F1] tracking-wider uppercase mb-0.5">
                  STATUS
                </span>
                <span className="block text-xs sm:text-[13px] font-black text-[#1E293B] tracking-wide">
                  {displayStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Divider Line */}
          <div className="mt-6 mb-5 h-[1px] w-full bg-gradient-to-r from-transparent via-indigo-200 to-transparent" />

          {/* Bottom Commitment Section + Scannable QR Code */}
          <div className="w-full flex items-center justify-between gap-3 pb-6">
            {/* Left: Globe Icon Badge & Slogan */}
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] text-white shadow-sm ring-2 ring-indigo-200/50">
                <Globe className="h-6 w-6 stroke-[1.8]" />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-black tracking-wider text-[#1E293B] uppercase leading-tight">
                  YOUR JOURNEY
                </p>
                <p className="text-[11px] font-black tracking-wider text-[#1E293B] uppercase leading-tight">
                  OUR COMMITMENT.
                </p>
              </div>
            </div>

            {/* Right: Scannable QR Code (pointing to https://edvanz.co) */}
            <div className="shrink-0 p-1.5 rounded-xl bg-white/90 border border-indigo-100 shadow-2xs">
              <QRCodeSVG
                value="https://edvanz.co"
                size={66}
                fgColor="#2563EB"
                bgColor="transparent"
                level="M"
              />
            </div>
          </div>
        </div>

        {/* Bottom Banner Ribbon */}
        <div className="w-full bg-gradient-to-r from-[#2563EB] via-[#4F46E5] to-[#8042FF] py-3 px-4 text-center">
          <p className="text-[10px] sm:text-[11px] font-extrabold tracking-[0.24em] text-white uppercase select-none drop-shadow-2xs">
            EDVANZ EDUCATION ECOSYSTEM
          </p>
        </div>
      </div>
    </div>
  );
}
