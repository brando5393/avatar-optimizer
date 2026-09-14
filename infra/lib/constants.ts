export const DOMAIN_NAME = "picperfecto.com";

// The picperfecto.com hosted zone, registered through Route 53. Shared by
// every stack that needs to add DNS records (SES verification, the site's
// alias records) so they never drift out of sync with each other.
export const HOSTED_ZONE_ID = "Z06376742T1BU4DRI8T25";

// Created out-of-band alongside the Turnstile widget itself — see
// docs/architecture.md and the picperfecto-turnstile-secret-read policy.
// Shared by every Lambda that needs to verify a Turnstile token
// (contact-form, generate-upload-url) so the two stacks can't drift.
export const TURNSTILE_SECRET_ID = "picperfecto/turnstile-secret-key";
export const TURNSTILE_SECRET_READ_POLICY_ARN =
  "arn:aws:iam::899111410433:policy/picperfecto-turnstile-secret-read";
