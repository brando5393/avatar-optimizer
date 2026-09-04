export const DOMAIN_NAME = "picperfecto.com";

// Created out-of-band alongside the Turnstile widget itself — see
// docs/architecture.md and the picperfecto-turnstile-secret-read policy.
// Shared by every Lambda that needs to verify a Turnstile token
// (contact-form, generate-upload-url) so the two stacks can't drift.
export const TURNSTILE_SECRET_ID = "picperfecto/turnstile-secret-key";
export const TURNSTILE_SECRET_READ_POLICY_ARN =
  "arn:aws:iam::899111410433:policy/picperfecto-turnstile-secret-read";
