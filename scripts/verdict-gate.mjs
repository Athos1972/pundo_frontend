#!/usr/bin/env node
/**
 * verdict-gate.mjs — Quality-Gate-Validator (F8950)
 *
 * Prüft dass .last_run kein SHIP-Verdict enthält wenn open_failures > 0.
 * Wird vom e2e-tester-Skill vor dem SHIP-Verdict aufgerufen.
 *
 * Exit 0 = Gate grün (SHIP erlaubt)
 * Exit 1 = Gate rot  (SHIP blockiert — offene FAILs vorhanden)
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

const path = resolve('.claude/skills/e2e-tester/.last_run')
let data
try {
  data = JSON.parse(readFileSync(path, 'utf-8'))
} catch (e) {
  console.error(`Gate: .last_run nicht lesbar — ${e.message}`)
  console.error('Pfad:', path)
  process.exit(1)
}

const open = data.open_failures ?? []

if (open.length === 0) {
  console.log('Gate OK: 0 offene FAILs — SHIP erlaubt')
  process.exit(0)
}

console.error(`\nGATE FAIL: ${open.length} offene FAIL(s) — SHIP blockiert\n`)
for (const f of open) {
  console.error(`  ${f.bugId}  [${f.category}]  ${f.status}  — ${f.journey ?? 'kein Journey'}`)
}
console.error('\nAlle Bugs müssen GELÖST sein bevor SHIP möglich ist.')
console.error('Vault: FG8 Admin & Operations/Bugs/')
process.exit(1)
