import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export interface RateLimitOptions {
  tableName: string;
  /** Usually the request's source IP. */
  identifier: string;
  /** Keeps different endpoints' counters from colliding on the same identifier. */
  scope: string;
  limit: number;
  windowSeconds: number;
  client?: Pick<DynamoDBDocumentClient, "send">;
}

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
}

/**
 * Fixed-window counter, atomic via DynamoDB's ADD update. All requests
 * within the same scope/identifier/window bucket share one item; the TTL
 * attribute lets expired windows clean themselves up rather than needing a
 * separate sweep job. This is a hard, hardcoded cap — not a substitute for
 * WAF/CloudFront-level throttling, but Lambda Function URLs have no
 * built-in throttling of their own the way API Gateway does.
 */
export async function checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const { tableName, identifier, scope, limit, windowSeconds, client = ddb } = options;

  const windowBucket = Math.floor(Date.now() / 1000 / windowSeconds);
  const rateLimitKey = `${scope}#${identifier}#${windowBucket}`;
  const expiresAt = Math.floor(Date.now() / 1000) + windowSeconds * 2;

  const result = await client.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { rateLimitKey },
      UpdateExpression: "SET expiresAt = if_not_exists(expiresAt, :expiresAt) ADD requestCount :one",
      ExpressionAttributeValues: { ":one": 1, ":expiresAt": expiresAt },
      ReturnValues: "UPDATED_NEW",
    }),
  );

  const count = (result.Attributes?.requestCount as number | undefined) ?? 1;
  return { allowed: count <= limit, count, limit };
}
