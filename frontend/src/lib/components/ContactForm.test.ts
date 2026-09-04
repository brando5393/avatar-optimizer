import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ContactForm from "./ContactForm.svelte";

describe("ContactForm", () => {
  beforeEach(() => {
    window.turnstile = {
      render: (_container: HTMLElement, options: { callback: (token: string) => void }) => {
        options.callback("test-token");
        return "mock-widget";
      },
      reset: vi.fn(),
    };
    vi.stubGlobal("fetch", vi.fn());
  });

  it("renders labeled message and email fields", () => {
    render(ContactForm);
    expect(screen.getByLabelText(/what's on your mind/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/your email/i)).toBeInTheDocument();
  });

  it("requires a message before it can be submitted", () => {
    render(ContactForm);
    expect(screen.getByLabelText(/what's on your mind/i)).toBeRequired();
  });

  it("shows a success message after a successful submission", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);
    render(ContactForm);
    await fireEvent.input(screen.getByLabelText(/what's on your mind/i), { target: { value: "Hello there" } });
    await fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    await waitFor(() => expect(screen.getByText(/sent — thanks/i)).toBeInTheDocument());
  });

  it("shows an error message when the request fails", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network error"));
    render(ContactForm);
    await fireEvent.input(screen.getByLabelText(/what's on your mind/i), { target: { value: "Hello there" } });
    await fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    await waitFor(() => expect(screen.getByText(/something went wrong/i)).toBeInTheDocument());
  });
});
