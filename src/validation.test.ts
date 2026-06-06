import { describe, expect, it } from "vitest";
import { validateFile } from "./validation.js";

function fileOf(name: string, type: string, size: number): File {
  // Construct a File whose `.size` equals the requested byte count.
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

describe("validateFile", () => {
  it("accepts a file within size and type constraints", () => {
    const file = fileOf("photo.png", "image/png", 1000);
    const result = validateFile(file, { maxBytes: 2000, accept: "image/png" });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects an oversized file", () => {
    const file = fileOf("big.png", "image/png", 5000);
    const result = validateFile(file, { maxBytes: 1000 });
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain("too-large");
  });

  it("rejects a file with the wrong MIME type", () => {
    const file = fileOf("notes.txt", "text/plain", 100);
    const result = validateFile(file, { accept: "image/png" });
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain("wrong-type");
  });

  it("accepts via a MIME group wildcard", () => {
    const file = fileOf("photo.jpg", "image/jpeg", 100);
    const result = validateFile(file, { accept: "image/*" });
    expect(result.valid).toBe(true);
  });

  it("accepts via an extension pattern", () => {
    const file = fileOf("doc.PDF", "application/pdf", 100);
    const result = validateFile(file, { accept: [".pdf"] });
    expect(result.valid).toBe(true);
  });

  it("supports a comma-separated accept string", () => {
    const file = fileOf("photo.gif", "image/gif", 100);
    const result = validateFile(file, { accept: "image/png, image/gif" });
    expect(result.valid).toBe(true);
  });

  it("flags an empty file", () => {
    const file = fileOf("empty.png", "image/png", 0);
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain("empty");
  });

  it("reports multiple errors at once", () => {
    const file = fileOf("huge.txt", "text/plain", 5000);
    const result = validateFile(file, { maxBytes: 1000, accept: "image/*" });
    expect(result.valid).toBe(false);
    const codes = result.errors.map((e) => e.code);
    expect(codes).toContain("too-large");
    expect(codes).toContain("wrong-type");
  });

  it("rejects a file below the minimum size", () => {
    const file = fileOf("tiny.png", "image/png", 50);
    const result = validateFile(file, { minBytes: 1000 });
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain("too-small");
  });

  it("does not double-report empty files as too-small", () => {
    const file = fileOf("empty.png", "image/png", 0);
    const result = validateFile(file, { minBytes: 1000 });
    const codes = result.errors.map((e) => e.code);
    expect(codes).toContain("empty");
    expect(codes).not.toContain("too-small");
  });

  it("accepts a file within an explicit size band", () => {
    const file = fileOf("ok.png", "image/png", 500);
    const result = validateFile(file, { minBytes: 100, maxBytes: 1000 });
    expect(result.valid).toBe(true);
  });
});
