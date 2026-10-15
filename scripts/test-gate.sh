#!/usr/bin/env bash
# F8950 T34: Test-Lanes und Push-Gate fuer das Frontend.
#
#   scripts/test-gate.sh fast      tsc, eslint, lint:i18n, Vitest (ca. 20 s)
#   scripts/test-gate.sh commit    lint:i18n + Vitest (manuell vor einem Commit; kein pre-commit-Hook)
#   scripts/test-gate.sh smoke     Playwright-Projekt smoke (ca. 1 min); wird auch vom Backend-Push-Gate gerufen (A5)
#   scripts/test-gate.sh push      Pre-Push-Gate: fast + Playwright voll (smoke, dann full; ca. 2 min) + npm audit + gitleaks (falls installiert)
#   scripts/test-gate.sh nightly   wie push, aber Playwright mit --repeat-each=2 --retries=0 (AK5)
#
# push/nightly/smoke nehmen den gemeinsamen Lauf-Lock (scripts/gate-lib.sh, gilt fuer beide Repos), pruefen vorher
# PostgreSQL (fail-closed) und warten nicht ewig. Der Playwright-Global-Setup startet das Test-Backend 8500 selbst
# neu (BACKEND_REPO, Default ../pundo_main_backend) und der webServer startet/baut das Frontend auf 3500 (ein Rebuild
# kostet ca. 3 min, deshalb die grossen Timeouts). Nach jedem Lauf: .claude/playbooks/state/test-gate.last_run.
# Aufruf aus dem Pre-Push-Hook: .githooks/pre-push. Umgehen nur mit `git push --no-verify` und dokumentiertem Grund
# (docs/e2e-testing.md, Abschnitt "Gates und Hooks").
#
# Umgebung: GATE_LOCK_WAIT=<s> (Default 0), GATE_BUSY_WAIT=<s> (Default 90), GATE_LOG_DIR, GATE_FORCE=1
# (Push-Gate trotz gruenem Lauf fuer denselben Commit), PUNDO_GATE_LOCK_OWNER (vom Eltern-Gate gesetzt).
# gitleaks ist optional (brew install gitleaks); ohne Installation wird der Schritt uebersprungen und gemeldet.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "$ROOT/scripts/gate-lib.sh"

LANE="${1:-}"
[ "$#" -gt 0 ] && shift
BACKEND_REPO="${BACKEND_REPO:-$(cd "$ROOT/.." && pwd)/pundo_main_backend}"

[ -d node_modules ] || gate_die 4 "node_modules fehlt. Einrichten: npm ci"

run_tsc() { npx tsc --noEmit; }
run_eslint() { npm run lint; }
run_i18n() { npm run lint:i18n; }
run_vitest() { npx vitest run; }
run_audit() { npm audit --omit=dev --audit-level=high; }  # wie .github/workflows/security.yml (Job npm-audit)
run_gitleaks() { gitleaks detect --no-banner --redact; }   # wie der CI-Job gitleaks (Verlauf)

step_static() {
  gate_step tsc 300 run_tsc || return 1
  gate_step eslint 600 run_eslint || return 1
  gate_step lint-i18n 120 run_i18n || return 1
  gate_step vitest 600 run_vitest || return 1
}

step_security() {
  local ok=0
  if ! gate_step npm-audit 180 run_audit; then
    grep -qiE 'ENOTFOUND|network|EAI_AGAIN|ETIMEDOUT|audit endpoint' "$GATE_RUN_DIR/npm-audit.log" 2>/dev/null \
      && gate_say "Hinweis: npm audit braucht Netz. Offline? Das Gate bricht bewusst ab (fail-closed)."
    ok=1
  fi
  if command -v gitleaks >/dev/null 2>&1; then
    gate_step gitleaks 300 run_gitleaks || ok=1
  else
    gate_skip gitleaks "nicht installiert (brew install gitleaks); die CI scannt weiterhin"
  fi
  return "$ok"
}

# Playwright braucht Backend-Repo (Global Setup) und freie Test-Umgebung.
playwright_preflight() {
  [ -x "$BACKEND_REPO/scripts/start_test_server.sh" ] || gate_die 4 "Backend-Repo nicht gefunden ($BACKEND_REPO; BACKEND_REPO setzen)."
  [ -x "$BACKEND_REPO/.venv/bin/uvicorn" ] || gate_die 4 "$BACKEND_REPO/.venv fehlt (uv sync --all-extras --all-groups)."
  gate_preflight_db "$BACKEND_REPO"
  gate_wait_idle both
  gate_say "Playwright: Global Setup startet 8500 neu, webServer baut/startet 3500 (Rebuild ca. 3 min). Nur Test-Ports 3500/8500."
}

finish() {
  local rc=$1 result=pass
  [ "$rc" = 0 ] || result=fail
  gate_write_last_run "$ROOT" "$result"
  if [ "$rc" = 0 ]; then
    gate_say "GRUEN: Lane $GATE_LANE (${SECONDS}s). Nachweis: .claude/playbooks/state/test-gate.last_run"
  else
    gate_say "ROT: Lane $GATE_LANE. Logs: $GATE_RUN_DIR"
  fi
  exit "$rc"
}

case "$LANE" in
  fast)
    gate_init frontend fast
    step_static || finish 1
    finish 0
    ;;
  commit)
    gate_init frontend commit
    gate_step lint-i18n 120 run_i18n || finish 1
    gate_step vitest 600 run_vitest || finish 1
    finish 0
    ;;
  smoke)
    gate_init frontend smoke
    gate_lock_acquire
    playwright_preflight
    gate_step playwright-smoke 1000 npx playwright test --project=smoke || finish 1
    finish 0
    ;;
  push)
    sha="${GATE_PUSHED_SHA:-}"
    if [ -n "$sha" ] && [ "${GATE_FORCE:-0}" != "1" ] && gate_last_run_fresh "$ROOT" push "$sha" 21600; then
      gate_say "fuer Commit ${sha:0:10} lief das Push-Gate bereits gruen (< 6 h, Arbeitsbaum sauber): uebersprungen. GATE_FORCE=1 erzwingt einen neuen Lauf."
      exit 0
    fi
    gate_init frontend push
    gate_say "Pre-Push-Gate (Frontend): tsc, eslint, lint:i18n, vitest, Playwright voll, npm audit. Der Lauf testet den ARBEITSBAUM, nicht nur den gepushten Commit."
    gate_lock_acquire
    playwright_preflight
    step_static || finish 1
    gate_step playwright-full 1500 npx playwright test || finish 1
    step_security || finish 1
    finish 0
    ;;
  nightly)
    gate_init frontend nightly
    gate_lock_acquire
    playwright_preflight
    step_static || true
    gate_step playwright-repeat2 2400 npx playwright test --repeat-each=2 --retries=0 || true
    step_security || true
    finish "$GATE_FAILED"
    ;;
  *)
    echo "usage: $0 fast|commit|smoke|push|nightly" >&2
    exit 2
    ;;
esac
