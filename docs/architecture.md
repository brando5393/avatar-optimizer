# Architecture

## What this is

Pic Perfecto lets someone upload one or more photos and get back a set of
optimized variants — the exact dimensions/crops used by Facebook, Discord,
Xbox, Snapchat, etc. — plus a handful of filters (black & white, sepia/CPA
tones, and more to be defined). No accounts. Each batch gets a short,
random recovery code so the person can come back and finish downloading
before the batch expires.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | SvelteKit, static adapter, Tailwind | Lightweight, matches prior portfolio direction, fine as a pure CDN-hosted SPA — no personalization beyond the recovery code |
| Hosting | S3 + CloudFront | Cheap, fast, scales to zero |
| Upload | Browser → S3 via presigned POST | Image bytes never transit our API; keeps upload fast and our compute cheap |
| Processing | S3 event → SQS → Lambda (Node, `sharp`/libvips, arm64) | Fan-out per preset × per filter; async so upload response stays fast |
| Moderation | AWS Rekognition `DetectModerationLabels`, gates every original before it's processed or persisted | See "Content moderation" below — non-negotiable for an anonymous public upload service |
| Data | DynamoDB (session/batch records, TTL attribute) | Serverless, pairs with Lambda, TTL mirrors the S3 lifecycle expiry |
| Storage | S3 (`uploads/`, `outputs/`), private, OAC-only via CloudFront, 72h lifecycle expiry | See "Retention" below |
| Edge/security | CloudFront + AWS WAF (managed rule groups + rate-based rules) | In front of both the static site and the API |
| Bot gating | Cloudflare Turnstile, dedicated widget (sitekey `0x4AAAAAAEmkybB8q61nQbu0`) | Public no-auth upload endpoint needs abuse resistance beyond WAF alone |
| IaC | AWS CDK, TypeScript | Matches account convention; CDK Assertions give us infra-level tests |
| CI | GitHub Actions | Lint + unit + CDK assertion + Playwright/axe, all green before merge |

## Decisions locked in (2026-09-03/04)

- **Content moderation: Rekognition gate.** Every uploaded original is
  screened by `DetectModerationLabels` before it is stored or processed.
  Flagged images are rejected. This is the single biggest legal/reputational
  risk of a public anonymous image-host, so it is not deferred to a later
  phase.
- **Frontend: SvelteKit.**
- **Bot gating: Cloudflare Turnstile**, in addition to WAF rate-based rules.
  A dedicated widget was provisioned for this project (not shared with the
  brandontwilliams-info site's widget).
- **Retention TTL: 72 hours.** Originals, outputs, and the DynamoDB session
  record all expire together (S3 Lifecycle rule + DynamoDB TTL attribute on
  the same duration). Long enough that someone can come back in a day or two
  and finish downloading; short enough that this doesn't become a long-term
  photo host.

## Security model

- **Uploads never touch our compute directly.** Presigned S3 POST, with the
  size/content-type constraints enforced in the presigned policy itself, not
  just in application code.
- **Server-side file validation**: magic-byte / real image-header checks
  (not just extension or client-reported MIME type) before any processing.
- **Session tokens are opaque, high-entropy, and unguessable** — never a
  sequential ID, never the literal S3 key. The recovery-code lookup endpoint
  is rate-limited to prevent enumeration.
- **All downloads are short-lived presigned GET URLs.** No object in either
  bucket is ever public; both buckets have Block Public Access on and are
  only reachable via CloudFront Origin Access Control.
- **Least-privilege IAM per Lambda function** — separate roles for the
  upload-URL generator, the processing worker, and the session-lookup
  handler; no function gets more than it needs.
- **CORS locked to picperfecto.com.**
- **Secrets never touch app config in plaintext.** The Turnstile secret key
  lives in AWS Secrets Manager (`picperfecto/turnstile-secret-key`),
  encrypted with a dedicated KMS key (`alias/picperfecto-secrets`), resolved
  at runtime — never embedded in a Lambda's environment variables as
  plaintext, never logged.
- **CloudTrail already covers this project** — the account's existing
  multi-region trail logs all management events, so Secrets Manager/KMS/IAM
  access on this project's resources is audited without additional setup.

## Accessibility

WCAG 2.1 AA target:
- Full keyboard support for the before/after comparison UI.
- `aria-live` regions for async upload/processing status.
- Focus management on dynamic filter previews.
- Reduced-motion support.
- Contrast-compliant UI chrome (independent of whatever the user's photo
  looks like).
- Automated checks via axe-core in the Playwright suite — not just manual
  spot checks.

## Cost & AWS account conventions

Every resource for this project is tagged `Project=picperfecto`. That tag:

- Populates the `picperfecto-optimizer` Resource Group (one-click view of
  everything this project owns).
- Is an active Cost Explorer cost-allocation tag, so spend is visible
  per-project, not just account-wide.
- Drives `picperfecto-monthly-budget` ($20/mo, alerts at 50%/80%/100% actual
  and 100% forecasted, emailing the account owner).

This is also the teardown mechanism: `Project=picperfecto` is the complete,
authoritative list of what this app owns in AWS. Tearing down or pausing the
project means acting on everything tagged that way — no separate manifest to
maintain.

Rough cost estimate at portfolio-level traffic (~200 sessions/month): ~$10–15/mo,
dominated by the WAF Web ACL's flat monthly fee. See git history / prior
conversation for the itemized breakdown; treat it as planning-grade, not a
quote — actual cost is traffic-driven and the budget alarm is the real
backstop.

## Known risks / open items

- **Filter/lens list** (the specific "CPA tones" etc.) is a product decision
  still needed before the processing pipeline can be finalized.
- **Pixel-exact testing of filters is impractical** — perceptual diffing
  (e.g. pixelmatch) with a tolerance threshold is the plan, not byte-exact
  fixture comparison.
- **Lambda cold starts** with a `sharp` layer/container could work against
  the "fast" goal — provisioned concurrency or a Fargate fallback are the
  mitigations if this becomes a real problem.
- **Anonymous public storage is a cost-DoS vector** — the WAF rate limiting,
  Turnstile gate, and budget alarm are the layered mitigations; none of them
  alone is sufficient.
