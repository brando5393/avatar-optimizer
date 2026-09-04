import type { SQSEvent, SQSRecord } from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { moderateImage } from "../src/lib/moderation";
import { processImage } from "../src/lib/image-processing";

vi.mock("../src/lib/moderation", () => ({ moderateImage: vi.fn() }));
vi.mock("../src/lib/image-processing", () => ({ processImage: vi.fn() }));

const s3SendMock = vi.fn();
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: s3SendMock })),
  GetObjectCommand: vi.fn().mockImplementation((input: unknown) => ({ input, __type: "Get" })),
  PutObjectCommand: vi.fn().mockImplementation((input: unknown) => ({ input, __type: "Put" })),
  DeleteObjectCommand: vi.fn().mockImplementation((input: unknown) => ({ input, __type: "Delete" })),
}));

const ddbSendMock = vi.fn();
vi.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: vi.fn().mockImplementation(() => ({})),
}));
vi.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: { from: vi.fn().mockImplementation(() => ({ send: ddbSendMock })) },
  UpdateCommand: vi.fn().mockImplementation((input: unknown) => ({ input })),
}));

const { handler } = await import("../src/handlers/process-upload");

function fakeBody(text = "fake-image-bytes"): AsyncIterable<Uint8Array> {
  return {
    [Symbol.asyncIterator]: async function* () {
      yield Buffer.from(text);
    },
  };
}

function makeSqsRecord(key: string, messageId = "msg-1"): SQSRecord {
  return {
    messageId,
    body: JSON.stringify({ Records: [{ s3: { bucket: { name: "uploads" }, object: { key } } }] }),
  } as unknown as SQSRecord;
}

describe("process-upload handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.UPLOADS_BUCKET = "uploads-bucket";
    process.env.OUTPUTS_BUCKET = "outputs-bucket";
    process.env.SESSIONS_TABLE = "sessions-table";

    s3SendMock.mockImplementation(async (command: { __type?: string }) => {
      if (command.__type === "Get") return { Body: fakeBody() };
      return {};
    });
    ddbSendMock.mockResolvedValue({ Attributes: { processedCount: 1, originalKeys: ["TOKEN/0"] } });
  });

  it("marks the session ready once every original has been processed", async () => {
    vi.mocked(moderateImage).mockResolvedValue({ isSafe: true, labels: [] });
    vi.mocked(processImage).mockResolvedValue([
      { presetId: "discord", filterId: "original", buffer: Buffer.from("x"), contentType: "image/jpeg" },
    ]);

    const event: SQSEvent = { Records: [makeSqsRecord("TOKEN/0")] };
    const result = await handler(event);

    expect(result.batchItemFailures).toEqual([]);
    expect(processImage).toHaveBeenCalledOnce();

    // Second update call marks status ready once processedCount >= originalKeys.length.
    const readyCall = ddbSendMock.mock.calls.find(
      ([cmd]) => cmd.input.UpdateExpression === "SET #status = :ready",
    );
    expect(readyCall).toBeDefined();
  });

  it("does not mark ready when processedCount is still behind originalKeys.length", async () => {
    vi.mocked(moderateImage).mockResolvedValue({ isSafe: true, labels: [] });
    vi.mocked(processImage).mockResolvedValue([
      { presetId: "discord", filterId: "original", buffer: Buffer.from("x"), contentType: "image/jpeg" },
    ]);
    ddbSendMock.mockResolvedValue({ Attributes: { processedCount: 1, originalKeys: ["TOKEN/0", "TOKEN/1"] } });

    const event: SQSEvent = { Records: [makeSqsRecord("TOKEN/0")] };
    await handler(event);

    const readyCall = ddbSendMock.mock.calls.find(
      ([cmd]) => cmd.input.UpdateExpression === "SET #status = :ready",
    );
    expect(readyCall).toBeUndefined();
  });

  it("rejects and deletes the original when moderation flags it, without processing outputs", async () => {
    vi.mocked(moderateImage).mockResolvedValue({ isSafe: false, labels: ["Explicit Nudity"] });

    const event: SQSEvent = { Records: [makeSqsRecord("TOKEN/0")] };
    await handler(event);

    expect(processImage).not.toHaveBeenCalled();
    const deleteCall = s3SendMock.mock.calls.find(([cmd]) => cmd.__type === "Delete");
    expect(deleteCall).toBeDefined();

    const rejectCall = ddbSendMock.mock.calls.find(
      ([cmd]) => cmd.input.ExpressionAttributeValues?.[":rejected"] === "rejected",
    );
    expect(rejectCall![0].input.ExpressionAttributeValues[":reason"]).toBe("Explicit Nudity");
  });

  it("reports a failed record in batchItemFailures without aborting the rest of the batch", async () => {
    vi.mocked(moderateImage)
      .mockRejectedValueOnce(new Error("Rekognition unavailable"))
      .mockResolvedValueOnce({ isSafe: true, labels: [] });
    vi.mocked(processImage).mockResolvedValue([
      { presetId: "discord", filterId: "original", buffer: Buffer.from("x"), contentType: "image/jpeg" },
    ]);

    const event: SQSEvent = {
      Records: [makeSqsRecord("TOKEN/0", "msg-fail"), makeSqsRecord("TOKEN/1", "msg-ok")],
    };
    const result = await handler(event);

    expect(result.batchItemFailures).toEqual([{ itemIdentifier: "msg-fail" }]);
    expect(processImage).toHaveBeenCalledOnce();
  });
});
