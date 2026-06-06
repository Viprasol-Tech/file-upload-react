import { useCallback, useId, useRef, useState } from "react";
import type { DragEvent, ChangeEvent, KeyboardEvent, ReactNode } from "react";
import type { Uploader, UploadItem, ValidateOptions } from "./types.js";
import { useMultiFileUpload } from "./useMultiFileUpload.js";
import { formatBytes } from "./preview.js";

/** Props for the {@link Dropzone} component. */
export interface DropzoneProps extends ValidateOptions {
  /** The uploader used for every dropped/selected file. */
  uploader: Uploader;
  /** Allow selecting more than one file at once. Defaults to `true`. */
  multiple?: boolean;
  /** Maximum concurrent uploads. Defaults to `3`. */
  concurrency?: number;
  /** Disable the dropzone entirely. */
  disabled?: boolean;
  /** Visible instructional text inside the drop area. */
  label?: ReactNode;
  /** Optional class for the outer container. */
  className?: string;
  /** Called whenever a single file finishes uploading. */
  onItemUploaded?: (item: UploadItem) => void;
  /** Called whenever a single file fails. */
  onItemError?: (item: UploadItem, error: Error) => void;
}

/**
 * A drag-and-drop dropzone with multi-file uploads, per-file progress bars,
 * inline image previews, and per-file cancel / retry / remove controls. It is
 * fully keyboard accessible: the drop area is focusable and Enter/Space opens
 * the native file picker.
 */
export function Dropzone(props: DropzoneProps): JSX.Element {
  const {
    uploader,
    multiple = true,
    concurrency = 3,
    disabled = false,
    label = "Drag & drop files here, or click to browse",
    className,
    maxBytes,
    minBytes,
    accept,
    onItemUploaded,
    onItemError,
  } = props;

  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [isDragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  const { items, add, cancel, retry, remove, overallPercent, isUploading } =
    useMultiFileUpload({
      uploader,
      maxBytes,
      minBytes,
      accept,
      concurrency,
      onItemSuccess: onItemUploaded,
      onItemError,
    });

  const acceptAttr = Array.isArray(accept) ? accept.join(",") : accept;

  const openPicker = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        add(multiple ? files : ([files[0]] as File[]));
      }
      // Allow re-selecting the same file.
      event.target.value = "";
    },
    [add, multiple],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      if (disabled) return;
      const dropped = event.dataTransfer?.files;
      if (dropped && dropped.length > 0) {
        add(multiple ? dropped : ([dropped[0]] as File[]));
      }
    },
    [add, multiple, disabled],
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const handleDragEnter = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (disabled) return;
      dragDepth.current += 1;
      setDragging(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openPicker();
      }
    },
    [openPicker],
  );

  return (
    <div className={className} data-testid="dropzone">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label={typeof label === "string" ? label : "File dropzone"}
        data-testid="dropzone-area"
        data-dragging={isDragging}
        onClick={openPicker}
        onKeyDown={handleKeyDown}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
      >
        {label}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        hidden
        multiple={multiple}
        accept={acceptAttr}
        disabled={disabled}
        onChange={handleChange}
      />

      {isUploading && (
        <progress
          data-testid="overall-progress"
          max={100}
          value={overallPercent}
          aria-label="Overall upload progress"
        >
          {overallPercent}%
        </progress>
      )}

      {items.length > 0 && (
        <ul data-testid="dropzone-items">
          {items.map((item) => (
            <li key={item.id} data-testid="dropzone-item" data-status={item.status}>
              {item.previewUrl && (
                <img
                  src={item.previewUrl}
                  alt={item.file.name}
                  data-testid="dropzone-preview"
                  width={48}
                  height={48}
                />
              )}
              <span data-testid="item-name">{item.file.name}</span>
              <span data-testid="item-size">{formatBytes(item.file.size)}</span>

              {(item.status === "uploading" || item.status === "validating") && (
                <progress max={100} value={item.progress.percent}>
                  {item.progress.percent}%
                </progress>
              )}

              {item.status === "success" && item.fileUrl && (
                <a href={item.fileUrl} data-testid="item-link">
                  done
                </a>
              )}

              {item.status === "error" && (
                <span role="alert" data-testid="item-error">
                  {item.error?.message ??
                    item.errors.map((e) => e.message).join(" ")}
                </span>
              )}

              {(item.status === "uploading" || item.status === "validating") && (
                <button
                  type="button"
                  data-testid="item-cancel"
                  onClick={() => cancel(item.id)}
                >
                  Cancel
                </button>
              )}

              {(item.status === "error" || item.status === "canceled") && (
                <button
                  type="button"
                  data-testid="item-retry"
                  onClick={() => retry(item.id)}
                >
                  Retry
                </button>
              )}

              <button
                type="button"
                data-testid="item-remove"
                onClick={() => remove(item.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
