import { describe, expect, it, vi } from "vitest";
import { checkRateLimit } from "../src/lib/rate-limit";

function mockClient(requestCount: number) {
  return { send: vi.fn().mockResolvedValue({ Attributes: { requestCount } }) };
}

describe("checkRateLimit", () => {
  it("allows a request when the count is at or under the limit", async () => {
    const client = mockClient(3);
    const result = await checkRateLimit({
      tableName: "t",
      identifier: "1.2.3.4",
      scope: "test",
      limit: 5,
      windowSeconds: 60,
      client,
    });
    expect(result).toEqual({ allowed: true, count: 3, limit: 5 });
  });

  it("blocks a request once the count exceeds the limit", async () => {
    const client = mockClient(6);
    const result = await checkRateLimit({
      tableName: "t",
      identifier: "1.2.3.4",
      scope: "test",
      limit: 5,
      windowSeconds: 60,
      client,
    });
    expect(result.allowed).toBe(false);
  });

  it("keys by scope + identifier + window bucket, so different scopes never share a counter", async () => {
    const client = mockClient(1);
    await checkRateLimit({ tableName: "t", identifier: "1.2.3.4", scope: "upload", limit: 5, windowSeconds: 60, client });
    await checkRateLimit({ tableName: "t", identifier: "1.2.3.4", scope: "contact", limit: 5, windowSeconds: 60, client });

    const [firstCall] = client.send.mock.calls[0];
    const [secondCall] = client.send.mock.calls[1];
    expect(firstCall.input.Key.rateLimitKey).toContain("upload#1.2.3.4#");
    expect(secondCall.input.Key.rateLimitKey).toContain("contact#1.2.3.4#");
    expect(firstCall.input.Key.rateLimitKey).not.toBe(secondCall.input.Key.rateLimitKey);
  });

  it("sets an expiresAt TTL attribute so the window record self-cleans", async () => {
    const client = mockClient(1);
    await checkRateLimit({ tableName: "t", identifier: "1.2.3.4", scope: "test", limit: 5, windowSeconds: 60, client });
    const [command] = client.send.mock.calls[0];
    expect(command.input.UpdateExpression).toContain("expiresAt");
    expect(command.input.ExpressionAttributeValues[":expiresAt"]).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});
