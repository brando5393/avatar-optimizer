import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstileToken } from "../src/lib/turnstile";

vi.mock("../src/lib/turnstile", () => ({
  verifyTurnstileToken: vi.fn(),
}));

const sesSendMock = vi.fn();
vi.mock("@aws-sdk/client-sesv2", () => ({
  SESv2Client: vi.fn().mockImplementation(() => ({ send: sesSendMock })),
  SendEmailCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
}));

const secretsSendMock = vi.fn();
vi.mock("@aws-sdk/client-secrets-manager", () => ({
  SecretsManagerClient: vi.fn().mockImplementation(() => ({ send: secretsSendMock })),
  GetSecretValueCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
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
    secretsSendMock.mockResolvedValue({ SecretString: JSON.stringify({ api_key: "turnstile-secret" }) });
    sesSendMock.mockResolvedValue({});
  });

  it("rejects non-POST methods", async () => {
    const result = await handler(makeEvent({}, "GET"));
    expect(result.statusCode).toBe(405);
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

  it("includes CORS headers reflecting ALLOWED_ORIGIN on every response", async () => {
    const result = await handler(makeEvent({ message: "" }));
    expect(result.headers?.["Access-Control-Allow-Origin"]).toBe("https://picperfecto.com");
  });
});
