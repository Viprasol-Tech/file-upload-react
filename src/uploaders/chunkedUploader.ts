import type {
  PresignedTarget,
  PutFileOptions,
  Uploader,
} from "../types.js";
import { makeProgress } from "../progress.js";
import { AbortError } from "../errors.js";

/** Describes a single chunk to be uploaded. */
export interface ChunkInfo {
  /** Zero-based index of this chunk within the file. */
  index: number;
  /** Total number of chunks for the file. */
  total: number;
  /** Inclusive start byte offset of this chunk. */
  start: number;
  /** Exclusive end byte offset of this chunk. */
  end: number;
}

/** Configuration for the {@link ChunkedUploader}. */
export interface ChunkedUploaderOptions {
  /** Resolves the canonical target (and `fileUrl`) for the whole file. */
  getPresignedUrl: (file: File) => Promise<PresignedTarget>;
  /**
   * Uploads a single chunk. Receives the chunk bytes plus positional metadata,
   * and must resolve once the chunk has been durably stored. Throw to fail the
   * whole upload; honor `signal` to support cancellation.
   */
  uploadChunk: (
    chunk: Blob,
    info: ChunkInfo,
    file: File,
    signal?: AbortSignal,
  ) => Promise<void>;
  /** Chunk size in bytes. Defaults to 5 MiB. */
  chunkSize?: number;
}

const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;

/**
 * An {@link Uploader} that splits a file into fixed-size chunks and uploads them
 * sequentially, reporting cumulative byte progress. This is the building block
 * for resumable / multipart flows (e.g. S3 multipart, tus): you provide the
 * per-chunk transport via {@link ChunkedUploaderOptions.uploadChunk}.
 */
export class ChunkedUploader implements Uploader {
  private readonly resolveTarget: ChunkedUploaderOptions["getPresignedUrl"];
  private readonly uploadChunk: ChunkedUploaderOptions["uploadChunk"];
  private readonly chunkSize: number;

  constructor(options: ChunkedUploaderOptions) {
    this.resolveTarget = options.getPresignedUrl;
    this.uploadChunk = options.uploadChunk;
    this.chunkSize =
      options.chunkSize && options.chunkSize > 0
        ? options.chunkSize
        : DEFAULT_CHUNK_SIZE;
  }

  getPresignedUrl(file: File): Promise<PresignedTarget> {
    return this.resolveTarget(file);
  }

  async putFile(
    file: File,
    _target: PresignedTarget,
    options: PutFileOptions = {},
  ): Promise<void> {
    const { onProgress, signal } = options;
    const total = file.size;
    const chunkCount = Math.max(1, Math.ceil(total / this.chunkSize));

    for (let index = 0; index < chunkCount; index++) {
      if (signal?.aborted) {
        throw new AbortError();
      }

      const start = index * this.chunkSize;
      const end = Math.min(start + this.chunkSize, total);
      const chunk = file.slice(start, end);

      await this.uploadChunk(
        chunk,
        { index, total: chunkCount, start, end },
        file,
        signal,
      );

      onProgress?.(makeProgress(end, total));
    }
  }
}
