#!/usr/bin/env bash
# Rebuild a video:  video/build.sh <slug> [en|el|...] [--rerecord] [--no-record]
#   steps: tts -> record (only if no recording yet or --rerecord) -> render layers/intro/outro -> compose
# Recording needs the TEST instance (frontend :3500, backend :8500) - never 3000/8000.
set -euo pipefail
cd "$(dirname "$0")"
SLUG="${1:?usage: build.sh <slug> [lang ...] [--rerecord|--no-record]}"; shift || true
LANGS=(); RERECORD=0; NOREC=0
for a in "$@"; do case "$a" in --rerecord) RERECORD=1;; --no-record) NOREC=1;; *) LANGS+=("$a");; esac; done
PY=.venv/bin/python
[ -x "$PY" ] || { python3.12 -m venv .venv && .venv/bin/pip install -q edge-tts pyyaml pillow numpy; }
# scenes.yml helper: meta.<key> (voice_langs -> "en", format -> "desktop"); empty if unset
meta() { $PY -c "import sys,yaml;m=(yaml.safe_load(open('$SLUG/scenes.yml')).get('meta') or {}).get('$1');print(' '.join(m) if isinstance(m,list) else (m or ''))"; }
# Default languages: meta.voice_langs (subtitle-only languages such as EL are produced with the voiced one), else en el
[ ${#LANGS[@]} -eq 0 ] && read -r -a LANGS <<< "$(meta voice_langs)"
[ ${#LANGS[@]} -eq 0 ] && LANGS=(en el)
FORMAT="$(meta format)"
for L in "${LANGS[@]}"; do
  echo "=== $SLUG [$L] ==="
  $PY _branding/tts.py "$SLUG" "$L"
  if [ $NOREC -eq 0 ] && { [ $RERECORD -eq 1 ] || [ ! -f "$SLUG/.cache/$L/rec/frames.json" ]; }; then
    curl -sf -o /dev/null http://localhost:3500 || { echo "Frontend :3500 not running (npm run dev:test)"; exit 1; }
    if curl -sf -o /dev/null http://localhost:8500/health; then :
    elif [[ "$SLUG" == team-* ]]; then echo "ABORT: team videos need the test backend :8500 (/health) - ./scripts/start_test_server.sh in pundo_main_backend"; exit 1
    else echo "WARN: backend :8500 not answering /health (./scripts/start_test_server.sh in pundo_main_backend)"; fi
    node "$SLUG/record.mjs" "$L"
  fi
  node _branding/render.mjs layers "$SLUG" "$L"
  node _branding/render.mjs intro "$SLUG" "$L"
  node _branding/render.mjs outro "$SLUG" "$L"
  $PY _branding/compose.py "$SLUG" "$L"
  # desktop videos: output check (resolution, duration, SRTs, chapters >= 10 s); non-zero exit aborts the build
  [ "$FORMAT" = "desktop" ] && $PY _branding/verify_output.py "$SLUG" "$L"
done
echo "Output: video/$SLUG/out/"
