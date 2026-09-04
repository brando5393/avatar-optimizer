import { render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RecoverFlow from "./RecoverFlow.svelte";

vi.mock("$lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("$lib/api")>();
  return { ...actual, getSession: vi.fn() };
});

import { ApiError, getSession } from "$lib/api";

beforeEach(() => {
  vi.mocked(getSession).mockReset();
});

describe("RecoverFlow", () => {
  it("disables submit until a code is entered", () => {
    render(RecoverFlow);
    expect(screen.getByRole("button", { name: /recover my package/i })).toBeDisabled();
  });

  it("shows the results once a ready session is found", async () => {
    vi.mocked(getSession).mockResolvedValue({
      status: "ready",
      outputs: [{ presetId: "xbox", filterId: "original", sourceKey: "CODE/0", url: "https://out.example/0.jpg" }],
    });

    render(RecoverFlow);
    await userEvent.type(screen.getByLabelText(/recovery code/i), "ABCD-1234-EFGH-5678");
    await userEvent.click(screen.getByRole("button", { name: /recover my package/i }));

    await waitFor(() => expect(screen.getByText("ABCD-1234-EFGH-5678")).toBeInTheDocument());
    expect(getSession).toHaveBeenCalledWith("ABCD-1234-EFGH-5678");
    expect(screen.getByText("Xbox Gamerpic")).toBeInTheDocument();
  });

  it("shows a not-found message for an unknown code", async () => {
    vi.mocked(getSession).mockRejectedValue(new ApiError("Not found", 404));

    render(RecoverFlow);
    await userEvent.type(screen.getByLabelText(/recovery code/i), "BAD-CODE");
    await userEvent.click(screen.getByRole("button", { name: /recover my package/i }));

    await waitFor(() => expect(screen.getByText(/couldn't find a package/i)).toBeInTheDocument());
  });

  it("shows the rejection reason for a rejected session", async () => {
    vi.mocked(getSession).mockResolvedValue({
      status: "rejected",
      rejectionReason: "This photo didn't pass our content screening.",
      outputs: [],
    });

    render(RecoverFlow);
    await userEvent.type(screen.getByLabelText(/recovery code/i), "REJECTED-CODE");
    await userEvent.click(screen.getByRole("button", { name: /recover my package/i }));

    await waitFor(() => expect(screen.getByText(/didn't pass our content screening/i)).toBeInTheDocument());
  });

  it("shows a generic error message on an unexpected failure", async () => {
    vi.mocked(getSession).mockRejectedValue(new ApiError("Too many requests", 429));

    render(RecoverFlow);
    await userEvent.type(screen.getByLabelText(/recovery code/i), "SOME-CODE");
    await userEvent.click(screen.getByRole("button", { name: /recover my package/i }));

    await waitFor(() => expect(screen.getByText("Too many requests")).toBeInTheDocument());
  });

  it("lets the user look up another code from the results view", async () => {
    vi.mocked(getSession).mockResolvedValue({ status: "ready", outputs: [] });

    render(RecoverFlow);
    await userEvent.type(screen.getByLabelText(/recovery code/i), "CODE-1");
    await userEvent.click(screen.getByRole("button", { name: /recover my package/i }));
    await waitFor(() => expect(screen.getByText("CODE-1")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /look up another code/i }));
    expect(screen.getByLabelText(/recovery code/i)).toHaveValue("");
  });
});
