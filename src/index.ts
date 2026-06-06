/**
 * file-upload-react
 *
 * React file upload component + hook with presigned-URL flow, progress, and
 * validation. Built and maintained by Viprasol Tech.
 */

export { validateFile } from "./validation.js";
export { makeProgress, zeroProgress } from "./progress.js";
export { useFileUpload } from "./useFileUpload.js";
export { FileUpload } from "./FileUpload.js";
export { FakeUploader } from "./uploaders/fakeUploader.js";
export { PresignedUploader } from "./uploaders/presignedUploader.js";

export type {
  ValidateOptions,
  ValidationError,
  ValidationResult,
  PresignedTarget,
  UploadProgress,
  ProgressHandler,
  Uploader,
  UploadStatus,
} from "./types.js";
export type { FakeUploaderOptions } from "./uploaders/fakeUploader.js";
export type { PresignedUploaderOptions } from "./uploaders/presignedUploader.js";
export type {
  UseFileUploadOptions,
  UseFileUploadResult,
} from "./useFileUpload.js";
export type { FileUploadProps } from "./FileUpload.js";
