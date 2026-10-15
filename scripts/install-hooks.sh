#!/usr/bin/env bash
# F8950 T34: aktiviert die versionierten Git-Hooks (.githooks/) fuer diesen Klon. Idempotent.
set -euo pipefail
cd "$(dirname "$0")/.."
git config core.hooksPath .githooks
echo "core.hooksPath = $(git config core.hooksPath)  (Pre-Push-Gate aktiv; deaktivieren: git config --unset core.hooksPath)"
