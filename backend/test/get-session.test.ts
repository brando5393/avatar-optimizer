import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSignedUrlMock = vi.fn();
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: (...args: unknown[]) => getSignedUrlMock(...args),
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({})),
  GetObjectCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
}));

const ddbSendMock = vi.fn();
vi.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: vi.fn().mockImplementation(() => ({})),
}));
vi.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: { from: vi.fn().mockImplementation(() => ({ send: ddbSendMock })) },
  GetCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
}));

const { handler } = await import("../src/handlers/get-session");

function makeEvent(token: string | undefined, method = "GET"): APIGatewayProxyEventV2 {
  return {
    version: "2.0",
    routeKey: "$default",
    rawPath: "/",
    rawQueryString: "",
    headers: {},
    queryStringParameters: token === undefined ? {} : { token },
    requestContext: { http: { method, sourceIp: "1.2.3.4" } },
    isBase64Encoded: false,
  } as unknown as APIGatewayProxyEventV2;
}

const VALID_TOKEN = "ABCD-2345-6789-JKMN";

describe("get-session handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SESSIONS_TABLE = "sessions-table";
    process.env.OUTPUTS_BUCKET = "outputs-bucket";
    process.env.ALLOWED_ORIGIN = "https://picperfecto.com";
    getSignedUrlMock.mockResolvedValue("https://s3.example/signed");
  });

  it("rejects non-GET methods", async () => {
    const result = await handler(makeEvent(VALID_TOKEN, "POST"));
    expect(result.statusCode).toBe(405);
  });

  it("rejects a missing token", async () => {
    const result = await handler(makeEvent(undefined));
    expect(result.statusCode).toBe(400);
    expect(ddbSendMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed token without querying DynamoDB", async () => {
    const result = await handler(makeEvent("not-a-real-code"));
    expect(result.statusCode).toBe(400);
    expect(ddbSendMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the session doesn't exist or has expired", async () => {
    ddbSendMock.mockResolvedValue({ Item: undefined });
    const result = await handler(makeEvent(VALID_TOKEN));
    expect(result.statusCode).toBe(404);
  });

  it("returns status and presigned download URLs for a ready session", async () => {
    ddbSendMock.mockResolvedValue({
      Item: {
        sessionToken: VALID_TOKEN,
        status: "ready",
        outputs: [{ sourceKey: "T/0", presetId: "discord", filterId: "original", outputKey: "T/0/discord-original.jpg" }],
      },
    });

    const result = await handler(makeEvent(VALID_TOKEN));
    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body ?? "{}");
    expect(body.status).toBe("ready");
    expect(body.outputs).toHaveLength(1);
    expect(body.outputs[0].url).toBe("https://s3.example/signed");
    expect(body.outputs[0].presetId).toBe("discord");
  });

  it("accepts a lowercase recovery code (case-insensitive lookup)", async () => {
    ddbSendMock.mockResolvedValue({ Item: { sessionToken: VALID_TOKEN, status: "pending", outputs: [] } });
    await handler(makeEvent(VALID_TOKEN.toLowerCase()));
    const [getCommand] = ddbSendMock.mock.calls[0];
    expect(getCommand.input.Key.sessionToken).toBe(VALID_TOKEN);
  });
});
