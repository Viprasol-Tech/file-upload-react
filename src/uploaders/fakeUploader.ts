import type {
  PresignedTarget,
  PutFileOptions,
  Uploader,
} from "../types.js";
import { makeProgress } from "../progress.js";
import { AbortError } from "../errors.js";

/** Configuration for the {@link FakeUploader}. */
export interface FakeUploaderOptions {
  /** Base URL used to construct the fake presigned + file URLs. */
  baseUrl?: string;
  /** Number of progress ticks emitted during {@link Uploader.putFile}. */
  steps?: number;
  /** If set, `putFile` rejects with this error to simulate a failure. */
  failWith?: Error;
  /** Records every file passed to `putFile`, for assertions in tests. */
  uploaded?: File[];
  /**
   * Milliseconds of simulated delay between progress ticks. Defaults to `0`
   * (synchronous), which keeps the common test path fast; set a small positive
   * value to leave a window for abort/cancel tests.
   */
  delayMs?: number;
}

/**
 * An in-memory {@link Uploader} that performs no network I/O. It is the default
 * uploader for tests and offline development: `getPresignedUrl` fabricates a
 * deterministic target and `putFile` emits synthetic progress events before
 * resolving (or rejecting, when `failWith` is provided).
 */
export class FakeUploader implements Uploader {
  private readonly baseUrl: string;
  private readonly steps: number;
  private readonly failWith?: Error;
  private readonly delayMs: number;
  /** Files that were successfully handed to {@link FakeUploader.putFile}. */
  public readonly uploaded: File[];

  constructor(options: FakeUploaderOptions = {}) {
    this.baseUrl = options.baseUrl ?? "https://uploads.example.com";
    this.steps = options.steps && options.steps > 0 ? options.steps : 4;
    this.failWith = options.failWith;
    this.delayMs = options.delayMs && options.delayMs > 0 ? options.delayMs : 0;
    this.uploaded = options.uploaded ?? [];
  }

  async getPresignedUrl(file: File): Promise<PresignedTarget> {
    const key = encodeURIComponent(file.name || "file");
    return {
      uploadUrl: `${this.baseUrl}/put/${key}?signature=fake`,
      fileUrl: `${this.baseUrl}/files/${key}`,
      headers: { "content-type": file.type || "application/octet-stream" },
    };
  }

  async putFile(
    file: File,
    _target: PresignedTarget,
    options: PutFileOptions = {},
  ): Promise<void> {
    const { onProgress, signal } = options;

    if (signal?.aborted) {
      throw new AbortError();
    }
    if (this.failWith) {
      throw this.failWith;
    }

    const total = file.size;
    for (let i = 1; i <= this.steps; i++) {
      if (this.delayMs > 0) {
        await this.wait(this.delayMs, signal);
      }
      if (signal?.aborted) {
        throw new AbortError();
      }
      const loaded = Math.round((total * i) / this.steps);
      onProgress?.(makeProgress(loaded, total));
    }
    this.uploaded.push(file);
  }

  /** Resolve after `ms`, or reject early if the abort signal fires. */
  private wait(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        resolve();
      }, ms);
      const onAbort = (): void => {
        cleanup();
        reject(new AbortError());
      };
      const cleanup = (): void => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
      };
      signal?.addEventListener("abort", onAbort, { once: true });
    });
  }
}
