# Pic Perfecto

Upload one or more photos, get them optimized for the sizes and crops used by
Facebook, Discord, Xbox, Snapchat and friends, run through a set of filters
(black & white, sepia/CPA tones, etc.), and download the results — no account
required. Each batch gets a recovery code so you can come back and finish
downloading within the retention window.

Hosted at [picperfecto.com](https://picperfecto.com) on AWS.

## Status

Early scaffolding. See [`docs/architecture.md`](docs/architecture.md) for the
full design, decisions, and rationale.

## Repo layout

```
infra/      AWS CDK app (TypeScript) — all infrastructure as code
backend/    Lambda handlers (upload, processing, session lookup)
frontend/   SvelteKit app (static, CDN-hosted)
docs/       Architecture and decision records
```

## Development

This repo is documentation-first and test-driven: every change ships with
tests, and CI must be green before merge — see `.github/workflows/ci.yml`.

```bash
npm install
npm run lint
npm test
```

Each workspace (`infra`, `backend`, `frontend`) has its own `package.json`
with workspace-specific scripts; see each directory's README for details.
