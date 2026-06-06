import { useCallback, useMemo, useRef, useState } from "react";
import type {
  PresignedTarget,
  UploadProgress,
  UploadStatus,
  Uploader,
  ValidateOptions,
  ValidationError,
} from "./types.js";
import { validateFile } from "./validation.js";
import { zeroProgress } from "./progress.js";

/** Options for {@link useFileUpload}. */
export interface UseFileUploadOptions extends ValidateOptions {
  /** The uploader used to obtain a presigned URL and push bytes. */
  uploader: Uploader;
  /** Called after a successful upload with the resolved file URL. */
  onSuccess?: (result: { file: File; fileUrl: string }) => void;
  /** Called when validation or upload fails. */
  onError?: (error: Error) => void;
}

/** State and actions returned by {@link useFileUpload}. */
export interface UseFileUploadResult {
  status: UploadStatus;
  progress: UploadProgress;
  errors: ValidationError[];
  error: Error | null;
  fileUrl: string | null;
  file: File | null;
  isUploading: boolean;
  /** Validate then upload a file. Resolves with the file URL on success. */
  upload: (file: File) => Promise<string | null>;
  /** Reset all state back to idle. */
  reset: () => void;
}

/**
 * React hook that validates a file and uploads it through a pluggable
 * {@link Uploader} (presigned-URL flow), tracking status, progress, and errors.
 */
export function useFileUpload(options: UseFileUploadOptions): UseFileUploadResult {
  const { uploader, maxBytes, accept, onSuccess, onError } = options;

  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState<UploadProgress>(zeroProgress());
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  // Keep the latest callbacks in refs so `upload` stays stable across renders.
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  const reset = useCallback(() => {
    setStatus("idle");
    setProgress(zeroProgress());
    setErrors([]);
    setError(null);
    setFileUrl(null);
    setFile(null);
  }, []);

  const upload = useCallback(
    async (selected: File): Promise<string | null> => {
      setFile(selected);
      setError(null);
      setFileUrl(null);
      setProgress(zeroProgress(selected.size));
      setStatus("validating");

      const validation = validateFile(selected, { maxBytes, accept });
      if (!validation.valid) {
        setErrors(validation.errors);
        setStatus("error");
        const err = new Error(validation.errors.map((e) => e.message).join(" "));
        setError(err);
        onErrorRef.current?.(err);
        return null;
      }
      setErrors([]);

      try {
        setStatus("uploading");
        const target: PresignedTarget = await uploader.getPresignedUrl(selected);
        await uploader.putFile(selected, target, setProgress);
        setFileUrl(target.fileUrl);
        setStatus("success");
        onSuccessRef.current?.({ file: selected, fileUrl: target.fileUrl });
        return target.fileUrl;
      } catch (cause) {
        const err = cause instanceof Error ? cause : new Error(String(cause));
        setError(err);
        setStatus("error");
        onErrorRef.current?.(err);
        return null;
      }
    },
    [uploader, maxBytes, accept],
  );

  return useMemo(
    () => ({
      status,
      progress,
      errors,
      error,
      fileUrl,
      file,
      isUploading: status === "uploading" || status === "validating",
      upload,
      reset,
    }),
    [status, progress, errors, error, fileUrl, file, upload, reset],
  );
}
