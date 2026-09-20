import { Link } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PartyPopper, Share2 } from "lucide-react";
import { BadgeCanvas } from "./BadgeCanvas";
import type { StudentBadge } from "@/services/badges.service";

export const BadgeEarnedModal = ({
  open,
  onOpenChange,
  badge,
  onShare,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  badge: StudentBadge | null;
  onShare?: () => void;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md text-center">
      {badge && (
        <div className="space-y-4 py-3">
          <div className="flex items-center justify-center gap-2 text-primary">
            <PartyPopper className="h-6 w-6" />
            <h2 className="text-2xl font-bold">Congratulations!</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            You have earned a new <span className="font-semibold text-foreground">Course Completion Badge</span>.
          </p>
          <div className="flex justify-center">
            <BadgeCanvas
              courseTitle={badge.courseTitle}
              completionDate={badge.earnedDate}
              size={240}
            />
          </div>
          <p className="font-semibold">{badge.courseTitle}</p>
          <p className="text-xs text-muted-foreground">Issued by EDVANZ LMS</p>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button onClick={onShare} variant="outline" className="gap-1.5">
              <Share2 className="h-4 w-4" /> Share
            </Button>
            <Button asChild>
              <Link to={`/dashboard/badges/${badge.id}`}>View badge</Link>
            </Button>
          </div>
        </div>
      )}
    </DialogContent>
  </Dialog>
);
