/**
 * file-upload-react
 *
 * React file upload toolkit: a drag-and-drop dropzone, single- and multi-file
 * hooks with per-file progress, image previews, chunked uploads, cancel/abort,
 * retry, and accept/size validation. Built and maintained by Viprasol Tech.
 */

export { validateFile } from "./validation.js";
export { makeProgress, zeroProgress } from "./progress.js";
export { useFileUpload } from "./useFileUpload.js";
export { useMultiFileUpload } from "./useMultiFileUpload.js";
export { FileUpload } from "./FileUpload.js";
export { Dropzone } from "./Dropzone.js";
export { FakeUploader } from "./uploaders/fakeUploader.js";
export { PresignedUploader } from "./uploaders/presignedUploader.js";
export { ChunkedUploader } from "./uploaders/chunkedUploader.js";
export { AbortError, isAbortError } from "./errors.js";
export {
  isImageFile,
  createPreviewUrl,
  revokePreviewUrl,
  formatBytes,
} from "./preview.js";

export type {
  ValidateOptions,
  ValidationError,
  ValidationResult,
  PresignedTarget,
  UploadProgress,
  ProgressHandler,
  PutFileOptions,
  Uploader,
  UploadStatus,
  FileStatus,
  UploadItem,
} from "./types.js";
export type { FakeUploaderOptions } from "./uploaders/fakeUploader.js";
export type { PresignedUploaderOptions } from "./uploaders/presignedUploader.js";
export type {
  ChunkedUploaderOptions,
  ChunkInfo,
} from "./uploaders/chunkedUploader.js";
export type {
  UseFileUploadOptions,
  UseFileUploadResult,
} from "./useFileUpload.js";
export type {
  UseMultiFileUploadOptions,
  UseMultiFileUploadResult,
} from "./useMultiFileUpload.js";
export type { FileUploadProps } from "./FileUpload.js";
export type { DropzoneProps } from "./Dropzone.js";
