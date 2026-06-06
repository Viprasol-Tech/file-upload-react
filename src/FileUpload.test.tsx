import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FileUpload } from "./FileUpload.js";
import { FakeUploader } from "./uploaders/fakeUploader.js";

function fileOf(name: string, type: string, size: number): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

describe("<FileUpload>", () => {
  it("renders a labelled file input", () => {
    const uploader = new FakeUploader();
    render(<FileUpload uploader={uploader} label="Upload an image" />);
    expect(screen.getByText("Upload an image")).toBeTruthy();
    const input = screen.getByLabelText("Upload an image") as HTMLInputElement;
    expect(input.type).toBe("file");
  });

  it("uploads a selected file and shows the success link", async () => {
    const uploader = new FakeUploader();
    render(<FileUpload uploader={uploader} label="Upload" accept="image/*" />);

    const input = screen.getByLabelText("Upload") as HTMLInputElement;
    const file = fileOf("photo.png", "image/png", 1024);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(screen.getByTestId("file-upload").getAttribute("data-status")).toBe(
        "success",
      ),
    );
    const link = screen.getByRole("link") as HTMLAnchorElement;
    expect(link.href).toContain("photo.png");
    expect(uploader.uploaded).toHaveLength(1);
  });

  it("shows validation errors for an oversized file", async () => {
    const uploader = new FakeUploader();
    render(<FileUpload uploader={uploader} label="Upload" maxBytes={100} />);

    const input = screen.getByLabelText("Upload") as HTMLInputElement;
    const file = fileOf("big.png", "image/png", 5000);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(screen.getByTestId("validation-errors")).toBeTruthy(),
    );
    expect(screen.getByTestId("file-upload").getAttribute("data-status")).toBe(
      "error",
    );
    expect(uploader.uploaded).toHaveLength(0);
  });
});
