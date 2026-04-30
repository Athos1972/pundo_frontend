#!/usr/bin/env bash
# smoketest-heartbeat.sh — Lightweight HTTP-200 heartbeat check
#
# Checks top-5 paths on both pundo.cy and naidivse.cy.
# Runs every 15 minutes via cron on the Hetzner server.
# On failure: sends alert mail via SMTP.
#
# Cron entry (add to crontab on Hetzner server):
#   */15 * * * * /opt/pundo/smoketest-heartbeat.sh >> /var/log/smoketest-heartbeat.log 2>&1
#
# Required environment variables (set in /etc/environment or sourced before cron):
#   SMOKETEST_SMTP_HOST       — SMTP server hostname
#   SMOKETEST_SMTP_USER       — SMTP auth username
#   SMOKETEST_SMTP_PASSWORD   — SMTP auth password
#   SMOKETEST_MAIL_TO         — recipient email (default: bernhard.m.buhl@gmail.com)
#   SMOKETEST_MAIL_FROM       — sender email (default: heartbeat@pundo.cy)
#
# Secrets are NEVER hardcoded — always read from environment.
set -euo pipefail

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
BRANDS=("pundo.cy" "naidivse.cy")
PATHS=("/" "/shops" "/search" "/guides" "/de/guides")
MAX_TIME=10
UA="pundo-smoketester-heartbeat/1.0 (+https://github.com/pundo-cy/pundo_frontend/tree/main/scripts)"
HEADER_SMOKETEST="X-Smoketest: 1"

MAIL_TO="${SMOKETEST_MAIL_TO:-bernhard.m.buhl@gmail.com}"
MAIL_FROM="${SMOKETEST_MAIL_FROM:-heartbeat@pundo.cy}"
SMTP_HOST="${SMOKETEST_SMTP_HOST:-}"
SMTP_USER="${SMOKETEST_SMTP_USER:-}"
SMTP_PASS="${SMOKETEST_SMTP_PASSWORD:-}"

TIMESTAMP=$(date -u '+%Y-%m-%d %H:%M UTC')
SCRIPT_NAME=$(basename "$0")

# ---------------------------------------------------------------------------
# Check each path
# ---------------------------------------------------------------------------
FAILS=()
PASS_COUNT=0

echo "[$TIMESTAMP] $SCRIPT_NAME — starting heartbeat check"

for brand in "${BRANDS[@]}"; do
  for path in "${PATHS[@]}"; do
    url="https://${brand}${path}"
    http_code=$(curl -sS -o /dev/null -w '%{http_code}' \
      -H "$HEADER_SMOKETEST" \
      -H "User-Agent: $UA" \
      --max-time "$MAX_TIME" \
      --retry 1 \
      --retry-delay 2 \
      "$url" 2>/dev/null || echo "000")

    if [[ "$http_code" =~ ^(200|301|302)$ ]]; then
      echo "  OK    $http_code  $url"
      (( PASS_COUNT++ )) || true
    else
      echo "  FAIL  $http_code  $url"
      FAILS+=("${brand}${path}=${http_code}")
    fi
  done
done

TOTAL=$(( ${#BRANDS[@]} * ${#PATHS[@]} ))
echo "[$TIMESTAMP] Results: $PASS_COUNT/$TOTAL OK, ${#FAILS[@]} failed"

# ---------------------------------------------------------------------------
# Send alert mail on failure
# ---------------------------------------------------------------------------
if (( ${#FAILS[@]} > 0 )); then
  FAIL_LIST=$(printf '  - %s\n' "${FAILS[@]}")
  SUBJECT="[HEARTBEAT FAIL] pundo.cy ${TIMESTAMP} — ${#FAILS[@]} paths down"
  BODY="Pundo Heartbeat Alert
=====================

Timestamp: $TIMESTAMP
Failed paths (${#FAILS[@]}):
$FAIL_LIST

OK: $PASS_COUNT / $TOTAL

---
pundo-smoketester-heartbeat/1.0
Cron: every 15 minutes on Hetzner server"

  echo "[$TIMESTAMP] Sending alert to $MAIL_TO"

  if [[ -z "$SMTP_HOST" || -z "$SMTP_USER" || -z "$SMTP_PASS" ]]; then
    echo "[$TIMESTAMP] ERROR: SMTP credentials not set — cannot send alert mail"
    echo "[$TIMESTAMP] Set SMOKETEST_SMTP_HOST, SMOKETEST_SMTP_USER, SMOKETEST_SMTP_PASSWORD"
    exit 1
  fi

  # Send via curl SMTP (no browser / Node.js required on heartbeat host)
  curl --silent --show-error \
    --url "smtp://${SMTP_HOST}:587" \
    --ssl-reqd \
    --user "${SMTP_USER}:${SMTP_PASS}" \
    --mail-from "$MAIL_FROM" \
    --mail-rcpt "$MAIL_TO" \
    -H "User-Agent: $UA" \
    -T <(printf "From: Pundo Heartbeat <%s>\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n%s" \
      "$MAIL_FROM" "$MAIL_TO" "$SUBJECT" "$BODY") \
    && echo "[$TIMESTAMP] Alert sent" \
    || echo "[$TIMESTAMP] WARNING: Failed to send alert mail"
fi

exit 0
