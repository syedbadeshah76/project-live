import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Linkedin, Facebook, Instagram, Twitter, Send, Mail, MessageCircle, Link2, Check } from "lucide-react";
import { badgesService, type SharePlatform, type StudentBadge } from "@/services/badges.service";
import { toast } from "sonner";

const PLATFORMS: { id: SharePlatform; label: string; icon: any; tint: string }[] = [
  { id: "linkedin",  label: "LinkedIn",  icon: Linkedin,      tint: "bg-[#0A66C2]/10 text-[#0A66C2]" },
  { id: "facebook",  label: "Facebook",  icon: Facebook,      tint: "bg-[#1877F2]/10 text-[#1877F2]" },
  { id: "twitter",   label: "X",         icon: Twitter,       tint: "bg-foreground/10 text-foreground" },
  { id: "whatsapp",  label: "WhatsApp",  icon: MessageCircle, tint: "bg-[#25D366]/10 text-[#25D366]" },
  { id: "telegram",  label: "Telegram",  icon: Send,          tint: "bg-[#26A5E4]/10 text-[#26A5E4]" },
  { id: "instagram", label: "Instagram", icon: Instagram,     tint: "bg-[#E4405F]/10 text-[#E4405F]" },
  { id: "email",     label: "Email",     icon: Mail,          tint: "bg-muted text-foreground" },
  { id: "copy",      label: "Copy Link", icon: Link2,         tint: "bg-primary/10 text-primary" },
];

export const ShareBadgeDialog = ({
  open,
  onOpenChange,
  badge,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  badge: StudentBadge;
}) => {
  const [copied, setCopied] = useState(false);

  const handleShare = async (platform: SharePlatform) => {
    try {
      const res = await badgesService.share(badge.id, platform);
      const url = res.data.shareUrl;
      if (platform === "copy" || platform === "instagram") {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success(
          platform === "instagram"
            ? "Link copied — paste in your Instagram story"
            : "Link copied to clipboard"
        );
        setTimeout(() => setCopied(false), 2000);
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch {
      toast.error("Could not share badge");
    }
  };

  const publicUrl = `${window.location.origin}/badge/${badge.shareToken}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share your badge</DialogTitle>
          <DialogDescription>
            Show off your <span className="font-semibold">{badge.courseTitle}</span> achievement.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-3 py-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleShare(p.id)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-muted transition"
            >
              <span className={`h-11 w-11 rounded-full flex items-center justify-center ${p.tint}`}>
                <p.icon className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-medium">{p.label}</span>
            </button>
          ))}
        </div>
        <div className="bg-muted/50 rounded-lg px-3 py-2 flex items-center gap-2 text-xs">
          <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate flex-1 text-muted-foreground">{publicUrl}</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={() => handleShare("copy")}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : "Copy"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
