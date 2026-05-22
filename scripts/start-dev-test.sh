#!/usr/bin/env bash
# Beendet alle Prozesse auf Port 3500, dann startet npm run dev:test

set -euo pipefail

PORT=3500

PIDS=$(lsof -ti tcp:$PORT 2>/dev/null || true)

if [ -n "$PIDS" ]; then
  echo "Beende Prozesse auf Port $PORT: $PIDS"
  echo "$PIDS" | xargs kill -9
  sleep 0.5
else
  echo "Port $PORT ist frei."
fi

cd "$(dirname "$0")/.."
exec npm run dev:test
