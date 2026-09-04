import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import type { SessionRecord } from "../lib/session-record";
import { isValidSessionTokenFormat } from "../lib/session-token";

const s3 = new S3Client({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const DOWNLOAD_URL_EXPIRY_SECONDS = 15 * 60;

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

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  if (event.requestContext.http.method !== "GET") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const rawToken = event.queryStringParameters?.token;
  if (!rawToken || !isValidSessionTokenFormat(rawToken)) {
    return jsonResponse(400, { error: "Invalid or missing recovery code" });
  }
  const sessionToken = rawToken.toUpperCase();

  const tableName = requireEnv("SESSIONS_TABLE");
  const outputsBucket = requireEnv("OUTPUTS_BUCKET");

  const result = await ddb.send(new GetCommand({ TableName: tableName, Key: { sessionToken } }));
  const record = result.Item as SessionRecord | undefined;

  if (!record) {
    return jsonResponse(404, { error: "Recovery code not found or expired" });
  }

  const outputs = await Promise.all(
    record.outputs.map(async (output) => ({
      presetId: output.presetId,
      filterId: output.filterId,
      sourceKey: output.sourceKey,
      url: await getSignedUrl(s3, new GetObjectCommand({ Bucket: outputsBucket, Key: output.outputKey }), {
        expiresIn: DOWNLOAD_URL_EXPIRY_SECONDS,
      }),
    })),
  );

  return jsonResponse(200, {
    status: record.status,
    rejectionReason: record.rejectionReason,
    outputs,
  });
}
