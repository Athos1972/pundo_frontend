#!/usr/bin/env bash
# Rebuild a video:  video/build.sh <slug> [en|el|...] [--rerecord] [--no-record]
#   steps: tts -> record (only if no recording yet or --rerecord) -> render layers/intro/outro -> compose
# Recording needs the TEST instance (frontend :3500, backend :8500) - never 3000/8000.
set -euo pipefail
cd "$(dirname "$0")"
SLUG="${1:?usage: build.sh <slug> [lang ...] [--rerecord|--no-record]}"; shift || true
LANGS=(); RERECORD=0; NOREC=0
for a in "$@"; do case "$a" in --rerecord) RERECORD=1;; --no-record) NOREC=1;; *) LANGS+=("$a");; esac; done
[ ${#LANGS[@]} -eq 0 ] && LANGS=(en el)
PY=.venv/bin/python
[ -x "$PY" ] || { python3.12 -m venv .venv && .venv/bin/pip install -q edge-tts pyyaml pillow numpy; }
for L in "${LANGS[@]}"; do
  echo "=== $SLUG [$L] ==="
  $PY _branding/tts.py "$SLUG" "$L"
  if [ $NOREC -eq 0 ] && { [ $RERECORD -eq 1 ] || [ ! -f "$SLUG/.cache/$L/rec/frames.json" ]; }; then
    curl -sf -o /dev/null http://localhost:3500 || { echo "Frontend :3500 not running (npm run dev:test)"; exit 1; }
    curl -sf -o /dev/null http://localhost:8500/health || echo "WARN: backend :8500 not answering /health (./scripts/start_test_server.sh in pundo_main_backend)"
    node "$SLUG/record.mjs" "$L"
  fi
  node _branding/render.mjs layers "$SLUG" "$L"
  node _branding/render.mjs intro "$SLUG" "$L"
  node _branding/render.mjs outro "$SLUG" "$L"
  $PY _branding/compose.py "$SLUG" "$L"
done
echo "Output: video/$SLUG/out/"
