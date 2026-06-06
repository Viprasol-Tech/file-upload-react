import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Dropzone } from "./Dropzone.js";
import { FakeUploader } from "./uploaders/fakeUploader.js";

function fileOf(name: string, type: string, size: number): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

beforeEach(() => {
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => "blob:preview"),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("<Dropzone>", () => {
  it("renders an accessible drop area", () => {
    render(<Dropzone uploader={new FakeUploader()} label="Drop here" />);
    const area = screen.getByTestId("dropzone-area");
    expect(area.getAttribute("role")).toBe("button");
    expect(area.getAttribute("tabindex")).toBe("0");
    expect(screen.getByText("Drop here")).toBeTruthy();
  });

  it("uploads files dropped onto the area, showing previews", async () => {
    const uploader = new FakeUploader();
    render(<Dropzone uploader={uploader} accept="image/*" />);

    const area = screen.getByTestId("dropzone-area");
    fireEvent.drop(area, {
      dataTransfer: { files: [fileOf("a.png", "image/png", 1000)] },
    });

    await waitFor(() =>
      expect(screen.getByTestId("dropzone-item").getAttribute("data-status")).toBe(
        "success",
      ),
    );
    expect(screen.getByTestId("dropzone-preview")).toBeTruthy();
    expect(screen.getByTestId("item-link")).toBeTruthy();
    expect(uploader.uploaded).toHaveLength(1);
  });

  it("toggles the dragging state on drag enter/leave", () => {
    render(<Dropzone uploader={new FakeUploader()} />);
    const area = screen.getByTestId("dropzone-area");

    fireEvent.dragEnter(area);
    expect(area.getAttribute("data-dragging")).toBe("true");

    fireEvent.dragLeave(area);
    expect(area.getAttribute("data-dragging")).toBe("false");
  });

  it("shows a per-file error and a retry button for invalid files", async () => {
    const uploader = new FakeUploader();
    render(<Dropzone uploader={uploader} maxBytes={100} />);

    const area = screen.getByTestId("dropzone-area");
    fireEvent.drop(area, {
      dataTransfer: { files: [fileOf("big.png", "image/png", 5000)] },
    });

    await waitFor(() => expect(screen.getByTestId("item-error")).toBeTruthy());
    expect(screen.getByTestId("dropzone-item").getAttribute("data-status")).toBe(
      "error",
    );
    expect(screen.getByTestId("item-retry")).toBeTruthy();
    expect(uploader.uploaded).toHaveLength(0);
  });

  it("uploads files chosen through the hidden input", async () => {
    const uploader = new FakeUploader();
    const { container } = render(<Dropzone uploader={uploader} />);
    const input = container.querySelector(
      "input[type=file]",
    ) as HTMLInputElement;

    fireEvent.change(input, {
      target: { files: [fileOf("a.png", "image/png", 100)] },
    });

    await waitFor(() =>
      expect(screen.getByTestId("dropzone-item").getAttribute("data-status")).toBe(
        "success",
      ),
    );
  });

  it("ignores drops when disabled", () => {
    const uploader = new FakeUploader();
    render(<Dropzone uploader={uploader} disabled />);
    const area = screen.getByTestId("dropzone-area");
    expect(area.getAttribute("tabindex")).toBe("-1");

    fireEvent.drop(area, {
      dataTransfer: { files: [fileOf("a.png", "image/png", 100)] },
    });
    expect(screen.queryByTestId("dropzone-item")).toBeNull();
  });
});
