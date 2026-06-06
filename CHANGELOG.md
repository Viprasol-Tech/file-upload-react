# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/); versioning
follows [SemVer](https://semver.org/).

## [0.2.0] - 2025

### Added
- `Dropzone` component: accessible drag-and-drop area with multi-file uploads, per-file progress bars, inline image previews, and per-file cancel / retry / remove controls.
- `useMultiFileUpload` hook: batch uploads with independent per-file status, progress, validation, previews, bounded concurrency, cancel/cancelAll, retry, remove, clear, and `onAllSettled`.
- `ChunkedUploader`: splits a file into fixed-size chunks and uploads them sequentially with cumulative progress — a building block for resumable / multipart flows.
- Cancel/abort support across the stack via `AbortSignal`, surfaced as a `cancel()` action on `useFileUpload` and a `"canceled"` status. New `AbortError` class and `isAbortError` guard.
- `retry()` action on `useFileUpload` to re-run the last file after a failure or cancellation.
- Image preview helpers: `createPreviewUrl`, `revokePreviewUrl`, `isImageFile`, and a `formatBytes` utility.
- `minBytes` validation option and a `"too-small"` validation error code.
- Cancel and retry controls added to the `FileUpload` component.

### Changed
- `Uploader.putFile` now takes a `PutFileOptions` object (`{ onProgress, signal }`) instead of a bare `onProgress` callback, enabling cancellation.
- `FakeUploader` gained a `delayMs` option to simulate in-flight uploads for abort/cancel tests.

### Tests
- Expanded the suite from 15 to 59 tests covering previews, errors, chunking, multi-file orchestration, concurrency, cancellation, and retry.

## [0.1.0] - 2025

### Added
- Initial release of file-upload-react: React file upload component + hook with presigned-URL flow, progress, and validation.
