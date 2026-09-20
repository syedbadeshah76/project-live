import { useId, useRef } from "react";
import { Loader2, RefreshCw, Upload, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PresignedUploadState } from "@/hooks/usePresignedUpload";

interface FileUploadButtonProps {
  label: string;
  accept: string;
  upload: PresignedUploadState;
  variant?: "outline" | "solid";
  disabled?: boolean;
  describedById?: string;
}

export const FileUploadButton = ({
  label,
  accept,
  upload,
  variant = "outline",
  disabled = false,
  describedById,
}: FileUploadButtonProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const inputId = `file-upload-${generatedId}`;

  const openPicker = () => {
    if (disabled || upload.isBusy) return;
    inputRef.current?.click();
  };

  return (
    <div className="w-full">
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const selected = event.target.files?.[0] ?? null;
          upload.selectFile(selected);
          event.target.value = "";
        }}
      />

      <Button
        type="button"
        onClick={openPicker}
        disabled={disabled || upload.isBusy}
        aria-label={label}
        aria-describedby={describedById}
        aria-busy={upload.isBusy}
        className={cn(
          "w-full h-12 rounded-full text-sm font-semibold gap-2 transition-all",
          variant === "solid"
            ? "bg-[#604BD6] hover:bg-[#604BD6]/90 text-white shadow-md"
            : "bg-background border border-[#604BD6] text-[#604BD6] hover:bg-[#604BD6]/5",
        )}
      >
        {upload.isBusy ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : upload.isComplete ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        {upload.isBusy
          ? `Uploading ${upload.progress}%`
          : upload.isComplete
            ? "Replace File"
            : label}
      </Button>

      {upload.file && (
        <div className="mt-2 flex items-center gap-2">
          <p
            className="text-xs text-muted-foreground truncate flex-1"
            title={upload.file.name}
          >
            {upload.file.name}
          </p>

          {upload.status === "error" && (
            <button
              type="button"
              onClick={upload.retry}
              className="text-xs font-medium text-[#604BD6] hover:underline inline-flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          )}

          {!upload.isBusy && (
            <button
              type="button"
              onClick={upload.reset}
              aria-label={`Remove ${upload.file.name}`}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {upload.isBusy && (
        <div
          className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden"
          role="progressbar"
          aria-valuenow={upload.progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-[#604BD6] transition-all"
            style={{ width: `${upload.progress}%` }}
          />
        </div>
      )}

      {upload.error && (
        <p className="text-xs text-destructive mt-1">{upload.error}</p>
      )}
    </div>
  );
};

export default FileUploadButton;
