import { render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it } from "vitest";
import UploadDropzone from "./UploadDropzone.svelte";

function makeImageFile(name: string): File {
  return new File(["fake-bytes"], name, { type: "image/jpeg" });
}

beforeAll(() => {
  // jsdom doesn't implement createObjectURL/revokeObjectURL.
  URL.createObjectURL = () => "blob:mock-url";
  URL.revokeObjectURL = () => {};
});

describe("UploadDropzone", () => {
  it("renders the drop prompt and the file input", () => {
    render(UploadDropzone, { files: [] });
    expect(screen.getByText(/drop photos here/i)).toBeInTheDocument();
  });

  it("adds selected image files as thumbnails", async () => {
    render(UploadDropzone, { files: [] });
    const input = document.getElementById("upload-dropzone-input") as HTMLInputElement;
    await userEvent.upload(input, [makeImageFile("a.jpg"), makeImageFile("b.jpg")]);

    await waitFor(() => {
      expect(screen.getAllByRole("img")).toHaveLength(2);
    });
  });

  it("skips non-image files and shows an error", async () => {
    render(UploadDropzone, { files: [] });
    const input = document.getElementById("upload-dropzone-input") as HTMLInputElement;
    const notAnImage = new File(["x"], "notes.txt", { type: "text/plain" });
    // applyAccept: false — the component's own type check is what we're testing,
    // not the browser's native accept="image/*" filtering.
    await userEvent.upload(input, [makeImageFile("a.jpg"), notAnImage], { applyAccept: false });

    await waitFor(() => {
      expect(screen.getAllByRole("img")).toHaveLength(1);
      expect(screen.getByText(/skipped/i)).toBeInTheDocument();
    });
  });

  it("caps the number of files at maxFiles", async () => {
    render(UploadDropzone, { files: [], maxFiles: 2 });
    const input = document.getElementById("upload-dropzone-input") as HTMLInputElement;
    await userEvent.upload(input, [makeImageFile("a.jpg"), makeImageFile("b.jpg"), makeImageFile("c.jpg")]);

    await waitFor(() => {
      expect(screen.getAllByRole("img")).toHaveLength(2);
      expect(screen.getByText(/limit per batch/i)).toBeInTheDocument();
    });
  });

  it("removes a file when its remove button is clicked", async () => {
    render(UploadDropzone, { files: [] });
    const input = document.getElementById("upload-dropzone-input") as HTMLInputElement;
    await userEvent.upload(input, [makeImageFile("a.jpg"), makeImageFile("b.jpg")]);
    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(2));

    await userEvent.click(screen.getByRole("button", { name: /remove a\.jpg/i }));

    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(1));
  });
});
