/**
 * Helpers for generating and releasing image previews for selected files.
 *
 * Object URLs created with {@link createPreviewUrl} hold a reference to the
 * underlying file in memory until they are revoked, so always pair a create
 * with a {@link revokePreviewUrl} when the preview is no longer needed.
 */

/** Returns `true` if the file is an image that can be previewed inline. */
export function isImageFile(file: File): boolean {
  return (file.type || "").toLowerCase().startsWith("image/");
}

/**
 * Create an object URL for previewing an image file, or `null` if the file is
 * not an image (or the environment lacks `URL.createObjectURL`).
 */
export function createPreviewUrl(file: File): string | null {
  if (!isImageFile(file)) return null;
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    return null;
  }
  return URL.createObjectURL(file);
}

/** Revoke a previously created preview URL, freeing its memory. */
export function revokePreviewUrl(url: string | null | undefined): void {
  if (!url) return;
  if (typeof URL === "undefined" || typeof URL.revokeObjectURL !== "function") {
    return;
  }
  URL.revokeObjectURL(url);
}

/** Format a byte count into a short human-readable string, e.g. `1.5 MB`. */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, exponent);
  const rounded = exponent === 0 ? value : Number(value.toFixed(decimals));
  return `${rounded} ${units[exponent]}`;
}
