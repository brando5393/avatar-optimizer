import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const secretsManager = new SecretsManagerClient({});
const secretCache = new Map<string, string>();

/**
 * Fetches the Turnstile secret key from Secrets Manager, cached per Lambda
 * execution environment (warm invocations reuse it — Secrets Manager is
 * not free, and this value never changes without a redeploy of the widget).
 */
export async function getTurnstileSecret(
  secretId: string,
  client: Pick<SecretsManagerClient, "send"> = secretsManager,
): Promise<string> {
  const cached = secretCache.get(secretId);
  if (cached) return cached;

  const result = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
  if (!result.SecretString) throw new Error("Turnstile secret has no string value");
  const parsed = JSON.parse(result.SecretString) as { api_key: string };
  secretCache.set(secretId, parsed.api_key);
  return parsed.api_key;
}

/**
 * Verifies a Turnstile token server-side. Fails closed: any network error,
 * non-2xx response, or non-JSON body is treated as verification failure.
 */
export async function verifyTurnstileToken(
  secret: string,
  token: string,
  remoteIp: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const response = await fetchImpl(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return false;
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}
