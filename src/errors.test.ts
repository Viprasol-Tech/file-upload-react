import { describe, expect, it } from "vitest";
import { AbortError, isAbortError } from "./errors.js";

describe("AbortError", () => {
  it("has the AbortError name and a default message", () => {
    const err = new AbortError();
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AbortError);
    expect(err.name).toBe("AbortError");
    expect(err.message).toBe("The upload was aborted.");
  });

  it("accepts a custom message", () => {
    expect(new AbortError("stopped").message).toBe("stopped");
  });
});

describe("isAbortError", () => {
  it("detects our AbortError", () => {
    expect(isAbortError(new AbortError())).toBe(true);
  });

  it("detects a DOM-style abort error by name", () => {
    const err = new Error("aborted");
    err.name = "AbortError";
    expect(isAbortError(err)).toBe(true);
  });

  it("returns false for unrelated values", () => {
    expect(isAbortError(new Error("boom"))).toBe(false);
    expect(isAbortError("AbortError")).toBe(false);
    expect(isAbortError(null)).toBe(false);
  });
});
