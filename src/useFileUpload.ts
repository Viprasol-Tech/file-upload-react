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
import { isAbortError } from "./errors.js";

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
  /** Abort an in-flight upload. Status becomes `"canceled"`. */
  cancel: () => void;
  /** Re-attempt the last file after a failure or cancellation. */
  retry: () => Promise<string | null>;
  /** Reset all state back to idle. */
  reset: () => void;
}

/**
 * React hook that validates a file and uploads it through a pluggable
 * {@link Uploader} (presigned-URL flow), tracking status, progress, and errors.
 * Supports cancellation via {@link UseFileUploadResult.cancel} and re-attempts
 * via {@link UseFileUploadResult.retry}.
 */
export function useFileUpload(options: UseFileUploadOptions): UseFileUploadResult {
  const { uploader, maxBytes, minBytes, accept, onSuccess, onError } = options;

  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState<UploadProgress>(zeroProgress());
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  // Keep the latest callbacks in refs so actions stay stable across renders.
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  // Tracks the controller for the in-flight upload (for cancellation).
  const controllerRef = useRef<AbortController | null>(null);
  // Remembers the last file so `retry` can re-run it.
  const lastFileRef = useRef<File | null>(null);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    lastFileRef.current = null;
    setStatus("idle");
    setProgress(zeroProgress());
    setErrors([]);
    setError(null);
    setFileUrl(null);
    setFile(null);
  }, []);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  const upload = useCallback(
    async (selected: File): Promise<string | null> => {
      // Abort any previous in-flight upload before starting a new one.
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      lastFileRef.current = selected;

      setFile(selected);
      setError(null);
      setFileUrl(null);
      setProgress(zeroProgress(selected.size));
      setStatus("validating");

      const validation = validateFile(selected, { maxBytes, minBytes, accept });
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
        await uploader.putFile(selected, target, {
          onProgress: setProgress,
          signal: controller.signal,
        });
        setFileUrl(target.fileUrl);
        setStatus("success");
        onSuccessRef.current?.({ file: selected, fileUrl: target.fileUrl });
        return target.fileUrl;
      } catch (cause) {
        if (isAbortError(cause)) {
          setStatus("canceled");
          return null;
        }
        const err = cause instanceof Error ? cause : new Error(String(cause));
        setError(err);
        setStatus("error");
        onErrorRef.current?.(err);
        return null;
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
      }
    },
    [uploader, maxBytes, minBytes, accept],
  );

  const retry = useCallback((): Promise<string | null> => {
    const last = lastFileRef.current;
    if (!last) return Promise.resolve(null);
    return upload(last);
  }, [upload]);

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
      cancel,
      retry,
      reset,
    }),
    [status, progress, errors, error, fileUrl, file, upload, cancel, retry, reset],
  );
}
