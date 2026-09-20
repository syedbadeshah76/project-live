import {
  FileText,
  FileVideo,
  Link as LinkIcon,
  FileAudio,
  File as FileIcon,
} from "lucide-react";
import type { ResourceType } from "@/types/meeting.types";

const MAP: Record<
  ResourceType,
  { Icon: React.ComponentType<{ className?: string }> }
> = {
  pdf: { Icon: FileText },
  document: { Icon: FileText },
  word: { Icon: FileText },
  video: { Icon: FileVideo },
  link: { Icon: LinkIcon },
  audio: { Icon: FileAudio },
};

export const ResourceFileIcon = ({ type }: { type: ResourceType }) => {
  const { Icon } = MAP[type] ?? { Icon: FileIcon };
  return (
    <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
      <Icon className="w-5 h-5" />
    </div>
  );
};
