import { describe, expect, it, vi } from "vitest";
import { verifyTurnstileToken } from "../src/lib/turnstile";

describe("verifyTurnstileToken", () => {
  it("returns true when siteverify reports success", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    await expect(verifyTurnstileToken("secret", "token", "1.2.3.4", fetchImpl as never)).resolves.toBe(true);
  });

  it("returns false when siteverify reports failure", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: false }) });
    await expect(verifyTurnstileToken("secret", "token", undefined, fetchImpl as never)).resolves.toBe(false);
  });

  it("fails closed on a non-2xx response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ success: true }) });
    await expect(verifyTurnstileToken("secret", "token", undefined, fetchImpl as never)).resolves.toBe(false);
  });

  it("fails closed when the request throws", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));
    await expect(verifyTurnstileToken("secret", "token", undefined, fetchImpl as never)).resolves.toBe(false);
  });

  it("includes the remote IP in the request body when provided", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    await verifyTurnstileToken("secret", "token", "9.9.9.9", fetchImpl as never);
    const body = fetchImpl.mock.calls[0][1].body as URLSearchParams;
    expect(body.get("remoteip")).toBe("9.9.9.9");
  });
});
