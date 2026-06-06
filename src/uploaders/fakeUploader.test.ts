import { describe, expect, it } from "vitest";
import { FakeUploader } from "./fakeUploader.js";
import { AbortError } from "../errors.js";
import type { UploadProgress } from "../types.js";

function fileOf(name: string, type: string, size: number): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

describe("FakeUploader", () => {
  it("fabricates a deterministic presigned target", async () => {
    const uploader = new FakeUploader({ baseUrl: "https://cdn.test" });
    const target = await uploader.getPresignedUrl(fileOf("a b.png", "image/png", 10));
    expect(target.uploadUrl).toContain("https://cdn.test/put/");
    expect(target.fileUrl).toBe("https://cdn.test/files/a%20b.png");
    expect(target.headers?.["content-type"]).toBe("image/png");
  });

  it("emits the requested number of progress ticks ending at 100%", async () => {
    const uploader = new FakeUploader({ steps: 5 });
    const ticks: UploadProgress[] = [];
    const file = fileOf("a.png", "image/png", 1000);
    await uploader.putFile(file, await uploader.getPresignedUrl(file), {
      onProgress: (p) => ticks.push(p),
    });
    expect(ticks).toHaveLength(5);
    expect(ticks[ticks.length - 1].percent).toBe(100);
    expect(uploader.uploaded).toEqual([file]);
  });

  it("rejects with the configured failure", async () => {
    const uploader = new FakeUploader({ failWith: new Error("nope") });
    const file = fileOf("a.png", "image/png", 10);
    await expect(
      uploader.putFile(file, await uploader.getPresignedUrl(file)),
    ).rejects.toThrow("nope");
    expect(uploader.uploaded).toHaveLength(0);
  });

  it("throws AbortError when the signal is already aborted", async () => {
    const uploader = new FakeUploader();
    const controller = new AbortController();
    controller.abort();
    const file = fileOf("a.png", "image/png", 10);
    await expect(
      uploader.putFile(file, await uploader.getPresignedUrl(file), {
        signal: controller.signal,
      }),
    ).rejects.toBeInstanceOf(AbortError);
  });

  it("aborts mid-flight when delayMs leaves a window", async () => {
    const uploader = new FakeUploader({ steps: 10, delayMs: 5 });
    const controller = new AbortController();
    const file = fileOf("a.png", "image/png", 1000);
    const promise = uploader.putFile(file, await uploader.getPresignedUrl(file), {
      signal: controller.signal,
    });
    controller.abort();
    await expect(promise).rejects.toBeInstanceOf(AbortError);
    expect(uploader.uploaded).toHaveLength(0);
  });
});
