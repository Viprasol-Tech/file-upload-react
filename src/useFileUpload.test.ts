import { describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useFileUpload } from "./useFileUpload.js";
import { FakeUploader } from "./uploaders/fakeUploader.js";

function fileOf(name: string, type: string, size: number): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

describe("useFileUpload", () => {
  it("validates and uploads a file through the fake uploader", async () => {
    const uploader = new FakeUploader();
    const { result } = renderHook(() =>
      useFileUpload({ uploader, maxBytes: 10_000, accept: "image/*" }),
    );

    const file = fileOf("photo.png", "image/png", 2048);
    let returned: string | null = null;
    await act(async () => {
      returned = await result.current.upload(file);
    });

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(returned).toContain("photo.png");
    expect(result.current.fileUrl).toContain("photo.png");
    expect(result.current.progress.percent).toBe(100);
    expect(uploader.uploaded).toHaveLength(1);
    expect(uploader.uploaded[0]).toBe(file);
  });

  it("rejects an oversized file before calling the uploader", async () => {
    const uploader = new FakeUploader();
    const { result } = renderHook(() =>
      useFileUpload({ uploader, maxBytes: 100 }),
    );

    const file = fileOf("big.png", "image/png", 5000);
    let returned: string | null = "unset";
    await act(async () => {
      returned = await result.current.upload(file);
    });

    expect(returned).toBeNull();
    expect(result.current.status).toBe("error");
    expect(result.current.errors.map((e) => e.code)).toContain("too-large");
    expect(uploader.uploaded).toHaveLength(0);
  });

  it("surfaces uploader failures as errors", async () => {
    const uploader = new FakeUploader({ failWith: new Error("boom") });
    const { result } = renderHook(() => useFileUpload({ uploader }));

    const file = fileOf("photo.png", "image/png", 100);
    await act(async () => {
      await result.current.upload(file);
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error?.message).toBe("boom");
  });

  it("reset returns state to idle", async () => {
    const uploader = new FakeUploader();
    const { result } = renderHook(() => useFileUpload({ uploader }));

    await act(async () => {
      await result.current.upload(fileOf("a.png", "image/png", 100));
    });
    expect(result.current.status).toBe("success");

    act(() => {
      result.current.reset();
    });
    expect(result.current.status).toBe("idle");
    expect(result.current.fileUrl).toBeNull();
    expect(result.current.progress.percent).toBe(0);
  });
});
