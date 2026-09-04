import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { isValidContactPayload } from "../lib/contact-payload";
import { verifyTurnstileToken } from "../lib/turnstile";

const ses = new SESv2Client({});
const secretsManager = new SecretsManagerClient({});

let cachedTurnstileSecret: string | undefined;

async function getTurnstileSecret(): Promise<string> {
  if (cachedTurnstileSecret) return cachedTurnstileSecret;
  const secretId = requireEnv("TURNSTILE_SECRET_ID");
  const result = await secretsManager.send(new GetSecretValueCommand({ SecretId: secretId }));
  if (!result.SecretString) throw new Error("Turnstile secret has no string value");
  const parsed = JSON.parse(result.SecretString) as { api_key: string };
  cachedTurnstileSecret = parsed.api_key;
  return cachedTurnstileSecret;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

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

  if (!isValidContactPayload(payload)) {
    return jsonResponse(400, { error: "Invalid payload" });
  }

  const secret = await getTurnstileSecret();
  const verified = await verifyTurnstileToken(secret, payload.turnstileToken, event.requestContext.http.sourceIp);
  if (!verified) {
    return jsonResponse(403, { error: "Verification failed" });
  }

  await ses.send(
    new SendEmailCommand({
      FromEmailAddress: requireEnv("CONTACT_FROM_ADDRESS"),
      Destination: { ToAddresses: [requireEnv("CONTACT_TO_ADDRESS")] },
      ReplyToAddresses: payload.email ? [payload.email] : undefined,
      Content: {
        Simple: {
          Subject: { Data: "New Pic Perfecto contact form message" },
          Body: {
            Text: {
              Data: [`From: ${payload.email ?? "(no reply address given)"}`, "", payload.message].join("\n"),
            },
          },
        },
      },
    }),
  );

  return jsonResponse(200, { ok: true });
}
