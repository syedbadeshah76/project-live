import { useCallback, useEffect, useRef, useState } from "react";
import { uploadService } from "@/services/upload.service";
import { getApiError } from "@/lib/api-error";
import type { UploadStatus, UploadType } from "@/types/upload.types";

interface UsePresignedUploadOptions {
  uploadType: UploadType;
  /** Exact MIME type required by the backend / AWS object. */
  contentType: string;
  /** Accepted MIME types for the selected file. */
  acceptedMimeTypes: string[];
  /** Accepted lowercase extensions, e.g. [".pdf"] */
  acceptedExtensions: string[];
  /** Max size in bytes. */
  maxSizeBytes: number;
  invalidTypeMessage: string;
  maxSizeMessage: string;
}

export interface PresignedUploadState {
  file: File | null;
  fileKey: string;
  status: UploadStatus;
  progress: number;
  error: string;
  isBusy: boolean;
  isComplete: boolean;
  selectFile: (file: File | null) => void;
  retry: () => void;
  reset: () => void;
}

export const usePresignedUpload = ({
  uploadType,
  contentType,
  acceptedMimeTypes,
  acceptedExtensions,
  maxSizeBytes,
  invalidTypeMessage,
  maxSizeMessage,
}: UsePresignedUploadOptions): PresignedUploadState => {
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState("");
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const isMountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const isValidFile = useCallback(
    (candidate: File): string => {
      const name = candidate.name.toLowerCase();
      const extensionOk = acceptedExtensions.some((ext) => name.endsWith(ext));
      const mimeOk =
        acceptedMimeTypes.includes(candidate.type) ||
        (candidate.type === "" && extensionOk);

      if (!extensionOk || !mimeOk) return invalidTypeMessage;
      if (candidate.size > maxSizeBytes) return maxSizeMessage;
      return "";
    },
    [
      acceptedExtensions,
      acceptedMimeTypes,
      invalidTypeMessage,
      maxSizeBytes,
      maxSizeMessage,
    ],
  );

  const runUpload = useCallback(
    async (target: File) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setError("");
      setProgress(0);
      setStatus("requesting");

      try {
        const presigned = await uploadService.getPresignedUrl({
          fileName: target.name,
          uploadType,
        });

        if (!presigned?.presignedUrl || !presigned?.fileKey) {
          throw new Error("Upload could not be prepared. Please try again.");
        }

        if (!isMountedRef.current) return;

        // The file key must survive until registration completes.
        setFileKey(presigned.fileKey);
        setStatus("uploading");

        await uploadService.uploadToPresignedUrl({
          presignedUrl: presigned.presignedUrl,
          file: target,
          contentType,
          signal: controller.signal,
          onProgress: (percent) => {
            if (isMountedRef.current) setProgress(percent);
          },
        });

        if (!isMountedRef.current) return;

        setProgress(100);
        setStatus("success");
      } catch (uploadError) {
        if (!isMountedRef.current) return;
        if (controller.signal.aborted) {
          setStatus("idle");
          setProgress(0);
          return;
        }
        // Keep the selected file and the file key so the user can retry.
        setStatus("error");
        setError(getApiError(uploadError, "Upload failed. Please retry."));
      } finally {
        inFlightRef.current = false;
      }
    },
    [contentType, uploadType],
  );

  const selectFile = useCallback(
    (candidate: File | null) => {
      if (!candidate) return;

      const validationError = isValidFile(candidate);
      if (validationError) {
        setError(validationError);
        setStatus("error");
        return;
      }

      abortRef.current?.abort();
      setFile(candidate);
      setFileKey("");
      setProgress(0);
      setError("");
      void runUpload(candidate);
    },
    [isValidFile, runUpload],
  );

  const retry = useCallback(() => {
    if (!file) return;
    void runUpload(file);
  }, [file, runUpload]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setFile(null);
    setFileKey("");
    setProgress(0);
    setError("");
    setStatus("idle");
  }, []);

  return {
    file,
    fileKey,
    status,
    progress,
    error,
    isBusy: status === "requesting" || status === "uploading",
    isComplete: status === "success" && Boolean(fileKey),
    selectFile,
    retry,
    reset,
  };
};

export default usePresignedUpload;
