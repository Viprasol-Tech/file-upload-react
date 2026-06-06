import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  isImageFile,
  createPreviewUrl,
  revokePreviewUrl,
  formatBytes,
} from "./preview.js";

function fileOf(name: string, type: string, size = 10): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

describe("isImageFile", () => {
  it("recognizes image MIME types", () => {
    expect(isImageFile(fileOf("a.png", "image/png"))).toBe(true);
    expect(isImageFile(fileOf("a.webp", "image/webp"))).toBe(true);
  });

  it("rejects non-image types", () => {
    expect(isImageFile(fileOf("a.pdf", "application/pdf"))).toBe(false);
    expect(isImageFile(fileOf("a.bin", ""))).toBe(false);
  });
});

describe("createPreviewUrl / revokePreviewUrl", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:preview-1"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates an object URL for an image", () => {
    const url = createPreviewUrl(fileOf("a.png", "image/png"));
    expect(url).toBe("blob:preview-1");
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
  });

  it("returns null for a non-image", () => {
    const url = createPreviewUrl(fileOf("a.pdf", "application/pdf"));
    expect(url).toBeNull();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("revokes a URL exactly when one is given", () => {
    revokePreviewUrl("blob:preview-1");
    revokePreviewUrl(null);
    revokePreviewUrl(undefined);
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview-1");
  });
});

describe("formatBytes", () => {
  it("formats common magnitudes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1024 * 1024)).toBe("1 MB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5 MB");
  });

  it("guards against negative and non-finite input", () => {
    expect(formatBytes(-10)).toBe("0 B");
    expect(formatBytes(Number.NaN)).toBe("0 B");
  });
});
