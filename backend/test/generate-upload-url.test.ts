import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
    createPresignedPostMock.mockResolvedValue({ url: "https://s3.example/upload", fields: { key: "x" } });
    ddbSendMock.mockResolvedValue({});
  });

  it("rejects non-POST methods", async () => {
    const result = await handler(makeEvent({ fileCount: 1 }, "GET"));
    expect(result.statusCode).toBe(405);
  });

  it("rejects a missing fileCount", async () => {
    const result = await handler(makeEvent({}));
    expect(result.statusCode).toBe(400);
    expect(createPresignedPostMock).not.toHaveBeenCalled();
  });

  it("rejects fileCount out of range", async () => {
    expect((await handler(makeEvent({ fileCount: 0 }))).statusCode).toBe(400);
    expect((await handler(makeEvent({ fileCount: 11 }))).statusCode).toBe(400);
    expect((await handler(makeEvent({ fileCount: 2.5 }))).statusCode).toBe(400);
  });

  it("rejects malformed JSON", async () => {
    const event = makeEvent(undefined);
    event.body = "{not json";
    expect((await handler(event)).statusCode).toBe(400);
  });

  it("creates one presigned POST per requested file and writes a pending session record", async () => {
    const result = await handler(makeEvent({ fileCount: 3 }));
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
    await handler(makeEvent({ fileCount: 1 }));
    const [, options] = createPresignedPostMock.mock.calls[0];
    expect(options.Conditions).toContainEqual(["content-length-range", 1, 15 * 1024 * 1024]);
  });

  it("includes CORS headers reflecting ALLOWED_ORIGIN", async () => {
    const result = await handler(makeEvent({ fileCount: 1 }));
    expect(result.headers?.["Access-Control-Allow-Origin"]).toBe("https://picperfecto.com");
  });
});
