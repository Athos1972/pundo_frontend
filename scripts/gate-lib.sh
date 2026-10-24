#!/usr/bin/env bash
# F8950 T34: gemeinsame Helfer fuer scripts/test-gate.sh und scripts/nightly.sh (wird gesourced).
# Es gibt eine inhaltsgleiche Kopie in pundo_frontend/scripts/gate-lib.sh (zwei Repos, kein gemeinsamer
# Code-Ort): Aenderungen immer in BEIDEN Repos nachziehen.
#
#   Lock     ein Lock fuer beide Repos und die Nightly (~/Library/Caches/pundo-test-gate/lock.d), weil alle
#            Laeufe pundo_test und die Ports 3500/8500 teilen. Verwaiste Locks (toter Prozess) werden uebernommen.
#   Timeout  gate_timeout killt die ganze Prozessgruppe (kein haengender Hook).
#   Steps    gate_step schreibt pro Schritt ein Log und gibt eine Zeile aus; bei Fehler die letzten Zeilen.
#   last_run .claude/playbooks/state/test-gate.last_run (+ .<lane>.last_run), gitignored, nur Nachweis.
#
# bash 3.2 kompatibel (macOS /bin/bash).

# Hooks setzen GIT_DIR & Co. fuer das Repo, das pusht; das wuerde git-Aufrufe im anderen Repo (Frontend-Smoke)
# umlenken.
unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_PREFIX

export PATH="$HOME/.local/bin:/opt/homebrew/bin:/opt/homebrew/opt/libpq/bin:/usr/local/bin:$PATH"

if [ -n "${PUNDO_SLOT:-}" ]; then
  case "$PUNDO_SLOT" in 1|2|3|4) ;; *) echo "gate: ABBRUCH: PUNDO_SLOT muss 1 bis 4 sein." >&2; exit 4;; esac
  [ -n "${PUNDO_SLOT_MANIFEST:-}" ] && [ -n "${PUNDO_SLOT_TOKEN:-}" ] || { echo "gate: ABBRUCH: Slot braucht Manifest und Token." >&2; exit 4; }
  GATE_STATE_DIR="${GATE_STATE_DIR:-$HOME/.pundo/worktree-env/locks/slot-$PUNDO_SLOT/gate}"
else
  GATE_STATE_DIR="${GATE_STATE_DIR:-$HOME/Library/Caches/pundo-test-gate}"
fi
GATE_LOCK_DIR="$GATE_STATE_DIR/lock.d"
GATE_LOCK_MINE=0
GATE_CHILD_PGID=""
GATE_STEPS=""
GATE_FAILED=0

gate_say() { printf 'gate: %s\n' "$*" >&2; }
gate_die() { local rc=$1; shift; printf 'gate: ABBRUCH: %s\n' "$*" >&2; exit "$rc"; }

# ---- Lauf-Verzeichnis, Logs ------------------------------------------------------------------------------
# gate_init <repo-name> <lane>
gate_init() {
  GATE_REPO_NAME="$1"; GATE_LANE="$2"
  GATE_T0=$SECONDS
  GATE_STARTED="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  local base="${GATE_LOG_DIR:-$HOME/Library/Logs/pundo-test-gate}"
  GATE_RUN_DIR="$base/$(date +%Y%m%d-%H%M%S)-$GATE_REPO_NAME-$GATE_LANE"
  mkdir -p "$GATE_RUN_DIR"
  # Alte Laufverzeichnisse (> 14 Tage) wegraeumen; nur eigene Namensmuster.
  find "$base" -maxdepth 1 -type d -name '2*-*-*-*' -mtime +14 -exec rm -rf {} + 2>/dev/null || true
  trap gate_on_exit EXIT
  trap 'gate_on_signal INT' INT
  trap 'gate_on_signal TERM' TERM
}

gate_on_signal() {
  gate_say "Signal $1: breche ab."
  if [ -n "$GATE_CHILD_PGID" ]; then kill -TERM -- "-$GATE_CHILD_PGID" 2>/dev/null || true; fi
  exit 130
}

gate_on_exit() {
  local rc=$?
  gate_lock_release
  return $rc
}

# ---- Lock ------------------------------------------------------------------------------------------------
# gate_lock_acquire: wartet max. GATE_LOCK_WAIT Sekunden (Default 0 = sofort abbrechen).
# Hat ein Elternprozess (Backend-Push ruft Frontend-Smoke, Nightly ruft beide Repos) den Lock schon,
# steht seine PID in PUNDO_GATE_LOCK_OWNER und wir laufen unter seinem Lock weiter.
gate_lock_acquire() {
  if [ -n "${PUNDO_GATE_LOCK_OWNER:-}" ] && kill -0 "$PUNDO_GATE_LOCK_OWNER" 2>/dev/null; then
    return 0
  fi
  mkdir -p "$GATE_STATE_DIR"
  local waited=0 wait_max="${GATE_LOCK_WAIT:-0}" owner info
  while ! mkdir "$GATE_LOCK_DIR" 2>/dev/null; do
    owner="$(awk 'NR==1{print $1}' "$GATE_LOCK_DIR/info" 2>/dev/null || true)"
    if [ -z "$owner" ] || ! kill -0 "$owner" 2>/dev/null; then
      gate_say "verwaister Lock (PID ${owner:-?}) wird uebernommen."
      rm -rf "$GATE_LOCK_DIR"
      continue
    fi
    if [ "$waited" -ge "$wait_max" ]; then
      info="$(sed -n '2p' "$GATE_LOCK_DIR/info" 2>/dev/null || true)"
      gate_die 3 "Es laeuft bereits ein Gate/Nightly (PID $owner, ${info:-?}).
  Beide Repos teilen pundo_test und die Ports 3500/8500; gleichzeitige Laeufe zerstoeren sich gegenseitig.
  Warten und erneut pushen (oder GATE_LOCK_WAIT=<sek> setzen). Notausgang nur mit Begruendung: git push --no-verify."
    fi
    sleep 5; waited=$((waited + 5))
  done
  printf '%s\n%s %s seit %s\n' "$$" "$GATE_REPO_NAME" "$GATE_LANE" "$GATE_STARTED" > "$GATE_LOCK_DIR/info"
  GATE_LOCK_MINE=1
  export PUNDO_GATE_LOCK_OWNER=$$
}

gate_lock_release() {
  if [ "$GATE_LOCK_MINE" = "1" ]; then
    rm -rf "$GATE_LOCK_DIR"
    GATE_LOCK_MINE=0
  fi
}

# ---- Konfliktprozesse ------------------------------------------------------------------------------------
# gate_wait_idle <what>: what = playwright | pytest | both. Wartet bis GATE_BUSY_WAIT s (Default 90), dann Abbruch.
gate_busy_pids() {
  [ -n "${PUNDO_SLOT:-}" ] && return 0
  local what="$1" out=""
  if [ "$what" = playwright ] || [ "$what" = both ]; then
    out="$out $(pgrep -f '[n]ode .*playwright test' 2>/dev/null | tr '\n' ' ')"
  fi
  if [ "$what" = pytest ] || [ "$what" = both ]; then
    out="$out $(pgrep -f '[p]ython.* -m pytest' 2>/dev/null | tr '\n' ' ')"
  fi
  echo "$out" | tr -s ' ' | sed 's/^ //; s/ $//'
}

gate_wait_idle() {
  local what="$1" waited=0 max="${GATE_BUSY_WAIT:-90}" pids
  [ "${GATE_ALLOW_PLAYWRIGHT:-0}" = "1" ] && return 0
  while :; do
    pids="$(gate_busy_pids "$what")"
    [ -z "$pids" ] && return 0
    if [ "$waited" -ge "$max" ]; then
      gate_die 3 "Es laeuft ein Test-Prozess ($what, PID $pids), der pundo_test teilt. Nach ${max}s aufgegeben.
  Beenden/abwarten und erneut starten. Notausgang nur mit Begruendung: git push --no-verify."
    fi
    [ "$waited" = 0 ] && gate_say "warte auf laufende Test-Prozesse ($what, PID $pids) ..."
    sleep 5; waited=$((waited + 5))
  done
}

# ---- Preflight -------------------------------------------------------------------------------------------
# gate_preflight_db <backend-repo>: PostgreSQL aus DATABASE_URL_TEST (.env) per TCP pruefen (fail-closed, 3 s).
gate_preflight_db() {
  if [ -n "${PUNDO_SLOT:-}" ] && [ -n "${PUNDO_PRODCOPY_DATABASE_URL:-}" ]; then
    local slot_hp
    slot_hp="$(printf '%s' "$PUNDO_PRODCOPY_DATABASE_URL" | sed -E 's#^[^@]*@([^:/]+):?([0-9]*)/.*#\1 \2#')"
    local slot_host="${slot_hp%% *}" slot_port="${slot_hp##* }"
    [ "$slot_port" = "$slot_host" ] || [ -z "$slot_port" ] && slot_port=5432
    nc -z -w 3 "$slot_host" "$slot_port" >/dev/null 2>&1 || gate_die 4 "PostgreSQL für Slot $PUNDO_SLOT nicht erreichbar."
    return 0
  fi
  local envf="$1/.env" hp host port
  [ -f "$envf" ] || gate_die 4 "$envf fehlt (DATABASE_URL_TEST wird fuer die Test-DB gebraucht)."
  hp="$(grep -E '^DATABASE_URL_TEST=' "$envf" | head -1 | sed -E 's#^[^@]*@([^:/]+):?([0-9]*)/.*#\1 \2#')"
  host="${hp%% *}"; port="${hp##* }"
  [ -n "$host" ] || gate_die 4 "DATABASE_URL_TEST in $envf nicht lesbar."
  [ "$port" = "$host" ] || [ -z "$port" ] && port=5432
  if ! nc -z -w 3 "$host" "$port" >/dev/null 2>&1; then
    gate_die 4 "PostgreSQL $host:$port nicht erreichbar (Test-DB pundo_test).
  Container starten (docker start pundo_postgres) und erneut versuchen. Das Gate bricht bewusst ab (fail-closed)."
  fi
}

# ---- Timeout, Schritte -----------------------------------------------------------------------------------
# gate_timeout <sek> <cmd...>: Rueckgabe 124 bei Timeout (Prozessgruppe wird beendet).
gate_timeout() {
  local secs="$1"; shift
  local flag; flag="$(mktemp "${TMPDIR:-/tmp}/gate-timeout.XXXXXX")"; rm -f "$flag"
  set -m
  "$@" </dev/null &
  local pid=$!
  set +m
  GATE_CHILD_PGID=$pid
  (
    trap 'kill "$sp" 2>/dev/null; exit 0' TERM
    sleep "$secs" & sp=$!
    wait "$sp" || exit 0
    : > "$flag"; kill -TERM -- "-$pid" 2>/dev/null
    sleep 5 & sp=$!; wait "$sp"; kill -KILL -- "-$pid" 2>/dev/null
  ) >/dev/null 2>&1 &
  local wd=$! rc=0
  wait "$pid" || rc=$?
  kill "$wd" 2>/dev/null || true
  wait "$wd" 2>/dev/null || true
  GATE_CHILD_PGID=""
  if [ -e "$flag" ]; then rm -f "$flag"; return 124; fi
  return "$rc"
}

# gate_step <name> <timeout-sek> <cmd...>: Log nach $GATE_RUN_DIR/<name>.log.
gate_step() {
  local name="$1" secs="$2"; shift 2
  local log="$GATE_RUN_DIR/$name.log" t=$SECONDS rc=0
  gate_say "> $name ..."
  gate_timeout "$secs" "$@" >"$log" 2>&1 || rc=$?
  local dur=$((SECONDS - t))
  if [ "$rc" = 0 ]; then
    gate_say "ok   $name (${dur}s)"
    GATE_STEPS="$GATE_STEPS${GATE_STEPS:+,}\"$name:ok:${dur}s\""
    return 0
  fi
  if [ "$rc" = 124 ]; then
    gate_say "FAIL $name: Timeout nach ${secs}s. Log: $log"
  else
    gate_say "FAIL $name (rc=$rc, ${dur}s). Log: $log"
  fi
  echo "---- letzte Zeilen von $name ----" >&2; tail -n 30 "$log" >&2; echo "----" >&2
  GATE_STEPS="$GATE_STEPS${GATE_STEPS:+,}\"$name:FAIL(rc=$rc):${dur}s\""
  GATE_FAILED=1
  return "$rc"
}

# gate_skip <name> <grund>
gate_skip() {
  gate_say "skip $1: $2"
  GATE_STEPS="$GATE_STEPS${GATE_STEPS:+,}\"$1:skipped\""
}

# ---- last_run --------------------------------------------------------------------------------------------
# gate_write_last_run <repo-root> <result: pass|fail>
gate_write_last_run() {
  local root="$1" result="$2" dir sha dirty dur
  dir="$root/.claude/playbooks/state"
  mkdir -p "$dir"
  sha="$(git -C "$root" rev-parse HEAD 2>/dev/null || echo unknown)"
  dirty="$(git -C "$root" status --porcelain --untracked-files=no 2>/dev/null | wc -l | tr -d ' ')"
  dur=$((SECONDS - GATE_T0))
  local json
  json="$(printf '{\n  "lane": "%s",\n  "repo": "%s",\n  "started": "%s",\n  "duration_s": %s,\n  "result": "%s",\n  "commit": "%s",\n  "tracked_files_modified": %s,\n  "steps": [%s],\n  "logs": "%s"\n}\n' \
    "$GATE_LANE" "$GATE_REPO_NAME" "$GATE_STARTED" "$dur" "$result" "$sha" "$dirty" "$GATE_STEPS" "$GATE_RUN_DIR")"
  printf '%s' "$json" > "$dir/test-gate.last_run"
  printf '%s' "$json" > "$dir/test-gate.$GATE_LANE.last_run"
}

# gate_last_run_fresh <repo-root> <lane> <sha> <max-sek>: 0, wenn die Lane fuer genau diesen Commit gruen lief,
# der Arbeitsbaum (tracked) sauber ist und der Lauf juenger als max-sek ist.
gate_last_run_fresh() {
  local root="$1" lane="$2" sha="$3" max="$4" f
  f="$root/.claude/playbooks/state/test-gate.$lane.last_run"
  [ -f "$f" ] || return 1
  grep -q '"result": "pass"' "$f" || return 1
  grep -q "\"commit\": \"$sha\"" "$f" || return 1
  [ "$(git -C "$root" status --porcelain --untracked-files=no | wc -l | tr -d ' ')" = "0" ] || return 1
  [ $(( $(date +%s) - $(stat -f %m "$f") )) -le "$max" ] || return 1
  return 0
}
