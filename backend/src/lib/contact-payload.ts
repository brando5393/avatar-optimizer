export const MAX_MESSAGE_LENGTH = 5000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ContactPayload {
  message: string;
  email?: string;
  turnstileToken: string;
  /**
   * CSS honeypot — a field real users never see or fill in (hidden
   * off-screen, aria-hidden, excluded from tab order). Bots that fill every
   * field they find populate it. Any non-empty value here means: accept the
   * request to avoid tipping the bot off, but drop it silently — never send.
   */
  website?: string;
}

/** Validates an untrusted parsed JSON body before it touches SES or Turnstile. */
export function isValidContactPayload(value: unknown): value is ContactPayload {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.message !== "string" ||
    candidate.message.trim().length === 0 ||
    candidate.message.length > MAX_MESSAGE_LENGTH
  ) {
    return false;
  }

  if (typeof candidate.turnstileToken !== "string" || candidate.turnstileToken.length === 0) {
    return false;
  }

  if (
    candidate.email !== undefined &&
    (typeof candidate.email !== "string" || !EMAIL_PATTERN.test(candidate.email))
  ) {
    return false;
  }

  if (candidate.website !== undefined && typeof candidate.website !== "string") {
    return false;
  }

  return true;
}

/** True when the honeypot field was filled in — a near-certain sign of a bot. */
export function isHoneypotFilled(payload: ContactPayload): boolean {
  return typeof payload.website === "string" && payload.website.trim().length > 0;
}
