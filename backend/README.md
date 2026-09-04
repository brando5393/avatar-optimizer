# backend

Lambda handlers for Pic Perfecto: presigned-upload issuance, the S3-triggered
processing worker (Rekognition moderation gate → `sharp` resize/filter
fan-out), and session/recovery-code lookup.

## Layout

```
src/
  lib/        Pure, unit-tested logic (session tokens, validation, etc.)
  handlers/   Lambda entry points — thin, wire lib/ to AWS SDK calls
test/
```

Only `src/lib/session-token.ts` exists so far (the recovery-code generator/
validator). Handlers land here once the upload/processing/moderation flow is
implemented — each gets its own least-privilege IAM role defined in
`infra/`.

## Commands

```bash
npm test
npm run lint   # tsc --noEmit
npm run build
```
