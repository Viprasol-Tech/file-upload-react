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

  it("marks an upload as canceled when aborted mid-flight", async () => {
    const uploader = new FakeUploader({ steps: 10, delayMs: 5 });
    const { result } = renderHook(() => useFileUpload({ uploader }));

    const file = fileOf("a.png", "image/png", 1000);
    let pending: Promise<string | null>;
    act(() => {
      pending = result.current.upload(file);
    });
    await waitFor(() => expect(result.current.status).toBe("uploading"));

    act(() => result.current.cancel());
    await act(async () => {
      await pending;
    });

    expect(result.current.status).toBe("canceled");
    expect(uploader.uploaded).toHaveLength(0);
  });

  it("retry re-runs the last file after a failure", async () => {
    // First uploader fails; we swap to a working one and retry.
    const failing = new FakeUploader({ failWith: new Error("boom") });
    const { result, rerender } = renderHook(
      ({ up }) => useFileUpload({ uploader: up }),
      { initialProps: { up: failing } },
    );

    const file = fileOf("a.png", "image/png", 100);
    await act(async () => {
      await result.current.upload(file);
    });
    expect(result.current.status).toBe("error");

    const working = new FakeUploader();
    rerender({ up: working });

    await act(async () => {
      await result.current.retry();
    });
    expect(result.current.status).toBe("success");
    expect(working.uploaded).toHaveLength(1);
  });

  it("retry resolves to null when there is no prior file", async () => {
    const uploader = new FakeUploader();
    const { result } = renderHook(() => useFileUpload({ uploader }));
    let out: string | null = "x";
    await act(async () => {
      out = await result.current.retry();
    });
    expect(out).toBeNull();
  });
});
