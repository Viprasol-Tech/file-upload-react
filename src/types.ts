/**
 * Shared types for the file-upload-react package.
 */

/** Options controlling client-side validation of a selected file. */
export interface ValidateOptions {
  /** Maximum allowed size in bytes. Files larger than this are rejected. */
  maxBytes?: number;
  /**
   * Accepted MIME types or extensions, mirroring the HTML `accept` attribute.
   * Examples: `"image/png"`, `"image/*"`, `".pdf"`. A `string[]` or a
   * comma-separated `string` are both supported.
   */
  accept?: string | string[];
}

/** A single problem found while validating a file. */
export interface ValidationError {
  code: "too-large" | "wrong-type" | "empty";
  message: string;
}

/** Result of validating a file. */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/** Metadata describing the destination for a presigned upload. */
export interface PresignedTarget {
  /** The URL the file bytes should be PUT to. */
  uploadUrl: string;
  /** The canonical URL the object will be served from after upload. */
  fileUrl: string;
  /** Optional headers that must accompany the PUT request. */
  headers?: Record<string, string>;
}

/** Progress information emitted during an upload. */
export interface UploadProgress {
  /** Bytes transferred so far. */
  loaded: number;
  /** Total bytes to transfer. */
  total: number;
  /** Fraction in the range [0, 1]. */
  fraction: number;
  /** Percentage in the range [0, 100], rounded to the nearest integer. */
  percent: number;
}

/** Callback invoked as upload progress changes. */
export type ProgressHandler = (progress: UploadProgress) => void;

/**
 * Pluggable uploader. Implementations decide how to obtain a presigned URL and
 * how to push the file bytes. A {@link FakeUploader} is provided for tests and
 * offline development.
 */
export interface Uploader {
  /** Request a presigned target for the given file. */
  getPresignedUrl(file: File): Promise<PresignedTarget>;
  /** Upload the file bytes to the presigned target, reporting progress. */
  putFile(
    file: File,
    target: PresignedTarget,
    onProgress?: ProgressHandler,
  ): Promise<void>;
}

/** Lifecycle status of an upload. */
export type UploadStatus = "idle" | "validating" | "uploading" | "success" | "error";
