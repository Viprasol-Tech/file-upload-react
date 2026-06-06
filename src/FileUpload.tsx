import { useId } from "react";
import type { ChangeEvent } from "react";
import type { Uploader, ValidateOptions } from "./types.js";
import { useFileUpload } from "./useFileUpload.js";

/** Props for the {@link FileUpload} component. */
export interface FileUploadProps extends ValidateOptions {
  /** The uploader used to obtain a presigned URL and push bytes. */
  uploader: Uploader;
  /** Visible label for the file input. */
  label?: string;
  /** Disable selection. */
  disabled?: boolean;
  /** Optional class applied to the outer container. */
  className?: string;
  /** Called after a successful upload with the resolved file URL. */
  onUploaded?: (result: { file: File; fileUrl: string }) => void;
  /** Called when validation or upload fails. */
  onError?: (error: Error) => void;
}

/**
 * A self-contained file upload control: a native file input wired to
 * {@link useFileUpload}, with a progress bar, status text, and error display.
 */
export function FileUpload(props: FileUploadProps): JSX.Element {
  const {
    uploader,
    maxBytes,
    minBytes,
    accept,
    label = "Choose a file",
    disabled = false,
    className,
    onUploaded,
    onError,
  } = props;

  const inputId = useId();
  const {
    status,
    progress,
    errors,
    error,
    fileUrl,
    isUploading,
    upload,
    cancel,
    retry,
  } = useFileUpload({
    uploader,
    maxBytes,
    minBytes,
    accept,
    onSuccess: onUploaded,
    onError,
  });

  const acceptAttr = Array.isArray(accept) ? accept.join(",") : accept;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void upload(file);
    }
  };

  return (
    <div className={className} data-testid="file-upload" data-status={status}>
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        type="file"
        accept={acceptAttr}
        disabled={disabled || isUploading}
        onChange={handleChange}
      />

      {isUploading && (
        <>
          <progress
            data-testid="upload-progress"
            max={100}
            value={progress.percent}
            aria-label="Upload progress"
          >
            {progress.percent}%
          </progress>
          <button type="button" data-testid="upload-cancel" onClick={cancel}>
            Cancel
          </button>
        </>
      )}

      {(status === "error" || status === "canceled") && (
        <button type="button" data-testid="upload-retry" onClick={() => void retry()}>
          Retry
        </button>
      )}

      {status === "canceled" && (
        <p data-testid="upload-canceled">Upload canceled.</p>
      )}

      {status === "success" && fileUrl && (
        <p data-testid="upload-success">
          Uploaded: <a href={fileUrl}>{fileUrl}</a>
        </p>
      )}

      {errors.length > 0 && (
        <ul data-testid="validation-errors">
          {errors.map((e) => (
            <li key={e.code}>{e.message}</li>
          ))}
        </ul>
      )}

      {status === "error" && errors.length === 0 && error && (
        <p data-testid="upload-error" role="alert">
          {error.message}
        </p>
      )}
    </div>
  );
}
