import { Upload, X, FileText } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  file: File | null;
  onFile: (f: File | null) => void;
  error?: string;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export const ResourceUploader = ({ file, onFile, error }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />

      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full h-11 px-3 rounded-md border border-gray-300 bg-white text-left text-sm text-gray-500 hover:border-blue-500 flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Choose File - No file chosen
        </button>
      ) : (
        <div className="flex items-center justify-between rounded-md border border-gray-300 bg-white p-3">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="w-5 h-5 text-blue-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {file.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatSize(file.size)} • PDF
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onFile(null)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};
