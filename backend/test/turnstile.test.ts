import { describe, expect, it, vi } from "vitest";
import { getTurnstileSecret, verifyTurnstileToken } from "../src/lib/turnstile";

function mockSecretsClient(secretString: string | undefined) {
  return { send: vi.fn().mockResolvedValue({ SecretString: secretString }) };
}

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

describe("getTurnstileSecret", () => {
  // Distinct secretId per test — the module caches by secretId, and reusing
  // one across tests would mask a broken client behind an earlier cache hit.

  it("extracts api_key from the secret's JSON string value", async () => {
    const client = mockSecretsClient(JSON.stringify({ api_key: "abc123" }));
    await expect(getTurnstileSecret("test/secret-1", client)).resolves.toBe("abc123");
  });

  it("throws when the secret has no string value", async () => {
    const client = mockSecretsClient(undefined);
    await expect(getTurnstileSecret("test/secret-2", client)).rejects.toThrow();
  });

  it("caches the result — a second call for the same id doesn't hit the client again", async () => {
    const client = mockSecretsClient(JSON.stringify({ api_key: "cached-value" }));
    await getTurnstileSecret("test/secret-3", client);
    await getTurnstileSecret("test/secret-3", client);
    expect(client.send).toHaveBeenCalledOnce();
  });
});
