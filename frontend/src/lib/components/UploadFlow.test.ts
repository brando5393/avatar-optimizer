import { render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import UploadFlow from "./UploadFlow.svelte";

vi.mock("$lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("$lib/api")>();
  return {
    ...actual,
    generateUploadUrls: vi.fn(),
    uploadFileToS3: vi.fn(),
    getSession: vi.fn(),
  };
});

import { ApiError, generateUploadUrls, getSession, uploadFileToS3 } from "$lib/api";

function makeImageFile(name: string): File {
  return new File(["fake-bytes"], name, { type: "image/jpeg" });
}

async function selectFileAndSolveTurnstile() {
  const input = document.getElementById("upload-dropzone-input") as HTMLInputElement;
  await userEvent.upload(input, [makeImageFile("a.jpg")]);
  await waitFor(() => expect(screen.getByRole("button", { name: /send to the booth/i })).toBeEnabled());
}

beforeAll(() => {
  URL.createObjectURL = () => "blob:mock-url";
  URL.revokeObjectURL = () => {};
});

beforeEach(() => {
  window.turnstile = {
    render: (_container: HTMLElement, options: { callback: (token: string) => void }) => {
      options.callback("test-token");
      return "mock-widget";
    },
    reset: vi.fn(),
  };
  vi.mocked(generateUploadUrls).mockReset();
  vi.mocked(uploadFileToS3).mockReset();
  vi.mocked(getSession).mockReset();
});

describe("UploadFlow", () => {
  it("disables submit until a file is chosen and Turnstile has solved", () => {
    render(UploadFlow);
    expect(screen.getByRole("button", { name: /send to the booth/i })).toBeDisabled();
  });

  it("uploads each file to S3 and shows the results once the session is ready", async () => {
    vi.mocked(generateUploadUrls).mockResolvedValue({
      sessionToken: "CODE-1234",
      uploads: [{ key: "CODE-1234/0", url: "https://s3.example/bucket", fields: {} }],
    });
    vi.mocked(uploadFileToS3).mockResolvedValue(undefined);
    vi.mocked(getSession).mockResolvedValue({
      status: "ready",
      outputs: [
        { presetId: "discord", filterId: "original", sourceKey: "CODE-1234/0", url: "https://out.example/1.jpg" },
      ],
    });

    render(UploadFlow, { pollIntervalMs: 1 });
    await selectFileAndSolveTurnstile();
    await userEvent.click(screen.getByRole("button", { name: /send to the booth/i }));

    await waitFor(() => expect(screen.getByText("CODE-1234")).toBeInTheDocument());
    expect(generateUploadUrls).toHaveBeenCalledWith(1, "test-token");
    expect(uploadFileToS3).toHaveBeenCalledOnce();
    expect(screen.getByText("Discord")).toBeInTheDocument();
  });

  it("shows a processing message while the session is still pending", async () => {
    vi.mocked(generateUploadUrls).mockResolvedValue({
      sessionToken: "CODE-5678",
      uploads: [{ key: "CODE-5678/0", url: "https://s3.example/bucket", fields: {} }],
    });
    vi.mocked(uploadFileToS3).mockResolvedValue(undefined);
    vi.mocked(getSession)
      .mockResolvedValueOnce({ status: "processing", outputs: [] })
      .mockResolvedValueOnce({ status: "ready", outputs: [] });

    render(UploadFlow, { pollIntervalMs: 1 });
    await selectFileAndSolveTurnstile();
    await userEvent.click(screen.getByRole("button", { name: /send to the booth/i }));

    await waitFor(() => expect(screen.getByText(/developing your photos/i)).toBeInTheDocument());
    await waitFor(() => expect(getSession).toHaveBeenCalledTimes(2));
  });

  it("shows the rejection reason when the session is rejected", async () => {
    vi.mocked(generateUploadUrls).mockResolvedValue({
      sessionToken: "CODE-9999",
      uploads: [{ key: "CODE-9999/0", url: "https://s3.example/bucket", fields: {} }],
    });
    vi.mocked(uploadFileToS3).mockResolvedValue(undefined);
    vi.mocked(getSession).mockResolvedValue({
      status: "rejected",
      rejectionReason: "This photo didn't pass our content screening.",
      outputs: [],
    });

    render(UploadFlow, { pollIntervalMs: 1 });
    await selectFileAndSolveTurnstile();
    await userEvent.click(screen.getByRole("button", { name: /send to the booth/i }));

    await waitFor(() => expect(screen.getByText(/didn't pass our content screening/i)).toBeInTheDocument());
  });

  it("shows an error message when generating upload URLs fails", async () => {
    vi.mocked(generateUploadUrls).mockRejectedValue(new ApiError("Too many requests", 429));

    render(UploadFlow, { pollIntervalMs: 1 });
    await selectFileAndSolveTurnstile();
    await userEvent.click(screen.getByRole("button", { name: /send to the booth/i }));

    await waitFor(() => expect(screen.getByText("Too many requests")).toBeInTheDocument());
    expect(uploadFileToS3).not.toHaveBeenCalled();
  });

  it("times out with a friendly message after too many pending polls", async () => {
    vi.mocked(generateUploadUrls).mockResolvedValue({
      sessionToken: "CODE-SLOW",
      uploads: [{ key: "CODE-SLOW/0", url: "https://s3.example/bucket", fields: {} }],
    });
    vi.mocked(uploadFileToS3).mockResolvedValue(undefined);
    vi.mocked(getSession).mockResolvedValue({ status: "processing", outputs: [] });

    render(UploadFlow, { pollIntervalMs: 1, maxPollAttempts: 2 });
    await selectFileAndSolveTurnstile();
    await userEvent.click(screen.getByRole("button", { name: /send to the booth/i }));

    await waitFor(() => expect(screen.getByText(/taking longer than expected/i)).toBeInTheDocument());
    expect(screen.getByText("CODE-SLOW")).toBeInTheDocument();
  });
});
