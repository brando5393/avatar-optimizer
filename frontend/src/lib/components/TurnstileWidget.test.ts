import { render } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TurnstileWidget from "./TurnstileWidget.svelte";

describe("TurnstileWidget", () => {
  beforeEach(() => {
    delete window.turnstile;
  });

  it("renders the widget once window.turnstile is available", () => {
    const renderMock = vi.fn().mockReturnValue("widget-id");
    window.turnstile = { render: renderMock, reset: vi.fn() };

    render(TurnstileWidget, { onVerify: vi.fn() });

    expect(renderMock).toHaveBeenCalledOnce();
  });

  it("calls onVerify with the token when the challenge is solved", () => {
    let capturedCallback: ((token: string) => void) | undefined;
    window.turnstile = {
      render: (_el, options) => {
        capturedCallback = options.callback;
        return "widget-id";
      },
      reset: vi.fn(),
    };
    const onVerify = vi.fn();

    render(TurnstileWidget, { onVerify });
    capturedCallback?.("solved-token");

    expect(onVerify).toHaveBeenCalledWith("solved-token");
  });

  it("calls onExpire when the challenge expires", () => {
    let capturedExpiredCallback: (() => void) | undefined;
    window.turnstile = {
      render: (_el, options) => {
        capturedExpiredCallback = options["expired-callback"];
        return "widget-id";
      },
      reset: vi.fn(),
    };
    const onExpire = vi.fn();

    render(TurnstileWidget, { onVerify: vi.fn(), onExpire });
    capturedExpiredCallback?.();

    expect(onExpire).toHaveBeenCalledOnce();
  });

  it("exposes a reset() method that resets the underlying widget", () => {
    const resetMock = vi.fn();
    window.turnstile = { render: vi.fn().mockReturnValue("widget-id"), reset: resetMock };

    const { component } = render(TurnstileWidget, { onVerify: vi.fn() });
    (component as unknown as { reset: () => void }).reset();

    expect(resetMock).toHaveBeenCalledWith("widget-id");
  });
});
