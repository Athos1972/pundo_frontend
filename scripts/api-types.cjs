#!/usr/bin/env node
'use strict'
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS-Skript, von Node direkt gestartet */
/**
 * Backend-Vertrag fuer die Frontend-Typen (B8950-016 T17).
 *
 *   node scripts/api-types.cjs sync    kopiert ../pundo_main_backend/docs/openapi.json und docs/error_codes.json nach src/types/generated/openapi.json
 *                                      und erzeugt src/types/generated/backend.ts (openapi-typescript, isoliert in tools/api-types)
 *   node scripts/api-types.cjs check   prueft (1) Kopie == Backend-Snapshot (sichtbarer Skip, wenn das Backend-Repo fehlt),
 *                                      (2) backend.ts == Ausgabe des Generators fuer die Kopie. Exit 1 = veraltet.
 *
 * Quelle der Wahrheit ist das Backend (`scripts/export_openapi.py`), und zwar sein COMMITTETER Stand (`git show HEAD:docs/...`):
 * uncommittete Arbeit einer anderen Session am Backend macht dieses Gate nicht rot und fliesst nicht in die Typen ein.
 * Ohne Git-Checkout wird die Datei selbst gelesen; `PUNDO_BACKEND_WORKTREE=1` erzwingt die Arbeitsdatei.
 * Aenderung am Backend-Schema -> Backend-Snapshot neu erzeugen und committen, hier `sync`, committen. Der Typecheck (`tsc`) zeigt dann, wo das Frontend abweicht
 * (`src/types/contracts.ts`).
 *
 * openapi-typescript braucht TypeScript 5, die App nutzt 6: der Generator lebt in einem eigenen Paket (tools/api-types).
 */
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
const SIBLING = path.join(process.env.PUNDO_BACKEND_DIR ?? path.join(ROOT, '..', 'pundo_main_backend'), 'docs', 'openapi.json')
const LOCAL = path.join(ROOT, 'src', 'types', 'generated', 'openapi.json')
const OUT = path.join(ROOT, 'src', 'types', 'generated', 'backend.ts')
const CODES_SIBLING = path.join(path.dirname(SIBLING), 'error_codes.json')
const CODES_LOCAL = path.join(ROOT, 'src', 'types', 'generated', 'error_codes.json')
const TOOL = path.join(ROOT, 'tools', 'api-types')

/** Inhalt von `<backend>/docs/<name>`: committeter Stand (HEAD), sonst die Datei; null, wenn es sie nicht gibt. */
function backendFile(file) {
  if (!fs.existsSync(file)) return null
  if (process.env.PUNDO_BACKEND_WORKTREE !== '1') {
    const dir = path.dirname(path.dirname(file))
    try {
      return execFileSync('git', ['-C', dir, 'show', `HEAD:docs/${path.basename(file)}`], { maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] })
    } catch {
      /* kein Git-Checkout oder Datei nicht committet: Arbeitsdatei */
    }
  }
  return fs.readFileSync(file)
}

function generator() {
  const bin = path.join(TOOL, 'node_modules', '.bin', 'openapi-typescript')
  if (!fs.existsSync(bin)) {
    execFileSync('npm', ['ci', '--prefix', TOOL, '--no-audit', '--no-fund'], { stdio: 'inherit' })
  }
  return bin
}

function generate(input, output) {
  execFileSync(generator(), [input, '-o', output], { stdio: ['ignore', 'ignore', 'inherit'] })
  // TypeScript 6 rejects the recursive JsonValue aliases the generator emits (TS2502); a JSON value is `unknown` for us.
  const text = fs.readFileSync(output, 'utf8').replace(/"JsonValue-(Input|Output)": [\s\S]*?\| null;/g, '"JsonValue-$1": unknown;')
  fs.writeFileSync(output, text)
}

const cmd = process.argv[2]
if (cmd === 'sync') {
  if (!fs.existsSync(SIBLING)) {
    console.error(`api-types: ${SIBLING} fehlt (Backend-Repo oder docs/openapi.json nicht vorhanden)`)
    process.exit(1)
  }
  fs.mkdirSync(path.dirname(LOCAL), { recursive: true })
  fs.writeFileSync(LOCAL, backendFile(SIBLING))
  if (fs.existsSync(CODES_SIBLING)) fs.writeFileSync(CODES_LOCAL, backendFile(CODES_SIBLING))
  generate(LOCAL, OUT)
  console.log(`api-types: synchronisiert (${fs.statSync(OUT).size >> 10} KB backend.ts)`)
} else if (cmd === 'check') {
  let failed = false
  if (!fs.existsSync(SIBLING)) {
    console.error(`api-types: SKIPPED - ${SIBLING} nicht vorhanden (Backend-Repo fehlt); Snapshot-Vergleich uebersprungen`)
  } else if (!backendFile(SIBLING).equals(fs.readFileSync(LOCAL))) {
    console.error('api-types: FEHLER - src/types/generated/openapi.json ist veraltet gegenueber dem Backend. Fix: node scripts/api-types.cjs sync')
    failed = true
  }
  if (fs.existsSync(CODES_SIBLING) && !backendFile(CODES_SIBLING).equals(fs.readFileSync(CODES_LOCAL))) {
    console.error('api-types: FEHLER - src/types/generated/error_codes.json ist veraltet gegenueber dem Backend. Fix: node scripts/api-types.cjs sync')
    failed = true
  }
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'api-types-')), 'backend.ts')
  generate(LOCAL, tmp)
  if (!fs.readFileSync(tmp).equals(fs.readFileSync(OUT))) {
    console.error('api-types: FEHLER - src/types/generated/backend.ts passt nicht zur Kopie. Fix: node scripts/api-types.cjs sync')
    failed = true
  }
  if (failed) process.exit(1)
  console.log('api-types: ok')
} else {
  console.error('usage: node scripts/api-types.cjs sync|check')
  process.exit(2)
}
