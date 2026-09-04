import { S3Client } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { newExpiresAt, type SessionRecord } from "../lib/session-record";
import { generateSessionToken } from "../lib/session-token";

const s3 = new S3Client({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const MIN_FILES = 1;
const MAX_FILES = 10;
const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB per photo
const POST_EXPIRY_SECONDS = 15 * 60;

function jsonResponse(statusCode: number, body: unknown): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN ?? "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

interface RequestBody {
  fileCount: number;
}

function isValidRequest(value: unknown): value is RequestBody {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.fileCount === "number" &&
    Number.isInteger(candidate.fileCount) &&
    candidate.fileCount >= MIN_FILES &&
    candidate.fileCount <= MAX_FILES
  );
}

function parseBody(event: APIGatewayProxyEventV2): unknown {
  if (!event.body) return null;
  const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf-8") : event.body;
  return JSON.parse(raw);
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  if (event.requestContext.http.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  let payload: unknown;
  try {
    payload = parseBody(event);
  } catch {
    return jsonResponse(400, { error: "Invalid JSON" });
  }

  if (!isValidRequest(payload)) {
    return jsonResponse(400, { error: `fileCount must be an integer between ${MIN_FILES} and ${MAX_FILES}` });
  }

  const bucket = requireEnv("UPLOADS_BUCKET");
  const tableName = requireEnv("SESSIONS_TABLE");
  const sessionToken = generateSessionToken();

  const originalKeys: string[] = [];
  const uploads: Array<{ key: string; url: string; fields: Record<string, string> }> = [];

  for (let i = 0; i < payload.fileCount; i++) {
    const key = `${sessionToken}/${i}`;
    originalKeys.push(key);
    const post = await createPresignedPost(s3, {
      Bucket: bucket,
      Key: key,
      Conditions: [
        ["content-length-range", 1, MAX_FILE_BYTES],
        ["starts-with", "$Content-Type", "image/"],
      ],
      Fields: { "Content-Type": "image/jpeg" },
      Expires: POST_EXPIRY_SECONDS,
    });
    uploads.push({ key, url: post.url, fields: post.fields });
  }

  const record: SessionRecord = {
    sessionToken,
    status: "pending",
    originalKeys,
    processedCount: 0,
    outputs: [],
    createdAt: new Date().toISOString(),
    expiresAt: newExpiresAt(),
  };

  await ddb.send(new PutCommand({ TableName: tableName, Item: record }));

  return jsonResponse(200, { sessionToken, uploads });
}
