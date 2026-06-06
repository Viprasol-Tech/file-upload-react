import type {
  PresignedTarget,
  ProgressHandler,
  Uploader,
} from "../types.js";
import { makeProgress } from "../progress.js";

/** Configuration for the {@link PresignedUploader}. */
export interface PresignedUploaderOptions {
  /**
   * Resolves a presigned target for a file. Typically calls your backend, which
   * signs an S3 (or compatible) PUT URL and returns the public file URL.
   */
  getPresignedUrl: (file: File) => Promise<PresignedTarget>;
  /** HTTP method used for the upload. Defaults to `"PUT"`. */
  method?: "PUT" | "POST";
}

/**
 * A production {@link Uploader} that uploads file bytes directly to a presigned
 * URL using `XMLHttpRequest`, which (unlike `fetch`) exposes upload progress
 * events. The presigned URL is obtained via the injected `getPresignedUrl`.
 */
export class PresignedUploader implements Uploader {
  private readonly resolveTarget: PresignedUploaderOptions["getPresignedUrl"];
  private readonly method: "PUT" | "POST";

  constructor(options: PresignedUploaderOptions) {
    this.resolveTarget = options.getPresignedUrl;
    this.method = options.method ?? "PUT";
  }

  getPresignedUrl(file: File): Promise<PresignedTarget> {
    return this.resolveTarget(file);
  }

  putFile(
    file: File,
    target: PresignedTarget,
    onProgress?: ProgressHandler,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(this.method, target.uploadUrl, true);

      const headers = target.headers ?? {};
      for (const [name, value] of Object.entries(headers)) {
        xhr.setRequestHeader(name, value);
      }

      xhr.upload.onprogress = (event: ProgressEvent) => {
        if (event.lengthComputable) {
          onProgress?.(makeProgress(event.loaded, event.total));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress?.(makeProgress(file.size, file.size));
          resolve();
        } else {
          reject(new Error(`Upload failed with HTTP ${xhr.status}.`));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload."));
      xhr.onabort = () => reject(new Error("Upload was aborted."));

      xhr.send(file);
    });
  }
}
