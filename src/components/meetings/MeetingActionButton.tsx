// src/components/meetings/MeetingActionButton.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Meeting } from "@/types/meeting.types";
import { meetingService } from "@/services/meeting.service";
import { liveClassService } from "@/services/liveClassService";
import { demoClassService } from "@/services/demoClass.service";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface Props {
  meeting: Meeting;
  onChanged?: () => void;
}

const isAlreadyStartedError = (err: any): boolean => {
  const errMsg = (
    err?.response?.data?.message ||
    err?.message ||
    ""
  ).toLowerCase();
  const errCode = err?.response?.data?.code;
  const status = err?.response?.status;
  return (
    errCode === "VAL_004" ||
    errMsg.includes("already started") ||
    errMsg.includes("has already started") ||
    errMsg.includes("class is already live") ||
    errMsg.includes("already live") ||
    (status === 400 && errMsg.includes("started"))
  );
};

const isTooEarlyError = (err: any): boolean => {
  const errMsg = (
    err?.response?.data?.message ||
    err?.message ||
    ""
  ).toLowerCase();
  const errCode = err?.response?.data?.code;
  return (
    errCode === "LIV_006" ||
    errMsg.includes("15 minutes") ||
    errMsg.includes("cannot start yet") ||
    errMsg.includes("too early")
  );
};

export const MeetingActionButton = ({ meeting, onChanged }: Props) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isStarting, setIsStarting] = useState(false);

  const handleStartOrJoin = async () => {
    if (isStarting) return;

    const existingUrl =
      (meeting as any).startUrl ||
      (meeting as any).zoomJoinUrl ||
      (meeting as any).joinUrl;

    // If already marked as live and URL is available, join directly
    if (meeting.status === "live" && existingUrl) {
      window.open(existingUrl, "_blank", "noopener,noreferrer");
      return;
    }

    // Check if scheduled start time is more than 15 minutes away
    const scheduledTimeStr =
      (meeting as any).scheduledStartAt ||
      (meeting as any).scheduledAt ||
      (meeting.date && meeting.startTime
        ? `${meeting.date}T${meeting.startTime}:00`
        : null);

    if (scheduledTimeStr && meeting.status !== "live") {
      const scheduledTime = new Date(scheduledTimeStr).getTime();
      const now = new Date().getTime();
      const diffMinutes = (scheduledTime - now) / (1000 * 60);
      if (diffMinutes > 15) {
        toast({
          title: "Cannot Start Yet",
          description:
            "Live class can only be started 15 minutes before the scheduled time",
          variant: "destructive",
        });
        return;
      }
    }

    setIsStarting(true);

    try {
      let launchUrl: string | undefined;

      // If explicitly a Demo Class, call POST /api/demo-classes/{id}/start
      if ((meeting as any).isDemo || (meeting as any).type === "DEMO") {
        try {
          const demoRes = await demoClassService.startDemoClass(meeting.id);
          launchUrl =
            demoRes?.startUrl ||
            (demoRes as any)?.joinUrl ||
            existingUrl;
        } catch (demoErr: any) {
          if (isAlreadyStartedError(demoErr)) {
            toast({
              title: "Class already started",
              description: "This class has already been started.",
            });
            if (existingUrl) {
              window.open(existingUrl, "_blank", "noopener,noreferrer");
            }
            onChanged?.();
            return;
          }
          throw demoErr;
        }
      } else {
        // Call POST /api/live-classes/{id}/start
        try {
          const res = await liveClassService.startLiveClass(meeting.id);
          launchUrl =
            res?.startUrl ||
            res?.joinUrl ||
            existingUrl;
        } catch (liveErr: any) {
          if (isAlreadyStartedError(liveErr)) {
            toast({
              title: "Class already started",
              description: "This class has already been started.",
            });
            if (existingUrl) {
              window.open(existingUrl, "_blank", "noopener,noreferrer");
            }
            onChanged?.();
            return;
          }

          if (isTooEarlyError(liveErr)) {
            toast({
              title: "Cannot Start Yet",
              description:
                "Live class can only be started 15 minutes before the scheduled time",
              variant: "destructive",
            });
            return;
          }

          // If live class start failed (e.g. demo class instead), try demoClassService
          try {
            const demoRes = await demoClassService.startDemoClass(meeting.id);
            launchUrl =
              demoRes?.startUrl ||
              (demoRes as any)?.joinUrl ||
              existingUrl;
          } catch (demoErr: any) {
            if (isAlreadyStartedError(demoErr)) {
              toast({
                title: "Class already started",
                description: "This class has already been started.",
              });
              if (existingUrl) {
                window.open(existingUrl, "_blank", "noopener,noreferrer");
              }
              onChanged?.();
              return;
            }

            // Fallback to meetingService
            const fallbackRes = await meetingService.startMeeting(meeting.id).catch(() => null);
            if (fallbackRes?.success && fallbackRes.data?.url) {
              launchUrl = fallbackRes.data.url;
            } else {
              throw liveErr;
            }
          }
        }
      }

      if (launchUrl) {
        window.open(launchUrl, "_blank", "noopener,noreferrer");
        onChanged?.();
      } else if (existingUrl) {
        window.open(existingUrl, "_blank", "noopener,noreferrer");
        onChanged?.();
      } else {
        toast({ title: "Meeting link not ready", variant: "destructive" });
      }
    } catch (err: any) {
      if (isAlreadyStartedError(err)) {
        toast({
          title: "Class already started",
          description: "This class has already been started.",
        });
        if (existingUrl) {
          window.open(existingUrl, "_blank", "noopener,noreferrer");
        }
        onChanged?.();
      } else {
        toast({
          title: "Error starting class",
          description:
            err?.response?.data?.message ||
            err?.message ||
            "Live class can only be started 15 minutes before the scheduled time",
          variant: "destructive",
        });
      }
    } finally {
      setIsStarting(false);
    }
  };

  if (
    meeting.status === "live" ||
    meeting.status === "approved" ||
    meeting.status === "SCHEDULED"
  ) {
    return (
      <Button
        size="sm"
        disabled={isStarting}
        className="bg-primary hover:bg-primary/90 text-primary-foreground h-8"
        onClick={handleStartOrJoin}
      >
        {isStarting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : meeting.status === "live" ? (
          "Join Now"
        ) : (
          "Start Class"
        )}
      </Button>
    );
  }

  if (meeting.status === "draft") {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-8"
        onClick={() =>
          navigate(`/instructor/meetings/schedule?draftId=${meeting.id}`)
        }
      >
        Edit
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      disabled={isStarting}
      variant="outline"
      className="h-8"
      onClick={handleStartOrJoin}
    >
      {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : "View / Start"}
    </Button>
  );
};
