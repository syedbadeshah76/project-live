import { Copy, Pencil } from "lucide-react";
import { toast } from "sonner";

interface Props {
  content: string;
  onEdit: () => void;
}

export function UserMessage({ content, onEdit }: Props) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied successfully");
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="flex w-full justify-end">
      <div className="max-w-[85%] rounded-2xl bg-[#EEF2FF] px-6 py-5 text-[15px] leading-relaxed text-[#1F2937]">
        <p className="whitespace-pre-wrap">{content}</p>
        <div className="mt-3 flex justify-end gap-3 text-[#6B7280]">
          <button
            type="button"
            onClick={onEdit}
            className="rounded p-1 transition-colors hover:bg-white hover:text-[#2D6BFF]"
            aria-label="Edit message"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="rounded p-1 transition-colors hover:bg-white hover:text-[#2D6BFF]"
            aria-label="Copy message"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
