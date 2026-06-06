import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  PresignedTarget,
  UploadItem,
  Uploader,
  ValidateOptions,
} from "./types.js";
import { validateFile } from "./validation.js";
import { zeroProgress } from "./progress.js";
import { isAbortError } from "./errors.js";
import { createPreviewUrl, revokePreviewUrl } from "./preview.js";

/** Options for {@link useMultiFileUpload}. */
export interface UseMultiFileUploadOptions extends ValidateOptions {
  /** The uploader used for every file in the batch. */
  uploader: Uploader;
  /**
   * Maximum number of uploads to run at once. Additional files queue and start
   * as slots free up. Defaults to `3`.
   */
  concurrency?: number;
  /** Generate image preview object URLs for image files. Defaults to `true`. */
  previews?: boolean;
  /** Called when a single file finishes uploading successfully. */
  onItemSuccess?: (item: UploadItem) => void;
  /** Called when a single file fails validation or upload. */
  onItemError?: (item: UploadItem, error: Error) => void;
  /** Called once every file in the batch has settled (success/error/canceled). */
  onAllSettled?: (items: UploadItem[]) => void;
}

/** State and actions returned by {@link useMultiFileUpload}. */
export interface UseMultiFileUploadResult {
  /** Every tracked file, in the order it was added. */
  items: UploadItem[];
  /** `true` while any file is validating or uploading. */
  isUploading: boolean;
  /** Aggregate progress percent across all files, weighted by size. */
  overallPercent: number;
  /** Add files to the batch and begin uploading. Returns the new items. */
  add: (files: FileList | File[]) => UploadItem[];
  /** Cancel an in-flight upload by item id. */
  cancel: (id: string) => void;
  /** Cancel every in-flight upload. */
  cancelAll: () => void;
  /** Re-attempt a failed or canceled item by id. */
  retry: (id: string) => void;
  /** Remove an item from the batch (cancels it first if needed). */
  remove: (id: string) => void;
  /** Remove every item and reset state. */
  clear: () => void;
}

let counter = 0;
function nextId(): string {
  counter += 1;
  return `upload-${Date.now().toString(36)}-${counter}`;
}

/**
 * React hook for uploading many files at once with independent per-file status,
 * progress, validation, previews, cancellation, and retry. Uploads run through
 * the same pluggable {@link Uploader} as {@link useFileUpload}, bounded by
 * {@link UseMultiFileUploadOptions.concurrency}.
 */
export function useMultiFileUpload(
  options: UseMultiFileUploadOptions,
): UseMultiFileUploadResult {
  const {
    uploader,
    maxBytes,
    minBytes,
    accept,
    concurrency = 3,
    previews = true,
    onItemSuccess,
    onItemError,
    onAllSettled,
  } = options;

  const [items, setItems] = useState<UploadItem[]>([]);

  // Mutable side-channels keyed by item id.
  const controllersRef = useRef<Map<string, AbortController>>(new Map());
  const filesRef = useRef<Map<string, File>>(new Map());
  const activeRef = useRef<number>(0);
  const queueRef = useRef<string[]>([]);

  // Stable refs for callbacks and config used inside async runners.
  const cbRef = useRef({ onItemSuccess, onItemError, onAllSettled });
  cbRef.current = { onItemSuccess, onItemError, onAllSettled };
  const cfgRef = useRef({ uploader, maxBytes, minBytes, accept, concurrency });
  cfgRef.current = { uploader, maxBytes, minBytes, accept, concurrency };

  const patch = useCallback(
    (id: string, changes: Partial<UploadItem>): void => {
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, ...changes } : it)),
      );
    },
    [],
  );

  const maybeSettled = useCallback((): void => {
    if (activeRef.current === 0 && queueRef.current.length === 0) {
      setItems((prev) => {
        const allDone =
          prev.length > 0 &&
          prev.every((it) =>
            it.status === "success" ||
            it.status === "error" ||
            it.status === "canceled",
          );
        if (allDone) cbRef.current.onAllSettled?.(prev);
        return prev;
      });
    }
  }, []);

  const run = useCallback(
    async (id: string): Promise<void> => {
      const file = filesRef.current.get(id);
      if (!file) return;
      const cfg = cfgRef.current;

      patch(id, { status: "validating" });
      const validation = validateFile(file, {
        maxBytes: cfg.maxBytes,
        minBytes: cfg.minBytes,
        accept: cfg.accept,
      });
      if (!validation.valid) {
        const err = new Error(validation.errors.map((e) => e.message).join(" "));
        patch(id, { status: "error", errors: validation.errors, error: err });
        cbRef.current.onItemError?.(
          { ...buildPlaceholder(id, file), status: "error", error: err },
          err,
        );
        return;
      }

      const controller = new AbortController();
      controllersRef.current.set(id, controller);
      patch(id, { status: "uploading", errors: [], error: null });

      try {
        const target: PresignedTarget = await cfg.uploader.getPresignedUrl(file);
        await cfg.uploader.putFile(file, target, {
          onProgress: (p) => patch(id, { progress: p }),
          signal: controller.signal,
        });
        patch(id, { status: "success", fileUrl: target.fileUrl });
        cbRef.current.onItemSuccess?.({
          ...buildPlaceholder(id, file),
          status: "success",
          fileUrl: target.fileUrl,
        });
      } catch (cause) {
        if (isAbortError(cause)) {
          patch(id, { status: "canceled" });
        } else {
          const err = cause instanceof Error ? cause : new Error(String(cause));
          patch(id, { status: "error", error: err });
          cbRef.current.onItemError?.(
            { ...buildPlaceholder(id, file), status: "error", error: err },
            err,
          );
        }
      } finally {
        controllersRef.current.delete(id);
      }
    },
    [patch],
  );

  const pump = useCallback((): void => {
    const limit = Math.max(1, cfgRef.current.concurrency);
    while (activeRef.current < limit && queueRef.current.length > 0) {
      const id = queueRef.current.shift() as string;
      activeRef.current += 1;
      void run(id).finally(() => {
        activeRef.current -= 1;
        pump();
        maybeSettled();
      });
    }
    maybeSettled();
  }, [run, maybeSettled]);

  const enqueue = useCallback(
    (id: string): void => {
      queueRef.current.push(id);
      pump();
    },
    [pump],
  );

  const add = useCallback(
    (files: FileList | File[]): UploadItem[] => {
      const list = Array.from(files);
      const created = list.map((file) => {
        const id = nextId();
        filesRef.current.set(id, file);
        const previewUrl = previews ? createPreviewUrl(file) : null;
        return {
          id,
          file,
          status: "pending" as const,
          progress: zeroProgress(file.size),
          errors: [],
          error: null,
          fileUrl: null,
          previewUrl,
        } satisfies UploadItem;
      });

      setItems((prev) => [...prev, ...created]);
      for (const it of created) enqueue(it.id);
      return created;
    },
    [enqueue, previews],
  );

  const cancel = useCallback((id: string): void => {
    controllersRef.current.get(id)?.abort();
    queueRef.current = queueRef.current.filter((q) => q !== id);
  }, []);

  const cancelAll = useCallback((): void => {
    queueRef.current = [];
    for (const controller of controllersRef.current.values()) {
      controller.abort();
    }
  }, []);

  const retry = useCallback(
    (id: string): void => {
      if (!filesRef.current.has(id)) return;
      patch(id, {
        status: "pending",
        error: null,
        errors: [],
        progress: zeroProgress(filesRef.current.get(id)?.size ?? 0),
      });
      enqueue(id);
    },
    [enqueue, patch],
  );

  const remove = useCallback((id: string): void => {
    controllersRef.current.get(id)?.abort();
    controllersRef.current.delete(id);
    queueRef.current = queueRef.current.filter((q) => q !== id);
    filesRef.current.delete(id);
    setItems((prev) => {
      const target = prev.find((it) => it.id === id);
      revokePreviewUrl(target?.previewUrl);
      return prev.filter((it) => it.id !== id);
    });
  }, []);

  const clear = useCallback((): void => {
    cancelAll();
    controllersRef.current.clear();
    filesRef.current.clear();
    setItems((prev) => {
      for (const it of prev) revokePreviewUrl(it.previewUrl);
      return [];
    });
  }, [cancelAll]);

  // Revoke any outstanding preview URLs on unmount.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  useEffect(() => {
    return () => {
      for (const it of itemsRef.current) revokePreviewUrl(it.previewUrl);
    };
  }, []);

  const isUploading = useMemo(
    () =>
      items.some(
        (it) => it.status === "uploading" || it.status === "validating",
      ),
    [items],
  );

  const overallPercent = useMemo(() => {
    const total = items.reduce((sum, it) => sum + it.progress.total, 0);
    if (total <= 0) return 0;
    const loaded = items.reduce((sum, it) => sum + it.progress.loaded, 0);
    return Math.round((loaded / total) * 100);
  }, [items]);

  return {
    items,
    isUploading,
    overallPercent,
    add,
    cancel,
    cancelAll,
    retry,
    remove,
    clear,
  };
}

/** Minimal item shape passed to user callbacks (preview URL not required). */
function buildPlaceholder(id: string, file: File): UploadItem {
  return {
    id,
    file,
    status: "uploading",
    progress: zeroProgress(file.size),
    errors: [],
    error: null,
    fileUrl: null,
    previewUrl: null,
  };
}
