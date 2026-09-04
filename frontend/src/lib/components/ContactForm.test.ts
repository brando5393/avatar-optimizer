import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ContactForm from "./ContactForm.svelte";

describe("ContactForm (Turnstile already solved)", () => {
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

  it("enables the submit button once Turnstile has solved", async () => {
    render(ContactForm);
    await waitFor(() => expect(screen.getByRole("button", { name: /send message/i })).toBeEnabled());
  });

  it("shows a success message after a successful submission", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);
    render(ContactForm);
    await fireEvent.input(screen.getByLabelText(/what's on your mind/i), { target: { value: "Hello there" } });
    await waitFor(() => expect(screen.getByRole("button", { name: /send message/i })).toBeEnabled());
    await fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    await waitFor(() => expect(screen.getByText(/sent — thanks/i)).toBeInTheDocument());
  });

  it("shows an error message when the request fails", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network error"));
    render(ContactForm);
    await fireEvent.input(screen.getByLabelText(/what's on your mind/i), { target: { value: "Hello there" } });
    await waitFor(() => expect(screen.getByRole("button", { name: /send message/i })).toBeEnabled());
    await fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    await waitFor(() => expect(screen.getByText(/something went wrong/i)).toBeInTheDocument());
  });

  it("submits the honeypot field's value alongside the real fields", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);
    const { container } = render(ContactForm);
    await fireEvent.input(screen.getByLabelText(/what's on your mind/i), { target: { value: "Hello there" } });
    await waitFor(() => expect(screen.getByRole("button", { name: /send message/i })).toBeEnabled());
    await fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(body).toHaveProperty("website");
    // Sanity check the honeypot input itself is in the DOM.
    expect(container.querySelector('input[name="website"]')).not.toBeNull();
  });
});

describe("ContactForm (Turnstile not yet solved)", () => {
  beforeEach(() => {
    window.turnstile = {
      render: () => "mock-widget",
      reset: vi.fn(),
    };
    vi.stubGlobal("fetch", vi.fn());
  });

  it("disables the submit button until verification completes", () => {
    render(ContactForm);
    expect(screen.getByRole("button", { name: /send message/i })).toBeDisabled();
  });
});

describe("ContactForm honeypot field accessibility", () => {
  beforeEach(() => {
    window.turnstile = {
      render: (_container: HTMLElement, options: { callback: (token: string) => void }) => {
        options.callback("test-token");
        return "mock-widget";
      },
      reset: vi.fn(),
    };
  });

  it("is excluded from the accessibility tree and tab order", () => {
    const { container } = render(ContactForm);

    // getByRole respects aria-hidden, so a hidden honeypot never surfaces
    // as an accessible textbox — the real WCAG-relevant check (verified
    // end-to-end by the axe sweep in tests/a11y.spec.ts).
    expect(screen.queryByRole("textbox", { name: /website/i })).not.toBeInTheDocument();

    const honeypot = container.querySelector('input[name="website"]');
    expect(honeypot).not.toBeNull();
    expect(honeypot).toHaveAttribute("tabindex", "-1");
    expect(honeypot?.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
