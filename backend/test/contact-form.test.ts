import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit } from "../src/lib/rate-limit";
import { getTurnstileSecret, verifyTurnstileToken } from "../src/lib/turnstile";

vi.mock("../src/lib/turnstile", () => ({
  verifyTurnstileToken: vi.fn(),
  getTurnstileSecret: vi.fn(),
}));

vi.mock("../src/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

const sesSendMock = vi.fn();
vi.mock("@aws-sdk/client-sesv2", () => ({
  SESv2Client: vi.fn().mockImplementation(() => ({ send: sesSendMock })),
  SendEmailCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
}));

const { handler } = await import("../src/handlers/contact-form");

function makeEvent(body: unknown, method = "POST"): APIGatewayProxyEventV2 {
  return {
    version: "2.0",
    routeKey: "$default",
    rawPath: "/",
    rawQueryString: "",
    headers: {},
    requestContext: {
      http: { method, sourceIp: "1.2.3.4" },
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    isBase64Encoded: false,
  } as unknown as APIGatewayProxyEventV2;
}

describe("contact-form handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TURNSTILE_SECRET_ID = "picperfecto/turnstile-secret-key";
    process.env.CONTACT_FROM_ADDRESS = "no-reply@picperfecto.com";
    process.env.CONTACT_TO_ADDRESS = "owner@example.com";
    process.env.ALLOWED_ORIGIN = "https://picperfecto.com";
    process.env.RATE_LIMIT_TABLE = "rate-limit-table";
    vi.mocked(getTurnstileSecret).mockResolvedValue("turnstile-secret");
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, count: 1, limit: 5 });
    sesSendMock.mockResolvedValue({});
  });

  it("rejects non-POST methods", async () => {
    const result = await handler(makeEvent({}, "GET"));
    expect(result.statusCode).toBe(405);
  });

  it("returns 429 and never parses the body when rate limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, count: 6, limit: 5 });
    const result = await handler(makeEvent({ message: "Hello", turnstileToken: "tok" }));
    expect(result.statusCode).toBe(429);
    expect(verifyTurnstileToken).not.toHaveBeenCalled();
    expect(sesSendMock).not.toHaveBeenCalled();
  });

  it("scopes the rate limit check to this endpoint and the caller's IP", async () => {
    await handler(makeEvent({ message: "Hello", turnstileToken: "tok" }));
    expect(checkRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "contact-form", identifier: "1.2.3.4", limit: 5 }),
    );
  });

  it("rejects an invalid payload without calling Turnstile or SES", async () => {
    const result = await handler(makeEvent({ message: "" }));
    expect(result.statusCode).toBe(400);
    expect(verifyTurnstileToken).not.toHaveBeenCalled();
    expect(sesSendMock).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON bodies", async () => {
    const event = makeEvent(undefined);
    event.body = "{not json";
    const result = await handler(event);
    expect(result.statusCode).toBe(400);
  });

  it("returns 403 and never calls SES when Turnstile verification fails", async () => {
    vi.mocked(verifyTurnstileToken).mockResolvedValue(false);
    const result = await handler(makeEvent({ message: "Hello", turnstileToken: "bad-token" }));
    expect(result.statusCode).toBe(403);
    expect(sesSendMock).not.toHaveBeenCalled();
  });

  it("sends via SES and returns 200 on a valid, verified submission", async () => {
    vi.mocked(verifyTurnstileToken).mockResolvedValue(true);
    const result = await handler(
      makeEvent({ message: "Hello there", email: "sender@example.com", turnstileToken: "good-token" }),
    );
    expect(result.statusCode).toBe(200);
    expect(sesSendMock).toHaveBeenCalledOnce();
    const [command] = sesSendMock.mock.calls[0];
    expect(command.input.FromEmailAddress).toBe("no-reply@picperfecto.com");
    expect(command.input.Destination.ToAddresses).toEqual(["owner@example.com"]);
    expect(command.input.ReplyToAddresses).toEqual(["sender@example.com"]);
  });

  it("silently accepts and drops a submission with the honeypot filled in", async () => {
    const result = await handler(
      makeEvent({ message: "Buy pills now", turnstileToken: "whatever", website: "https://spam.example" }),
    );
    expect(result.statusCode).toBe(200);
    expect(verifyTurnstileToken).not.toHaveBeenCalled();
    expect(sesSendMock).not.toHaveBeenCalled();
  });

  it("includes CORS headers reflecting ALLOWED_ORIGIN on every response", async () => {
    const result = await handler(makeEvent({ message: "" }));
    expect(result.headers?.["Access-Control-Allow-Origin"]).toBe("https://picperfecto.com");
  });
});
