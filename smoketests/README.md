# Pundo Smoketester

Production smoke-test runner for `pundo.cy` and `naidivse.cy`. Runs after each deployment via GitHub Actions and as a 15-minute Hetzner cron heartbeat.

## Overview

- **Tool:** Playwright (headless Chromium) + TypeScript
- **Scope:** broad & shallow — checks that major sections are alive after deploy
- **Not:** a replacement for `e2e/` (which tests deep journeys against test data)
- **Single Source of Truth:** `manifest.yaml` lists all checks

## Local Run

### Prerequisites

```bash
cd smoketests
npm install
npx playwright install --with-deps chromium
```

### Validate the manifest (no live server needed)

```bash
npm run validate-manifest
```

### Run against a live target

```bash
SMOKETEST_BASE_URL_PUNDO=https://pundo.cy \
SMOKETEST_BASE_URL_NAIDIVSE=https://naidivse.cy \
SMOKETEST_USER=smoketest@pundo.cy \
SMOKETEST_PASSWORD=<secret> \
SMOKETEST_SMTP_HOST=<host> \
SMOKETEST_SMTP_USER=<user> \
SMOKETEST_SMTP_PASSWORD=<pass> \
SMOKETEST_MAIL_TO=bernhard.m.buhl@gmail.com \
npx tsx src/runner.ts
```

### Dry-run (no mail sent, no live server needed)

```bash
SMOKETEST_DRY_RUN=1 \
SMOKETEST_BASE_URL_PUNDO=https://pundo.cy \
npx tsx src/runner.ts
```

### Run stub (T1 acceptance check)

```bash
npx tsx src/runner.ts
# Expected output: "smoketester ok"
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `SMOKETEST_BASE_URL_PUNDO` | yes | — | Base URL for pundo brand |
| `SMOKETEST_BASE_URL_NAIDIVSE` | yes | — | Base URL for naidivse brand |
| `SMOKETEST_USER` | yes (auth phase) | — | Smoketest user email |
| `SMOKETEST_PASSWORD` | yes (auth phase) | — | Smoketest user password |
| `SMOKETEST_SMTP_HOST` | yes | — | SMTP server hostname |
| `SMOKETEST_SMTP_PORT` | no | `587` | SMTP port (587=STARTTLS, 465=TLS) |
| `SMOKETEST_SMTP_USER` | yes | — | SMTP auth username |
| `SMOKETEST_SMTP_PASSWORD` | yes | — | SMTP auth password |
| `SMOKETEST_MAIL_TO` | yes | — | Report recipient email |
| `SMOKETEST_MAIL_FROM` | no | `smoketester@pundo.cy` | Sender address |
| `SMOKETEST_DRY_RUN` | no | — | Set to `1` to skip sending mail |
| `BRAND_FILTER` | no | `both` | `pundo`, `naidivse`, or `both` |
| `GITHUB_SHA` | no | — | Set by CI; shown in report footer |
| `DEPLOY_SHA` | no | — | Commit SHA of deployed version |

## Exit Codes

| Code | Meaning |
|---|---|
| `0` | All checks passed |
| `1` | One or more checks failed |
| `2` | Domain unreachable after 3 retries |

## Architecture

```
smoketests/
├── manifest.yaml             # All checks (Single Source of Truth)
├── manifest.schema.ts        # Zod schema for manifest validation
├── playwright.config.ts      # NO webServer — tests against live domain
├── src/
│   ├── runner.ts             # Entry point: iterates brands × langs × checks
│   ├── assert-engine.ts      # Per-assert-type implementations
│   ├── translations-loader.ts # Reads ../src/lib/translations.ts
│   ├── lang-setup.ts         # Sets app_lang cookie + RTL detection
│   ├── retry.ts              # Exponential backoff helper
│   ├── reporters/
│   │   ├── html-reporter.ts  # HTML report with embedded screenshots
│   │   └── text-reporter.ts  # Plain-text subject + body
│   └── mailer/
│       └── smtp.ts           # nodemailer SMTP transport
└── tests/
    └── manifest.spec.ts      # Vitest: manifest schema validation
```

## GitHub Actions

The workflow `.github/workflows/smoketest.yml` runs:
- On `workflow_dispatch` (manual or triggered by deploy hook)
- On schedule: every 6 hours (`0 */6 * * *`)
- On `repository_dispatch` event `post-deploy` (from Hetzner deploy hook)

### Required GitHub Secrets

```
# Secret: SMOKETEST_USER         — smoketest@pundo.cy
# Secret: SMOKETEST_PASSWORD     — smoketest user password
# Secret: SMOKETEST_SMTP_HOST    — Hetzner SMTP server hostname
# Secret: SMOKETEST_SMTP_USER    — SMTP auth username
# Secret: SMOKETEST_SMTP_PASSWORD — SMTP auth password
# Secret: SMOKETEST_MAIL_TO      — report recipient
# Secret: GITHUB_DEPLOY_TOKEN    — token for repository_dispatch from Hetzner
```

## Hetzner Deploy Hook

Add as the last step in your Hetzner deploy script (after `docker compose up -d`):

```bash
# Trigger GitHub Actions smoketest after successful deploy
curl -X POST \
  -H "Authorization: Bearer $GITHUB_DEPLOY_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/<org>/pundo_frontend/dispatches \
  -d "{\"event_type\":\"post-deploy\",\"client_payload\":{\"sha\":\"$(git rev-parse HEAD)\"}}"
```

### Required Hetzner `.env` entries

```bash
GITHUB_DEPLOY_TOKEN=ghp_...          # GitHub PAT with repo scope (contents:write)
SMOKETEST_USER=smoketest@pundo.cy    # Set on server, also in GitHub Secrets
SMOKETEST_PASSWORD=...               # Set on server, also in GitHub Secrets
```

## Hetzner Heartbeat Cron

The script `scripts/smoketest-heartbeat.sh` (in the repo root `scripts/`) performs
a lightweight HTTP-200 check for the top 5 paths on both brands. No browser — pure curl.

Add to crontab on the Hetzner server:

```cron
*/15 * * * * /opt/pundo/smoketest-heartbeat.sh >> /var/log/smoketest-heartbeat.log 2>&1
```

Required env on the server (set in `/etc/environment` or sourced before cron):

```bash
SMOKETEST_SMTP_HOST=...
SMOKETEST_SMTP_USER=...
SMOKETEST_SMTP_PASSWORD=...
SMOKETEST_MAIL_TO=bernhard.m.buhl@gmail.com
```

## Manifest Coverage Lint

The CI job `manifest-coverage` (in `smoketest.yml`) compares customer routes in
`src/app/(customer)/` against paths in `manifest.yaml`. Missing routes produce a
**warning** PR comment — not a hard fail (some routes are intentionally not smokeable).

## Scope Sync with e2e-tester

`manifest.yaml` is the Single Source of Truth for smoketest scope.

When the e2e-tester agent adds a new customer journey that touches a top-level route
(`src/app/(customer)/**/page.tsx`), it checks whether the route has a manifest entry
and proposes one if not. See `e2e/journeys/CATALOG.md` for the coverage table.

Criterion: "Would failure of this section be noticed by a real user within 24 hours?"
