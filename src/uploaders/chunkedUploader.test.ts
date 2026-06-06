import { describe, expect, it, vi } from "vitest";
import { ChunkedUploader, type ChunkInfo } from "./chunkedUploader.js";
import { AbortError } from "../errors.js";
import type { UploadProgress } from "../types.js";

function fileOf(name: string, type: string, size: number): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

describe("ChunkedUploader", () => {
  it("splits a file into the expected number of chunks", async () => {
    const seen: ChunkInfo[] = [];
    const uploader = new ChunkedUploader({
      chunkSize: 100,
      getPresignedUrl: async (f) => ({
        uploadUrl: "u",
        fileUrl: `https://cdn/${f.name}`,
      }),
      uploadChunk: async (_chunk, info) => {
        seen.push(info);
      },
    });

    const file = fileOf("big.bin", "application/octet-stream", 250);
    const target = await uploader.getPresignedUrl(file);
    await uploader.putFile(file, target);

    expect(seen).toHaveLength(3); // 100 + 100 + 50
    expect(seen[0]).toMatchObject({ index: 0, total: 3, start: 0, end: 100 });
    expect(seen[2]).toMatchObject({ index: 2, total: 3, start: 200, end: 250 });
    expect(seen[2].end - seen[2].start).toBe(50);
  });

  it("reports cumulative progress reaching 100%", async () => {
    const ticks: UploadProgress[] = [];
    const uploader = new ChunkedUploader({
      chunkSize: 50,
      getPresignedUrl: async () => ({ uploadUrl: "u", fileUrl: "f" }),
      uploadChunk: async () => {},
    });

    const file = fileOf("x.bin", "application/octet-stream", 120);
    await uploader.putFile(file, await uploader.getPresignedUrl(file), {
      onProgress: (p) => ticks.push(p),
    });

    expect(ticks).toHaveLength(3);
    expect(ticks[ticks.length - 1].percent).toBe(100);
    expect(ticks[ticks.length - 1].loaded).toBe(120);
  });

  it("uses a single chunk for an empty file", async () => {
    const uploadChunk = vi.fn(async () => {});
    const uploader = new ChunkedUploader({
      getPresignedUrl: async () => ({ uploadUrl: "u", fileUrl: "f" }),
      uploadChunk,
    });
    const file = fileOf("empty.bin", "application/octet-stream", 0);
    await uploader.putFile(file, await uploader.getPresignedUrl(file));
    expect(uploadChunk).toHaveBeenCalledOnce();
  });

  it("aborts before sending any chunk when the signal is already aborted", async () => {
    const uploadChunk = vi.fn(async () => {});
    const uploader = new ChunkedUploader({
      chunkSize: 10,
      getPresignedUrl: async () => ({ uploadUrl: "u", fileUrl: "f" }),
      uploadChunk,
    });
    const controller = new AbortController();
    controller.abort();

    const file = fileOf("x.bin", "application/octet-stream", 30);
    await expect(
      uploader.putFile(file, await uploader.getPresignedUrl(file), {
        signal: controller.signal,
      }),
    ).rejects.toBeInstanceOf(AbortError);
    expect(uploadChunk).not.toHaveBeenCalled();
  });

  it("stops sending chunks once aborted mid-flight", async () => {
    const controller = new AbortController();
    let calls = 0;
    const uploader = new ChunkedUploader({
      chunkSize: 10,
      getPresignedUrl: async () => ({ uploadUrl: "u", fileUrl: "f" }),
      uploadChunk: async () => {
        calls += 1;
        if (calls === 1) controller.abort();
      },
    });

    const file = fileOf("x.bin", "application/octet-stream", 100); // 10 chunks
    await expect(
      uploader.putFile(file, await uploader.getPresignedUrl(file), {
        signal: controller.signal,
      }),
    ).rejects.toBeInstanceOf(AbortError);
    expect(calls).toBe(1);
  });
});
