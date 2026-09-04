import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit } from "../src/lib/rate-limit";
import { getTurnstileSecret, verifyTurnstileToken } from "../src/lib/turnstile";

const createPresignedPostMock = vi.fn();
vi.mock("@aws-sdk/s3-presigned-post", () => ({
  createPresignedPost: (...args: unknown[]) => createPresignedPostMock(...args),
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({})),
}));

const ddbSendMock = vi.fn();
vi.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: vi.fn().mockImplementation(() => ({})),
}));
vi.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: { from: vi.fn().mockImplementation(() => ({ send: ddbSendMock })) },
  PutCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
}));

vi.mock("../src/lib/turnstile", () => ({
  verifyTurnstileToken: vi.fn(),
  getTurnstileSecret: vi.fn(),
}));

vi.mock("../src/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

const { handler } = await import("../src/handlers/generate-upload-url");

function makeEvent(body: unknown, method = "POST"): APIGatewayProxyEventV2 {
  return {
    version: "2.0",
    routeKey: "$default",
    rawPath: "/",
    rawQueryString: "",
    headers: {},
    requestContext: { http: { method, sourceIp: "1.2.3.4" } },
    body: body === undefined ? undefined : JSON.stringify(body),
    isBase64Encoded: false,
  } as unknown as APIGatewayProxyEventV2;
}

describe("generate-upload-url handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.UPLOADS_BUCKET = "uploads-bucket";
    process.env.SESSIONS_TABLE = "sessions-table";
    process.env.ALLOWED_ORIGIN = "https://picperfecto.com";
    process.env.TURNSTILE_SECRET_ID = "picperfecto/turnstile-secret-key";
    process.env.RATE_LIMIT_TABLE = "rate-limit-table";
    createPresignedPostMock.mockResolvedValue({ url: "https://s3.example/upload", fields: { key: "x" } });
    ddbSendMock.mockResolvedValue({});
    vi.mocked(getTurnstileSecret).mockResolvedValue("turnstile-secret");
    vi.mocked(verifyTurnstileToken).mockResolvedValue(true);
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, count: 1, limit: 5 });
  });

  it("rejects non-POST methods", async () => {
    const result = await handler(makeEvent({ fileCount: 1, turnstileToken: "tok" }, "GET"));
    expect(result.statusCode).toBe(405);
  });

  it("returns 429 and never touches Turnstile or S3 when rate limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, count: 6, limit: 5 });
    const result = await handler(makeEvent({ fileCount: 1, turnstileToken: "tok" }));
    expect(result.statusCode).toBe(429);
    expect(verifyTurnstileToken).not.toHaveBeenCalled();
    expect(createPresignedPostMock).not.toHaveBeenCalled();
  });

  it("scopes the rate limit check to this endpoint and the caller's IP", async () => {
    await handler(makeEvent({ fileCount: 1, turnstileToken: "tok" }));
    expect(checkRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "generate-upload-url", identifier: "1.2.3.4", limit: 5 }),
    );
  });

  it("rejects a missing fileCount", async () => {
    const result = await handler(makeEvent({ turnstileToken: "tok" }));
    expect(result.statusCode).toBe(400);
    expect(createPresignedPostMock).not.toHaveBeenCalled();
  });

  it("rejects fileCount out of range", async () => {
    expect((await handler(makeEvent({ fileCount: 0, turnstileToken: "tok" }))).statusCode).toBe(400);
    expect((await handler(makeEvent({ fileCount: 11, turnstileToken: "tok" }))).statusCode).toBe(400);
    expect((await handler(makeEvent({ fileCount: 2.5, turnstileToken: "tok" }))).statusCode).toBe(400);
  });

  it("rejects a missing turnstileToken", async () => {
    const result = await handler(makeEvent({ fileCount: 1 }));
    expect(result.statusCode).toBe(400);
    expect(verifyTurnstileToken).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    const event = makeEvent(undefined);
    event.body = "{not json";
    expect((await handler(event)).statusCode).toBe(400);
  });

  it("returns 403 and never creates presigned POSTs when Turnstile verification fails", async () => {
    vi.mocked(verifyTurnstileToken).mockResolvedValue(false);
    const result = await handler(makeEvent({ fileCount: 1, turnstileToken: "bad-token" }));
    expect(result.statusCode).toBe(403);
    expect(createPresignedPostMock).not.toHaveBeenCalled();
    expect(ddbSendMock).not.toHaveBeenCalled();
  });

  it("creates one presigned POST per requested file and writes a pending session record", async () => {
    const result = await handler(makeEvent({ fileCount: 3, turnstileToken: "tok" }));
    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body ?? "{}");
    expect(body.sessionToken).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
    expect(body.uploads).toHaveLength(3);
    expect(createPresignedPostMock).toHaveBeenCalledTimes(3);

    expect(ddbSendMock).toHaveBeenCalledOnce();
    const [putCommand] = ddbSendMock.mock.calls[0];
    expect(putCommand.input.Item.status).toBe("pending");
    expect(putCommand.input.Item.originalKeys).toHaveLength(3);
    expect(putCommand.input.Item.processedCount).toBe(0);
    expect(putCommand.input.Item.outputs).toEqual([]);
  });

  it("enforces a server-side content-length-range condition on every presigned POST", async () => {
    await handler(makeEvent({ fileCount: 1, turnstileToken: "tok" }));
    const [, options] = createPresignedPostMock.mock.calls[0];
    expect(options.Conditions).toContainEqual(["content-length-range", 1, 15 * 1024 * 1024]);
  });

  it("includes CORS headers reflecting ALLOWED_ORIGIN", async () => {
    const result = await handler(makeEvent({ fileCount: 1, turnstileToken: "tok" }));
    expect(result.headers?.["Access-Control-Allow-Origin"]).toBe("https://picperfecto.com");
  });
});
