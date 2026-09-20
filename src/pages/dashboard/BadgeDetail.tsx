import { useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Share2, Maximize2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { BadgeCanvas } from "@/components/badges/BadgeCanvas";
import { ShareBadgeDialog } from "@/components/badges/ShareBadgeDialog";
import { badgesService, type StudentBadge } from "@/services/badges.service";
import { toast } from "sonner";

const BadgeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [badge, setBadge] = useState<StudentBadge | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [fullOpen, setFullOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    badgesService
      .getBadge(id)
      .then((res) => setBadge(res.data))
      .catch(() => {
        toast.error("Badge not found");
        navigate("/dashboard/badges");
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleDownload = async () => {
    if (!badgeRef.current || !badge) return;
    setDownloading(true);
    try {
      // Compose a 1024×1024 PNG: draw the template image, then overlay
      // course title (top arc) and date (bottom arc) using Canvas API.
      // This avoids html-to-image as a dependency.
      const canvas = document.createElement("canvas");
      const size = 1024;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      // 1. Load template
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = (badgeRef.current.querySelector("img") as HTMLImageElement).src;
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
      ctx.drawImage(img, 0, 0, size, size);

      // 2. Title on top arc (replaces "WEB DEVELOPMENT")
      const title = badge.courseTitle.toUpperCase();
      const dateLabel = new Date(badge.earnedDate).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
      }).toUpperCase();

      ctx.fillStyle = "#3D2BBF";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      drawTextOnArc(ctx, title, size / 2, size / 2, size * 0.38, -Math.PI / 2, 64, true);
      drawTextOnArc(ctx, dateLabel, size / 2, size / 2, size * 0.36, Math.PI / 2, 56, false);

      // 3. Trigger download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `edvanz-badge-${badge.courseTitle.toLowerCase().replace(/\s+/g, "-")}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Badge downloaded");
      }, "image/png");
    } catch (e) {
      toast.error("Could not download badge");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <Skeleton className="h-96 rounded-2xl" />;
  if (!badge) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        onClick={() => navigate("/dashboard/badges")}
        className="text-sm text-primary inline-flex items-center gap-1 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to badges
      </button>

      <div className="grid grid-cols-1 md:grid-cols-[1fr,1.2fr] gap-8 bg-card border rounded-2xl p-6 md:p-8">
        <div className="flex justify-center">
          <BadgeCanvas
            ref={badgeRef}
            courseTitle={badge.courseTitle}
            completionDate={badge.earnedDate}
            size={320}
          />
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Course Completion Badge
            </p>
            <h1 className="text-2xl md:text-3xl font-bold mt-1">{badge.courseTitle}</h1>
          </div>
          <dl className="space-y-2 text-sm">
            <Row label="Earned date">
              {new Date(badge.earnedDate).toLocaleDateString(undefined, {
                day: "numeric", month: "long", year: "numeric",
              })}
            </Row>
            <Row label="Issued by">EDVANZ LMS</Row>
            <Row label="Status">
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <ShieldCheck className="h-3.5 w-3.5" /> Verified
              </span>
            </Row>
            <Row label="Verify token">
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{badge.shareToken}</code>
            </Row>
          </dl>
          <div className="grid grid-cols-3 gap-2 pt-2">
            <Button onClick={handleDownload} disabled={downloading} className="gap-1.5">
              <Download className="h-4 w-4" /> {downloading ? "..." : "Download"}
            </Button>
            <Button onClick={() => setShareOpen(true)} variant="outline" className="gap-1.5">
              <Share2 className="h-4 w-4" /> Share
            </Button>
            <Button onClick={() => setFullOpen(true)} variant="outline" className="gap-1.5">
              <Maximize2 className="h-4 w-4" /> Fullscreen
            </Button>
          </div>
          <p className="text-xs text-muted-foreground pt-2 border-t">
            Anyone with the verification link can confirm this badge at{" "}
            <Link to={`/badge/${badge.shareToken}`} className="text-primary underline">
              /badge/{badge.shareToken}
            </Link>
          </p>
        </div>
      </div>

      <ShareBadgeDialog open={shareOpen} onOpenChange={setShareOpen} badge={badge} />

      <Dialog open={fullOpen} onOpenChange={setFullOpen}>
        <DialogContent className="max-w-2xl bg-background/95">
          <div className="flex justify-center py-6">
            <BadgeCanvas
              courseTitle={badge.courseTitle}
              completionDate={badge.earnedDate}
              size={500}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex justify-between gap-4 py-1.5 border-b last:border-0">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="font-medium text-right">{children}</dd>
  </div>
);

// Render text along a circular arc — used only for PNG download.
function drawTextOnArc(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number, cy: number,
  radius: number,
  centerAngle: number, // 0=right, -PI/2=top, PI/2=bottom
  fontSize: number,
  curveAbove: boolean, // if true text curves like a smile (top arc); false = bottom arc
) {
  ctx.font = `800 ${fontSize}px Inter, system-ui, sans-serif`;
  const letterSpacing = fontSize * 0.15;
  const widths = text.split("").map((ch) => ctx.measureText(ch).width + letterSpacing);
  const totalWidth = widths.reduce((a, b) => a + b, 0);
  const totalAngle = totalWidth / radius;
  let angle = centerAngle - totalAngle / 2;

  for (let i = 0; i < text.length; i++) {
    const charWidth = widths[i];
    const charAngle = charWidth / radius;
    const a = angle + charAngle / 2;
    ctx.save();
    if (curveAbove) {
      ctx.translate(cx + radius * Math.cos(a), cy + radius * Math.sin(a));
      ctx.rotate(a + Math.PI / 2);
    } else {
      ctx.translate(cx + radius * Math.cos(a), cy + radius * Math.sin(a));
      ctx.rotate(a - Math.PI / 2);
    }
    ctx.fillText(text[i], 0, 0);
    ctx.restore();
    angle += charAngle;
  }
}

export default BadgeDetail;
