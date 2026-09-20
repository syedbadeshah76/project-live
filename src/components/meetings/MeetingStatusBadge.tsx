import type { MeetingStatus } from "@/types/meeting.types";
import {
  STATUS_LABEL,
  STATUS_PILL_CLASSES,
} from "@/constants/meeting.constants";
import { cn } from "@/lib/utils";

interface Props {
  status: MeetingStatus;
  className?: string;
}

export const MeetingStatusBadge = ({ status, className }: Props) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
      STATUS_PILL_CLASSES[status],
      className,
    )}
  >
    {status === "live" && (
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
      </span>
    )}
    {STATUS_LABEL[status]}
  </span>
);
