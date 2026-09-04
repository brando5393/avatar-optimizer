const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

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
