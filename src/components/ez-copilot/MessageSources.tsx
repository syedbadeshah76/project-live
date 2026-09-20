import { FileText } from "lucide-react";

interface MessageSourcesProps {
  sources?: string[];
}

export function MessageSources({ sources }: MessageSourcesProps) {
  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-[#E5E9F2] pt-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
        <FileText className="h-3.5 w-3.5 text-[#9CA3AF]" />
        <span>Sources</span>
      </div>
      <ul className="mt-2 flex flex-col gap-1.5 text-xs text-[#4B5563]">
        {sources.map((src, index) => (
          <li key={`${src}-${index}`} className="flex items-start gap-2 min-w-0">
            <span className="mt-1 text-[#9CA3AF] select-none">•</span>
            <span className="min-w-0 flex-1 truncate font-medium text-[#374151]" title={src}>
              {src}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
