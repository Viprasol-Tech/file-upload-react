/**
 * Error raised when an upload is aborted via an {@link AbortSignal}.
 *
 * Uploaders throw this (instead of a generic `Error`) so that callers can tell
 * a deliberate cancellation apart from a real failure and mark the file as
 * `"canceled"` rather than `"error"`.
 */
export class AbortError extends Error {
  /** Matches the DOM `DOMException` name for aborts, for interop. */
  public readonly name = "AbortError";

  constructor(message = "The upload was aborted.") {
    super(message);
    Object.setPrototypeOf(this, AbortError.prototype);
  }
}

/** Returns `true` if `value` represents an abort (our class or a DOM abort). */
export function isAbortError(value: unknown): boolean {
  return (
    value instanceof AbortError ||
    (value instanceof Error && value.name === "AbortError")
  );
}
