<div align="center">
  <img src="docs/assets/logo.png" alt="Viprasol Tech" width="160" />

  <h1>file-upload-react</h1>

  <p><strong>React file upload component + hook with presigned-URL flow, progress, and validation.</strong></p>

  <p><em>Built and maintained by Viprasol Tech.</em></p>

  <p>
    <a href="https://github.com/Viprasol-Tech/file-upload-react/actions"><img src="https://github.com/Viprasol-Tech/file-upload-react/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT" /></a>
    <img src="https://img.shields.io/badge/TypeScript-strict-3178c6.svg" alt="TypeScript strict" />
  </p>
</div>

---

## Features

- **`useFileUpload` hook** — validate, upload, and track status/progress/errors in one call.
- **`<FileUpload>` component** — a drop-in control with a file input, progress bar, and error display.
- **Presigned-URL flow** — uploads go straight to S3 (or any compatible store) via a pluggable `Uploader`.
- **Pluggable uploaders** — `PresignedUploader` (real, XHR-based with progress) and `FakeUploader` (in-memory, for tests/offline).
- **Pure validators** — `validateFile(file, { maxBytes, accept })` with deterministic, fully testable results.
- **Progress state** — normalized `{ loaded, total, fraction, percent }` on every tick.
- **TypeScript-first** — strict types, full `.d.ts` output, zero runtime dependencies beyond React.

## Install

```bash
npm install file-upload-react react react-dom
```

## Usage

### The `<FileUpload>` component

```tsx
import { FileUpload, PresignedUploader } from "file-upload-react";

const uploader = new PresignedUploader({
  // Ask your backend to sign an S3 PUT URL and return the public file URL.
  getPresignedUrl: async (file) => {
    const res = await fetch(`/api/sign?name=${encodeURIComponent(file.name)}`);
    return res.json(); // { uploadUrl, fileUrl, headers? }
  },
});

export function Avatar() {
  return (
    <FileUpload
      uploader={uploader}
      label="Upload an image"
      accept="image/*"
      maxBytes={5 * 1024 * 1024}
      onUploaded={({ fileUrl }) => console.log("Done:", fileUrl)}
      onError={(err) => console.error(err)}
    />
  );
}
```

### The `useFileUpload` hook

```tsx
import { useFileUpload, PresignedUploader } from "file-upload-react";

function MyUploader({ uploader }: { uploader: PresignedUploader }) {
  const { upload, status, progress, errors, fileUrl } = useFileUpload({
    uploader,
    accept: ["image/png", "image/jpeg"],
    maxBytes: 2 * 1024 * 1024,
  });

  return (
    <>
      <input
        type="file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      {status === "uploading" && <progress max={100} value={progress.percent} />}
      {fileUrl && <a href={fileUrl}>View file</a>}
      {errors.map((err) => (
        <p key={err.code}>{err.message}</p>
      ))}
    </>
  );
}
```

### Validation only

```ts
import { validateFile } from "file-upload-react";

const result = validateFile(file, { maxBytes: 1024, accept: "image/*" });
if (!result.valid) {
  console.log(result.errors); // [{ code: "too-large", message: "..." }]
}
```

### Testing with `FakeUploader`

```ts
import { FakeUploader, useFileUpload } from "file-upload-react";

const uploader = new FakeUploader();
// ...drive useFileUpload(...) in your test; inspect `uploader.uploaded`.
```

## API notes

- **`validateFile(file, options)`** — pure. `accept` supports exact MIME (`image/png`), group wildcards (`image/*`), extensions (`.pdf`), and arrays or comma-separated strings. Empty files are rejected with code `empty`.
- **`Uploader`** — interface with `getPresignedUrl(file)` and `putFile(file, target, onProgress?)`. Implement your own, or use the bundled `PresignedUploader` / `FakeUploader`.
- **`UploadProgress`** — `{ loaded, total, fraction (0..1), percent (0..100) }`.
- **`useFileUpload`** — returns `{ status, progress, errors, error, fileUrl, file, isUploading, upload, reset }`. `upload()` resolves with the file URL on success, or `null` on validation/upload failure.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and our [Code of Conduct](CODE_OF_CONDUCT.md). Run `npm run typecheck` and `npm test` before opening a pull request.

## Contact — Viprasol Tech Private Limited

- Website: [viprasol.com](https://viprasol.com)
- Email: [support@viprasol.com](mailto:support@viprasol.com)
- Telegram: [t.me/viprasol_help](https://t.me/viprasol_help) | WhatsApp: +91 96336 52112
- GitHub: [@Viprasol-Tech](https://github.com/Viprasol-Tech) | [LinkedIn](https://www.linkedin.com/in/viprasol/) | X [@viprasol](https://twitter.com/viprasol)

## License

[MIT](LICENSE) (c) 2025 Viprasol Tech Private Limited
