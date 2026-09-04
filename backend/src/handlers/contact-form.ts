import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { isHoneypotFilled, isValidContactPayload } from "../lib/contact-payload";
import { checkRateLimit } from "../lib/rate-limit";
import { getTurnstileSecret, verifyTurnstileToken } from "../lib/turnstile";

const ses = new SESv2Client({});

const RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW_SECONDS = 10 * 60;

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

  const sourceIp = event.requestContext.http.sourceIp;
  const rateLimit = await checkRateLimit({
    tableName: requireEnv("RATE_LIMIT_TABLE"),
    identifier: sourceIp,
    scope: "contact-form",
    limit: RATE_LIMIT,
    windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
  });
  if (!rateLimit.allowed) {
    return jsonResponse(429, { error: "Too many requests. Please try again later." });
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

  // Bot filled the honeypot: pretend success (don't tip it off) and drop
  // the message without touching Turnstile or SES.
  if (isHoneypotFilled(payload)) {
    return jsonResponse(200, { ok: true });
  }

  const secret = await getTurnstileSecret(requireEnv("TURNSTILE_SECRET_ID"));
  const verified = await verifyTurnstileToken(secret, payload.turnstileToken, sourceIp);
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
