import type { ValidateOptions, ValidationError, ValidationResult } from "./types.js";

/** Normalize the `accept` option into a trimmed list of lower-cased patterns. */
function normalizeAccept(accept: ValidateOptions["accept"]): string[] {
  if (!accept) return [];
  const parts = Array.isArray(accept) ? accept : accept.split(",");
  return parts
    .map((p) => p.trim().toLowerCase())
    .filter((p) => p.length > 0);
}

/**
 * Returns `true` if `file` matches a single `accept` pattern. Patterns follow
 * the HTML `accept` attribute semantics:
 *   - `".png"`        extension match (case-insensitive)
 *   - `"image/png"`   exact MIME match
 *   - `"image/*"`     MIME group wildcard
 */
function matchesPattern(file: File, pattern: string): boolean {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();

  if (pattern.startsWith(".")) {
    return name.endsWith(pattern);
  }
  if (pattern.endsWith("/*")) {
    const group = pattern.slice(0, pattern.indexOf("/"));
    return type.startsWith(group + "/");
  }
  return type === pattern;
}

/**
 * Validate a file against size and type constraints.
 *
 * This is a pure function: it performs no I/O and produces a deterministic
 * {@link ValidationResult} for a given input, which makes it trivial to test.
 *
 * @example
 * const result = validateFile(file, { maxBytes: 1024, accept: "image/*" });
 * if (!result.valid) console.log(result.errors);
 */
export function validateFile(file: File, options: ValidateOptions = {}): ValidationResult {
  const errors: ValidationError[] = [];

  if (file.size === 0) {
    errors.push({ code: "empty", message: "The file is empty." });
  }

  if (typeof options.maxBytes === "number" && file.size > options.maxBytes) {
    errors.push({
      code: "too-large",
      message: `File is ${file.size} bytes, which exceeds the limit of ${options.maxBytes} bytes.`,
    });
  }

  const patterns = normalizeAccept(options.accept);
  if (patterns.length > 0) {
    const ok = patterns.some((p) => matchesPattern(file, p));
    if (!ok) {
      errors.push({
        code: "wrong-type",
        message: `File type "${file.type || "unknown"}" is not in the accepted list: ${patterns.join(", ")}.`,
      });
    }
  }

  return { valid: errors.length === 0, errors };
}
