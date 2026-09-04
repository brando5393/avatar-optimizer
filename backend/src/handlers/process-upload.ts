import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { SQSBatchResponse, SQSEvent, SQSRecord } from "aws-lambda";
import { moderateImage } from "../lib/moderation";
import { processImage } from "../lib/image-processing";
import type { SessionOutput } from "../lib/session-record";

const s3 = new S3Client({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

async function streamToBuffer(body: AsyncIterable<Uint8Array>): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

interface S3EventNotification {
  Records?: Array<{ s3: { bucket: { name: string }; object: { key: string } } }>;
}

async function processS3Object(uploadsBucket: string, outputsBucket: string, tableName: string, key: string) {
  const sessionToken = key.split("/")[0];

  const getResult = await s3.send(new GetObjectCommand({ Bucket: uploadsBucket, Key: key }));
  const imageBuffer = await streamToBuffer(getResult.Body as AsyncIterable<Uint8Array>);

  const moderation = await moderateImage(imageBuffer);
  if (!moderation.isSafe) {
    await s3.send(new DeleteObjectCommand({ Bucket: uploadsBucket, Key: key }));
    await ddb.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { sessionToken },
        UpdateExpression: "SET #status = :rejected, rejectionReason = :reason",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":rejected": "rejected",
          ":reason": moderation.labels.join(", "),
        },
      }),
    );
    return;
  }

  const outputs = await processImage(imageBuffer);
  const sessionOutputs: SessionOutput[] = [];
  for (const output of outputs) {
    const outputKey = `${key}/${output.presetId}-${output.filterId}.jpg`;
    await s3.send(
      new PutObjectCommand({
        Bucket: outputsBucket,
        Key: outputKey,
        Body: output.buffer,
        ContentType: output.contentType,
      }),
    );
    sessionOutputs.push({ sourceKey: key, presetId: output.presetId, filterId: output.filterId, outputKey });
  }

  // The original's job is done once we have its outputs — remove it rather
  // than let it sit until the bucket lifecycle rule catches up.
  await s3.send(new DeleteObjectCommand({ Bucket: uploadsBucket, Key: key }));

  const updateResult = await ddb.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { sessionToken },
      UpdateExpression:
        "SET outputs = list_append(if_not_exists(outputs, :emptyList), :newOutputs), #status = :processing ADD processedCount :one",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":newOutputs": sessionOutputs,
        ":emptyList": [],
        ":one": 1,
        ":processing": "processing",
      },
      ReturnValues: "ALL_NEW",
    }),
  );

  const updated = updateResult.Attributes as { processedCount: number; originalKeys: string[] } | undefined;
  if (updated && updated.processedCount >= updated.originalKeys.length) {
    await ddb.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { sessionToken },
        UpdateExpression: "SET #status = :ready",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":ready": "ready" },
      }),
    );
  }
}

async function processSqsRecord(record: SQSRecord) {
  const uploadsBucket = requireEnv("UPLOADS_BUCKET");
  const outputsBucket = requireEnv("OUTPUTS_BUCKET");
  const tableName = requireEnv("SESSIONS_TABLE");

  const s3Event = JSON.parse(record.body) as S3EventNotification;
  for (const s3Record of s3Event.Records ?? []) {
    const key = decodeURIComponent(s3Record.s3.object.key.replace(/\+/g, " "));
    await processS3Object(uploadsBucket, outputsBucket, tableName, key);
  }
}

export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  const batchItemFailures: { itemIdentifier: string }[] = [];

  for (const record of event.Records) {
    try {
      await processSqsRecord(record);
    } catch (error) {
      console.error("Failed to process record", record.messageId, error);
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
}
