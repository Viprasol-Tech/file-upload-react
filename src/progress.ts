import type { UploadProgress } from "./types.js";

/** Build a normalized {@link UploadProgress} from raw byte counts. */
export function makeProgress(loaded: number, total: number): UploadProgress {
  const safeTotal = total > 0 ? total : 0;
  const fraction = safeTotal > 0 ? Math.min(1, Math.max(0, loaded / safeTotal)) : 0;
  return {
    loaded,
    total: safeTotal,
    fraction,
    percent: Math.round(fraction * 100),
  };
}

/** A zeroed progress object for the given total size. */
export function zeroProgress(total = 0): UploadProgress {
  return makeProgress(0, total);
}
